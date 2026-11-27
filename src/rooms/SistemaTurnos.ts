import type { ClienteJuego, IMyRoom } from "./IMyRoom.js";
import type { Carta, Jugador } from "./schema/MyRoomState.js";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { GestorNPC } from "./GestorNPC.js";
import { Utilidades } from "./Utilidades.js";

interface FaseInicioTurno {
    nombre: string;
    ejecutar: (idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void) => boolean;
}

export class SistemaTurnos {
    private readonly fasesInicioTurno: FaseInicioTurno[];

    constructor(private sala: IMyRoom) {
        this.fasesInicioTurno = [
            { nombre: "Embrujo", ejecutar: (id, j, idx, next) => this.faseEmbrujo(id, j, idx, next) },
            { nombre: "MiniDinamita", ejecutar: (id, j, idx, next) => this.faseMiniDinamita(id, j, idx, next) },
            { nombre: "Dinamita", ejecutar: (id, j, idx, next) => this.faseDinamita(id, j, idx, next) },
            { nombre: "Papapum", ejecutar: (id, j, idx, next) => this.fasePapapum(id, j, idx, next) },
            { nombre: "Crisalida", ejecutar: (id, j, idx, next) => this.faseCrisalida(id, j, idx, next) },
            { nombre: "Prision", ejecutar: (id, j, idx, next) => this.fasePrision(id, j, idx, next) },
            { nombre: "InicioEfectivo", ejecutar: (id, j) => this.faseInicioEfectivo(id, j) }
        ];
    }

    // =========================================================================
    // 1. PASAR Y AVANZAR TURNO
    // =========================================================================

    public procesarPasarTurno(client: ClienteJuego): void {
        if (
            this.sala.state.estadoJuego !== "Jugando" ||
            this.sala.state.turnoActual !== client.sessionId ||
            this.sala.juegoPausado()
        ) {
            return;
        }

        const jugadorActual = this.sala.state.jugadores.get(client.sessionId);
        if (!jugadorActual) return;

        if (Utilidades.esControladoPorIA(jugadorActual) && !client.esClienteNpc) {
            return;
        }

        if (!jugadorActual.estaVivo) {
            jugadorActual.mano.clear();
            jugadorActual.yaJugoFantasma = false;
            this.avanzarAlSiguienteTurno(client.sessionId);
            return;
        }

        const modificacion = this.sala.motorEventos.sumar(
            jugadorActual,
            "modificarCartasEnManoAlPasarTurno",
            jugadorActual
        );
        const limiteMano = Math.max(0, jugadorActual.vidas + modificacion);

        if (jugadorActual.mano.length > limiteMano) {
            const excedente = jugadorActual.mano.length - limiteMano;
            this.sala.enviarAlerta(
                client.sessionId,
                `Tenés demasiadas cartas. Descartá ${excedente} para pasar el turno.`
            );
            return;
        }

        // Snapshot para Subaru antes de efectos de fin de turno (Fuego, Tocxic, BANG! de Bolt)
        this.sala.sistemaTiempo.capturarPuntoDeRetorno();

        this.ejecutarAccionesAlPasarTurno(jugadorActual);
        this.programarAvanceDeTurno(client.sessionId);
    }

    public programarAvanceDeTurno(idJugador: string): void {
        if (this.sala.state.estadoJuego !== "Jugando") return;
        // Si el jugador era un NPC y murió durante sus efectos de fin de turno, evaluarMuerte ya avanzó el turno
        if (this.sala.state.turnoActual !== idJugador) return;

        if (this.sala.juegoPausado()) {
            this.sala.sistemaInteracciones.alVaciarCola(() => {
                if (this.sala.state.estadoJuego !== "Jugando") return;
                if (this.sala.state.turnoActual === idJugador) {
                    this.avanzarAlSiguienteTurno(idJugador);
                }
            });
            return;
        }

        this.avanzarAlSiguienteTurno(idJugador);
    }

