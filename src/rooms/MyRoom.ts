import { Room, Client } from "colyseus";
import { ArraySchema, Encoder, MapSchema } from "@colyseus/schema";
import {
    Carta,
    Jugador,
    MyRoomState,
    OpcionPersonaje
} from "./schema/MyRoomState.js";
import type { ClienteJuego, IMyRoom, SfxPayload } from "./IMyRoom.js";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { GestorMusica } from "./GestorMusica.js";
import { GestorPersonajes, type IPersonaje } from "./Personajes.js";
import { MotorEventos } from "./MotorEventos.js";
import { SistemaCartas } from "./SistemaCartas.js";
import { SistemaCombate } from "./SistemaCombate.js";
import { SistemaInteracciones, type OpcionCartaConfig } from "./SistemaInteracciones.js";
import { SistemaRuleta } from "./SistemaRuleta.js";
import { SistemaTurnos } from "./SistemaTurnos.js";
import { Utilidades } from "./Utilidades.js";

Encoder.BUFFER_SIZE = 64 * 1024; // 64 KB

interface OpcionesIngreso {
    nombre?: string;
    avatar?: number;
}

interface PayloadJugarObjetivo {
    idCarta?: string;
    idCartaJugada?: string;
    idObjetivo?: string;
}

interface PayloadComando {
    comando?: string;
    parametro?: string;
}

export class MyRoom extends Room implements IMyRoom {
    public maxClients = 15;
    public state = new MyRoomState();

    public motorEventos!: MotorEventos;
    public sistemaCombate!: SistemaCombate;
    public sistemaRuleta!: SistemaRuleta;
    public sistemaInteracciones!: SistemaInteracciones;
    public sistemaTurnos!: SistemaTurnos;
    public sistemaCartas!: SistemaCartas;
    public gestorPersonajes!: GestorPersonajes;
    public gestorMusica!: GestorMusica;

    private estadosPrivados: Map<string, Record<string, unknown>> = new Map();

    // =========================================================================
    // CICLO DE VIDA DE COLYSEUS
    // =========================================================================

    public onCreate(): void {
        console.log("La sala multijugador se creó correctamente");
        this.setState(new MyRoomState());

        this.gestorPersonajes = new GestorPersonajes();
        this.gestorMusica = new GestorMusica(this);
        this.motorEventos = new MotorEventos(this);
        this.sistemaCartas = new SistemaCartas(this);
        this.sistemaCombate = new SistemaCombate(this);
        this.sistemaRuleta = new SistemaRuleta(this);
        this.sistemaInteracciones = new SistemaInteracciones(this);
        this.sistemaTurnos = new SistemaTurnos(this);

        this.registrarMensajes();
    }

    public onJoin(client: Client, options: OpcionesIngreso): void {
        const nuevoJugador = new Jugador();
        if (options?.nombre && options.nombre.trim() !== "") {
            nuevoJugador.nombre = options.nombre.trim();
        }
        if (typeof options?.avatar === "number") {
            nuevoJugador.avatar = options.avatar;
        }
        if (this.state.jugadores.size === 0) {
            nuevoJugador.esAnfitrion = true;
        }

        this.state.jugadores.set(client.sessionId, nuevoJugador);
        this.reproducirSfx("sfxJugadorEntra");
    }

    public onLeave(client: Client): void {
        const jugadorQueSeVa = this.state.jugadores.get(client.sessionId);
        if (!jugadorQueSeVa) return;

        const eraAnfitrion = jugadorQueSeVa.esAnfitrion;

        if (this.state.estadoJuego !== "Jugando") {
            this.state.jugadores.delete(client.sessionId);
            this.limpiarEstadoPrivado(client.sessionId);
            this.reproducirSfx("sfxJugadorSale");
        } else {
            this.agregarRegistro(
                `🏃 ${jugadorQueSeVa.nombre} ha abandonado la partida y su personaje muere.`
            );

            jugadorQueSeVa.vidas = -999;
            jugadorQueSeVa.estaMuertoFalso = false;
            jugadorQueSeVa.estaDesconectado = true;
            this.reproducirSfx("desconectado");

            const eraSuTurno = this.state.turnoActual === client.sessionId;
            this.evaluarMuerte(jugadorQueSeVa, null, true);

            if (eraSuTurno && this.state.estadoJuego === "Jugando") {
                this.sistemaTurnos.avanzarAlSiguienteTurno(client.sessionId);
            }
        }

        if (eraAnfitrion && this.state.jugadores.size > 0) {
            for (const jugador of this.state.jugadores.values()) {
                if (!jugador.esNpc && !jugador.estaDesconectado) {
                    jugador.esAnfitrion = true;
                    break;
                }
            }
        }
    }

