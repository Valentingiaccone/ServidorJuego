import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import type {
    ClienteJuego,
    ContextoDano,
    ContextoJugada,
    IContextoRuleta,
    IMyRoom,
    ReglaObjetivo,
    TipoInmunidad
} from "./IMyRoom.js";
import type { OpcionCartaConfig } from "./SistemaInteracciones.js";
import { Carta, Jugador } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

export interface IDefinicionCarta {
    nombre: string;
    reglaObjetivo: ReglaObjetivo;
    huecoEquipamiento?: string;
    equipamientoEnObjetivo?: boolean;
    manejaEquipamientoManual?: boolean;
    consumoDiferido?: boolean; // true = la carta decide cuándo consumirse (ej. ¡Pánico! al confirmar)
    puedeEsquivarBang?: boolean;
    salvaDeMuerte?: boolean;
    zonaPasiva?: "mano" | "equipamiento" | "ambas";

    cartaParaAnimacion?: (ctx: ContextoJugada) => Carta | null;

    validarJugada?(ctx: ContextoJugada): string | null;
    onJugar?(ctx: ContextoJugada): void;
    onEsquivar?(sala: IMyRoom, victima: Jugador, carta: Carta): void;
    onDescartarPropia?(sala: IMyRoom, jugador: Jugador, carta: Carta, motivo: string): void;
    onImpacto?(sala: IMyRoom, ctx: ContextoDano): void;

    // Hooks pasivos (se ejecutan vía MotorEventos cuando la carta está en su zonaPasiva)
    onEquiparCarta?(sala: IMyRoom, jugador: Jugador, cartaEquipada: Carta, hueco: string, miCarta: Carta): void;
    onJugarCarta?(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta, miCarta: Carta): void;
    onDescartarCarta?(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string, miCarta: Carta): void;
    onIniciarTurno?(sala: IMyRoom, jugador: Jugador, miCarta: Carta): void;
    onPasarTurno?(sala: IMyRoom, jugador: Jugador, miCarta: Carta): void;
    onInterceptarDanoEntrante?(sala: IMyRoom, ctx: ContextoDano, miCarta: Carta): void;
    onRecibirDano?(sala: IMyRoom, ctx: ContextoDano, miCarta: Carta): void;
    onGolpear?(sala: IMyRoom, ctx: ContextoDano, miCarta: Carta): void;
    onMuereOtroPersonaje?(sala: IMyRoom, victimaMuerta: Jugador, asesino: Jugador | null, miJugador: Jugador, miCarta: Carta): void;

    modificarDanoAtacante?(sala: IMyRoom, ctx: ContextoDano, miCarta: Carta): number;
    modificarTraspasarEscudo?(sala: IMyRoom, ctx: ContextoDano, miCarta: Carta): boolean;
    modificarAlcanceAtacante?(sala: IMyRoom, atacante: Jugador, victima: Jugador, cartaUsada: Carta | null, miCarta: Carta): number;
    modificarDistanciaDefensiva?(sala: IMyRoom, atacante: Jugador, victima: Jugador, cartaUsada: Carta | null, miCarta: Carta): number;
    modificarCartasEnManoAlPasarTurno?(sala: IMyRoom, jugador: Jugador, miCarta: Carta): number;
    modificarRepartirCarta?(sala: IMyRoom, jugador: Jugador, causa: string, miCarta: Carta): number;
    modificarRuletaLocal?(sala: IMyRoom, ctx: IContextoRuleta, miCarta: Carta): void;
    puedeDispararBang?(sala: IMyRoom, atacante: Jugador, victima: Jugador, cartaUsada: Carta | null, miCarta: Carta): boolean;
    esInmuneA?(sala: IMyRoom, jugador: Jugador, tipo: TipoInmunidad, miCarta: Carta): boolean;
}

const REGLA_NINGUNO: ReglaObjetivo = { tipo: "ninguno" };
const REGLA_GLOBAL: ReglaObjetivo = { tipo: "jugador", alcance: "global" };
const REGLA_VECINO: ReglaObjetivo = {
    tipo: "jugador",
    alcance: "vecino",
    respetaModificadoresDistancia: false
};
const REGLA_ARMA: ReglaObjetivo = {
    tipo: "jugador",
    alcance: "arma",
    usaAlcanceMinimoArma: true,
    respetaModificadoresDistancia: true
};

export class SistemaCartas {
    private definiciones: Record<string, IDefinicionCarta> = {};

    constructor(private sala: IMyRoom) {
        this.registrarTodas();
    }

    private registrar(def: IDefinicionCarta): void {
        this.definiciones[def.nombre] = def;
    }

    public obtener(nombre: string): IDefinicionCarta | null {
        return this.definiciones[nombre] ?? null;
    }

    public puedeEsquivarBang(carta: Carta): boolean {
        if (carta.estaHackeada) return false;
        return this.obtener(carta.nombre)?.puedeEsquivarBang === true;
    }

    public salvaDeMuerte(carta: Carta): boolean {
        return this.obtener(carta.nombre)?.salvaDeMuerte === true;
    }

    public alEsquivarBang(sala: IMyRoom, victima: Jugador, carta: Carta): void {
        this.obtener(carta.nombre)?.onEsquivar?.(sala, victima, carta);
    }

    public alDescartarCartaPropia(jugador: Jugador, carta: Carta, motivo: string): void {
        this.obtener(carta.nombre)?.onDescartarPropia?.(this.sala, jugador, carta, motivo);
    }

    /**
     * Punto de entrada único para jugar cualquier carta (instantánea, equipamiento o con objetivo).
     * Gestiona automáticamente validaciones, gravedad, consumo de mano, animación y pasivas.
     */
    public jugarCarta(client: ClienteJuego, idCarta: string, idObjetivo?: string): boolean {
        if (
            this.sala.state.estadoJuego !== "Jugando" ||
            this.sala.state.turnoActual !== client.sessionId ||
            this.sala.juegoPausado()
        ) {
            return false;
        }

        const jugador = this.sala.state.jugadores.get(client.sessionId);
        if (!jugador) return false;

        if (Utilidades.esControladoPorIA(jugador) && !client.esClienteNpc) {
            return false;
        }

        if (!jugador.estaVivo && jugador.yaJugoFantasma) {
            this.sala.enviarAlerta(client.sessionId, "Los muertos solo pueden lanzar un maleficio por turno.");
            return false;
        }

        const carta = jugador.mano.find((c: Carta) => c.id === idCarta);
        if (!carta) return false;

        if (carta.estaHackeada) {
            this.sala.enviarAlerta(client.sessionId, "Esta carta está hackeada y no podés jugarla este turno.");
            return false;
        }

        const def = this.obtener(carta.nombre);
        if (!def || carta.tipoDeUso === "oculto") return false;

        // 1. Validación de objetivo
        let objetivoFinal: Jugador | null = null;
        let idObjetivoFinal: string | undefined = idObjetivo;

        if (def.reglaObjetivo.tipo === "jugador") {
            if (!idObjetivo) {
                this.sala.enviarAlerta(client.sessionId, "Necesitás elegir un objetivo.");
                return false;
            }
            const objetivoInicial = this.sala.state.jugadores.get(idObjetivo);
            if (!objetivoInicial) {
                this.sala.enviarAlerta(client.sessionId, "Objetivo inválido.");
                return false;
            }

            const errorObjetivo = this.sala.sistemaCombate.validarObjetivo(jugador, objetivoInicial, carta);
            if (errorObjetivo) {
                this.sala.enviarAlerta(client.sessionId, errorObjetivo);
                return false;
            }

            objetivoFinal = def.reglaObjetivo.ignoraGravedad
                ? objetivoInicial
                : this.sala.sistemaCombate.resolverObjetivoConGravedad(jugador, objetivoInicial);
            idObjetivoFinal = Utilidades.obtenerSessionIdDeJugador(this.sala, objetivoFinal);
        }

        const ctx: ContextoJugada = {
            sala: this.sala,
            client,
            idJugador: client.sessionId,
            jugador,
            carta,
            idObjetivo: idObjetivoFinal,
            objetivo: objetivoFinal
        };

        // 2. Validación propia de la carta antes de consumirla
        if (def.validarJugada) {
            const error = def.validarJugada(ctx);
            if (error) {
                this.sala.enviarAlerta(client.sessionId, error);
                return false;
            }
        }

        // 3. Snapshot para Subaru justo antes de ejecutar la jugada
        if (!def.consumoDiferido) {
            this.sala.sistemaTiempo.capturarPuntoDeRetorno();
        }

        // 4. Consumo automático de la carta
        if (!def.consumoDiferido) {
            Utilidades.eliminarCartaDeLaMano(jugador, carta);

            const cartaAnim = def.cartaParaAnimacion ? def.cartaParaAnimacion(ctx) : carta;
            if (cartaAnim) {
                this.sala.ejecutarAnimacionCarta(client.sessionId, cartaAnim);
            }

            if (def.huecoEquipamiento && !def.equipamientoEnObjetivo && !def.manejaEquipamientoManual) {
                Utilidades.equiparCarta(this.sala, jugador, carta, def.huecoEquipamiento);
            } else if (!def.huecoEquipamiento && !def.equipamientoEnObjetivo && !def.manejaEquipamientoManual) {
                this.sala.agregarAlDescarte(carta);
            }
        }

        // 5. Ejecución del efecto principal
        def.onJugar?.(ctx);

        // 6. Disparo de pasivas de "al jugar carta"
        if (!def.consumoDiferido) {
            this.sala.ejecutarPasivasAlJugarCarta(jugador, carta);
        }

        return true;
    }

    /**
     * Helper para cartas con `consumoDiferido: true` (ej. ¡Pánico! cuando el jugador confirma).
     */
    public consumirCartaDiferida(idJugador: string, jugador: Jugador, carta: Carta): void {
        if (Utilidades.eliminarCartaDeLaMano(jugador, carta)) {
            this.sala.ejecutarAnimacionCarta(idJugador, carta);
            this.sala.agregarAlDescarte(carta);
            this.sala.ejecutarPasivasAlJugarCarta(jugador, carta);
        }
    }

    // =========================================================================
    // REGISTRO DE TODAS LAS CARTAS DEL JUEGO
    // =========================================================================

    private registrarTodas(): void {
        this.registrarCartasBang();
        this.registrarArmas();
        this.registrarEquipamientos();
        this.registrarCuracionesYRobos();
        this.registrarAtaquesEspeciales();
        this.registrarTiendasYUtilidad();
        this.registrarEmbrujosYMaldiciones();
        this.registrarAnillosYBalatro();
    }

    // -------------------------------------------------------------------------
    // A. VARIANTES DE BANG! Y ESQUIVE
    // -------------------------------------------------------------------------

    private crearDefBang(config: {
        nombre: string;
        danoBase: number | ((carta: Carta) => number);
        aplicaBonusArma?: boolean;
        reglaObjetivo?: ReglaObjetivo;
        causa?: string;
        sfx?: string;
        onImpacto?: (sala: IMyRoom, ctx: ContextoDano) => void;
    }): IDefinicionCarta {
        return {
            nombre: config.nombre,
            reglaObjetivo: config.reglaObjetivo ?? REGLA_ARMA,
            validarJugada: (ctx) => {
                if (!ctx.objetivo) return "Objetivo inválido.";
                if (!ctx.sala.sistemaCombate.puedeDispararBang(ctx.jugador, ctx.objetivo, ctx.carta)) {
                    return "Ya disparaste un BANG! en este turno, no podés disparar dos BANG! por turno.";
                }
                return null;
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                ctx.jugador.yaDisparo = true;

                const statsArma = ctx.sala.sistemaCombate.getDatosArma(ctx.jugador);
                const base = typeof config.danoBase === "function" ? config.danoBase(ctx.carta) : config.danoBase;
                const bonusArma = config.aplicaBonusArma ? statsArma.danoExtra : 0;

                ctx.sala.agregarRegistro(
                    `⚠️ ¡${ctx.jugador.nombre} le atacó a ${ctx.objetivo.nombre}! ¿Tendrá un ¡Fallo!?`
                );

                if (config.sfx) ctx.sala.reproducirSfx(config.sfx);

                ctx.sala.sistemaCombate.encolarAtaqueBang({
                    victima: ctx.objetivo,
                    atacante: ctx.jugador,
                    danoBase: base + bonusArma,
                    causa: config.causa ?? "BANG",
                    flecha: "revolver",
                    cartaOrigen: ctx.carta,
                    alFrente: true,
                    ejecutarInmediatamente: true
                });
            },
            onImpacto: config.onImpacto
        };
    }

