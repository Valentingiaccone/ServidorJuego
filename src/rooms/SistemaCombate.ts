import type { Carta, Jugador } from "./schema/MyRoomState.js";
import type { ClienteJuego, ContextoDano, IMyRoom } from "./IMyRoom.js";
import { Utilidades } from "./Utilidades.js";

export interface DatosArma {
    nombre: string;
    alcance: number;
    danoExtra: number;
    alcanceMinimo: number;
}

export interface OpcionesDano {
    ignoraEscudo?: boolean;
    cartaOrigen?: Carta | null;
}

export interface OpcionesAtaqueBang {
    victima: Jugador;
    atacante: Jugador;
    danoBase: number;
    causa: string;
    flecha: string;
    cartaOrigen?: Carta | null;
    tituloPersonalizado?: string;
    alFrente?: boolean;
    ejecutarInmediatamente?: boolean;
}

export class SistemaCombate {
    constructor(private sala: IMyRoom) {}

    // =========================================================================
    // 1. ARMAS, DISTANCIAS Y OBJETIVOS VÁLIDOS (ÚNICA FUENTE DE VERDAD)
    // =========================================================================

    public getDatosArma(jugador: Jugador): DatosArma {
        const arma = jugador.equipamiento.get("arma");
        if (!arma) {
            return { nombre: "Colt .45", alcance: 1, danoExtra: 0, alcanceMinimo: 0 };
        }

        // Formato esperado: "equipar_arma_alcance_danoExtra_alcanceMinimo"
        const partes = arma.efecto.split("_");
        return {
            nombre: arma.nombre,
            alcance: parseInt(partes[2], 10) || 1,
            danoExtra: parseInt(partes[3], 10) || 0,
            alcanceMinimo: parseInt(partes[4], 10) || 0
        };
    }

    public calcularDistanciaFisica(idAtacante: string, idVictima: string): number {
        const vivos: string[] = [];
        this.sala.state.ordenSillasFisicas.forEach((id: string) => {
            const j = this.sala.state.jugadores.get(id);
            if (j && j.estaVivo) vivos.push(id);
        });

        const idxAtacante = vivos.indexOf(idAtacante);
        const idxVictima = vivos.indexOf(idVictima);
        if (idxAtacante === -1 || idxVictima === -1) return 999;

        const n = vivos.length;
        const diferencia = Math.abs(idxAtacante - idxVictima);
        return Math.min(diferencia, n - diferencia);
    }

    public calcularDistancia(atacante: Jugador, victima: Jugador, carta?: Carta | null): number {
        const idAtacante = Utilidades.obtenerSessionIdDeJugador(this.sala, atacante);
        const idVictima = Utilidades.obtenerSessionIdDeJugador(this.sala, victima);
        const distanciaFisica = this.calcularDistanciaFisica(idAtacante, idVictima);
        if (distanciaFisica >= 999) return 999;

        const definicion = carta ? this.sala.sistemaCartas.obtener(carta.nombre) : null;
        const regla = definicion?.reglaObjetivo;

        if (regla && regla.respetaModificadoresDistancia === false) {
            return distanciaFisica;
        }

        let distancia = distanciaFisica;

        // Modificadores base en el estado del jugador
        if (atacante.modificarAlcance) distancia -= atacante.modificarAlcance;
        if (victima.modificarDistancia) distancia += victima.modificarDistancia;

        // Bonus de alcance propio de la carta (ej. un BANG! con +1 alcance)
        if (regla?.bonusAlcanceCarta) {
            distancia -= regla.bonusAlcanceCarta;
        }

        // Hooks dinámicos de personajes (incluyendo Maya, Volpina, Haley, Pedro, JetpackCat, Tirachinas) y cartas (Mira, Caballo, Anillo Iridio, Triboulet)
        distancia -= this.sala.motorEventos.sumar(atacante, "modificarAlcanceAtacante", atacante, victima, carta ?? null);
        distancia += this.sala.motorEventos.sumar(victima, "modificarDistanciaDefensiva", atacante, victima, carta ?? null);

        return Math.max(0, distancia);
    }

    public puedeDispararBang(atacante: Jugador, victima: Jugador, carta?: Carta | null): boolean {
        if (!atacante.yaDisparo) return true;
        return this.sala.motorEventos.alguno(atacante, "puedeDispararBang", atacante, victima, carta ?? null);
    }