    // =========================================================================
    // REGISTRO DE MENSAJES DE RED
    // =========================================================================

    private registrarMensajes(): void {
        this.onMessage("iniciar_partida", (client) => this.manejarIniciarPartida(client));
        this.onMessage("elegir_personaje", (client, nombreElegido: string) =>
            this.manejarElegirPersonaje(client, nombreElegido)
        );
        this.onMessage("reroll", (client) => {
            const jugador = this.state.jugadores.get(client.sessionId);
            if (jugador) jugador.reroll = true;
        });

        this.onMessage("pasar_turno", (client) => this.procesarPasarTurno(client));

        // Mensaje unificado para jugar cartas (acepta string o { idCarta, idObjetivo })
        this.onMessage("jugar_carta", (client, payload: string | PayloadJugarObjetivo) => {
            if (typeof payload === "string") {
                this.procesarJugarCarta(client, payload);
            } else if (payload && payload.idCarta) {
                this.procesarJugarCarta(client, payload.idCarta, payload.idObjetivo);
            }
        });

        // Alias de compatibilidad
        this.onMessage("jugar_carta_1objetivo", (client, datos: PayloadJugarObjetivo) => {
            if (datos?.idCarta) {
                this.procesarJugarCarta(client, datos.idCarta, datos.idObjetivo);
            }
        });
        this.onMessage("encarcelar_jugador", (client, datos: PayloadJugarObjetivo) => {
            const idCarta = datos?.idCartaJugada ?? datos?.idCarta;
            if (idCarta) {
                this.procesarJugarCarta(client, idCarta, datos?.idObjetivo);
            }
        });

        // Consulta a demanda de objetivos válidos para iluminar en Cocos
        this.onMessage("consultar_objetivos", (client, idCarta: string) => {
            if (
                this.state.estadoJuego !== "Jugando" ||
                this.state.turnoActual !== client.sessionId ||
                this.juegoPausado()
            ) {
                client.send("objetivos_validos", { idCarta, objetivos: [] });
                return;
            }
            const jugador = this.state.jugadores.get(client.sessionId);
            const carta = jugador?.mano.find((c: Carta) => c.id === idCarta);
            if (!jugador || !carta) {
                client.send("objetivos_validos", { idCarta, objetivos: [] });
                return;
            }

            const objetivos = this.sistemaCombate.obtenerObjetivosValidos(client.sessionId, carta);
            client.send("objetivos_validos", { idCarta, objetivos });
        });

        this.onMessage("descartar_carta", (client, idCarta: string) =>
            this.procesarDescartarCarta(client, idCarta)
        );
        this.onMessage("voltear_carta", (client) => this.procesarVoltearCarta(client));
        this.onMessage("responder_interaccion", (client, idAccion: string) =>
            this.procesarResponderInteraccion(client, idAccion)
        );
        this.onMessage("respuesta_seleccion_carta", (client, idRespuesta: string) =>
            this.procesarRespuestaSeleccionCarta(client, idRespuesta)
        );

        this.onMessage("usar_habilidad_activa", (client, idHabilidad: string) => {
            if (
                this.state.estadoJuego !== "Jugando" ||
                this.state.turnoActual !== client.sessionId ||
                this.juegoPausado()
            ) {
                return;
            }
            const jugador = this.state.jugadores.get(client.sessionId);
            if (jugador && jugador.estaVivo) {
                this.motorEventos.dispararPersonaje(
                    jugador,
                    "ejecutarHabilidadActiva",
                    jugador,
                    client,
                    idHabilidad
                );
            }
        });

        this.onMessage("pin", (client, pin: string) => {
            const jugador = this.state.jugadores.get(client.sessionId);
            if (!jugador) return;
            this.broadcast("pin", {
                sessionId: client.sessionId,
                personaje: jugador.personaje,
                pin
            });
        });

        this.onMessage("accion", (client, accion: string) => {
            const jugador = this.state.jugadores.get(client.sessionId);
            if (!jugador) return;
            this.animacionJugador(client.sessionId, accion);
        });

        this.onMessage("enviarChat", (client, mensaje: string) => {
            if (!this.state.jugadores.has(client.sessionId)) return;
            this.broadcast("chat", { sessionId: client.sessionId, mensaje });
        });

        this.onMessage("enviarComando", (client, datos: PayloadComando) => {
            this.manejarComandoAdmin(client, datos);
        });
    }

    // =========================================================================
    // INICIO DE PARTIDA Y SELECCIÓN DE PERSONAJE
    // =========================================================================