    private registrarCartasBang(): void {
        this.registrar(this.crearDefBang({ nombre: "BANG!", danoBase: 1, aplicaBonusArma: true }));
        this.registrar(this.crearDefBang({ nombre: "SUPER BANG!", danoBase: 2 }));
        this.registrar(this.crearDefBang({ nombre: "Miedica BANG!", danoBase: 1, aplicaBonusArma: true }));
        this.registrar(this.crearDefBang({ nombre: "Huevo BANG!", danoBase: 1, aplicaBonusArma: true }));
        this.registrar(this.crearDefBang({ nombre: "Seta BANG!", danoBase: 1, aplicaBonusArma: true, reglaObjetivo: REGLA_VECINO }));
        this.registrar(this.crearDefBang({ nombre: "Apisonaflor BANG!", danoBase: 2, reglaObjetivo: REGLA_VECINO, sfx: "sfxApisonaflor" }));
        this.registrar(this.crearDefBang({ nombre: "Karuma", danoBase: 2, reglaObjetivo: REGLA_VECINO }));
        this.registrar(
            this.crearDefBang({
                nombre: "Escopetazo BANG!",
                danoBase: (c) => c.number.get("danoEscopetazo") ?? (parseInt(c.efecto.split("_")[1], 10) || 1)
            })
        );
        this.registrar(
            this.crearDefBang({
                nombre: "Orbita BANG!",
                danoBase: 0,
                causa: "Orbita BANG!",
                onImpacto: (sala, ctx) => {
                    Utilidades.agregarEfecto(ctx.victima, "gravitacional", 4);
                    sala.reproducirSfx("sfxOrbitaBang");
                    // Si el atacante tenía Papapum y el golpe hizo 0 daño (no disparó onGolpear), la pasamos igual
                    if (ctx.atacante && ctx.cantidad === 0 && ctx.atacante.equipamiento.has("papa")) {
                        const papa = Utilidades.quitarEquipamiento(ctx.atacante, "papa");
                        if (papa) Utilidades.equiparCarta(sala, ctx.victima, papa, "papa");
                    }
                }
            })
        );
        this.registrar(
            this.crearDefBang({
                nombre: "Manipulación BANG!",
                danoBase: 0,
                causa: "Manipulación BANG!",
                onImpacto: (sala, ctx) => {
                    if (!ctx.atacante || !ctx.victima.estaVivo) return;
                    const idAtacante = Utilidades.obtenerSessionIdDeJugador(sala, ctx.atacante);
                    const idControlador =
                        ctx.atacante.esNpc && ctx.atacante.idDueno !== ""
                            ? ctx.atacante.idDueno
                            : idAtacante;

                    const manipulacion = CatalogoCartasEspeciales.crearManipulacion();
                    manipulacion.esConjurada = true;
                    manipulacion.string.set("idManipulador", idControlador);

                    Utilidades.equiparCarta(sala, ctx.victima, manipulacion, "manipulacion");
                    sala.agregarRegistro(
                        `🕷️ ¡${Utilidades.obtenerNombreVisual(ctx.atacante)} manipuló la mente de ${Utilidades.obtenerNombreVisual(ctx.victima)}!`
                    );
                    sala.reproducirSfx("sfxWillowImpacto");
                }
            })
        );

        this.registrar({
            nombre: "¡Fallo!",
            reglaObjetivo: REGLA_NINGUNO,
            puedeEsquivarBang: true
        });
    }

    // -------------------------------------------------------------------------
    // B. ARMAS
    // -------------------------------------------------------------------------

