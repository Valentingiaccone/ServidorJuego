import {
    Carta,
    Jugador,
    OpcionCartaSeleccion,
    OpcionInteraccion
} from "./schema/MyRoomState.js";
import type { ClienteJuego, IMyRoom } from "./IMyRoom.js";
import { GestorNPC } from "./GestorNPC.js";
import { Utilidades } from "./Utilidades.js";

export interface OpcionBotonConfig {
    idAccion: string;
    texto: string;
    habilitado: boolean;
    color: "verde" | "rojo" | "azul" | "blanco";
}

export interface SolicitudInteraccion {
    idJugadorObjetivo: string;
    titulo: string;
    temaVisual: string;
    flecha: string;
    construirOpciones: () => OpcionBotonConfig[];
    onResponder: (idAccion: string, client: ClienteJuego) => void;
}

export interface OpcionCartaConfig {
    idRespuesta: string;
    carta: Carta;
    nombrePersonalizado?: string;
    descripcionPersonalizada?: string;
    spritePersonalizado?: string;
}

export interface SolicitudSeleccionCartas {
    idJugadorObjetivo: string;
    titulo: string;
    temaVisual: string;
    tipoAccion: string;
    esCancelable?: boolean;
    esPublica?: boolean;
    opciones: OpcionCartaConfig[];
    onSeleccionar: (idRespuesta: string, client: ClienteJuego) => void;
    onCancelar?: (client: ClienteJuego) => void;
    onAbortarPorMuerte?: () => void;
}

export interface SolicitudTienda {
    tipoTienda: "Griff" | "Juju" | "Pierre";
    colaJugadores: string[];
    cartas: Carta[];
}

export class SistemaInteracciones {
    private colaInteracciones: SolicitudInteraccion[] = [];
    private interaccionEnCurso: SolicitudInteraccion | null = null;
    private seleccionEnCurso: SolicitudSeleccionCartas | null = null;
    private callbacksColaVacia: Array<() => void> = [];

    constructor(private sala: IMyRoom) {}

    public estaPausado(): boolean {
        return (
            this.interaccionEnCurso !== null ||
            this.seleccionEnCurso !== null ||
            this.sala.state.interaccionActiva.idJugadorObjetivo !== "" ||
            this.sala.state.seleccionCartasActiva.idJugadorObjetivo !== ""
        );
    }

    /**
     * Registra un callback que se ejecutará apenas terminen todas las interacciones,
     * selecciones y ruletas pendientes (ej. avanzar turno tras el BANG! final de Bolt).
     */
    public alVaciarCola(callback: () => void): void {
        if (!this.estaPausado() && this.colaInteracciones.length === 0 && !this.sala.sistemaRuleta.estaActiva()) {
            callback();
            return;
        }
        this.callbacksColaVacia.push(callback);
    }

    // =========================================================================
    // 1. COLA DE INTERACCIONES DE BOTONES
    // =========================================================================

    public encolarInteraccion(
        solicitud: SolicitudInteraccion,
        alFrente: boolean = false,
        iniciarAhora: boolean = false
    ): void {
        if (this.sala.state.estadoJuego === "Terminado") return;

        if (alFrente) {
            this.colaInteracciones.unshift(solicitud);
        } else {
            this.colaInteracciones.push(solicitud);
        }

        if (iniciarAhora) {
            this.procesarSiguiente();
        }
    }