    private manejarIniciarPartida(client: Client): void {
        const jugador = this.state.jugadores.get(client.sessionId);
        if (!jugador || !jugador.esAnfitrion || this.state.estadoJuego !== "Lobby") return;

        const totalJugadores = this.state.jugadores.size;
        console.log(`🔥 ¡Inicia la partida con ${totalJugadores} jugadores!`);

        const arrayJugadores = this.mezclar(Array.from(this.state.jugadores.entries()));
        this.state.jugadores.clear();
        this.state.ordenSillasFisicas.clear();
        this.state.ordenTurnos.clear();

        for (const [id, jug] of arrayJugadores) {
            this.state.jugadores.set(id, jug);
            this.state.ordenSillasFisicas.push(id);
            this.state.ordenTurnos.push(id);
        }

        this.gestorMusica.reproducirSeleccionPersonaje();

        const mazoRoles = this.mezclar(this.construirRoles(totalJugadores));
        this.state.cantidadForajidos = mazoRoles.filter((r) => r === "Forajido").length;
        this.state.cantidadAlguaciles = mazoRoles.filter((r) => r === "Alguacil").length;

        const listaPersonajes = this.gestorPersonajes.obtenerTodosParaRepartir();
        let indicePersonaje = 0;
        let i = 0;

        this.state.jugadores.forEach((j: Jugador, sessionId: string) => {
            j.rol = mazoRoles[i] ?? "Forajido";
            if (j.rol === "Sheriff") this.state.turnoActual = sessionId;

            j.opcionesPersonaje.clear();
            for (let k = 0; k < 6; k++) {
                const p = listaPersonajes[indicePersonaje % listaPersonajes.length];
                const opcion = new OpcionPersonaje();
                opcion.nombre = p.nombre;
                opcion.habilidad = p.habilidad;
                opcion.vidasBase = p.vidasBase;
                opcion.spriteFueraDeJuego = p.spriteFueraDeJuego === true;
                j.opcionesPersonaje.push(opcion);
                indicePersonaje++;
            }
            i++;
        });

        this.construirMazoInicial();
        this.state.estadoJuego = "SeleccionPersonaje";
        this.lock();
    }

    private manejarElegirPersonaje(client: Client, nombreElegido: string): void {
        if (this.state.estadoJuego !== "SeleccionPersonaje") return;

        const jugador = this.state.jugadores.get(client.sessionId);
        if (!jugador || jugador.yaEligioPersonaje) return;

        const elegida = jugador.opcionesPersonaje.find((o) => o.nombre === nombreElegido);
        if (!elegida) return;

        const claseReal = this.gestorPersonajes.obtener(elegida.nombre);
        jugador.personaje = elegida.nombre;
        jugador.nombreMostrar = claseReal?.nombreMostrar ?? elegida.nombre;
        jugador.habilidad = elegida.habilidad;

        if (claseReal?.sfxMuerte) jugador.sfxMuerte = claseReal.sfxMuerte;
        if (claseReal?.sfxDefault) jugador.sfxDefault = claseReal.sfxDefault;

        jugador.vidas = elegida.vidasBase + (jugador.rol === "Sheriff" ? 1 : 0);
        jugador.vidasMaximas = jugador.vidas;
        jugador.yaEligioPersonaje = true;
        console.log(`✅ ${jugador.nombre} eligió a ${jugador.personaje}.`);

        let todosEligieron = true;
        this.state.jugadores.forEach((j: Jugador) => {
            if (!j.yaEligioPersonaje) todosEligieron = false;
        });

        if (!todosEligieron) return;

        // Reparto de mano inicial según vidas
        this.state.jugadores.forEach((j: Jugador) => {
            j.mano.clear();
            for (let balas = 0; balas < j.vidas; balas++) {
                const carta = this.robarUnaDelMazo();
                if (carta) j.mano.push(carta);
            }
        });

        this.state.estadoJuego = "Jugando";

        const jugadoresIniciales = Array.from(this.state.jugadores.values());
        for (const j of jugadoresIniciales) {
            this.motorEventos.dispararPersonaje(j, "onAsignar", j, false);
        }

        const totalActivos = this.state.jugadores.size;
        if (totalActivos >= 6) {
            this.state.jugadores.forEach((j: Jugador) => {
                if (j.estaVivo && j.rol !== "Sheriff") {
                    Utilidades.agregarEscudos(this, j, 1, 1, "inicio");
                }
            });
        }

        this.gestorMusica.sortearEstiloParaPartida();
        this.gestorMusica.actualizarAutomatica();

        const sheriff = this.state.jugadores.get(this.state.turnoActual);
        if (sheriff) {
            this.sistemaTurnos.iniciarTurnoEfectivo(sheriff);
        }
    }