    /**
     * Valida si `victima` es un objetivo legal para `carta` jugada por `atacante`.
     * Devuelve `null` si es válido, o el mensaje de error exacto para mostrar al jugador.
     */
    public validarObjetivo(atacante: Jugador, victima: Jugador, carta: Carta): string | null {
        if (!victima || !victima.estaVivo) {
            return "Objetivo inválido o ya está eliminado.";
        }

        const definicion = this.sala.sistemaCartas.obtener(carta.nombre);
        if (!definicion) return "Carta no reconocida.";

        const regla = definicion.reglaObjetivo;
        if (regla.tipo !== "jugador") {
            return "Esta carta no requiere un objetivo.";
        }

        if (atacante === victima && !regla.puedeAutoObjetivo) {
            return "No podés elegirte a vos mismo para esta carta.";
        }

        const statsArma = this.getDatosArma(atacante);
        const distancia = this.calcularDistancia(atacante, victima, carta);

        // El alcance mínimo (ej. Mortero) evalúa la distancia real (Caballo, Jetpack, Monoaldea, etc.)
        if (regla.usaAlcanceMinimoArma && distancia < statsArma.alcanceMinimo) {
            return "El arma está diseñada para largo alcance. No podés dispararle a alguien tan cerca.";
        }

        const alcance = regla.alcance ?? "global";
        if (alcance === "vecino") {
            if (distancia > 1) {
                return "Esta carta solo funciona con vecinos.";
            }
        } else if (alcance === "arma") {
            if (distancia > statsArma.alcance) {
                return `${Utilidades.obtenerNombreVisual(victima)} está fuera de tu alcance.`;
            }
        }

        if (regla.validarObjetivo) {
            return regla.validarObjetivo(this.sala, atacante, victima, carta);
        }

        return null;
    }

    /**
     * Devuelve todos los sessionId válidos para iluminar en Cocos o elegir en GestorNPC.
     */
    public obtenerObjetivosValidos(idAtacante: string, carta: Carta): string[] {
        const atacante = this.sala.state.jugadores.get(idAtacante);
        if (!atacante) return [];

        const validos: string[] = [];
        this.sala.state.jugadores.forEach((candidato: Jugador, idCandidato: string) => {
            if (this.validarObjetivo(atacante, candidato, carta) === null) {
                validos.push(idCandidato);
            }
        });

        return validos;
    }

    /**
     * Si algún rival vivo tiene efecto gravitacional, redirige el objetivo hacia el primero en orden horario.
     */
    public resolverObjetivoConGravedad(jugadorQueJuega: Jugador, objetivoOriginal: Jugador): Jugador {
        const listaOrdenada = Utilidades.obtenerJugadoresEnOrdenHorario(this.sala, jugadorQueJuega, true);
        for (const candidato of listaOrdenada) {
            if (candidato !== jugadorQueJuega && candidato.efecto.has("gravitacional")) {
                return candidato;
            }
        }
        return objetivoOriginal;
    }

    // =========================================================================
    // 2. PIPELINE DE DAÑO (CON ContextoDano Y CARTA ORIGEN)
    // =========================================================================