    public procesarSiguiente(): void {
        if (this.sala.state.estadoJuego === "Terminado") {
            this.limpiarTodo();
            return;
        }

        if (
            this.interaccionEnCurso !== null ||
            this.seleccionEnCurso !== null ||
            this.sala.sistemaRuleta.estaActiva()
        ) {
            return;
        }

        while (this.colaInteracciones.length > 0) {
            const sig = this.colaInteracciones.shift()!;
            const victima = this.sala.state.jugadores.get(sig.idJugadorObjetivo);

            if (!victima || !victima.estaVivo) {
                continue;
            }

            this.interaccionEnCurso = sig;
            const opciones = sig.construirOpciones();

            this.sala.state.interaccionActiva.idJugadorObjetivo = sig.idJugadorObjetivo;
            this.sala.state.interaccionActiva.titulo = sig.titulo;
            this.sala.state.interaccionActiva.temaVisual = sig.temaVisual;
            this.sala.state.spriteFlecha = sig.flecha;

            this.sala.state.interaccionActiva.opciones.clear();
            for (const op of opciones) {
                const nuevaOp = new OpcionInteraccion();
                nuevaOp.idAccion = op.idAccion;
                nuevaOp.texto = op.texto;
                nuevaOp.habilitado = op.habilitado;
                nuevaOp.color = op.color;
                this.sala.state.interaccionActiva.opciones.push(nuevaOp);
            }

            GestorNPC.verificarInteraccionUniversalNpc(this.sala);
            return;
        }

        // Cola vacía: limpiamos estado visual, restauramos música y disparamos callbacks pendientes
        this.sala.state.interaccionActiva.idJugadorObjetivo = "";
        this.sala.state.spriteFlecha = "";
        this.sala.gestorMusica.actualizarAutomatica();

        if (this.callbacksColaVacia.length > 0) {
            const pendientes = [...this.callbacksColaVacia];
            this.callbacksColaVacia = [];
            for (const cb of pendientes) {
                cb();
            }
        }
    }

    public responderInteraccion(client: ClienteJuego, idAccion: string): void {
        if (!this.interaccionEnCurso) return;
        if (this.interaccionEnCurso.idJugadorObjetivo !== client.sessionId) return;

        const victima = this.sala.state.jugadores.get(client.sessionId);
        if (victima && Utilidades.esControladoPorIA(victima) && !client.esClienteNpc) {
            return;
        }

        const actual = this.interaccionEnCurso;
        this.interaccionEnCurso = null;
        this.sala.state.interaccionActiva.idJugadorObjetivo = "";

        actual.onResponder(idAccion, client);

        this.procesarSiguiente();
    }

    // =========================================================================
    // 2. PANEL UNIVERSAL DE SELECCIÓN DE CARTAS
    // =========================================================================

    public abrirSeleccionCartas(solicitud: SolicitudSeleccionCartas): void {
        if (this.sala.state.estadoJuego === "Terminado") return;

        this.seleccionEnCurso = solicitud;

        const req = this.sala.state.seleccionCartasActiva;
        req.idJugadorObjetivo = solicitud.idJugadorObjetivo;
        req.titulo = solicitud.titulo;
        req.temaVisual = solicitud.temaVisual;
        req.tipoAccion = solicitud.tipoAccion;
        req.esCancelable = solicitud.esCancelable ?? false;
        req.esPublica = solicitud.esPublica ?? false;
        req.opciones.clear();

        for (const item of solicitud.opciones) {
            const op = new OpcionCartaSeleccion();
            op.idRespuesta = item.idRespuesta;
            op.nombreVisual = item.nombrePersonalizado ?? item.carta.nombre;
            op.descripcionVisual = item.descripcionPersonalizada ?? item.carta.descripcion;
            op.spriteReferencia = item.spritePersonalizado ?? item.carta.nombre;
            op.esConjurada = item.carta.esConjurada;
            op.tienePerro = item.carta.idDuenoDelPerro !== "";
            op.estaHackeada = item.carta.estaHackeada;
            req.opciones.push(op);
        }

        GestorNPC.verificarSeleccionCartaNpc(this.sala);
    }

    public responderSeleccionCarta(client: ClienteJuego, idRespuesta: string): void {
        if (!this.seleccionEnCurso) return;
        if (this.seleccionEnCurso.idJugadorObjetivo !== client.sessionId) return;

        const jugador = this.sala.state.jugadores.get(client.sessionId);
        if (jugador && Utilidades.esControladoPorIA(jugador) && !client.esClienteNpc) {
            return;
        }

        const actual = this.seleccionEnCurso;
        this.seleccionEnCurso = null;
        this.sala.state.seleccionCartasActiva.idJugadorObjetivo = "";

        if (idRespuesta === "cancelar") {
            actual.onCancelar?.(client);
        } else {
            actual.onSeleccionar(idRespuesta, client);
        }

        this.procesarSiguiente();
    }