    private crearDefArma(
        nombre: string,
        extras: Partial<IDefinicionCarta> = {}
    ): IDefinicionCarta {
        return {
            nombre,
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "arma",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🔫 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó ${ctx.carta.nombre}!`);
                ctx.sala.reproducirSfx("equiparArma" + Math.floor(Math.random() * 3));
            },
            ...extras
        };
    }

    private registrarArmas(): void {
        this.registrar(this.crearDefArma("Pistola de Shion"));
        this.registrar(this.crearDefArma("Revolver de Casiddy"));
        this.registrar(this.crearDefArma("Rifle de Ashe"));
        this.registrar(this.crearDefArma("Francotirador"));
        this.registrar(this.crearDefArma("Escopetas de Reaper"));
        this.registrar(this.crearDefArma("Escopetas de Reaper Pro"));
        this.registrar(this.crearDefArma("Mortero"));
        this.registrar(this.crearDefArma("Repetidora"));

        const sinLimiteBang = { puedeDispararBang: () => true };
        this.registrar(this.crearDefArma("Pistola de Tracer", sinLimiteBang));
        this.registrar(this.crearDefArma("Pistola de Tracer Pro", sinLimiteBang));
        this.registrar(this.crearDefArma("Tirachinas", sinLimiteBang));
        this.registrar(this.crearDefArma("Tirachinas maestro", sinLimiteBang));
        this.registrar(this.crearDefArma("Espada galactica Pro", sinLimiteBang));

        this.registrar(
            this.crearDefArma("Espada galactica", {
                puedeDispararBang: () => true,
                onPasarTurno: (sala, jugador) => {
                    const espada = Utilidades.quitarEquipamiento(jugador, "arma");
                    if (espada) sala.agregarAlDescarte(espada);
                }
            })
        );

        this.registrar({
            nombre: "Lanzaguisantes",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "arma",
            manejaEquipamientoManual: true,
            onJugar: (ctx) => {
                const armaActual = ctx.jugador.equipamiento.get("arma");
                if (armaActual?.nombre === "Repetidora") {
                    ctx.sala.agregarRegistro(
                        `${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó Lanzaguisantes pero ya tiene el Lanzaguisantes mejorado.`
                    );
                } else if (armaActual?.nombre === "Lanzaguisantes") {
                    const rep = CatalogoCartasEspeciales.crearRepetidora();
                    rep.esConjurada = true;
                    Utilidades.equiparCarta(ctx.sala, ctx.jugador, rep, "arma");
                    ctx.sala.agregarRegistro(
                        `🔫 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} mejoró su arma a Repetidora!`
                    );
                } else {
                    Utilidades.equiparCarta(ctx.sala, ctx.jugador, ctx.carta, "arma");
                    ctx.sala.agregarRegistro(
                        `🔫 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Lanzaguisantes!`
                    );
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // C. EQUIPAMIENTOS DE MESA
    // -------------------------------------------------------------------------

    private registrarEquipamientos(): void {
        this.registrar({
            nombre: "Caballo",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "mustang",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🐎 ${Utilidades.obtenerNombreVisual(ctx.jugador)} montó un Caballo.`),
            modificarDistanciaDefensiva: () => 1
        });
        this.registrar({
            nombre: "Caballo Pro",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "mustang",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🐎 ${Utilidades.obtenerNombreVisual(ctx.jugador)} montó un Caballo Pro.`),
            modificarDistanciaDefensiva: () => 2
        });

        this.registrar({
            nombre: "Monoaldea",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "mira",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🛖 ${Utilidades.obtenerNombreVisual(ctx.jugador)} equipó una Monoaldea.`),
            modificarAlcanceAtacante: () => 1
        });
        this.registrar({
            nombre: "Monoaldea Pro",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "mira",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🔭 ${Utilidades.obtenerNombreVisual(ctx.jugador)} equipó una Monoaldea Pro.`),
            modificarAlcanceAtacante: () => 2
        });

        const sfxBarril = (ctx: ContextoJugada) => {
            ctx.sala.agregarRegistro(`🛢️ ${Utilidades.obtenerNombreVisual(ctx.jugador)} se escondió detrás de un ${ctx.carta.nombre}.`);
            ctx.sala.reproducirSfx("barril" + Math.floor(Math.random() * 3));
        };
        this.registrar({ nombre: "Barril", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "barril", onJugar: sfxBarril });
        this.registrar({ nombre: "Barril Pro", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "barril", onJugar: sfxBarril });

        const onDinamita = (ctx: ContextoJugada) => {
            ctx.sala.agregarRegistro(`🧨 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} encendió una ${ctx.carta.nombre}!`);
            ctx.sala.reproducirSfx("dinamita");
        };
        this.registrar({ nombre: "Dinamita", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "dinamita", onJugar: onDinamita });
        this.registrar({ nombre: "Dinamita Pro", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "dinamita", onJugar: onDinamita });

        // Papapum: ya soporta múltiples instancias independientes (cada una lleva su probabilidadPapa en carta.number)
        this.registrar({
            nombre: "Papapum",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "papa",
            onJugar: (ctx) => {
                ctx.carta.number.set("probabilidadPapa", 1);
                ctx.sala.agregarRegistro(`🥔 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} activó al Papapum!`);
                ctx.sala.reproducirSfx("sfxPapapumColocandose");
            },
            onGolpear: (sala, ctx, miCarta) => {
                if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return;
                if (ctx.atacante.equipamiento.get("papa") !== miCarta) return;

                const papa = Utilidades.quitarEquipamiento(ctx.atacante, "papa");
                if (papa) {
                    Utilidades.equiparCarta(sala, ctx.victima, papa, "papa");
                }
            }
        });

        this.registrar({
            nombre: "Prisión",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                validarObjetivo: (sala, _atacante, objetivo) => {
                    if (sala.getTotalJugadoresVivos() <= 2) {
                        return "No se puede usar prisión cuando quedan 2 jugadores.";
                    }
                    if (objetivo.rol === "Sheriff") {
                        return "No podés meter preso al Sheriff.";
                    }
                    if (objetivo.equipamiento.has("prision")) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} ya está en prisión.`;
                    }
                    if (sala.motorEventos.alguno(objetivo, "esInmuneA", objetivo, "prision")) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} tiene algo que lo protege de la prisión.`;
                    }
                    return null;
                }
            },
            huecoEquipamiento: "prision",
            equipamientoEnObjetivo: true,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.equiparCarta(ctx.sala, ctx.objetivo, ctx.carta, "prision");
                ctx.sala.agregarRegistro(`⛓️ ¡${ctx.jugador.nombre} mandó a la cárcel a ${ctx.objetivo.nombre}!`);
                ctx.sala.reproducirSfx("prision");
            }
        });

        this.registrar({
            nombre: "Crisalida",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                validarObjetivo: (_sala, _atacante, objetivo) => {
                    if (objetivo.equipamiento.has("crisalida")) {
                        return "El jugador seleccionado ya tiene una crisálida.";
                    }
                    return null;
                }
            },
            huecoEquipamiento: "crisalida",
            equipamientoEnObjetivo: true,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.equiparCarta(ctx.sala, ctx.objetivo, ctx.carta, "crisalida");
                ctx.sala.reproducirSfx("sfxCrisalida");
                ctx.sala.agregarRegistro(
                    `🐚 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} encerró en una crisálida a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}!`
                );
            },
            onInterceptarDanoEntrante: (sala, ctx, miCarta) => {
                if (ctx.cancelado) return;
                if (ctx.victima.equipamiento.get("crisalida") !== miCarta) return;
                const removida = Utilidades.quitarEquipamiento(ctx.victima, "crisalida");
                if (removida) sala.agregarAlDescarte(removida);
                ctx.cancelado = true;
                sala.agregarRegistro(`🐚 La Crisálida de ${Utilidades.obtenerNombreVisual(ctx.victima)} lo protege del ataque.`);
            }
        });

        this.registrar({
            nombre: "Calabaza",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "calabaza",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🎃 ¡${ctx.jugador.nombre} se equipó Calabaza!`),
            onInterceptarDanoEntrante: (sala, ctx, miCarta) => {
                if (ctx.cancelado) return;
                if (ctx.victima.equipamiento.get("calabaza") !== miCarta) return;
                const removida = Utilidades.quitarEquipamiento(ctx.victima, "calabaza");
                if (removida) sala.agregarAlDescarte(removida);
                ctx.cancelado = true;
                sala.agregarRegistro(`🎃 La Calabaza de ${Utilidades.obtenerNombreVisual(ctx.victima)} lo protege del ataque.`);
            }
        });

        this.registrar({
            nombre: "Plantorcha",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "plantorcha",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🔥 ¡${ctx.jugador.nombre} se equipó Plantorcha!`),
            modificarDanoAtacante: (sala, ctx) => {
                if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return 0;
                const nombreArma = sala.sistemaCombate.getDatosArma(ctx.atacante).nombre;
                return nombreArma === "Lanzaguisantes" || nombreArma === "Repetidora" ? 1 : 0;
            }
        });

        this.registrar({
            nombre: "Humoseta",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "humoseta",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🫧 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Humoseta!`),
            modificarTraspasarEscudo: () => true
        });

        this.registrar({
            nombre: "Girasol",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "girasol",
            manejaEquipamientoManual: true,
            onJugar: (ctx) => {
                if (ctx.jugador.equipamiento.get("girasol")?.nombre === "Girasol") {
                    const birasol = CatalogoCartasEspeciales.crearBirasol();
                    birasol.esConjurada = true;
                    Utilidades.equiparCarta(ctx.sala, ctx.jugador, birasol, "girasol");
                    ctx.sala.agregarRegistro(`🌻 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} mejoró su Girasol a Birasol!`);
                } else {
                    Utilidades.equiparCarta(ctx.sala, ctx.jugador, ctx.carta, "girasol");
                    ctx.sala.agregarRegistro(`🌻 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Girasol!`);
                }
            },
            onIniciarTurno: (sala, jugador) => Utilidades.darSol(sala, jugador, 0.5)
        });

        this.registrar({
            nombre: "Birasol",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "girasol",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`🌻 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Birasol!`),
            onIniciarTurno: (sala, jugador) => Utilidades.darSol(sala, jugador, 1)
        });

        const crearDefEspantacocoroch = (nombre: string, cartasAlJugarCocoroch: number): IDefinicionCarta => ({
            nombre,
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "espantacocoroch",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`👨🏼‍🌾 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó ${nombre}!`),
            esInmuneA: (_sala, _j, tipo) => tipo === "cocoroch",
            onJugarCarta: (sala, jugador, cartaJugada) => {
                if (cartaJugada.nombre === "Cocoroch") {
                    sala.repartirCartas(jugador, cartasAlJugarCocoroch, "equipamiento");
                    sala.agregarRegistro(
                        `${Utilidades.obtenerNombreVisual(jugador)} roba ${cartasAlJugarCocoroch} carta(s) por su ${nombre}.`
                    );
                }
            }
        });
        this.registrar(crearDefEspantacocoroch("Espantacocoroch", 1));
        this.registrar(crearDefEspantacocoroch("Espantacocoroch Pro", 2));

        this.registrar({
            nombre: "Espiritu alegre",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "espiritu",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`✨ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Espiritu alegre!`),
            modificarRuletaLocal: (_sala, ctx) => { ctx.bonusSuerte += 2; }
        });
        this.registrar({
            nombre: "Espiritu alegre Pro",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "espiritu",
            onJugar: (ctx) => ctx.sala.agregarRegistro(`✨ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó Espiritu alegre Pro!`),
            modificarRuletaLocal: (_sala, ctx) => { ctx.bonusSuerte += 4; }
        });

        const crearDefEspirituEnojado = (nombre: string, penalizacion: number): IDefinicionCarta => ({
            nombre,
            reglaObjetivo: REGLA_GLOBAL,
            huecoEquipamiento: "espiritu",
            equipamientoEnObjetivo: true,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.equiparCarta(ctx.sala, ctx.objetivo, ctx.carta, "espiritu");
                ctx.sala.agregarRegistro(
                    `✨ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} le colocó ${nombre} a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}!`
                );
            },
            modificarRuletaLocal: (_sala, ctx) => { ctx.bonusSuerte -= penalizacion; }
        });
        this.registrar(crearDefEspirituEnojado("Espiritu enojado", 2));
        this.registrar(crearDefEspirituEnojado("Espiritu enojado Pro", 4));
        const onMiniDinamita = (ctx: ContextoJugada) => {
            ctx.sala.agregarRegistro(`🧨 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} encendió una ${ctx.carta.nombre}!`);
            ctx.sala.reproducirSfx("dinamita");
        };
        this.registrar({ nombre: "Mini dinamita", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "miniDinamita", onJugar: onMiniDinamita });
        this.registrar({ nombre: "Mini dinamita Pro", reglaObjetivo: REGLA_NINGUNO, huecoEquipamiento: "miniDinamita", onJugar: onMiniDinamita });

        this.registrar({
            nombre: "Papapum primitiva",
            reglaObjetivo: REGLA_NINGUNO,
            huecoEquipamiento: "papa",
            onJugar: (ctx) => {
                if (!ctx.carta.number.has("probabilidadPapa")) {
                    ctx.carta.number.set("probabilidadPapa", 1);
                }
                ctx.sala.agregarRegistro(`🥔 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} activó una Papapum primitiva!`);
                ctx.sala.reproducirSfx("sfxPapapumColocandose");
            },
            onGolpear: (sala, ctx, miCarta) => {
                if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return;
                if (ctx.atacante.equipamiento.get("papa") !== miCarta) return;

                const papa = Utilidades.quitarEquipamiento(ctx.atacante, "papa");
                if (papa) {
                    Utilidades.equiparCarta(sala, ctx.victima, papa, "papa");
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // D. CURACIONES, ESCUDOS Y ROBOS
    // -------------------------------------------------------------------------

    private registrarCuracionesYRobos(): void {
        const crearCurarUno = (nombre: string, salvaDeMuerte: boolean): IDefinicionCarta => ({
            nombre,
            reglaObjetivo: REGLA_NINGUNO,
            salvaDeMuerte,
            validarJugada: (ctx) =>
                Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador) ? null : "No podes curarte ahora mismo.",
            onJugar: (ctx) => {
                Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "BOTIQUIN", false);
                ctx.sala.agregarRegistro(`🩹 ${Utilidades.obtenerNombreVisual(ctx.jugador)} usó ${nombre}.`);
                ctx.sala.reproducirSfx("curacion");
            }
        });
        this.registrar(crearCurarUno("Botiquín", true));
        this.registrar(crearCurarUno("Huevo sano", true));
        this.registrar(crearCurarUno("Nuez", false));

        this.registrar({
            nombre: "Ensalada",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador) ? null : "No podes curarte ahora mismo.",
            onJugar: (ctx) => {
                const cura = ctx.sala.getTotalJugadoresVivos() === 2 ? 1 : 2;
                Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, cura, "ENSALADA", false);
                ctx.sala.agregarRegistro(`🥗 ${Utilidades.obtenerNombreVisual(ctx.jugador)} comió su Ensalada.`);
                ctx.sala.reproducirSfx("curacion");
            }
        });

        this.registrar({
            nombre: "Anderlandis",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                esBeneficiosa: true,
                validarObjetivo: (sala, atacante, objetivo) => {
                    if (!Utilidades.puedeRecibirCuracion(sala, atacante)) return "No podes curarte ahora mismo.";
                    if (!Utilidades.puedeRecibirCuracion(sala, objetivo)) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} no puede curarse ahora mismo.`;
                    }
                    return null;
                }
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "CURADUO", false);
                Utilidades.aplicarCuracion(ctx.sala, ctx.objetivo, 1, "CURADUO", false);
                ctx.sala.agregarRegistro(
                    `🤝 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} y ${Utilidades.obtenerNombreVisual(ctx.objetivo)} compartieron curación!`
                );
                ctx.sala.reproducirSfx("curacion");
                ctx.sala.reproducirSfx(Math.random() < 0.01 ? "Anderland" : "sfxAnderlandis");
            }
        });

        this.registrar({
            nombre: "Musicoterapia",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                let alguien = false;
                ctx.sala.state.jugadores.forEach((j: Jugador) => {
                    if (Utilidades.puedeRecibirCuracion(ctx.sala, j)) alguien = true;
                });
                return alguien ? null : "No hay ningun jugador que se pueda curar ahora mismo.";
            },
            onJugar: (ctx) => {
                ctx.sala.state.jugadores.forEach((j: Jugador) => {
                    if (Utilidades.puedeRecibirCuracion(ctx.sala, j)) {
                        Utilidades.aplicarCuracion(ctx.sala, j, 1, "CURARTODOS", false);
                    }
                });
                ctx.sala.agregarRegistro(`✨ ¡${ctx.jugador.nombre} jugó Musicoterapia y curó a todos!`);
                ctx.sala.reproducirSfx("poco");
            }
        });

        this.registrar({
            nombre: "Manzana dorada",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                if (Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador)) {
                    Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "carta", false);
                    ctx.sala.agregarRegistro(`🍎 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se curó con la Manzana dorada!`);
                    ctx.sala.reproducirSfx("curacion");
                } else {
                    Utilidades.agregarEscudos(ctx.sala, ctx.jugador, 2, 1, "carta");
                    ctx.sala.agregarRegistro(`🍎 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} obtuvo 2 escudos con la Manzana dorada!`);
                    ctx.sala.reproducirSfx("sfxEscudo");
                }
            }
        });

        this.registrar({
            nombre: "Cafe",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                const puedeCurar = Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador);
                if (!puedeCurar && !ctx.jugador.yaDisparo) {
                    return "No podes curarte ni reiniciar tu limite de Bang! ahora mismo.";
                }
                return null;
            },
            onJugar: (ctx) => {
                if (Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador)) {
                    Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "cafe", false);
                    ctx.sala.agregarRegistro(`☕ ${Utilidades.obtenerNombreVisual(ctx.jugador)} se curó 1 por su Café.`);
                    ctx.sala.reproducirSfx("curacion");
                }
                if (ctx.jugador.yaDisparo) {
                    ctx.jugador.yaDisparo = false;
                    ctx.sala.agregarRegistro(`☕ ${Utilidades.obtenerNombreVisual(ctx.jugador)} reinicia su limite de Bang! por su Café.`);
                }
            }
        });

        this.registrar({
            nombre: "Spooky",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                Utilidades.agregarEscudos(ctx.sala, ctx.jugador, 1, 1, "EFECTOESCUDO");
                ctx.sala.agregarRegistro(`🛡️ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} usó Spooky! Obtiene vida extra temporal.`);
                ctx.sala.reproducirSfx("sfxEscudo");
            }
        });

        this.registrar({
            nombre: "Domo protector",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🛡️ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} les dió a todos 1 de escudo!`);
                ctx.sala.state.jugadores.forEach((j: Jugador) => {
                    if (j.estaVivo) Utilidades.agregarEscudos(ctx.sala, j, 1, 1, "carta");
                });
                ctx.sala.reproducirSfx("eolia");
            }
        });

        this.registrar({
            nombre: "Secador",
            reglaObjetivo: { ...REGLA_ARMA, esBeneficiosa: true, usaAlcanceMinimoArma: false },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.agregarEscudos(ctx.sala, ctx.objetivo, 1, 1, "carta");
                ctx.sala.agregarRegistro(
                    `𖣘 ${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó un Secador y le dio 1 de escudo a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}.`
                );
                ctx.sala.reproducirSfx("sfxSecador");
            }
        });

        const crearRobar = (nombre: string, cantidad: number, sfx?: string): IDefinicionCarta => ({
            nombre,
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                ctx.sala.repartirCartas(ctx.jugador, cantidad, "carta");
                ctx.sala.agregarRegistro(`🃏 ${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó ${nombre}.`);
                if (sfx) ctx.sala.reproducirSfx(sfx);
            }
        });
        this.registrar(crearRobar("Cofre", 2, "sfxCofre"));
        this.registrar(crearRobar("Cofre super magico", 3, "sfxCofreSupermagico"));
        this.registrar(crearRobar("Huevo sorpresa", 1));

        // Domino (multiefecto según su propiedad efecto)
        this.registrar({
            nombre: "Domino",
            reglaObjetivo: REGLA_NINGUNO,
            manejaEquipamientoManual: true,
            validarJugada: (ctx) => {
                if (ctx.carta.efecto === "curar_1" && !Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador)) {
                    return "No podes curarte ahora mismo.";
                }
                return null;
            },
            onJugar: (ctx) => {
                if (ctx.carta.efecto === "curar_1") {
                    Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "BOTIQUIN", false);
                    ctx.sala.agregarRegistro(`🩹 ${Utilidades.obtenerNombreVisual(ctx.jugador)} usó un Dominó curativo.`);
                    ctx.sala.reproducirSfx("curacion");
                    ctx.sala.agregarAlDescarte(ctx.carta);
                } else if (ctx.carta.efecto === "robar_1") {
                    ctx.sala.repartirCartas(ctx.jugador, 1, "carta");
                    ctx.sala.agregarRegistro(`🃏 ${Utilidades.obtenerNombreVisual(ctx.jugador)} usó un Dominó de robo.`);
                    ctx.sala.agregarAlDescarte(ctx.carta);
                } else {
                    Utilidades.equiparCarta(ctx.sala, ctx.jugador, ctx.carta, "arma");
                    ctx.sala.agregarRegistro(`🔫 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} se equipó un Dominó (alcance 4)!`);
                    ctx.sala.reproducirSfx("equiparArma0");
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // E. ATAQUES ESPECIALES E INTERACCIONES DE RESPUESTA
    // -------------------------------------------------------------------------

    private registrarAtaquesEspeciales(): void {
        this.registrar({
            nombre: "Tiratachuela",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsOtrosVivos(ctx.idJugador).length > 0 ? null : "No hay nadie vivo para atacar.",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🌧️ ¡${ctx.jugador.nombre} usó un Tiratachuela! ¡Todos a cubierto!`);
                ctx.sala.gestorMusica.reproducirEvento("tiratachueladaOst");

                const victimasIds = this.obtenerIdsOtrosVivos(ctx.idJugador);
                for (const idVictima of victimasIds) {
                    const victima = ctx.sala.state.jugadores.get(idVictima);
                    if (!victima) continue;
                    ctx.sala.sistemaCombate.encolarAtaqueBang({
                        victima,
                        atacante: ctx.jugador,
                        danoBase: 1,
                        causa: "TIRATACHUELA",
                        flecha: "tiratachuela",
                        cartaOrigen: ctx.carta,
                        tituloPersonalizado: "¡El Tiratachuela te apunta!\nElegí cómo responder:"
                    });
                }
                ctx.sala.sistemaInteracciones.procesarSiguiente();
            }
        });

        this.registrar({
            nombre: "¡Indios!",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsOtrosVivos(ctx.idJugador).length > 0 ? null : "No hay nadie vivo para atacar.",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🔥 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} lanzó un ataque de ¡Indios!`);
                ctx.sala.gestorMusica.reproducirEvento("indiadaOst");

                for (const idVictima of this.obtenerIdsOtrosVivos(ctx.idJugador)) {
                    const victima = ctx.sala.state.jugadores.get(idVictima);
                    if (!victima) continue;

                    ctx.sala.sistemaInteracciones.encolarInteraccion({
                        idJugadorObjetivo: idVictima,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} te ataca con indios!`,
                        temaVisual: "indios",
                        flecha: "indio",
                        construirOpciones: () => [
                            {
                                idAccion: "indios_descartar",
                                texto: "Descartar BANG!",
                                habilitado: victima.mano.some((c: Carta) => c.nombre === "BANG!"),
                                color: "verde"
                            },
                            { idAccion: "indios_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "indios_descartar") {
                                const idx = victima.mano.findIndex((c: Carta) => c.nombre === "BANG!");
                                if (idx !== -1) {
                                    const descartada = victima.mano.splice(idx, 1)[0];
                                    if (descartada) ctx.sala.agregarAlDescarte(descartada);
                                    ctx.sala.agregarRegistro(
                                        `🛡️ ${Utilidades.obtenerNombreVisual(victima)} descartó un BANG! y ahuyentó a los Indios.`
                                    );
                                }
                            } else {
                                ctx.sala.agregarRegistro(`🩸 ¡${Utilidades.obtenerNombreVisual(victima)} recibió 1 de daño por los Indios!`);
                                ctx.sala.reproducirSfx("sfxIndiosGolpe");
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "INDIOS", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    });
                }
                ctx.sala.sistemaInteracciones.procesarSiguiente();
            }
        });

        this.registrar({
            nombre: "Duelo",
            reglaObjetivo: REGLA_GLOBAL,
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                ctx.sala.agregarRegistro(`⚔️ ¡${ctx.jugador.nombre} retó a duelo a ${ctx.objetivo.nombre}!`);
                ctx.sala.reproducirSfx("sfxDuelo");

                const encolarPasoDuelo = (idAtacanteActual: string, idDefensorActual: string): void => {
                    const atacanteActual = ctx.sala.state.jugadores.get(idAtacanteActual);
                    const defensorActual = ctx.sala.state.jugadores.get(idDefensorActual);
                    if (!atacanteActual || !defensorActual || !defensorActual.estaVivo) return;

                    ctx.sala.sistemaInteracciones.encolarInteraccion(
                        {
                            idJugadorObjetivo: idDefensorActual,
                            titulo: `¡${atacanteActual.nombre} te desafía en Duelo!\nDescartá un BANG! o perdé 1 vida:`,
                            temaVisual: "duelo",
                            flecha: "duelo",
                            construirOpciones: () => [
                                {
                                    idAccion: "duelo_descartar",
                                    texto: "Descartar BANG!",
                                    habilitado: defensorActual.mano.some((c: Carta) => c.nombre === "BANG!"),
                                    color: "verde"
                                },
                                { idAccion: "duelo_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                            ],
                            onResponder: (idAccion) => {
                                if (idAccion === "duelo_descartar") {
                                    const idx = defensorActual.mano.findIndex((c: Carta) => c.nombre === "BANG!");
                                    if (idx !== -1) {
                                        const descartada = defensorActual.mano.splice(idx, 1)[0];
                                        if (descartada) ctx.sala.agregarAlDescarte(descartada);
                                        ctx.sala.agregarRegistro(
                                            `🛡️ ${Utilidades.obtenerNombreVisual(defensorActual)} descartó un BANG! ¡El duelo vuelve!`
                                        );
                                        if (atacanteActual.estaVivo) {
                                            encolarPasoDuelo(idDefensorActual, idAtacanteActual);
                                        }
                                    }
                                } else {
                                    ctx.sala.agregarRegistro(
                                        `🩸 ¡${Utilidades.obtenerNombreVisual(defensorActual)} perdió el duelo contra ${atacanteActual.nombre}!`
                                    );
                                    ctx.sala.sistemaCombate.procesarDano(defensorActual, atacanteActual, 1, "DUELO", {
                                        cartaOrigen: ctx.carta
                                    });
                                }
                            }
                        },
                        true,
                        true
                    );
                };

                encolarPasoDuelo(ctx.idJugador, ctx.idObjetivo);
            }
        });

        this.registrar({
            nombre: "Horda de Bloons",
            reglaObjetivo: { ...REGLA_ARMA, usaAlcanceMinimoArma: false },
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                ctx.sala.agregarRegistro(
                    `🎈 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} le mandó una Horda de Bloons a ${Utilidades.obtenerNombreVisual(victima)}!`
                );

                ctx.sala.sistemaInteracciones.encolarInteraccion(
                    {
                        idJugadorObjetivo: ctx.idObjetivo,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} te ataca con Bloons!`,
                        temaVisual: "bloons",
                        flecha: "bloon",
                        construirOpciones: () => [
                            {
                                idAccion: "bloons_bang",
                                texto: "Reventarlos (Usa BANG!)",
                                habilitado: victima.mano.some((c: Carta) => c.nombre === "BANG!"),
                                color: "verde"
                            },
                            {
                                idAccion: "bloons_barril",
                                texto: "Cubrirse (Pierde Barril)",
                                habilitado: victima.equipamiento.has("barril"),
                                color: "azul"
                            },
                            { idAccion: "bloons_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "bloons_bang") {
                                const idx = victima.mano.findIndex((c: Carta) => c.nombre === "BANG!");
                                if (idx !== -1) {
                                    const descartada = victima.mano.splice(idx, 1)[0];
                                    if (descartada) ctx.sala.agregarAlDescarte(descartada);
                                    ctx.sala.agregarRegistro(
                                        `🎈 ¡${Utilidades.obtenerNombreVisual(victima)} disparó un BANG! y reventó la horda de Bloons!`
                                    );
                                }
                            } else if (idAccion === "bloons_barril") {
                                const barril = Utilidades.quitarEquipamiento(victima, "barril");
                                if (barril) ctx.sala.agregarAlDescarte(barril);
                                ctx.sala.agregarRegistro(
                                    `🎈 ¡${Utilidades.obtenerNombreVisual(victima)} se escondió en su Barril pero los Bloons lo destruyeron!`
                                );
                            } else {
                                ctx.sala.agregarRegistro(
                                    `🩸 ¡${Utilidades.obtenerNombreVisual(victima)} recibió 1 de daño por la horda de Bloons!`
                                );
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "BLOONS", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    },
                    true,
                    true
                );
            }
        });

        this.registrar({
            nombre: "Patada Killo",
            reglaObjetivo: REGLA_VECINO,
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                ctx.sala.agregarRegistro(
                    `🦶 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} le dio una Patada Killo a ${Utilidades.obtenerNombreVisual(victima)}!`
                );

                ctx.sala.sistemaInteracciones.encolarInteraccion(
                    {
                        idJugadorObjetivo: ctx.idObjetivo,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} te dio una Patada Killo!`,
                        temaVisual: "patadaKillo",
                        flecha: "patadaKillo",
                        construirOpciones: () => [
                            {
                                idAccion: "patada_fallo",
                                texto: "Esquivar (Usa ¡Fallo!)",
                                habilitado:
                                    Utilidades.puedeUsarCartaFallo(victima) &&
                                    victima.mano.some((c: Carta) => this.puedeEsquivarBang(c)),
                                color: "verde"
                            },
                            {
                                idAccion: "patada_barril",
                                texto: "Cubrirse (Pierde Barril)",
                                habilitado: victima.equipamiento.has("barril"),
                                color: "azul"
                            },
                            {
                                idAccion: "patada_caballo",
                                texto: "Alejarse (Pierde Caballo)",
                                habilitado: victima.equipamiento.has("mustang"),
                                color: "azul"
                            },
                            { idAccion: "patada_dano", texto: "Recibir 2 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion, respClient) => {
                            if (idAccion === "patada_fallo") {
                                this.consumirUnFalloParaEsquivar(victima, respClient);
                            } else if (idAccion === "patada_barril") {
                                const barril = Utilidades.quitarEquipamiento(victima, "barril");
                                if (barril) ctx.sala.agregarAlDescarte(barril);
                                ctx.sala.agregarRegistro(
                                    `💥 ¡${Utilidades.obtenerNombreVisual(victima)} sacrificó su Barril para cubrirse de la Patada!`
                                );
                            } else if (idAccion === "patada_caballo") {
                                const caballo = Utilidades.quitarEquipamiento(victima, "mustang");
                                if (caballo) ctx.sala.agregarAlDescarte(caballo);
                                ctx.sala.agregarRegistro(
                                    `🐎 ¡${Utilidades.obtenerNombreVisual(victima)} sacrificó su Caballo para huir a tiempo!`
                                );
                            } else {
                                ctx.sala.agregarRegistro(
                                    `🩸 ¡${Utilidades.obtenerNombreVisual(victima)} recibió de lleno la Patada Killo! (2 de daño)`
                                );
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 2, "PATADA", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    },
                    true,
                    true
                );
            }
        });

        this.registrar({
            nombre: "Maceta Killo",
            reglaObjetivo: REGLA_GLOBAL,
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                ctx.sala.agregarRegistro(
                    `🪴 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} le arrojó una Maceta Killo a ${Utilidades.obtenerNombreVisual(victima)}!`
                );

                ctx.sala.sistemaInteracciones.encolarInteraccion(
                    {
                        idJugadorObjetivo: ctx.idObjetivo,
                        titulo: `¡${ctx.jugador.nombre} te arrojó una Maceta Killo!`,
                        temaVisual: "macetaKillo",
                        flecha: "macetaKillo",
                        construirOpciones: () => [
                            {
                                idAccion: "maceta_fallo",
                                texto: "Esquivar (Usa ¡Fallo!)",
                                habilitado:
                                    Utilidades.puedeUsarCartaFallo(victima) &&
                                    victima.mano.some((c: Carta) => this.puedeEsquivarBang(c)),
                                color: "verde"
                            },
                            {
                                idAccion: "maceta_bang",
                                texto: "Destruirla (Descartar BANG!)",
                                habilitado: victima.mano.some((c: Carta) => c.nombre === "BANG!"),
                                color: "azul"
                            },
                            { idAccion: "maceta_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion, respClient) => {
                            if (idAccion === "maceta_fallo") {
                                this.consumirUnFalloParaEsquivar(victima, respClient);
                            } else if (idAccion === "maceta_bang") {
                                const idx = victima.mano.findIndex((c: Carta) => c.nombre === "BANG!");
                                if (idx !== -1) {
                                    const descartada = victima.mano.splice(idx, 1)[0];
                                    if (descartada) ctx.sala.agregarAlDescarte(descartada);
                                    ctx.sala.agregarRegistro(
                                        `🪴 ¡${Utilidades.obtenerNombreVisual(victima)} descartó un BANG! para destruir la Maceta Killo!`
                                    );
                                }
                            } else {
                                ctx.sala.agregarRegistro(
                                    `🩸 ¡${Utilidades.obtenerNombreVisual(victima)} recibió un macetazo en la cabeza! (1 de daño)`
                                );
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "MACETA", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    },
                    true,
                    true
                );
            }
        });

        this.registrar({
            nombre: "Bomba",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsPorDistanciaMaxima(ctx.idJugador, 1, ctx.carta).length > 0
                    ? null
                    : "No hay jugadores vivos a distancia 1 para atacar.",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`💣 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} lanzó una Bomba a los jugadores cercanos!`);
                for (const idVictima of this.obtenerIdsPorDistanciaMaxima(ctx.idJugador, 1, ctx.carta)) {
                    const victima = ctx.sala.state.jugadores.get(idVictima);
                    if (!victima) continue;
                    ctx.sala.sistemaInteracciones.encolarInteraccion({
                        idJugadorObjetivo: idVictima,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} te tiró una Bomba!`,
                        temaVisual: "bomba",
                        flecha: "bomba",
                        construirOpciones: () => [
                            {
                                idAccion: "bomba_descartar",
                                texto: "Descartar carta izquierda",
                                habilitado: victima.mano.length > 0,
                                color: "verde"
                            },
                            { idAccion: "bomba_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "bomba_descartar" && victima.mano.length > 0) {
                                const cartaDesc = victima.mano.splice(0, 1)[0];
                                if (cartaDesc) {
                                    ctx.sala.descartarCarta(cartaDesc, victima, "BOMBA");
                                    ctx.sala.agregarRegistro(
                                        `🛡️ ${Utilidades.obtenerNombreVisual(victima)} descartó su ${cartaDesc.nombre} para salvarse de la Bomba.`
                                    );
                                }
                            } else {
                                ctx.sala.agregarRegistro(`💥 ¡${Utilidades.obtenerNombreVisual(victima)} recibió 1 de daño por la Bomba!`);
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "BOMBA", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    });
                }
                ctx.sala.sistemaInteracciones.procesarSiguiente();
            }
        });

        this.registrar({
            nombre: "Mega Bomba",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsPorDistanciaMaxima(ctx.idJugador, 2, ctx.carta).length > 0
                    ? null
                    : "No hay jugadores vivos a distancia 1 o 2 para atacar.",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`💣💣 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} lanzó una MEGA BOMBA a la mesa!`);
                for (const idVictima of this.obtenerIdsPorDistanciaMaxima(ctx.idJugador, 2, ctx.carta)) {
                    const victima = ctx.sala.state.jugadores.get(idVictima);
                    if (!victima) continue;
                    ctx.sala.sistemaInteracciones.encolarInteraccion({
                        idJugadorObjetivo: idVictima,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} tiró una Mega Bomba!`,
                        temaVisual: "megabomba",
                        flecha: "megabomba",
                        construirOpciones: () => [
                            {
                                idAccion: "megaBomba_descartar",
                                texto: "Descartar 2 cartas izquierdas",
                                habilitado: victima.mano.length >= 2,
                                color: "verde"
                            },
                            { idAccion: "megaBomba_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "megaBomba_descartar" && victima.mano.length >= 2) {
                                const cartasDesc = victima.mano.splice(0, 2);
                                for (const c of cartasDesc) {
                                    ctx.sala.descartarCarta(c, victima, "MEGA_BOMBA");
                                }
                                ctx.sala.agregarRegistro(
                                    `🛡️ ${Utilidades.obtenerNombreVisual(victima)} sacrificó ${cartasDesc[0].nombre} y ${cartasDesc[1].nombre} para salvarse.`
                                );
                            } else {
                                ctx.sala.agregarRegistro(
                                    `💥 ¡${Utilidades.obtenerNombreVisual(victima)} recibió 1 de daño por la Mega Bomba!`
                                );
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "MEGA_BOMBA", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    });
                }
                ctx.sala.sistemaInteracciones.procesarSiguiente();
            }
        });

        this.registrar({
            nombre: "Tormenta",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsOtrosVivos(ctx.idJugador).length > 0 ? null : "No hay nadie a quien afecte la tormenta.",
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`⛈️ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} desató una Tormenta!`);
                ctx.sala.gestorMusica.reproducirEvento("musicaTormenta");

                for (const idVictima of this.obtenerIdsOtrosVivos(ctx.idJugador)) {
                    const victima = ctx.sala.state.jugadores.get(idVictima);
                    if (!victima) continue;

                    ctx.sala.sistemaInteracciones.encolarInteraccion({
                        idJugadorObjetivo: idVictima,
                        titulo: `¡${Utilidades.obtenerNombreVisual(ctx.jugador)} invocó una Tormenta!`,
                        temaVisual: "tormenta",
                        flecha: "tormenta",
                        construirOpciones: () => [
                            {
                                idAccion: "tormenta_descartar",
                                texto: "Descartar Equipamiento",
                                habilitado: victima.equipamiento.size > 0,
                                color: "azul"
                            },
                            { idAccion: "tormenta_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "tormenta_descartar" && victima.equipamiento.size > 0) {
                                const opciones: OpcionCartaConfig[] = [];
                                victima.equipamiento.forEach((cartaEq: Carta, clave: string) => {
                                    opciones.push({
                                        idRespuesta: clave,
                                        carta: cartaEq,
                                        descripcionPersonalizada: "Equipado en mesa"
                                    });
                                });

                                ctx.sala.sistemaInteracciones.abrirSeleccionCartas({
                                    idJugadorObjetivo: idVictima,
                                    titulo: "Elegí qué equipamiento perder en la Tormenta:",
                                    temaVisual: "normal",
                                    tipoAccion: "tormenta_seleccion",
                                    opciones,
                                    onSeleccionar: (claveElegida) => {
                                        const removida = Utilidades.quitarEquipamiento(victima, claveElegida);
                                        if (removida) {
                                            ctx.sala.descartarCarta(removida, victima, "TORMENTA");
                                            ctx.sala.agregarRegistro(
                                                `🌪️ ${Utilidades.obtenerNombreVisual(victima)} descartó ${removida.nombre} para protegerse de la Tormenta.`
                                            );
                                        }
                                    }
                                });
                            } else {
                                ctx.sala.agregarRegistro(`⚡ ¡${Utilidades.obtenerNombreVisual(victima)} recibió 1 de daño por la Tormenta!`);
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "TORMENTA", {
                                    cartaOrigen: ctx.carta
                                });
                            }
                        }
                    });
                }
                ctx.sala.sistemaInteracciones.procesarSiguiente();
            }
        });

        this.registrar({
            nombre: "Rayo",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                let maxSalud = -1;
                ctx.sala.state.jugadores.forEach((j: Jugador) => {
                    if (j.estaVivo && j.vidas > maxSalud) maxSalud = j.vidas;
                });

                ctx.sala.agregarRegistro(`⚡ ¡${ctx.jugador.nombre} invocó un Rayo sobre los jugadores con más salud!`);
                ctx.sala.reproducirSfx("rayo");

                for (const id of this.obtenerIdsVivosEnOrden(ctx.idJugador)) {
                    const victima = ctx.sala.state.jugadores.get(id);
                    if (victima && victima.estaVivo && victima.vidas === maxSalud) {
                        ctx.sala.agregarRegistro(`⚡ ¡KABOOM! El rayo impacta a ${Utilidades.obtenerNombreVisual(victima)}.`);
                        ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "RAYO", {
                            cartaOrigen: ctx.carta
                        });
                    }
                }
            }
        });

        this.registrar({
            nombre: "Petaseta",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🌋 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} invocó una Petaseta!`);
                ctx.sala.reproducirSfx("sfxPetaseta");

                for (const id of this.obtenerIdsVivosEnOrden(ctx.idJugador)) {
                    const victima = ctx.sala.state.jugadores.get(id);
                    if (victima && victima.estaVivo) {
                        Utilidades.destruirTodosLosEquipamientos(ctx.sala, victima);
                        ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "PETASETA", {
                            cartaOrigen: ctx.carta
                        });
                    }
                }
            }
        });

        this.registrar({
            nombre: "Mechero",
            reglaObjetivo: REGLA_GLOBAL,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.agregarEfecto(ctx.objetivo, "fuego", 1);
                ctx.sala.agregarRegistro(
                    `🔥 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} incendia a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}!`
                );
                ctx.sala.reproducirSfx("sfxFuego");
            }
        });
    }

    // -------------------------------------------------------------------------
    // F. TIENDAS, SABOTAJES Y UTILIDADES
    // -------------------------------------------------------------------------

    private registrarTiendasYUtilidad(): void {
        this.registrar({
            nombre: "Cocoroch",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                validarObjetivo: (sala, _atacante, objetivo) => {
                    if (objetivo.mano.length === 0 && objetivo.equipamiento.size === 0) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} no tiene nada para descartar.`;
                    }
                    if (sala.motorEventos.alguno(objetivo, "esInmuneA", objetivo, "cocoroch")) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} tiene algo que lo protege del Cocoroch.`;
                    }
                    return null;
                }
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                ctx.sala.agregarRegistro(`🪳 ¡${ctx.jugador.nombre} le jugó un Cocoroch a ${victima.nombre}!`);
                ctx.sala.reproducirSfx("cocoroch" + Math.floor(Math.random() * 2));

                const opciones: OpcionCartaConfig[] = [];
                victima.equipamiento.forEach((cartaEq: Carta, clave: string) => {
                    opciones.push({
                        idRespuesta: `equip|${clave}`,
                        carta: cartaEq,
                        descripcionPersonalizada: "Equipado en mesa"
                    });
                });
                victima.mano.forEach((cartaMano: Carta) => {
                    opciones.push({ idRespuesta: `mano|${cartaMano.id}`, carta: cartaMano });
                });

                ctx.sala.sistemaInteracciones.abrirSeleccionCartas({
                    idJugadorObjetivo: ctx.idObjetivo,
                    titulo: "¡Te tiraron un Cocoroch y tenés que descartar!",
                    temaVisual: "normal",
                    tipoAccion: "cocoroch",
                    opciones,
                    onSeleccionar: (idResp) => {
                        const [zona, claveOId] = idResp.split("|");
                        let afectada: Carta | null = null;
                        if (zona === "equip") {
                            afectada = Utilidades.quitarEquipamiento(victima, claveOId);
                        } else {
                            const idx = victima.mano.findIndex((c: Carta) => c.id === claveOId);
                            if (idx !== -1) afectada = victima.mano.splice(idx, 1)[0] ?? null;
                        }
                        if (afectada) {
                            ctx.sala.descartarCarta(afectada, victima, "cocoroch");
                            ctx.sala.agregarRegistro(`🗑️ ${victima.nombre} descartó ${afectada.nombre}.`);
                        }
                    }
                });
            }
        });

        this.registrar({
            nombre: "¡Pánico!",
            reglaObjetivo: {
                ...REGLA_VECINO,
                validarObjetivo: (sala, _atacante, objetivo) => {
                    if (objetivo.mano.length === 0 && objetivo.equipamiento.size === 0) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} no tiene nada para robarle.`;
                    }
                    if (sala.motorEventos.alguno(objetivo, "esInmuneA", objetivo, "panico")) {
                        return `${Utilidades.obtenerNombreVisual(objetivo)} tiene algo que lo protege del Pánico.`;
                    }
                    return null;
                }
            },
            consumoDiferido: true,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                const victima = ctx.objetivo;
                const opciones: OpcionCartaConfig[] = [];

                victima.equipamiento.forEach((cartaEq: Carta, clave: string) => {
                    opciones.push({
                        idRespuesta: `equip|${clave}`,
                        carta: cartaEq,
                        descripcionPersonalizada: "Equipado en mesa"
                    });
                });
                victima.mano.forEach((cartaMano: Carta) => {
                    opciones.push({
                        idRespuesta: `mano|${cartaMano.id}`,
                        carta: cartaMano,
                        nombrePersonalizado: "Carta Oculta",
                        descripcionPersonalizada: "¿?",
                        spritePersonalizado: "CartaOculta"
                    });
                });

                ctx.sala.sistemaInteracciones.abrirSeleccionCartas({
                    idJugadorObjetivo: ctx.idJugador,
                    titulo: `¿Qué querés robarle a ${Utilidades.obtenerNombreVisual(victima)}?`,
                    temaVisual: "normal",
                    tipoAccion: "panico",
                    esCancelable: true,
                    opciones,
                    onSeleccionar: (idResp) => {
                        if (!victima.estaVivo) return;
                        const [zona, claveOId] = idResp.split("|");
                        let robada: Carta | null = null;
                        if (zona === "equip") {
                            robada = Utilidades.quitarEquipamiento(victima, claveOId);
                        } else {
                            const idx = victima.mano.findIndex((c: Carta) => c.id === claveOId);
                            if (idx !== -1) robada = victima.mano.splice(idx, 1)[0] ?? null;
                        }
                        if (robada) {
                            ctx.jugador.mano.push(robada);
                            ctx.sala.agregarRegistro(`🕵️ ${ctx.jugador.nombre} le robó una carta a ${victima.nombre}.`);
                            ctx.sala.reproducirSfx("panico");
                            this.consumirCartaDiferida(ctx.idJugador, ctx.jugador, ctx.carta);
                        }
                    }
                });
            }
        });

        this.registrar({
            nombre: "Valerie ladrona",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                validarObjetivo: (_sala, _a, objetivo) =>
                    objetivo.mano.length > 0 ? null : `${Utilidades.obtenerNombreVisual(objetivo)} no tiene cartas en la mano.`
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo || ctx.objetivo.mano.length === 0) return;
                const robada = ctx.objetivo.mano.splice(0, 1)[0];
                if (robada) ctx.jugador.mano.push(robada);
                ctx.sala.agregarRegistro(
                    `🐸 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó Valerie ladrona y le robó una carta a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}!`
                );
                ctx.sala.reproducirSfx("sfxLesly");
            }
        });

        this.registrar({
            nombre: "Trebolador",
            reglaObjetivo: {
                ...REGLA_GLOBAL,
                validarObjetivo: (_sala, _a, objetivo) =>
                    objetivo.mano.length > 0 ? null : `${Utilidades.obtenerNombreVisual(objetivo)} no tiene cartas para descartar.`
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                const cartaDesc = Utilidades.descartarCartaAleatoriaDeLaMano(ctx.objetivo);
                if (cartaDesc) {
                    ctx.sala.descartarCarta(cartaDesc, ctx.objetivo, "ATAQUE");
                    ctx.sala.agregarRegistro(
                        `☘️ ${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó Trebolador y le descartó ${cartaDesc.nombre} a ${Utilidades.obtenerNombreVisual(ctx.objetivo)}.`
                    );
                }
            }
        });

        const crearDesequipar = (nombre: string, cantidad: number, regla: ReglaObjetivo, sfx?: string): IDefinicionCarta => ({
            nombre,
            reglaObjetivo: {
                ...regla,
                validarObjetivo: (_sala, _a, objetivo) =>
                    objetivo.equipamiento.size > 0
                        ? null
                        : `${Utilidades.obtenerNombreVisual(objetivo)} no tiene ningún equipamiento para quitarle.`
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                const voladas: string[] = [];
                for (let i = 0; i < cantidad; i++) {
                    const c = Utilidades.descartarEquipamientoAleatorio(ctx.sala, ctx.objetivo);
                    if (!c) break;
                    voladas.push(c.nombre);
                }
                if (voladas.length > 0) {
                    ctx.sala.agregarRegistro(
                        `🌪️ ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} lanzó ${nombre}! ${Utilidades.obtenerNombreVisual(ctx.objetivo)} perdió ${voladas.join(" y ")}.`
                    );
                }
                if (sfx) ctx.sala.reproducirSfx(sfx);
            }
        });
        this.registrar(crearDesequipar("Tornado", 1, REGLA_GLOBAL, "sfxTornado"));
        this.registrar(crearDesequipar("Come piedras", 1, REGLA_GLOBAL, "sfxComePiedras"));
        this.registrar(crearDesequipar("Planta carnivora", 2, REGLA_VECINO));

        this.registrar({
            nombre: "Gran desaparicion",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                const vinculado = Utilidades.obtenerJugadorPorSessionId(ctx.sala, ctx.carta.idGranDesaparicion);
                if (!vinculado) return "El jugador vinculado ya no está en la sala.";
                if (vinculado.equipamiento.size === 0) {
                    return `${Utilidades.obtenerNombreVisual(vinculado)} no tiene ningún equipamiento para descartarle.`;
                }
                return null;
            },
            onJugar: (ctx) => {
                const vinculado = Utilidades.obtenerJugadorPorSessionId(ctx.sala, ctx.carta.idGranDesaparicion);
                if (!vinculado) return;
                Utilidades.destruirTodosLosEquipamientos(ctx.sala, vinculado);
                ctx.sala.agregarRegistro(
                    `🎩 ${Utilidades.obtenerNombreVisual(ctx.jugador)} le hace desaparecer todo el equipamiento a ${Utilidades.obtenerNombreVisual(vinculado)}.`
                );
                ctx.sala.reproducirSfx("granDesaparicion");
            }
        });

        this.registrar({
            nombre: "La tienda de Griff",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                const vivosIds = this.obtenerIdsVivosEnOrden(ctx.idJugador);
                const cartas: Carta[] = [];
                for (let i = 0; i < vivosIds.length; i++) {
                    if (Math.random() < 0.025) {
                        const alma = CatalogoCartasEspeciales.crearAlmaBalatro();
                        alma.esConjurada = true;
                        cartas.push(alma);
                        continue;
                    }
                    const cartaMazo = this.robarUnaDelMazo();
                    if (cartaMazo) cartas.push(cartaMazo);
                }
                ctx.sala.sistemaInteracciones.iniciarTienda({ tipoTienda: "Griff", colaJugadores: vivosIds, cartas });
            }
        });

        this.registrar({
            nombre: "La tienda de Juju",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) =>
                this.obtenerIdsOtrosVivos(ctx.idJugador).length > 0 ? null : "No hay rivales vivos para la tienda.",
            onJugar: (ctx) => {
                const otrosIds = this.obtenerIdsOtrosVivos(ctx.idJugador);
                const cartas = otrosIds.map(() => CatalogoCartasEspeciales.crearCartaMalditaAleatoria());
                ctx.sala.reproducirSfx("sfxJujuTienda");
                ctx.sala.sistemaInteracciones.iniciarTienda({ tipoTienda: "Juju", colaJugadores: otrosIds, cartas });
            }
        });

        this.registrar({
            nombre: "La tienda de Pierre",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                const vivosIds = this.obtenerIdsVivosEnOrden(ctx.idJugador);
                const cartas: Carta[] = [];
                for (let i = 0; i < vivosIds.length; i++) {
                    if (Math.random() < 0.025) {
                        const alma = CatalogoCartasEspeciales.crearAlmaBalatro();
                        alma.esConjurada = true;
                        cartas.push(alma);
                    } else {
                        const c = CatalogoCartasEspeciales.crearCartaPierreAleatoria();
                        c.esConjurada = true;
                        cartas.push(c);
                    }
                }
                ctx.sala.reproducirSfx("sfxPierreTienda");
                ctx.sala.sistemaInteracciones.iniciarTienda({ tipoTienda: "Pierre", colaJugadores: vivosIds, cartas });
            }
        });

        this.registrar({
            nombre: "Clon",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                const otrasOriginales = ctx.jugador.mano.filter((c: Carta) => !c.esConjurada && c.id !== ctx.carta.id);
                return otrasOriginales.length > 0 ? null : "No tenés otras cartas originales en la mano para clonar.";
            },
            onJugar: (ctx) => {
                const originales = ctx.jugador.mano.filter((c: Carta) => !c.esConjurada);
                if (originales.length === 0) return;

                const elegida = originales[Math.floor(Math.random() * originales.length)];
                Utilidades.eliminarCartaDeLaMano(ctx.jugador, elegida);
                ctx.sala.agregarAlDescarte(elegida);

                for (let i = 0; i < 2; i++) {
                    ctx.jugador.mano.push(Utilidades.clonarCarta(elegida, "clon", true));
                }

                ctx.sala.agregarRegistro(
                    `🪞 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} jugó Clon, sacrificó una carta original y fabricó 2 clones!`
                );
                ctx.sala.reproducirSfx("tilinkPasiva");
            }
        });

        this.registrar({
            nombre: "Imitadora",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                const plantas = ctx.jugador.mano.filter(
                    (c: Carta) => c.esPlanta && c.id !== ctx.carta.id && c.nombre !== "Imitadora"
                );
                return plantas.length > 0 ? null : "Necesitás al menos otra carta planta en tu mano para poder usarla.";
            },
            onJugar: (ctx) => {
                const plantas = ctx.jugador.mano.filter((c: Carta) => c.esPlanta && c.nombre !== "Imitadora");
                if (plantas.length === 0) return;
                const elegida = plantas[Math.floor(Math.random() * plantas.length)];
                const clon = Utilidades.clonarCarta(elegida, "clon_imitadora", true);
                clon.esPlanta = true;
                ctx.jugador.mano.push(clon);
                ctx.sala.agregarRegistro(`🌱 ¡${ctx.jugador.nombre} jugó Imitadora y creó un clon de una planta!`);
                ctx.sala.reproducirSfx("tilinkPasiva");
            }
        });

        this.registrar({
            nombre: "Nutriente",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                // Validamos intentando mejorar directamente dentro de onJugar? No, mejor verificamos aquí:
                const mejora = Utilidades.mejorarEquipamientoAleatorio(ctx.sala, ctx.jugador);
                if (mejora === "") return "No tenés ningún equipamiento que se pueda seguir mejorando.";
                ctx.sala.obtenerEstadoPrivado(ctx.idJugador)["ultimaMejoraNutriente"] = mejora;
                return null;
            },
            onJugar: (ctx) => {
                const mejora = String(ctx.sala.obtenerEstadoPrivado(ctx.idJugador)["ultimaMejoraNutriente"] ?? "un equipamiento");
                ctx.sala.agregarRegistro(`🌱 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} usó un Nutriente y mejoró ${mejora}!`);
                ctx.sala.reproducirSfx("robinMejora");
            }
        });

        this.registrar({
            nombre: "Esquirla prismatica",
            reglaObjetivo: REGLA_NINGUNO,
            validarJugada: (ctx) => {
                const primera = Utilidades.mejorarEquipamientoAleatorio(ctx.sala, ctx.jugador);
                return primera === "" ? "No hay ningún equipamiento que puedas mejorar." : null;
            },
            onJugar: (ctx) => {
                while (Utilidades.mejorarEquipamientoAleatorio(ctx.sala, ctx.jugador) !== "") {
                    // Continúa mejorando hasta llegar al máximo
                }
                ctx.sala.agregarRegistro(
                    `🌈 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} usó una Esquirla prismática y mejoró todo su equipamiento al máximo!`
                );
                ctx.sala.reproducirSfx("robinMejora");
            }
        });

        this.registrar({
            nombre: "Warp Totem",
            reglaObjetivo: REGLA_GLOBAL,
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                Utilidades.intercambiarPosicionesFisicas(ctx.sala, ctx.jugador, ctx.objetivo);
                ctx.sala.repartirCartas(ctx.jugador, 1, "carta");

                let textoCura = "";
                if (Utilidades.puedeRecibirCuracion(ctx.sala, ctx.jugador)) {
                    Utilidades.aplicarCuracion(ctx.sala, ctx.jugador, 1, "WARP_TOTEM", false);
                    textoCura = " y se curó 1 de salud";
                }
                ctx.sala.agregarRegistro(
                    `🗿 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} usó Warp Totem! Intercambió asiento con ${Utilidades.obtenerNombreVisual(ctx.objetivo)}, robó 1 carta${textoCura}.`
                );
            }
        });

        this.registrar({
            nombre: "Festival del Huevo",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                ctx.sala.agregarRegistro(`🥚 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} inició el Festival del Huevo! Todos roban 1 carta.`);
                ctx.sala.state.jugadores.forEach((j: Jugador) => {
                    if (j.estaVivo) ctx.sala.repartirCartas(j, 1, "FESTIVAL");
                });

                const contarVirtual = (j: Jugador, id: string): number => {
                    const extra = Number(ctx.sala.obtenerEstadoPrivado(id)["susatoFaltanElegir"] ?? 0);
                    return j.mano.length + extra;
                };

                let maxCartas = -1;
                ctx.sala.state.jugadores.forEach((j: Jugador, id: string) => {
                    if (j.estaVivo) maxCartas = Math.max(maxCartas, contarVirtual(j, id));
                });

                const ganadores: string[] = [];
                ctx.sala.state.jugadores.forEach((j: Jugador, id: string) => {
                    if (j.estaVivo && contarVirtual(j, id) === maxCartas) {
                        const huevo = CatalogoCartasEspeciales.crearCartaHuevoAleatorio();
                        huevo.esConjurada = true;
                        j.mano.push(huevo);
                        ganadores.push(Utilidades.obtenerNombreVisual(j));
                    }
                });

                if (ganadores.length > 0) {
                    ctx.sala.agregarRegistro(`🥚 ¡${ganadores.join(" y ")} tenían más cartas y ganaron un Huevo Misterioso!`);
                }
            }
        });

        this.registrar({
            nombre: "Alma",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                const carta = CatalogoCartasEspeciales.crearCartaBalatroAleatoria();
                carta.esConjurada = true;
                ctx.jugador.mano.push(carta);
                ctx.sala.agregarRegistro(`🃏 ¡${Utilidades.obtenerNombreVisual(ctx.jugador)} conjura una carta de Balatro!`);
            }
        });

        this.registrar({
            nombre: "Cofre legendario",
            reglaObjetivo: REGLA_NINGUNO,
            onJugar: (ctx) => {
                const lista = CatalogoCartasEspeciales.obtenerTodasLasCartas();
                const elegida = lista[Math.floor(Math.random() * lista.length)];
                if (elegida) {
                    elegida.esConjurada = true;
                    ctx.jugador.mano.push(elegida);
                }
                ctx.sala.agregarRegistro(
                    `🃏 ${Utilidades.obtenerNombreVisual(ctx.jugador)} usó Cofre legendario y conjuró una carta aleatoria del juego.`
                );
                ctx.sala.reproducirSfx("sfxCofreSupermagico");
            }
        });

        this.registrar({
            nombre: "Correo explosivo",
            reglaObjetivo: REGLA_GLOBAL,
            cartaParaAnimacion: () => {
                const disfraz = CatalogoCartasEspeciales.crearCorreo();
                disfraz.esConjurada = true;
                return disfraz;
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                const nombreRemitente = Utilidades.obtenerNombreVisual(ctx.jugador);
                const nombreVictima = Utilidades.obtenerNombreVisual(victima);

                ctx.sala.agregarRegistro(`✉️ ${nombreRemitente} le envió un correo a ${nombreVictima}.`);

                ctx.sala.sistemaInteracciones.encolarInteraccion(
                    {
                        idJugadorObjetivo: ctx.idObjetivo,
                        titulo: `¡${nombreRemitente} te envió un paquete por correo!\n¿Lo aceptás?`,
                        temaVisual: "correo",
                        flecha: "correo",
                        construirOpciones: () => [
                            { idAccion: "correo_rechazar", texto: "No aceptar carta", habilitado: true, color: "rojo" },
                            { idAccion: "correo_aceptar", texto: "Aceptar carta", habilitado: true, color: "verde" }
                        ],
                        onResponder: (idAccion) => {
                            if (idAccion === "correo_aceptar") {
                                ctx.sala.reproducirSfx("explosion");
                                ctx.sala.agregarRegistro(
                                    `💥 ¡BOOM! El paquete de ${nombreRemitente} era un Correo explosivo. ${nombreVictima} recibe 1 de daño.`
                                );
                                ctx.sala.sistemaCombate.procesarDano(victima, ctx.jugador, 1, "CORREO_EXPLOSIVO", {
                                    cartaOrigen: ctx.carta
                                });
                            } else {
                                ctx.sala.agregarRegistro(`✉️ ${nombreVictima} rechazó el correo de ${nombreRemitente}.`);
                            }
                        }
                    },
                    true,
                    true
                );
            }
        });

        this.registrar({
            nombre: "Correo",
            reglaObjetivo: { ...REGLA_GLOBAL, esBeneficiosa: true },
            consumoDiferido: true,
            validarJugada: (ctx) => {
                const otras = ctx.jugador.mano.filter((c: Carta) => c.id !== ctx.carta.id);
                return otras.length > 0 ? null : "Necesitás al menos otra carta en tu mano para enviar por correo.";
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo || !ctx.idObjetivo) return;
                const victima = ctx.objetivo;
                const idVictima = ctx.idObjetivo;
                const nombreRemitente = Utilidades.obtenerNombreVisual(ctx.jugador);
                const nombreVictima = Utilidades.obtenerNombreVisual(victima);

                const opciones: OpcionCartaConfig[] = ctx.jugador.mano
                    .filter((c: Carta) => c.id !== ctx.carta.id)
                    .map((c: Carta) => ({ idRespuesta: c.id, carta: c }));

                ctx.sala.sistemaInteracciones.abrirSeleccionCartas({
                    idJugadorObjetivo: ctx.idJugador,
                    titulo: `Elegí qué carta enviarle por correo a ${nombreVictima}:`,
                    temaVisual: "correo",
                    tipoAccion: "correo_elegir",
                    esCancelable: true,
                    esPublica: false,
                    opciones,
                    onSeleccionar: (idCartaAEnviar) => {
                        if (!victima.estaVivo) return;
                        const cartaAEnviar = ctx.jugador.mano.find((c: Carta) => c.id === idCartaAEnviar);
                        if (!cartaAEnviar) return;

                        // Consumimos la carta "Correo" ahora que confirmó el envío
                        this.consumirCartaDiferida(ctx.idJugador, ctx.jugador, ctx.carta);
                        ctx.sala.agregarRegistro(`✉️ ${nombreRemitente} le envió un correo a ${nombreVictima}.`);

                        // Mismo panel visual y mismas opciones que Correo explosivo
                        ctx.sala.sistemaInteracciones.encolarInteraccion(
                            {
                                idJugadorObjetivo: idVictima,
                                titulo: `¡${nombreRemitente} te envió un paquete por correo!\n¿Lo aceptás?`,
                                temaVisual: "correo",
                                flecha: "correo",
                                construirOpciones: () => [
                                    { idAccion: "correo_rechazar", texto: "No aceptar carta", habilitado: true, color: "rojo" },
                                    { idAccion: "correo_aceptar", texto: "Aceptar carta", habilitado: true, color: "verde" }
                                ],
                                onResponder: (idAccion) => {
                                    if (idAccion === "correo_aceptar") {
                                        if (Utilidades.eliminarCartaDeLaMano(ctx.jugador, cartaAEnviar)) {
                                            victima.mano.push(cartaAEnviar);
                                            ctx.sala.agregarRegistro(
                                                `✉️ ${nombreVictima} aceptó el correo de ${nombreRemitente} y recibió: ${cartaAEnviar.nombre}.`
                                            );
                                        }
                                    } else {
                                        ctx.sala.agregarRegistro(`✉️ ${nombreVictima} rechazó el correo de ${nombreRemitente}.`);
                                    }
                                }
                            },
                            true,
                            false
                        );
                    }
                });
            }
        });
    }

    // -------------------------------------------------------------------------
    // G. EMBRUJOS Y MALDICIONES AL DESCARTAR
    // -------------------------------------------------------------------------

    private registrarEmbrujosYMaldiciones(): void {
        const crearDefEmbrujo = (
            nombre: string,
            tipo: string,
            cantidadBase: number,
            tipoEmbrujo: "bueno" | "malo"
        ): IDefinicionCarta => ({
            nombre,
            cartaParaAnimacion: () => null,
            reglaObjetivo: {
                tipo: "jugador",
                alcance: "global",
                puedeAutoObjetivo: true,
                ignoraGravedad: true,
                esBeneficiosa: tipoEmbrujo === "bueno",
                validarObjetivo: (sala, atacante, objetivo) => {
                    if (tipoEmbrujo === "malo" && sala.motorEventos.alguno(objetivo, "esInmuneA", objetivo, "embrujo_malo")) {
                        return `No podés embrujar de forma negativa a ${Utilidades.obtenerNombreVisual(objetivo)}.`;
                    }
                    const extra = sala.motorEventos.sumar(atacante, "modificarPuntosAlEmbrujar", atacante, objetivo, tipo, cantidadBase);
                    if (objetivo.embrujos.length + cantidadBase + extra > 16) {
                        return `La ruleta de ${Utilidades.obtenerNombreVisual(objetivo)} ya está demasiado embrujada.`;
                    }
                    return null;
                }
            },
            onJugar: (ctx) => {
                if (!ctx.objetivo) return;
                const extra = ctx.sala.motorEventos.sumar(
                    ctx.jugador,
                    "modificarPuntosAlEmbrujar",
                    ctx.jugador,
                    ctx.objetivo,
                    tipo,
                    cantidadBase
                );
                const total = Math.floor(cantidadBase + extra);
                for (let i = 0; i < total; i++) {
                    ctx.objetivo.embrujos.push(tipo);
                }

                ctx.jugador.yaJugoFantasma = true;
                ctx.sala.agregarRegistro(`👻 ¡Un espíritu ha lanzado un embrujo en secreto!`);

                if (!ctx.jugador.estaVivo) {
                    ctx.jugador.mano.clear();
                    ctx.jugador.yaJugoFantasma = false;
                    ctx.sala.sistemaTurnos.avanzarAlSiguienteTurno(ctx.idJugador);
                }
            }
        });

        this.registrar(crearDefEmbrujo("Golpe fantasmal", "dano", 2, "malo"));
        this.registrar(crearDefEmbrujo("Milagro", "curar", 2, "bueno"));
        this.registrar(crearDefEmbrujo("Regalo divino", "robar", 4, "bueno"));
        this.registrar(crearDefEmbrujo("Cocoroch fantasma", "descartar", 4, "malo"));
        this.registrar(crearDefEmbrujo("Fantasma comilon", "comilon", 3, "malo"));
        this.registrar(crearDefEmbrujo("Libro encantado", "libro", 3, "bueno"));

        // Cartas con efecto al ser descartadas (reemplaza todos los if de EfectoDescartar)
        this.registrar({
            nombre: "Hongo Venenoso",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador, carta) => {
                sala.agregarRegistro(`🍄 ¡${Utilidades.obtenerNombreVisual(jugador)} descartó ${carta.nombre} y recibe 1 de daño!`);
                sala.sistemaCombate.procesarDano(jugador, null, 1, "MALDICION", { cartaOrigen: carta });
                sala.reproducirSfx("sfxHongoVenenoso");
            }
        });

        this.registrar({
            nombre: "Reductor",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador, carta) => {
                const nombre = Utilidades.obtenerNombreVisual(jugador);
                if (jugador.vidasMaximas === jugador.vidas) {
                    sala.agregarRegistro(`⬇️ ${nombre} descartó ${carta.nombre} pero tiene la salud al máximo.`);
                } else if (jugador.vidasMaximas > 1) {
                    sala.agregarRegistro(`⬇️ ¡${nombre} descartó ${carta.nombre} y su salud máxima bajó en 1!`);
                    Utilidades.bajarVidaMaxima(jugador, 1);
                } else {
                    sala.agregarRegistro(`⬇️ ${nombre} descartó ${carta.nombre} pero su salud máxima no puede bajar de 1.`);
                }
            }
        });

        this.registrar({
            nombre: "Slime Comilón",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador) => {
                const devorada = Utilidades.descartarEquipamientoAleatorio(sala, jugador);
                const nombre = Utilidades.obtenerNombreVisual(jugador);
                if (devorada) {
                    sala.agregarRegistro(`👾 ¡Una maldición devoró ${devorada.nombre} de ${nombre}!`);
                } else {
                    sala.agregarRegistro(`👾 Una maldición intentó actuar, pero ${nombre} no tenía equipamiento.`);
                }
            }
        });

        this.registrar({
            nombre: "Carta Maldita",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador) => {
                const extra = Utilidades.descartarCartaAleatoriaDeLaMano(jugador);
                const nombre = Utilidades.obtenerNombreVisual(jugador);
                if (extra) {
                    sala.agregarRegistro(`👻 ¡Una maldición obligó a ${nombre} a descartar ${extra.nombre}!`);
                    sala.descartarCarta(extra, jugador, "VOLUNTARIO");
                } else {
                    sala.agregarRegistro(`👻 Una maldición intentó actuar, pero la mano de ${nombre} ya estaba vacía.`);
                }
            }
        });

        this.registrar({
            nombre: "Zombidito",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador, carta) => {
                const nombre = Utilidades.obtenerNombreVisual(jugador);
                if (jugador.boolean.get("esZombistein") && !Utilidades.estaBloqueado(jugador)) {
                    sala.agregarRegistro(`🧟 ¡${nombre} descartó ${carta.nombre} y como es Zombistein, se cura 1!`);
                    if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                        Utilidades.aplicarCuracion(sala, jugador, 1, "carta", false);
                    }
                } else {
                    sala.agregarRegistro(`🧟 ¡${nombre} descartó ${carta.nombre} y lo muerde quitándole 1 vida!`);
                    sala.sistemaCombate.procesarDano(jugador, null, 1, "MALDICION", { cartaOrigen: carta });
                }
                sala.reproducirSfx("zombiditoDescarte");
            }
        });

        this.registrar({
            nombre: "Huevo explosivo",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarPropia: (sala, jugador, carta) => {
                sala.agregarRegistro(`🥚 ¡${Utilidades.obtenerNombreVisual(jugador)} descartó ${carta.nombre} y explota quitándole 1 vida!`);
                sala.sistemaCombate.procesarDano(jugador, null, 1, "MALDICION", { cartaOrigen: carta });
            }
        });
    }

    // -------------------------------------------------------------------------
    // H. ANILLOS PASIVOS Y COMODINES DE BALATRO
    // -------------------------------------------------------------------------

    private registrarAnillosYBalatro(): void {
        this.registrar({
            nombre: "Anillo de iridio",
            reglaObjetivo: REGLA_NINGUNO,
            modificarAlcanceAtacante: () => 3
        });

        this.registrar({
            nombre: "Anillo del ladron",
            reglaObjetivo: REGLA_NINGUNO,
            modificarRepartirCarta: () => 1
        });

        this.registrar({
            nombre: "Anillo de la suerte",
            reglaObjetivo: REGLA_NINGUNO,
            modificarRuletaLocal: (_sala, ctx) => { ctx.bonusSuerte += 3; }
        });

        this.registrar({
            nombre: "Anillo de Yoba",
            reglaObjetivo: REGLA_NINGUNO,
            onRecibirDano: (sala, ctx) => {
                if (Math.floor(Math.random() * 3) === 0) {
                    Utilidades.agregarEscudos(sala, ctx.victima, 1, 1, "anillo");
                    sala.agregarRegistro(`💍 ${Utilidades.obtenerNombreVisual(ctx.victima)} generó un escudo por su Anillo de Yoba.`);
                }
            }
        });

        this.registrar({
            nombre: "Anillo de inmunidad",
            reglaObjetivo: REGLA_NINGUNO,
            onInterceptarDanoEntrante: (sala, ctx, miCarta) => {
                if (ctx.cancelado || ctx.cantidad <= 0) return;
                // Priorizamos Calabaza/Crisálida/Inmortalidad para no desperdiciar el anillo
                if (
                    ctx.victima.equipamiento.has("calabaza") ||
                    ctx.victima.equipamiento.has("crisalida") ||
                    (ctx.victima.efecto.get("inmortalidad") ?? 0) > 0
                ) {
                    return;
                }
                ctx.cantidad = 0;
                ctx.cancelado = true;
                Utilidades.agregarEscudos(sala, ctx.victima, 2, 1, "anillo");
                Utilidades.eliminarCartaDeLaMano(ctx.victima, miCarta);
                sala.descartarCarta(miCarta, ctx.victima, "anillo");
                sala.agregarRegistro(
                    `💍 ${Utilidades.obtenerNombreVisual(ctx.victima)} redujo el daño a 0 con su Anillo de inmunidad, ganó 2 escudos y se descartó.`
                );
            }
        });

        this.registrar({
            nombre: "Anillo del vampiro",
            reglaObjetivo: REGLA_NINGUNO,
            onMuereOtroPersonaje: (sala, victimaMuerta, asesino, miJugador) => {
                if (asesino !== miJugador) return;
                const nombre = Utilidades.obtenerNombreVisual(miJugador);
                if (!victimaMuerta.beneficiarseDeSuMuerte) {
                    sala.agregarRegistro(
                        `💍 ${nombre} no se cura con su Anillo del vampiro ya que ${Utilidades.obtenerNombreVisual(victimaMuerta)} murió anteriormente.`
                    );
                    return;
                }
                if (Utilidades.puedeRecibirCuracion(sala, miJugador)) {
                    Utilidades.aplicarCuracion(sala, miJugador, 2, "anillo", false);
                    sala.agregarRegistro(`💍 ${nombre} se cura 2 de vida por su Anillo del vampiro.`);
                } else {
                    sala.agregarRegistro(`💍 Algo impidió que el Anillo del vampiro curara a ${nombre}.`);
                }
            }
        });

        // --- BALATRO ---
        this.registrar({
            nombre: "Canio",
            reglaObjetivo: REGLA_NINGUNO,
            onEquiparCarta: (_sala, _jugador, _cartaEq, _hueco, miCarta) => {
                const nivelActual = miCarta.number.get("canioNivel") ?? 0;
                if (nivelActual >= 3) return;

                const faltantes = (miCarta.number.get("canioEquipamiento") ?? 2) - 1;
                if (faltantes <= 0) {
                    miCarta.number.set("canioNivel", nivelActual + 1);
                    miCarta.number.set("canioEquipamiento", 2);
                } else {
                    miCarta.number.set("canioEquipamiento", faltantes);
                }

                const nuevoNivel = miCarta.number.get("canioNivel") ?? 0;
                let texto = nuevoNivel < 3 ? `Al equipar ${miCarta.number.get("canioEquipamiento")} carta: se mejora. ` : "";
                if (nuevoNivel >= 1) texto += "Al golpear: Quema 1. ";
                if (nuevoNivel >= 2) texto += "Traspasa escudo. ";
                if (nuevoNivel >= 3) texto += "Hace +1 de daño. ";
                miCarta.descripcion = `${texto}Nivel actual: ${nuevoNivel}/3.`;
                miCarta.string.set("spriteOpcional", "Canio nivel " + nuevoNivel);
            },
            modificarDanoAtacante: (_sala, _ctx, miCarta) => ((miCarta.number.get("canioNivel") ?? 0) >= 3 ? 1 : 0),
            modificarTraspasarEscudo: (_sala, _ctx, miCarta) => (miCarta.number.get("canioNivel") ?? 0) >= 2,
            onGolpear: (_sala, ctx, miCarta) => {
                if ((miCarta.number.get("canioNivel") ?? 0) >= 1) {
                    Utilidades.agregarEfecto(ctx.victima, "fuego", 1);
                }
            }
        });

        this.registrar({
            nombre: "Yorick",
            reglaObjetivo: REGLA_NINGUNO,
            onIniciarTurno: (_sala, _jugador, miCarta) => { miCarta.number.set("yorickDescartes", 0); },
            onPasarTurno: (_sala, _jugador, miCarta) => { miCarta.number.set("yorickDescartes", 0); },
            onDescartarCarta: (sala, jugador, _cartaDesc, motivo, miCarta) => {
                if (motivo !== "VOLUNTARIO") return;
                const descartes = (miCarta.number.get("yorickDescartes") ?? 0) + 1;
                miCarta.number.set("yorickDescartes", descartes);

                if (descartes <= 2) {
                    sala.repartirCartas(jugador, 1, "carta");
                    sala.agregarRegistro(
                        `🃏 ${Utilidades.obtenerNombreVisual(jugador)} descartó una carta y Yorick le otorgó 1 carta nueva (${descartes}/2).`
                    );
                }
                if (descartes === 4 && Utilidades.puedeRecibirCuracion(sala, jugador)) {
                    Utilidades.aplicarCuracion(sala, jugador, 1, "YORICK", false);
                    sala.agregarRegistro(`🃏 ¡${Utilidades.obtenerNombreVisual(jugador)} descartó 4 cartas y Yorick lo curó 1!`);
                    sala.reproducirSfx("curacion");
                }
            }
        });

        this.registrar({
            nombre: "Triboulet",
            reglaObjetivo: REGLA_NINGUNO,
            modificarAlcanceAtacante: () => 1,
            modificarDistanciaDefensiva: () => 1,
            modificarCartasEnManoAlPasarTurno: () => 1,
            modificarRepartirCarta: () => 1,
            modificarRuletaLocal: (_sala, ctx) => {
                ctx.bonusSuerte += 1;
                ctx.agregarFicha({
                    tipo: "exito",
                    visual: "exitoTriboulet",
                    ownerId: ctx.idVictima,
                    onActivar: (sala, dueno) => {
                        if (Utilidades.puedeRecibirCuracion(sala, dueno)) {
                            Utilidades.aplicarCuracion(sala, dueno, 1, "TRIBOULET", false);
                            sala.agregarRegistro(`🃏 ¡Salió la ficha de Triboulet! ${Utilidades.obtenerNombreVisual(dueno)} se cura 1.`);
                            sala.reproducirSfx("curacion");
                        }
                    }
                });
            }
        });

        this.registrar({
            nombre: "Perkeo",
            reglaObjetivo: REGLA_NINGUNO,
            onDescartarCarta: (sala, jugador, cartaDescartada, motivo, miCarta) => {
                if (motivo !== "VOLUNTARIO" || cartaDescartada.esConjurada) return;
                const originales = jugador.mano.filter(
                    (c: Carta) => !c.esConjurada && c.id !== miCarta.id && c.nombre !== "Perkeo"
                );
                if (originales.length === 0) return;

                const elegida = originales[Math.floor(Math.random() * originales.length)];
                Utilidades.eliminarCartaDeLaMano(jugador, elegida);
                sala.agregarAlDescarte(elegida);

                for (let i = 0; i < 2; i++) {
                    jugador.mano.push(Utilidades.clonarCarta(elegida, "clon", true));
                }
                sala.agregarRegistro(`🃏 ¡Perkeo sacrificó ${elegida.nombre} original y fabricó 2 clones!`);
                sala.reproducirSfx("tilinkPasiva");
            }
        });

        this.registrar({
            nombre: "Chicot",
            reglaObjetivo: REGLA_NINGUNO,
            esInmuneA: (_sala, _j, tipo) => tipo === "cocoroch" || tipo === "panico" || tipo === "prision",
            modificarRuletaLocal: (_sala, ctx) => {
                ctx.bonusSuerte += 3;
                ctx.agregarFicha(
                    {
                        tipo: "exito",
                        visual: "exitoChicot",
                        ownerId: ctx.idVictima,
                        onActivar: (sala, dueno) => {
                            sala.repartirCartas(dueno, 2, "carta");
                            sala.agregarRegistro(`🃏 ¡Salió la ficha de Chicot! ${Utilidades.obtenerNombreVisual(dueno)} roba 2 cartas.`);
                        }
                    },
                    3
                );
            }
        });
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    private consumirUnFalloParaEsquivar(victima: Jugador, client: ClienteJuego): void {
        const idx = victima.mano.findIndex((c: Carta) => this.puedeEsquivarBang(c));
        if (idx === -1) return;
        const cartaJugada = victima.mano.splice(idx, 1)[0];
        if (!cartaJugada) return;

        this.sala.agregarAlDescarte(cartaJugada);
        this.sala.ejecutarAnimacionCarta(client.sessionId, cartaJugada);
        this.sala.ejecutarPasivasAlJugarCarta(victima, cartaJugada);
        this.alEsquivarBang(this.sala, victima, cartaJugada);
        this.sala.agregarRegistro(`🛡️ ¡${Utilidades.obtenerNombreVisual(victima)} usó un ¡Fallo! para esquivar hábilmente!`);
    }

    private obtenerIdsVivosEnOrden(idInicial: string): string[] {
        const ids =
            this.sala.state.ordenTurnos.length > 0
                ? Array.from(this.sala.state.ordenTurnos)
                : Array.from(this.sala.state.jugadores.keys());

        const idxInicio = Math.max(0, ids.indexOf(idInicial));
        const resultado: string[] = [];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[(idxInicio + i) % ids.length];
            const j = this.sala.state.jugadores.get(id);
            if (j && j.estaVivo) resultado.push(id);
        }
        return resultado;
    }

    private obtenerIdsOtrosVivos(idExcluir: string): string[] {
        return this.obtenerIdsVivosEnOrden(idExcluir).filter((id) => id !== idExcluir);
    }

    private obtenerIdsPorDistanciaMaxima(
        idOrigen: string,
        distanciaMaxima: number,
        carta: Carta
    ): string[] {
        const atacante = this.sala.state.jugadores.get(idOrigen);
        if (!atacante) return [];

        return this.obtenerIdsOtrosVivos(idOrigen).filter((idCand) => {
            const candidato = this.sala.state.jugadores.get(idCand);
            if (!candidato || !candidato.estaVivo) return false;
            const dist = this.sala.sistemaCombate.calcularDistancia(atacante, candidato, carta);
            return dist <= distanciaMaxima;
        });
    }

    private robarUnaDelMazo(): Carta | null {
        if (this.sala.state.mazo.length === 0 && this.sala.state.descarte.length > 0) {
            const arrayDescarte = Array.from(this.sala.state.descarte);
            arrayDescarte.sort(() => Math.random() - 0.5);
            this.sala.state.descarte.clear();
            for (const c of arrayDescarte) {
                this.sala.state.mazo.push(Utilidades.clonarCarta(c, "mazo", false));
            }
        }
        return this.sala.state.mazo.pop() ?? null;
    }
}