    public avanzarAlSiguienteTurno(idJugadorActual: string): void {
        if (this.sala.state.estadoJuego !== "Jugando") return;

        const idsJugadores =
            this.sala.state.ordenTurnos.length > 0
                ? Array.from(this.sala.state.ordenTurnos)
                : Array.from(this.sala.state.jugadores.keys());

        if (idsJugadores.length === 0) return;

        let idxActual = idsJugadores.indexOf(idJugadorActual);
        if (idxActual === -1) idxActual = 0;

        let siguienteIdx = (idxActual + 1) % idsJugadores.length;
        let iteradorId = idsJugadores[siguienteIdx];
        let jugadorSiguiente = this.sala.state.jugadores.get(iteradorId);
        let vueltas = 0;

        while (vueltas < idsJugadores.length) {
            if (jugadorSiguiente && !jugadorSiguiente.estaDesconectado) {
                if (!jugadorSiguiente.estaVivo && jugadorSiguiente.estaMuertoFalso) {
                    this.procesarConteoKazuma(jugadorSiguiente);
                    break;
                }
                if (jugadorSiguiente.estaVivo) {
                    this.expirarEscudos(jugadorSiguiente);
                }
                break;
            }

            siguienteIdx = (siguienteIdx + 1) % idsJugadores.length;
            iteradorId = idsJugadores[siguienteIdx];
            jugadorSiguiente = this.sala.state.jugadores.get(iteradorId);
            vueltas++;
        }

        if (vueltas >= idsJugadores.length || !jugadorSiguiente) {
            this.sala.state.turnoActual = "";
            return;
        }

        this.sala.state.turnoActual = iteradorId;
        jugadorSiguiente.yaDisparo = false;
        this.ejecutarFasesDesde(iteradorId, 0);
    }

    public reanudarFaseDesde(idJugador: string, indiceInicial: number): void {
        this.ejecutarFasesDesde(idJugador, indiceInicial);
    }

    public obtenerSiguienteJugadorVivo(idActual: string): { id: string; jugador: Jugador | null } {
        const idsJugadores =
            this.sala.state.ordenTurnos.length > 0
                ? Array.from(this.sala.state.ordenTurnos)
                : Array.from(this.sala.state.jugadores.keys());

        if (idsJugadores.length === 0) return { id: "", jugador: null };

        const indiceActual = idsJugadores.indexOf(idActual);
        let siguienteIndice = (indiceActual + 1) % idsJugadores.length;
        let vueltas = 0;

        while (vueltas < idsJugadores.length) {
            const siguienteId = idsJugadores[siguienteIndice];
            const jugadorSiguiente = this.sala.state.jugadores.get(siguienteId);
            if (jugadorSiguiente && jugadorSiguiente.estaVivo) {
                return { id: siguienteId, jugador: jugadorSiguiente };
            }
            siguienteIndice = (siguienteIndice + 1) % idsJugadores.length;
            vueltas++;
        }

        return { id: "", jugador: null };
    }

    public obtenerSiguienteJugadorVivoSinEquipamiento(
        idActual: string,
        hueco: string
    ): { id: string; jugador: Jugador | null } {
        const idsJugadores =
            this.sala.state.ordenTurnos.length > 0
                ? Array.from(this.sala.state.ordenTurnos)
                : Array.from(this.sala.state.jugadores.keys());

        if (idsJugadores.length === 0) return { id: "", jugador: null };

        const indiceActual = idsJugadores.indexOf(idActual);
        let siguienteIndice = (indiceActual + 1) % idsJugadores.length;
        let vueltas = 0;

        while (vueltas < idsJugadores.length) {
            const siguienteId = idsJugadores[siguienteIndice];
            const jugadorSiguiente = this.sala.state.jugadores.get(siguienteId);
            if (jugadorSiguiente && jugadorSiguiente.estaVivo && !jugadorSiguiente.equipamiento.has(hueco)) {
                return { id: siguienteId, jugador: jugadorSiguiente };
            }
            siguienteIndice = (siguienteIndice + 1) % idsJugadores.length;
            vueltas++;
        }

        return this.obtenerSiguienteJugadorVivo(idActual);
    }

    // =========================================================================
    // 2. PIPELINE SECUENCIAL DE INICIO DE TURNO
    // =========================================================================

    private ejecutarFasesDesde(idJugador: string, indiceInicial: number): void {
        if (this.sala.state.estadoJuego !== "Jugando") return;

        for (let i = indiceInicial; i < this.fasesInicioTurno.length; i++) {
            const jugador = this.sala.state.jugadores.get(idJugador);
            if (!jugador) return;

            const fase = this.fasesInicioTurno[i];
            const pauso = fase.ejecutar(idJugador, jugador, i, () => {
                this.ejecutarFasesDesde(idJugador, i + 1);
            });

            if (pauso) return;
        }
    }