    public procesarDano(
        victima: Jugador,
        atacante: Jugador | null,
        cantidad: number,
        causa: string,
        opciones: OpcionesDano = {}
    ): ContextoDano {
        const ctx: ContextoDano = {
            victima,
            atacante,
            cantidad,
            causa,
            cartaOrigen: opciones.cartaOrigen ?? null,
            ignoraEscudo: opciones.ignoraEscudo ?? false,
            cancelado: false,
            danoCuerpo: 0,
            danoEscudo: 0
        };

        if (!victima || !victima.estaVivo) {
            ctx.cancelado = true;
            return ctx;
        }

        console.log(
            "Procesar daño:",
            Utilidades.obtenerNombreVisual(victima),
            atacante ? Utilidades.obtenerNombreVisual(atacante) : "NINGUNO",
            ctx.cantidad,
            ctx.causa,
            ctx.ignoraEscudo
        );

        // --- FASE 1: INTERCEPTORES Y CANCELADORES ---
        // (Calabaza, Crisálida, Anillo de Inmunidad, Mercy en modo curación, etc.)
        this.sala.motorEventos.disparar(victima, "onInterceptarDanoEntrante", ctx);
        if (ctx.cancelado) return ctx;

        if (ctx.atacante) {
            this.sala.motorEventos.disparar(ctx.atacante, "onInterceptarDanoSaliente", ctx);
            if (ctx.cancelado) return ctx;
        }

        // --- FASE 2: MODIFICADORES DE DAÑO Y PERFORACIÓN DE ESCUDO ---
        if (ctx.atacante) {
            const traspasaPorHook = this.sala.motorEventos.alguno(ctx.atacante, "modificarTraspasarEscudo", ctx);
            ctx.ignoraEscudo = ctx.ignoraEscudo || traspasaPorHook;

            ctx.cantidad += this.sala.motorEventos.sumar(ctx.atacante, "modificarDanoAtacante", ctx);

            if (ctx.atacante.boolean.get("leon_oculto")) {
                ctx.cantidad = 0;
            }
        }

        // Efecto Inmortalidad reduce todo daño a 0
        const inmortalidad = victima.efecto.get("inmortalidad") ?? 0;
        if (inmortalidad > 0) {
            ctx.cantidad = 0;
        }

        ctx.cantidad = Math.max(0, ctx.cantidad);

        // --- FASE 3: APLICACIÓN A ESCUDOS Y SALUD ---
        let danoRestante = ctx.cantidad;

        if (!ctx.ignoraEscudo && victima.turnosEscudos) {
            while (danoRestante > 0 && victima.turnosEscudos.length > 0) {
                victima.turnosEscudos.shift();
                victima.vidasEscudo = Math.max(0, victima.vidasEscudo - 1);
                ctx.danoEscudo++;
                danoRestante--;
            }
        }

        ctx.danoCuerpo = danoRestante;
        if (ctx.danoCuerpo > 0) {
            victima.vidas -= ctx.danoCuerpo;
        }

        // --- FASE 4: REACCIONES POST-IMPACTO ---
        // Efecto propio de la carta que impactó (ej. Órbita BANG! aplica gravitacional aunque haga 0 de daño)
        if (ctx.cartaOrigen) {
            const defCarta = this.sala.sistemaCartas.obtener(ctx.cartaOrigen.nombre);
            if (defCarta?.onImpacto) {
                defCarta.onImpacto(this.sala, ctx);
            }
        }

        if (ctx.cantidad > 0) {
            this.sala.motorEventos.disparar(victima, "onRecibirDano", ctx);
            if (ctx.atacante) {
                this.sala.motorEventos.disparar(ctx.atacante, "onGolpear", ctx);
            }
        }

        Utilidades.restarEfecto(victima, "gravitacional", 1);

        const danoTotalEfectivo = ctx.danoCuerpo + ctx.danoEscudo;
        if (danoTotalEfectivo > 0) {
            if (ctx.atacante) {
                Utilidades.agregarEstadistica(ctx.atacante, danoTotalEfectivo, "🔫daño");
            }
            Utilidades.agregarEstadistica(victima, danoTotalEfectivo, "💔daño recibido");
        }

        const idVictima = Utilidades.obtenerSessionIdDeJugador(this.sala, victima);
        if (idVictima) {
            this.sala.animacionJugador(idVictima, "recibirDano");
        }

        this.sala.evaluarMuerte(victima, ctx.atacante, ctx.ignoraEscudo);
        return ctx;
    }

    // =========================================================================
    // 3. INTERACCIÓN DE ATAQUE BANG / TIRATACHUELA AUTOCONTENIDA
    // =========================================================================