    private construirRoles(total: number): string[] {
        if (total <= 2) return ["Sheriff", "Renegado"];
        if (total === 3) return ["Sheriff", "Renegado", "Forajido"];

        const roles = ["Sheriff", "Renegado"];
        const restantes = total - 2;
        const forajidos = Math.ceil(restantes / 2) + (total >= 4 && restantes % 2 === 0 ? 1 : 0);
        const alguaciles = Math.max(0, restantes - forajidos);

        for (let i = 0; i < forajidos; i++) roles.push("Forajido");
        for (let i = 0; i < alguaciles; i++) roles.push("Alguacil");
        return roles.slice(0, total);
    }

    private construirMazoInicial(): void {
        const mazo: Carta[] = [];

        const agregar = (cantidad: number, fabrica: () => Carta): void => {
            for (let i = 0; i < cantidad; i++) mazo.push(fabrica());
        };

        agregar(26, () => CatalogoCartasEspeciales.crearBang());
        agregar(5, () => CatalogoCartasEspeciales.crearBotiquin());
        agregar(8, () => CatalogoCartasEspeciales.crearFallo());
        agregar(4, () => CatalogoCartasEspeciales.crearSpooky());
        agregar(3, () => CatalogoCartasEspeciales.crearCofre());
        agregar(1, () => CatalogoCartasEspeciales.crearCofreSuperMagico());
        agregar(4, () => CatalogoCartasEspeciales.crearCocoroch());
        agregar(4, () => CatalogoCartasEspeciales.crearPanico());
        agregar(1, () => CatalogoCartasEspeciales.crearMusicoterapia());
        agregar(1, () => CatalogoCartasEspeciales.crearTiratachuela());
        agregar(2, () => CatalogoCartasEspeciales.crearIndios());
        agregar(2, () => CatalogoCartasEspeciales.crearTiendaDeGriff());
        agregar(3, () => CatalogoCartasEspeciales.crearDuelo());
        agregar(2, () => CatalogoCartasEspeciales.crearCaballo());
        agregar(2, () => CatalogoCartasEspeciales.crearMonoAldea());
        agregar(2, () => CatalogoCartasEspeciales.crearBarril());
        agregar(3, () => CatalogoCartasEspeciales.crearPrision());
        agregar(1, () => CatalogoCartasEspeciales.crearDinamita());

        // Armas base
        agregar(2, () => CatalogoCartasEspeciales.crearArma("Pistola de Shion", 2));
        agregar(2, () => CatalogoCartasEspeciales.crearArma("Revolver de Casiddy", 3));
        agregar(1, () => CatalogoCartasEspeciales.crearArma("Rifle de Ashe", 4));
        agregar(1, () => CatalogoCartasEspeciales.crearArma("Francotirador", 5));
        agregar(2, () => CatalogoCartasEspeciales.crearPistolaDeTracer());

        // Pool de extensiones (10 aleatorias)
        const poolExtensiones = this.mezclar(CatalogoCartasEspeciales.obtenerPoolExtensiones()).slice(0, 10);
        for (const config of poolExtensiones) {
            for (let i = 0; i < config.copias; i++) {
                const cartaExt = CatalogoCartasEspeciales.crearCartaExtension(config.id);
                if (cartaExt) {
                    cartaExt.esConjurada = false;
                    mazo.push(cartaExt);
                }
            }
        }

        this.state.mazo.clear();
        for (const carta of this.mezclar(mazo)) {
            this.state.mazo.push(carta);
        }
    }

    // =========================================================================
    // PROCESADORES DE ACCIONES (USADOS POR RED Y POR GestorNPC)
    // =========================================================================

    public procesarPasarTurno(client: ClienteJuego): void {
        this.sistemaTurnos.procesarPasarTurno(client);
    }

    public procesarJugarCarta(client: ClienteJuego, idCarta: string, idObjetivo?: string): boolean {
        return this.sistemaCartas.jugarCarta(client, idCarta, idObjetivo);
    }

    public procesarDescartarCarta(client: ClienteJuego, idCarta: string): void {
        if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId) return;
        const jugador = this.state.jugadores.get(client.sessionId);
        if (!jugador) return;

        const idx = jugador.mano.findIndex((c: Carta) => c.id === idCarta);
        if (idx === -1) return;