    // =========================================================================
    // 3. HELPER UNIFICADO PARA TIENDAS
    // =========================================================================

    public iniciarTienda(solicitud: SolicitudTienda): void {
        const cola = [...solicitud.colaJugadores];
        const nombreTienda = Utilidades.capitalizar(solicitud.tipoTienda);
        const tema = solicitud.tipoTienda.toLowerCase();

        this.sala.state.cartasTienda.clear();
        for (const carta of solicitud.cartas) {
            this.sala.state.cartasTienda.push(carta);
        }

        const avanzarTienda = (): void => {
            if (this.sala.state.estadoJuego === "Terminado") {
                this.sala.state.cartasTienda.clear();
                return;
            }

            while (cola.length > 0 && this.sala.state.cartasTienda.length > 0) {
                const idSiguiente = cola.shift()!;
                const jugador = this.sala.state.jugadores.get(idSiguiente);
                if (!jugador || !jugador.estaVivo) continue;

                this.sala.agregarRegistro(
                    `🏪 ${jugador.nombre} está eligiendo en La tienda de ${nombreTienda}.`
                );
                this.sala.gestorMusica.reproducirEvento("tiendaDe" + nombreTienda);

                const opciones: OpcionCartaConfig[] = [];
                this.sala.state.cartasTienda.forEach((carta: Carta) => {
                    opciones.push({ idRespuesta: carta.id, carta });
                });

                this.abrirSeleccionCartas({
                    idJugadorObjetivo: idSiguiente,
                    titulo: `¡La tienda de ${nombreTienda} está abierta!\nElegí una carta para llevarte:`,
                    temaVisual: tema,
                    tipoAccion: "tienda",
                    esCancelable: false,
                    esPublica: true,
                    opciones,
                    onSeleccionar: (idCartaElegida: string) => {
                        const idx = this.sala.state.cartasTienda.findIndex(
                            (c: Carta) => c.id === idCartaElegida
                        );
                        if (idx !== -1) {
                            const cartaElegida = this.sala.state.cartasTienda.splice(idx, 1)[0];
                            if (cartaElegida && jugador.estaVivo) {
                                jugador.mano.push(cartaElegida);
                                this.sala.agregarRegistro(`🛍️ ${jugador.nombre} agarró una carta.`);
                            }
                        }
                        avanzarTienda();
                    },
                    onAbortarPorMuerte: () => {
                        avanzarTienda();
                    }
                });
                return;
            }

            this.sala.state.cartasTienda.clear();
            this.sala.agregarRegistro(`🏪 La tienda de ${nombreTienda} ha cerrado.`);
            this.sala.gestorMusica.actualizarAutomatica();
        };

        avanzarTienda();
    }

    // =========================================================================
    // 4. LIMPIEZA POR MUERTE / DESCONEXIÓN / FIN / RETROCESO TEMPORAL
    // =========================================================================

    public cancelarSiPerteneceA(idJugador: string): void {
        if (this.sala.state.estadoJuego === "Terminado") return;

        let debiaAvanzar = false;

        if (this.interaccionEnCurso && this.interaccionEnCurso.idJugadorObjetivo === idJugador) {
            this.interaccionEnCurso = null;
            this.sala.state.interaccionActiva.idJugadorObjetivo = "";
            debiaAvanzar = true;
        }

        if (this.seleccionEnCurso && this.seleccionEnCurso.idJugadorObjetivo === idJugador) {
            const abortada = this.seleccionEnCurso;
            this.seleccionEnCurso = null;
            this.sala.state.seleccionCartasActiva.idJugadorObjetivo = "";
            abortada.onAbortarPorMuerte?.();
            debiaAvanzar = true;
        }

        if (debiaAvanzar) {
            this.procesarSiguiente();
        }
    }

    public limpiarTodo(): void {
        this.colaInteracciones = [];
        this.interaccionEnCurso = null;
        this.seleccionEnCurso = null;
        this.callbacksColaVacia = [];
        this.sala.state.interaccionActiva.idJugadorObjetivo = "";
        this.sala.state.seleccionCartasActiva.idJugadorObjetivo = "";
        this.sala.state.spriteFlecha = "";
        this.sala.state.cartasTienda.clear();
    }
}