    private faseEmbrujo(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || jugador.embrujos.length === 0) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        this.sala.agregarRegistro(
            `👻 ¡${jugador.nombre} siente una presencia! La ruleta del Embrujo gira...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "Embrujo",
            probabilidadBase: 0,
            esEmbrujo: true,
            permiteModificadoresSuerte: false,
            onResultado: (_exito: boolean, tipoResultado: string) => {
                jugador.embrujos.clear();
                this.resolverConsecuenciaEmbrujo(jugador, tipoResultado);
                this.sala.motorEventos.disparar(jugador, "onSacarEmbrujoEnRuleta", jugador, tipoResultado);

                if (jugador.estaVivo) continuar();
                else this.programarAvanceDeTurno(idJugador);
            }
        });
        return true;
    }

    private faseMiniDinamita(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || !jugador.equipamiento.has("miniDinamita")) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        const cartaMini = jugador.equipamiento.get("miniDinamita")!;
        const esPro = cartaMini.nombre === "Mini dinamita Pro";

        this.sala.agregarRegistro(
            `🧨 ¡La ${cartaMini.nombre} chisporrotea frente a ${Utilidades.obtenerNombreVisual(jugador)}! Debe desenfundar...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "MiniDinamita",
            probabilidadBase: esPro ? 12 : 13,
            spriteRojo: "ruletaExplosion",
            textoExito: "¡A SALVO!",
            textoFallo: "¡BOOM!",
            onResultado: (exito: boolean) => {
                const carta = Utilidades.quitarEquipamiento(jugador, "miniDinamita");

                if (!exito) {
                    this.sala.agregarRegistro(
                        `💥 ¡BOOM! La ${cartaMini.nombre} explotó encima de ${jugador.nombre}.`
                    );
                    this.sala.reproducirSfx("explosion");
                    const dano = esPro ? 2 : 1;
                    this.sala.sistemaCombate.procesarDano(jugador, null, dano, "MINI_DINAMITA", {
                        cartaOrigen: carta
                    });
                    if (carta) this.sala.agregarAlDescarte(carta);

                    if (jugador.estaVivo) continuar();
                    else this.programarAvanceDeTurno(idJugador);
                } else {
                    const siguiente = this.obtenerSiguienteJugadorVivoSinEquipamiento(idJugador, "miniDinamita");
                    if (siguiente.jugador && carta) {
                        Utilidades.equiparCarta(this.sala, siguiente.jugador, carta, "miniDinamita");
                        this.sala.agregarRegistro(
                            `💨 ¡Uf! Salió Verde. La ${carta.nombre} pasa a ${Utilidades.obtenerNombreVisual(siguiente.jugador)}.`
                        );
                    }
                    continuar();
                }
            }
        });
        return true;
    }

    private faseDinamita(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || !jugador.equipamiento.has("dinamita")) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        const cartaDinamita = jugador.equipamiento.get("dinamita")!;
        const esPro = cartaDinamita.nombre === "Dinamita Pro";

        this.sala.agregarRegistro(
            `🧨 ¡La Dinamita arde frente a ${Utilidades.obtenerNombreVisual(jugador)}! Debe desenfundar...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "Dinamita",
            probabilidadBase: esPro ? 13 : 14,
            spriteRojo: "ruletaExplosion",
            textoExito: "¡A SALVO!",
            textoFallo: "¡BOOM!",
            onResultado: (exito: boolean) => {
                const carta = Utilidades.quitarEquipamiento(jugador, "dinamita");

                if (!exito) {
                    this.sala.agregarRegistro(
                        `💥 ¡BOOOOOOM! Salió Rojo. La dinamita explotó en la cara de ${jugador.nombre}.`
                    );
                    this.sala.reproducirSfx("explosion");
                    const dano = esPro ? 5 : 3;
                    this.sala.sistemaCombate.procesarDano(jugador, null, dano, "DINAMITA", {
                        cartaOrigen: carta
                    });
                    if (carta) this.sala.agregarAlDescarte(carta);

                    if (jugador.estaVivo) continuar();
                    else this.programarAvanceDeTurno(idJugador);
                } else {
                    const siguiente = this.obtenerSiguienteJugadorVivoSinEquipamiento(idJugador, "dinamita");
                    if (siguiente.jugador && carta) {
                        Utilidades.equiparCarta(this.sala, siguiente.jugador, carta, "dinamita");
                        this.sala.agregarRegistro(
                            `💨 ¡Uf! Salió Verde. La Dinamita pasa a ${Utilidades.obtenerNombreVisual(siguiente.jugador)}.`
                        );
                    }
                    continuar();
                }
            }
        });
        return true;
    }

    private fasePapapum(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || !jugador.equipamiento.has("papa")) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        const cartaPapa = jugador.equipamiento.get("papa")!;
        const esPrimitiva = cartaPapa.nombre === "Papapum primitiva";
        const probActual = cartaPapa.number.get("probabilidadPapa") ?? 1;

        this.sala.agregarRegistro(
            `🥔 ¡${cartaPapa.nombre} quema en las manos de ${Utilidades.obtenerNombreVisual(jugador)}! Debe desenfundar...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "Papa",
            probabilidadBase: Math.max(1, 16 - probActual),
            spriteRojo: "ruletaExplosion",
            textoExito: "¡A SALVO!",
            textoFallo: "¡BOOM!",
            onResultado: (exito: boolean) => {
                if (!exito) {
                    this.sala.agregarRegistro(
                        `💥 ¡PAPA PAPA PAPAPUM, BOOOM! ${cartaPapa.nombre} explotó encima de ${jugador.nombre}.`
                    );
                    this.sala.reproducirSfx("explosion");

                    const removida = Utilidades.quitarEquipamiento(jugador, "papa");
                    if (removida) {
                        removida.number.set("probabilidadPapa", 1);
                        this.sala.agregarAlDescarte(removida);
                    }

                    const dano = esPrimitiva ? 3 : 2;
                    this.sala.sistemaCombate.procesarDano(jugador, null, dano, "PAPA", {
                        cartaOrigen: removida
                    });

                    if (jugador.estaVivo) continuar();
                    else this.programarAvanceDeTurno(idJugador);
                } else {
                    const incremento = esPrimitiva ? 3 : 2;
                    const nuevaProb = Math.min(15, probActual + incremento);
                    cartaPapa.number.set("probabilidadPapa", nuevaProb);
                    this.sala.agregarRegistro(
                        `💨 ¡Salió Verde! ${cartaPapa.nombre} no explotó, pero su probabilidad aumentó a ${nuevaProb}/16.`
                    );
                    continuar();
                }
            }
        });
        return true;
    }

    private faseCrisalida(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || !jugador.equipamiento.has("crisalida")) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        this.sala.agregarRegistro(
            `🐚 ¡${Utilidades.obtenerNombreVisual(jugador)} está en una crisálida! Debe desenfundar...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "Crisalida",
            probabilidadBase: 9,
            onResultado: (exito: boolean) => {
                const crisalida = Utilidades.quitarEquipamiento(jugador, "crisalida");
                if (crisalida) this.sala.agregarAlDescarte(crisalida);

                if (exito) {
                    this.sala.agregarRegistro(
                        `❤️ ¡Salió Verde! ${Utilidades.obtenerNombreVisual(jugador)} escapó de la crisálida.`
                    );
                    continuar();
                } else {
                    this.sala.agregarRegistro(
                        `🐚 ¡Salió Rojo! ${Utilidades.obtenerNombreVisual(jugador)} se queda encerrado.`
                    );
                    const prision = Utilidades.quitarEquipamiento(jugador, "prision");
                    if (prision) this.sala.agregarAlDescarte(prision);

                    this.ejecutarAccionesAlPasarTurno(jugador);
                    this.programarAvanceDeTurno(idJugador);
                }
            }
        });
        return true;
    }

    private fasePrision(idJugador: string, jugador: Jugador, indiceFase: number, continuar: () => void): boolean {
        if (!jugador.estaVivo || !jugador.equipamiento.has("prision")) return false;

        this.sala.sistemaTiempo.capturarPuntoDeRetorno({ idJugador, indiceFase });

        this.sala.agregarRegistro(
            `⚖️ ¡${Utilidades.obtenerNombreVisual(jugador)} está en Prisión! Debe desenfundar...`
        );

        this.sala.sistemaRuleta.solicitar({
            idJugador,
            motivo: "Prision",
            probabilidadBase: 6,
            onResultado: (exito: boolean) => {
                const prision = Utilidades.quitarEquipamiento(jugador, "prision");
                if (prision) this.sala.agregarAlDescarte(prision);

                if (exito) {
                    this.sala.agregarRegistro(
                        `❤️ ¡Salió Verde! ${Utilidades.obtenerNombreVisual(jugador)} escapó de la cárcel.`
                    );
                    continuar();
                } else {
                    this.sala.agregarRegistro(
                        `⛓️ ¡Salió Rojo! ${Utilidades.obtenerNombreVisual(jugador)} se queda encerrado.`
                    );
                    this.ejecutarAccionesAlPasarTurno(jugador);
                    this.programarAvanceDeTurno(idJugador);
                }
            }
        });
        return true;
    }

    private faseInicioEfectivo(_idJugador: string, jugador: Jugador): boolean {
        if (!jugador.estaVivo) {
            jugador.yaJugoFantasma = false;
            for (let i = 0; i < 2; i++) {
                const cartaFantasma = CatalogoCartasEspeciales.crearCartaFantasmaAleatoria();
                if (cartaFantasma) jugador.mano.push(cartaFantasma);
            }
            this.sala.agregarRegistro(
                `👻 ¡Es el turno del espíritu de ${Utilidades.obtenerNombreVisual(jugador)}!`
            );
            return false;
        }

        this.iniciarTurnoEfectivo(jugador);
        this.sala.agregarRegistro(`¡Es el turno de ${Utilidades.obtenerNombreVisual(jugador)}!`);
        return false;
    }

    // =========================================================================
    // 3. ACCIONES DE INICIO Y FIN DE TURNO
    // =========================================================================

    public iniciarTurnoEfectivo(jugador: Jugador): void {
        this.sala.motorEventos.disparar(jugador, "onIniciarTurno", jugador);
        this.sala.repartirCartas(jugador, 2, "turno");

        // Snapshot limpio al comenzar la fase activa del turno
        this.sala.sistemaTiempo.capturarPuntoDeRetorno();

        if (jugador.estaVivo && Utilidades.esControladoPorIA(jugador)) {
            const idIa = Utilidades.obtenerSessionIdDeJugador(this.sala, jugador);
            if (idIa) {
                GestorNPC.iniciarTurnoNpc(this.sala, idIa);
            }
        }
    }

    public ejecutarAccionesAlPasarTurno(jugador: Jugador): void {
        // Limpiamos hackeos de Sombra en las cartas del jugador al finalizar su turno
        for (const carta of jugador.mano) {
            if (carta.estaHackeada) {
                carta.estaHackeada = false;
            }
        }

        this.sala.motorEventos.disparar(jugador, "onPasarTurno", jugador);

        if (jugador.estaVivo && jugador.efecto.has("fuego")) {
            this.sala.sistemaCombate.procesarDano(jugador, null, 1, "efecto");
            this.sala.agregarRegistro(
                `🔥 ¡${Utilidades.obtenerNombreVisual(jugador)} se incendia y recibe 1 de daño!`
            );
            this.sala.reproducirSfx("sfxFuegoActivado");
        }

        if (jugador.estaVivo && (jugador.efecto.get("tocxic") ?? 0) >= 3) {
            this.sala.sistemaCombate.procesarDano(jugador, null, 1, "efecto");
            this.sala.agregarRegistro(
                `☣️ ¡${Utilidades.obtenerNombreVisual(jugador)} recibe 1 de daño por su efecto tocxic!`
            );
        }

        if (jugador.estaVivo && jugador.efecto.has("inmortalidad")) {
            Utilidades.restarEfecto(jugador, "inmortalidad", 1);
            if (!jugador.efecto.has("inmortalidad")) {
                jugador.vidas = 0;
                this.sala.evaluarMuerte(jugador, null, true, "INMORTALIDAD");
            }
        }

        Utilidades.restarEfecto(jugador, "malestar", 1);
        Utilidades.restarEfecto(jugador, "tocxic", 1);
        Utilidades.restarEfecto(jugador, "gravitacional", 1);
        Utilidades.restarEfecto(jugador, "fuego", 1);
        Utilidades.restarEfecto(jugador, "bloqueado", 1);
    }

    // =========================================================================
    // 4. HELPERS PRIVADOS
    // =========================================================================

    private procesarConteoKazuma(jugador: Jugador): void {
        jugador.rondasMuerto--;
        if (jugador.rondasMuerto > 0) return;

        jugador.estaMuertoFalso = false;
        jugador.estaVivo = true;
        jugador.vidas = 1;
        this.sala.repartirCartas(jugador, 1, "pasiva");
        this.sala.agregarRegistro(`⚡ ¡KAZUMA HA RESUCITADO DE ENTRE LOS MUERTOS!`);
        this.sala.reproducirSfx({ sfx: "kazumaRevive", silencio: true });
        jugador.spriteAvatarOpcional = "Kazuma blanco";
        jugador.beneficiarseDeSuMuerte = false;
        this.sala.gestorMusica.actualizarAutomatica();
    }

    private expirarEscudos(jugador: Jugador): void {
        if (!jugador.turnosEscudos || jugador.turnosEscudos.length === 0) return;

        for (let i = 0; i < jugador.turnosEscudos.length; i++) {
            jugador.turnosEscudos[i]--;
        }

        const restantes = jugador.turnosEscudos.filter((t: number) => t > 0);
        const perdidos = jugador.turnosEscudos.length - restantes.length;
        jugador.turnosEscudos = restantes;

        if (perdidos > 0) {
            jugador.vidasEscudo = Math.max(0, jugador.vidasEscudo - perdidos);
            const texto = perdidos > 1 ? `${perdidos} Escudos` : "un Escudo";
            this.sala.agregarRegistro(
                `⏳ El efecto de ${texto} de ${jugador.nombre} se ha desvanecido.`
            );
        }
    }

    private resolverConsecuenciaEmbrujo(victima: Jugador, tipo: string): void {
        const nombre = Utilidades.obtenerNombreVisual(victima);

        if (tipo === "dano") {
            this.sala.agregarRegistro(`👻 ¡El embrujo hirió a ${nombre}! Pierde 1 vida.`);
            this.sala.sistemaCombate.procesarDano(victima, null, 1, "EMBRUJO", { ignoraEscudo: true });
            this.sala.reproducirSfx("sfxEmbrujoMalo");
        } else if (tipo === "curar") {
            if (Utilidades.puedeRecibirCuracion(this.sala, victima)) {
                Utilidades.aplicarCuracion(this.sala, victima, 1, "EMBRUJO", true);
                this.sala.agregarRegistro(`👻 ¡El embrujo sanó a ${nombre}!`);
            } else {
                this.sala.agregarRegistro(`👻 El embrujo intentó sanar a ${nombre}, pero no pudo.`);
            }
            this.sala.reproducirSfx("sfxEmbrujoBueno");
        } else if (tipo === "robar") {
            this.sala.repartirCartas(victima, 1, "embrujo");
            this.sala.agregarRegistro(`👻 ¡El embrujo le dio una carta extra a ${nombre}!`);
            this.sala.reproducirSfx("sfxEmbrujoBueno");
        } else if (tipo === "descartar") {
            const carta = Utilidades.descartarCartaAleatoriaDeLaMano(victima);
            if (carta) {
                this.sala.descartarCarta(carta, victima, "EMBRUJO");
                this.sala.agregarRegistro(`👻 ¡El embrujo descartó una carta de ${nombre}!`);
            } else {
                this.sala.agregarRegistro(`👻 El embrujo falló, la mano de ${nombre} estaba vacía.`);
            }
            this.sala.reproducirSfx("sfxEmbrujoMalo");
        } else if (tipo === "comilon") {
            const devorada = Utilidades.descartarEquipamientoAleatorio(this.sala, victima);
            if (devorada) {
                this.sala.agregarRegistro(
                    `👻 ¡El embrujo devoró un equipamiento (${devorada.nombre}) de ${nombre}!`
                );
            } else {
                this.sala.agregarRegistro(`👻 El embrujo falló, ${nombre} no tenía ningún equipamiento.`);
            }
            this.sala.reproducirSfx("sfxEmbrujoMalo");
        } else if (tipo === "libro") {
            const mejora = Utilidades.mejorarEquipamientoAleatorio(this.sala, victima);
            if (mejora !== "") {
                this.sala.agregarRegistro(`👻 ¡El embrujo afecta a ${nombre} y mejora ${mejora}!`);
            } else {
                this.sala.agregarRegistro(
                    `👻 El embrujo falló, ${nombre} no tenía ningún equipamiento que se pueda mejorar.`
                );
            }
            this.sala.reproducirSfx("sfxEmbrujoBueno");
        } else {
            this.sala.agregarRegistro(`💨 ¡${nombre} tuvo suerte y se salvó del embrujo!`);
        }
    }
}