    public encolarAtaqueBang(opts: OpcionesAtaqueBang): void {
        const { victima, atacante, danoBase, causa, flecha, cartaOrigen = null } = opts;
        const idVictima = Utilidades.obtenerSessionIdDeJugador(this.sala, victima);
        if (!idVictima || !victima.estaVivo) return;

        const fallosExtra = this.sala.motorEventos.sumar(
            atacante,
            "modificarFallosRequeridos",
            atacante,
            victima,
            cartaOrigen
        );
        const fallosRequeridos = Math.max(1, 1 + fallosExtra);

        // Estado local de este disparo puntual (nunca más se cruza con otros ataques ni queda sucio)
        let usosBarrilRealizados = 0;

        const nombreAtacante = atacante.nombre.toUpperCase();
        const titulo =
            opts.tituloPersonalizado ??
            `¡${nombreAtacante} te está disparando!\nElegí cómo responder:`;
        const textoFallo =
            fallosRequeridos > 1 ? `Usar ${fallosRequeridos} ¡Fallo!` : "Usar ¡Fallo!";

        const encolarPaso = (alFrente: boolean, iniciarAhora: boolean): void => {
            this.sala.sistemaInteracciones.encolarInteraccion(
                {
                    idJugadorObjetivo: idVictima,
                    titulo,
                    temaVisual: "bang",
                    flecha,
                    construirOpciones: () => {
                        const cartasEsquive = victima.mano.filter((c: Carta) =>
                            this.sala.sistemaCartas.puedeEsquivarBang(c)
                        );
                        const puedeEsquivar =
                            victima.puedeUsarFallo &&
                            !victima.boolean.get("frankFallo") &&
                            cartasEsquive.length >= fallosRequeridos;

                        const maxUsosBarril = this.calcularMaxUsosBarril(victima);
                        const tieneBarril = maxUsosBarril > 0 && usosBarrilRealizados < maxUsosBarril;

                        return [
                            { idAccion: "bang_fallo", texto: textoFallo, habilitado: puedeEsquivar, color: "verde" },
                            { idAccion: "bang_barril", texto: "Usar Barril", habilitado: tieneBarril, color: "blanco" },
                            { idAccion: "bang_dano", texto: "Recibir daño", habilitado: true, color: "rojo" }
                        ];
                    },
                    onResponder: (idAccion: string, client: ClienteJuego) => {
                        if (idAccion === "bang_fallo") {
                            this.resolverEsquiveBang(victima, client, fallosRequeridos);
                        } else if (idAccion === "bang_barril") {
                            usosBarrilRealizados++;
                            this.sala.agregarRegistro(
                                `🛢️ ¡${Utilidades.obtenerNombreVisual(victima)} tira de la ruleta del Barril!`
                            );
                            this.sala.sistemaRuleta.solicitar(
                                {
                                    idJugador: idVictima,
                                    motivo: "Barril",
                                    probabilidadBase: 4,
                                    onResultado: (exito: boolean) => {
                                        if (exito) {
                                            this.sala.agregarRegistro(
                                                `❤️ ¡Salió Verde! El Barril salvó a ${victima.nombre}.`
                                            );
                                            this.sala.sistemaInteracciones.procesarSiguiente();
                                        } else {
                                            this.sala.agregarRegistro(
                                                `💥 ¡Salió Rojo! El Barril no aguantó el disparo.`
                                            );
                                            encolarPaso(true, true);
                                        }
                                    }
                                },
                                true
                            );
                        } else if (idAccion === "bang_dano") {
                            this.sala.agregarRegistro(
                                `💥 ¡${Utilidades.obtenerNombreVisual(victima)} recibió el balazo de ${Utilidades.obtenerNombreVisual(atacante)}!`
                            );
                            const numero = Math.floor(Math.random() * 3);
                            this.sala.reproducirSfx("bang" + numero);
                            this.procesarDano(victima, atacante, danoBase, causa, { cartaOrigen });
                        }
                    }
                },
                alFrente,
                iniciarAhora
            );
        };

        encolarPaso(opts.alFrente ?? false, opts.ejecutarInmediatamente ?? false);
    }

    private calcularMaxUsosBarril(victima: Jugador): number {
        let maxUsos = 0;
        const barril = victima.equipamiento.get("barril");
        if (barril) {
            maxUsos += barril.nombre === "Barril Pro" ? 2 : 1;
        }
        if (victima.tieneBarrilPasiva) {
            maxUsos += 1;
        }
        return maxUsos;
    }

    private resolverEsquiveBang(victima: Jugador, client: ClienteJuego, cantidadRequerida: number): void {
        const usadas: Carta[] = [];

        for (let i = 0; i < cantidadRequerida; i++) {
            const idx = victima.mano.findIndex((c: Carta) =>
                this.sala.sistemaCartas.puedeEsquivarBang(c)
            );
            if (idx === -1) break;
            const carta = victima.mano.splice(idx, 1)[0];
            if (carta) usadas.push(carta);
        }

        if (usadas.length === 0) return;

        for (const carta of usadas) {
            this.sala.agregarAlDescarte(carta);
            this.sala.ejecutarAnimacionCarta(client.sessionId, carta);
            this.sala.ejecutarPasivasAlJugarCarta(victima, carta);
            // Permite que cartas de esquive especiales tengan efectos extra (ej. robar una carta al esquivar)
            this.sala.sistemaCartas.alEsquivarBang(this.sala, victima, carta);
        }

        const texto =
            usadas.length > 1
                ? `usó ${usadas.length} ¡Fallo! y esquivó`
                : "usó un ¡Fallo! y esquivó";
        this.sala.agregarRegistro(`🛡️ ¡Uf! ${Utilidades.obtenerNombreVisual(victima)} ${texto} el ataque.`);

        const numero = Math.floor(Math.random() * 2);
        this.sala.reproducirSfx("sfxFallo" + numero);
    }
}