        const cartaDescartada = jugador.mano.splice(idx, 1)[0];
        if (cartaDescartada) {
            this.descartarCarta(cartaDescartada, jugador, "VOLUNTARIO");
            this.agregarRegistro(`🗑️ ${Utilidades.obtenerNombreVisual(jugador)} descartó una carta.`);
        }
    }

    public procesarVoltearCarta(client: ClienteJuego): void {
        this.sistemaRuleta.procesarGiro(client.sessionId);
    }

    public procesarResponderInteraccion(client: ClienteJuego, idAccion: string): void {
        this.sistemaInteracciones.responderInteraccion(client, idAccion);
    }

    public procesarRespuestaSeleccionCarta(client: ClienteJuego, idRespuesta: string): void {
        this.sistemaInteracciones.responderSeleccionCarta(client, idRespuesta);
    }

    // =========================================================================
    // ROBO, DESCARTE, PASIVAS AL JUGAR Y MUERTE
    // =========================================================================

    public repartirCartas(jugador: Jugador, cantidadBase: number, causa: string): void {
        if (!jugador || !jugador.estaVivo) return;

        const modificacion = this.motorEventos.sumar(jugador, "modificarRepartirCarta", jugador, causa);
        const cantidadFinal = cantidadBase + modificacion;
        if (cantidadFinal <= 0) return;

        // Mecánica de Susato al iniciar turno: elige entre (cantidad + 3) cartas
        if (jugador.boolean.get("susato") && causa === "turno") {
            const extraidas: Carta[] = [];
            for (let i = 0; i < cantidadFinal + 3; i++) {
                const c = this.robarUnaDelMazo();
                if (c) extraidas.push(c);
            }
            if (extraidas.length > 0) {
                const idSusato = Utilidades.obtenerSessionIdDeJugador(this, jugador);
                this.iniciarSeleccionSusato(idSusato, jugador, extraidas, cantidadFinal);
                return;
            }
        }

        for (let i = 0; i < cantidadFinal; i++) {
            const carta = this.robarUnaDelMazo();
            if (carta) jugador.mano.push(carta);
        }
    }

    private iniciarSeleccionSusato(
        idSusato: string,
        susato: Jugador,
        pool: Carta[],
        faltanElegir: number
    ): void {
        const privado = this.obtenerEstadoPrivado(idSusato);

        const descartarRestantes = (): void => {
            privado["susatoFaltanElegir"] = 0;
            for (const c of pool) this.agregarAlDescarte(c);
            pool.length = 0;
        };

        const pedirSiguiente = (restantes: number): void => {
            if (restantes <= 0 || pool.length === 0 || !susato.estaVivo) {
                descartarRestantes();
                return;
            }

            privado["susatoFaltanElegir"] = restantes;
            const opciones: OpcionCartaConfig[] = pool.map((carta) => ({
                idRespuesta: carta.id,
                carta
            }));

            this.sistemaInteracciones.abrirSeleccionCartas({
                idJugadorObjetivo: idSusato,
                titulo: `Interesada: Elegí una carta para tu mano (Faltan ${restantes})`,
                temaVisual: "susato",
                tipoAccion: "susato_robar",
                opciones,
                onSeleccionar: (idCartaElegida) => {
                    const idx = pool.findIndex((c) => c.id === idCartaElegida);
                    if (idx !== -1) {
                        const elegida = pool.splice(idx, 1)[0];
                        if (elegida && susato.estaVivo) {
                            susato.mano.push(elegida);
                            this.agregarRegistro(
                                `📚 ${Utilidades.obtenerNombreVisual(susato)} eligió una carta y la agregó a su mano.`
                            );
                        }
                    }
                    pedirSiguiente(restantes - 1);
                },
                onAbortarPorMuerte: () => {
                    descartarRestantes();
                }
            });
        };

        pedirSiguiente(faltanElegir);
    }

    private robarUnaDelMazo(): Carta | null {
        if (this.state.mazo.length === 0 && this.state.descarte.length > 0) {
            const mezcladas = this.mezclar(Array.from(this.state.descarte));
            this.state.descarte.clear();
            for (const carta of mezcladas) {
                // Clonamos con forzarConjurada = false para que Colyseus mantenga vivos los MapSchema internos
                this.state.mazo.push(Utilidades.clonarCarta(carta, "mazo", false));
            }
        }
        return this.state.mazo.pop() ?? null;
    }

    public descartarCarta(cartaDescartada: Carta, jugador: Jugador, motivo: string): void {
        if (!cartaDescartada) return;
        if (!jugador) {
            this.agregarAlDescarte(cartaDescartada);
            return;
        }

        this.motorEventos.disparar(jugador, "onDescartarCarta", jugador, cartaDescartada, motivo);
        Utilidades.restarEfecto(jugador, "fuego", 1);

        // Perro con hueso
        if (cartaDescartada.idDuenoDelPerro !== "") {
            const atacante = this.state.jugadores.get(cartaDescartada.idDuenoDelPerro) ?? null;
            this.sistemaCombate.procesarDano(jugador, atacante, 1, "DESCARTE", {
                cartaOrigen: cartaDescartada
            });
            this.reproducirSfx("sfxPerroAtacando");
        }

        // Efecto propio de la carta al ser descartada (Hongo Venenoso, Reductor, Zombidito, etc.)
        this.sistemaCartas.alDescartarCartaPropia(jugador, cartaDescartada, motivo);

        this.agregarAlDescarte(cartaDescartada);
    }

    public agregarAlDescarte(carta: Carta): void {
        if (!carta || carta.esConjurada) return;
        carta.idDuenoDelPerro = "";
        this.state.descarte.push(carta);
    }

    public ejecutarPasivasAlJugarCarta(jugador: Jugador, carta: Carta): void {
        this.motorEventos.disparar(jugador, "onJugarCarta", jugador, carta);
        this.motorEventos.dispararGlobal("onJugarCartaGlobal", jugador, carta);
        Utilidades.agregarEstadistica(jugador, 1, "🃏jugadas");
    }

    public evaluarMuerte(
        victima: Jugador,
        asesino: Jugador | null = null,
        _fueDanoVerdadero: boolean = false
    ): void {
        if (!victima || !victima.estaVivo) return;

        // 1. Intento automático de supervivencia con Botiquín / Huevo sano
        const totalVivosAntes = this.getTotalJugadoresVivos();
        while (victima.vidas <= 0 && totalVivosAntes !== 2 && !victima.estaDesconectado) {
            if (victima.transformarCuraEnEscudo || victima.efecto.has("malestar")) break;

            const idx = victima.mano.findIndex((c: Carta) => this.sistemaCartas.salvaDeMuerte(c));
            if (idx === -1) break;

            const salvadora = victima.mano.splice(idx, 1)[0];
            if (salvadora) {
                this.agregarAlDescarte(salvadora);
                Utilidades.aplicarCuracion(this, victima, 1, "BOTIQUIN", false);
                this.agregarRegistro(
                    `🩹 ¡${victima.nombre} usó ${salvadora.nombre} automáticamente para evitar la muerte!`
                );
            }
        }

        if (victima.vidas > 0) return;

        // 2. Muerte confirmada
        victima.estaVivo = false;
        victima.vidas = 0;

        if (victima.rol !== "Sheriff" && !victima.estaDesconectado) {
            this.reproducirSfx({
                sfx: victima.sfxMuerte[0],
                silencio: victima.sfxMuerte[1],
                vol: victima.sfxMuerte[2] ?? 1.0
            });
        }

        if (victima.personaje === "Kazuma" && victima.rol !== "Sheriff" && !victima.estaMuertoFalso) {
            victima.estaMuertoFalso = true;
            victima.rondasMuerto = Math.floor(Math.random() * 2) + 2;
            this.agregarRegistro(`☠️ ${victima.nombre} ha sido ELIMINADO?.`);
        } else {
            victima.estaMuertoFalso = false;
            console.log(`☠️ ${victima.nombre} ha sido ELIMINADO.`);
        }

        // 3. Recompensas y castigos de roles
        if (asesino && asesino.estaVivo && !victima.esNpc) {
            if (victima.rol === "Forajido") {
                if (victima.beneficiarseDeSuMuerte) {
                    this.agregarRegistro(
                        `💰 ¡${asesino.nombre} eliminó a un Forajido y cobra la recompensa de 2 cartas!`
                    );
                    this.repartirCartas(asesino, 2, "recompensa_forajido");
                } else {
                    this.agregarRegistro(
                        `${asesino.nombre} no roba cartas porque ${victima.nombre} ya murió antes.`
                    );
                }
            } else if (victima.rol === "Alguacil" && asesino.rol === "Sheriff") {
                if (victima.beneficiarseDeSuMuerte) {
                    this.agregarRegistro(
                        `🤦‍♂️ ¡El Sheriff mató a su propio Alguacil! Pierde todas sus cartas y equipamiento.`
                    );
                    for (const carta of asesino.mano) this.agregarAlDescarte(carta);
                    asesino.mano.clear();
                    Utilidades.destruirTodosLosEquipamientos(this, asesino);
                } else {
                    this.agregarRegistro(
                        `El Sheriff no pierde nada ya que ${victima.nombre} ya murió anteriormente.`
                    );
                }
            }
        }

        // 4. Limpieza de la víctima
        for (const carta of victima.mano) this.agregarAlDescarte(carta);
        victima.mano.clear();
        victima.vidasEscudo = 0;
        victima.turnosEscudos = [];
        Utilidades.destruirTodosLosEquipamientos(this, victima);
        Utilidades.eliminarTodosLosEfectos(victima);
        victima.embrujos.clear();

        const idVictima = Utilidades.obtenerSessionIdDeJugador(this, victima);

        // 5. Hook onMorir exclusivamente en la víctima
        this.motorEventos.disparar(victima, "onMorir", victima);

        // 6. Hooks globales en vivos (Anillo del Vampiro, Mario, Luigi, Mortis, Maya, Phoenix, Volpina)
        const vivosSnapshot = Array.from(this.state.jugadores.values()).filter((j) => j.estaVivo);
        for (const j of vivosSnapshot) {
            if (!victima.esNpc) {
                this.motorEventos.disparar(j, "onMuereOtroPersonaje", victima, asesino, j);
            } else {
                this.motorEventos.disparar(j, "onMuereNpc", j, victima);
            }
        }
        victima.beneficiarseDeSuMuerte = false;

        // 7. Evaluamos victoria ANTES de avanzar colas/turnos (evita pisar música de fin)
        const vivosPorRol = { Sheriff: 0, Forajido: 0, Renegado: 0, Alguacil: 0 };
        let realesVivos = 0;
        this.state.jugadores.forEach((j: Jugador) => {
            if (j.estaVivo && !j.esNpc) {
                realesVivos++;
                if (j.rol in vivosPorRol) {
                    vivosPorRol[j.rol as keyof typeof vivosPorRol]++;
                }
            }
        });

        let mensajeVictoria: string | null = null;
        if (vivosPorRol.Sheriff === 0) {
            mensajeVictoria =
                realesVivos === 1 && vivosPorRol.Renegado === 1
                    ? "🏆 ¡EL RENEGADO GANA LA PARTIDA!"
                    : "🏆 ¡LOS FORAJIDOS GANAN LA PARTIDA!";
        } else if (vivosPorRol.Forajido === 0 && vivosPorRol.Renegado === 0) {
            mensajeVictoria = "🏆 ¡EL SHERIFF GANA LA PARTIDA!";
        }

        if (mensajeVictoria) {
            this.state.estadoJuego = "Terminado";
            this.sistemaInteracciones.limpiarTodo();
            this.sistemaRuleta.limpiarTodo();
            this.gestorMusica.reproducirFin();
            this.broadcast("victoria", mensajeVictoria);
            return;
        }

        // 8. Si es un NPC, lo removemos de la mesa y turnos
        if (victima.esNpc && idVictima !== "") {
            this.agregarRegistro(
                `💨 ¡${Utilidades.obtenerNombreVisual(victima)} fue derrotado y desapareció de la mesa!`
            );
            const eraSuTurno = this.state.turnoActual === idVictima;
            if (eraSuTurno) {
                this.sistemaTurnos.avanzarAlSiguienteTurno(idVictima);
            }

            const idxSilla = this.state.ordenSillasFisicas.indexOf(idVictima);
            if (idxSilla !== -1) this.state.ordenSillasFisicas.splice(idxSilla, 1);

            const idxTurno = this.state.ordenTurnos.indexOf(idVictima);
            if (idxTurno !== -1) this.state.ordenTurnos.splice(idxTurno, 1);

            this.state.jugadores.delete(idVictima);
            this.limpiarEstadoPrivado(idVictima);
        }

        // 9. Destrabamos interacciones/ruletas pendientes de la víctima y actualizamos música
        if (idVictima) {
            this.sistemaRuleta.cancelarSiPerteneceA(idVictima);
            this.sistemaInteracciones.cancelarSiPerteneceA(idVictima);
        }

        this.gestorMusica.actualizarAutomatica();
    }

    // =========================================================================
    // COMANDOS DE ADMINISTRACIÓN / DEBUG
    // =========================================================================

    private manejarComandoAdmin(client: Client, datos: PayloadComando): void {
        const comando = datos?.comando ?? "";
        const parametro = datos?.parametro ?? "";
        const miJugador = this.state.jugadores.get(client.sessionId);

        if ((comando === "carta" || comando === "original") && miJugador) {
            const todas = CatalogoCartasEspeciales.obtenerTodasLasCartas();
            const encontrada = todas.find((c) => c.nombre.toLowerCase() === parametro.toLowerCase());
            if (encontrada) {
                encontrada.esConjurada = comando === "carta";
                miJugador.mano.push(encontrada);
                client.send("alerta_personal", `Recibiste: ${encontrada.nombre}`);
            } else {
                client.send("alerta_personal", `No existe la carta: ${parametro}`);
            }
            return;
        }

        if (comando === "vida" && miJugador) {
            miJugador.vidas = parseInt(parametro, 10) || 1;
            return;
        }

        if (comando === "personaje" && miJugador) {
            this.motorEventos.dispararPersonaje(miJugador, "onRemover", miJugador);
            const nuevaClase = this.gestorPersonajes.obtener(parametro);
            if (nuevaClase) {
                miJugador.personaje = nuevaClase.nombre;
                miJugador.nombreMostrar = nuevaClase.nombreMostrar ?? nuevaClase.nombre;
                miJugador.habilidad = nuevaClase.habilidad;
                this.motorEventos.dispararPersonaje(miJugador, "onAsignar", miJugador, false);
                client.send("alerta_personal", `Cambiaste a: ${nuevaClase.nombre}`);
            }
            return;
        }

        if (comando === "kick") {
            let idObjetivo = "";
            let nombreJugador = "";
            this.state.jugadores.forEach((j: Jugador, sessionId: string) => {
                if (j.personaje.toLowerCase() === parametro.toLowerCase()) {
                    idObjetivo = sessionId;
                    nombreJugador = j.nombre;
                }
            });

            if (!idObjetivo) {
                client.send("alerta_personal", `No se encontró a nadie usando el personaje: ${parametro}`);
                return;
            }

            const clienteAExpulsar = this.clients.find((c) => c.sessionId === idObjetivo);
            if (clienteAExpulsar) {
                this.agregarRegistro(`🔨 ¡El administrador ha expulsado a ${nombreJugador}!`);
                clienteAExpulsar.leave();
            } else {
                client.send("alerta_personal", "Ese jugador ya se encuentra desconectado.");
            }
        }
    }

    // =========================================================================
    // IMPLEMENTACIÓN DE UTILIDADES DE IMyRoom
    // =========================================================================

    public obtenerEstadoPrivado(idJugador: string): Record<string, unknown> {
        let estado = this.estadosPrivados.get(idJugador);
        if (!estado) {
            estado = {};
            this.estadosPrivados.set(idJugador, estado);
        }
        return estado;
    }

    public limpiarEstadoPrivado(idJugador: string): void {
        this.estadosPrivados.delete(idJugador);
    }

    public agregarRegistro(mensaje: string): void {
        this.broadcast("notificacion_turno", mensaje);
    }

    public reproducirSfx(sfx: SfxPayload): void {
        this.broadcast("sfx", sfx);
    }

    public enviarAlerta(idJugador: string, mensaje: string): void {
        const cliente = this.clients.find((c) => c.sessionId === idJugador);
        cliente?.send("alerta_personal", mensaje);
    }

    public ejecutarAnimacionCarta(idJugador: string, carta: Carta): void {
        if (!idJugador || !carta) return;
        this.broadcast("animacion_carta", { idJugador, carta });
    }

    public animacionJugador(idJugador: string, animacion: string): void {
        const jugador = this.state.jugadores.get(idJugador);
        this.broadcast("animacionJugador", {
            sessionId: idJugador,
            personaje: jugador?.personaje ?? "",
            animacion
        });
    }

    public juegoPausado(): boolean {
        return this.sistemaRuleta.estaActiva() || this.sistemaInteracciones.estaPausado();
    }

    public getJugadores(): MapSchema<Jugador> {
        return this.state.jugadores;
    }

    public getSillasFisicas(): ArraySchema<string> {
        return this.state.ordenSillasFisicas;
    }

    public getTotalNpc(): number {
        let total = 0;
        this.state.jugadores.forEach((j: Jugador) => {
            if (j.estaVivo && j.esNpc) total++;
        });
        return total;
    }

    public getTotalJugadoresMuertos(): number {
        let total = 0;
        this.state.jugadores.forEach((j: Jugador) => {
            if (!j.estaVivo && !j.esNpc) total++;
        });
        return total;
    }

    public getTotalJugadoresVivos(): number {
        let total = 0;
        this.state.jugadores.forEach((j: Jugador) => {
            if (j.estaVivo) total++;
        });
        return total;
    }

    public renegadoEstaVivo(): boolean {
        let vivo = false;
        this.state.jugadores.forEach((j: Jugador) => {
            if (j.estaVivo && j.rol === "Renegado") vivo = true;
        });
        return vivo;
    }

    public obtenerIPersonaje(personaje: string): IPersonaje | null {
        return this.gestorPersonajes.obtener(personaje);
    }

    private mezclar<T>(lista: T[]): T[] {
        const copia = [...lista];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = copia[i];
            copia[i] = copia[j];
            copia[j] = temp;
        }
        return copia;
    }
}