import type {
    FichaRuleta,
    IContextoRuleta,
    IMyRoom,
    SolicitudRuleta
} from "./IMyRoom.js";
import type { Jugador } from "./schema/MyRoomState.js";
import { GestorNPC } from "./GestorNPC.js";

const TOTAL_CASILLAS = 16;

const TEXTOS_EMBRUJO: Record<string, { texto: string; verde: boolean }> = {
    vacio: { texto: "¡SE SALVÓ!", verde: true },
    curar: { texto: "¡CURACIÓN!", verde: true },
    robar: { texto: "¡ROBO!", verde: true },
    libro: { texto: "¡MEJORA!", verde: true },
    dano: { texto: "¡DAÑO!", verde: false },
    descartar: { texto: "¡DESCARTE!", verde: false },
    comilon: { texto: "¡COMILÓN!", verde: false }
};

class ContextoRuleta implements IContextoRuleta {
    public bonusSuerte: number = 0;
    public fichasEspeciales: FichaRuleta[] = [];

    constructor(
        public motivo: string,
        public victima: Jugador,
        public idVictima: string
    ) {}

    public agregarFicha(ficha: FichaRuleta, cantidad: number = 1): void {
        for (let i = 0; i < cantidad; i++) {
            this.fichasEspeciales.push({ ...ficha });
        }
    }
}

interface RuletaEnCurso {
    solicitud: SolicitudRuleta;
    casillas: FichaRuleta[];
    girando: boolean;
}

export class SistemaRuleta {
    private cola: SolicitudRuleta[] = [];
    private enCurso: RuletaEnCurso | null = null;

    constructor(private sala: IMyRoom) {}

    public estaActiva(): boolean {
        return this.enCurso !== null || this.sala.state.faseTransicion;
    }

    /**
     * Encola una ruleta. Si no hay ninguna en curso, la inicia inmediatamente.
     * `alFrente = true` la inserta antes que otras pendientes (útil para interrupciones inmediatas).
     */
    public solicitar(solicitud: SolicitudRuleta, alFrente: boolean = false): void {
        if (this.sala.state.estadoJuego === "Terminado") return;

        if (alFrente) {
            this.cola.unshift(solicitud);
        } else {
            this.cola.push(solicitud);
        }

        if (!this.enCurso && !this.sala.state.faseTransicion) {
            this.iniciarSiguiente();
        }
    }

    /**
     * Si el jugador muere o se desconecta mientras tiene una ruleta abierta o en cola, la destraba.
     */
    public cancelarSiPerteneceA(idJugador: string): void {
        this.cola = this.cola.filter((s) => s.idJugador !== idJugador);

        if (this.enCurso && this.enCurso.solicitud.idJugador === idJugador && !this.enCurso.girando) {
            this.limpiarEstadoVisual();
            this.enCurso = null;
            this.iniciarSiguiente();
        }
    }

    public procesarGiro(idJugador: string): void {
        if (!this.enCurso) return;
        if (this.enCurso.solicitud.idJugador !== idJugador) return;
        if (this.enCurso.girando) return;

        const ruleta = this.enCurso;
        ruleta.girando = true;

        const indiceObjetivo = Math.floor(Math.random() * TOTAL_CASILLAS);
        const fichaElegida = ruleta.casillas[indiceObjetivo] ?? {
            tipo: "fallo" as const,
            visual: "fallo",
            ownerId: ""
        };

        let esExito = fichaElegida.tipo === "exito";
        let colorVerde = esExito;
        let textoVisual = esExito
            ? (ruleta.solicitud.textoExito ?? "¡ÉXITO!")
            : (ruleta.solicitud.textoFallo ?? "FALLÓ");

        if (ruleta.solicitud.esEmbrujo) {
            const infoEmbrujo = TEXTOS_EMBRUJO[fichaElegida.visual];
            if (infoEmbrujo) {
                textoVisual = infoEmbrujo.texto;
                colorVerde = infoEmbrujo.verde;
                esExito = infoEmbrujo.verde;
            }
        }

        this.sala.broadcast("resultado_ruleta", {
            exito: colorVerde,
            texto: textoVisual,
            objetivoIndex: indiceObjetivo
        });

        // 5s para la animación visual de la ruleta en Cocos
        this.sala.clock.setTimeout(() => {
            this.limpiarEstadoVisual();
            this.sala.state.faseTransicion = true;

            // 650ms de pausa visual entre paneles
            this.sala.clock.setTimeout(() => {
                this.sala.state.faseTransicion = false;
                this.enCurso = null;

                if (this.sala.state.estadoJuego === "Terminado") {
                    this.cola = [];
                    return;
                }

                const victima = this.sala.state.jugadores.get(idJugador);

                // 1. Activamos consecuencia de ficha especial (Maggey, Cubo, Triboulet, Chicot, etc.)
                if (!ruleta.solicitud.esEmbrujo && fichaElegida.ownerId && fichaElegida.onActivar) {
                    const dueno = this.sala.state.jugadores.get(fichaElegida.ownerId);
                    if (dueno && dueno.estaVivo && victima) {
                        fichaElegida.onActivar(this.sala, dueno, victima);
                    }
                }

                // 2. Ejecutamos el callback propio de quien solicitó esta ruleta
                ruleta.solicitud.onResultado(esExito, fichaElegida.visual);

                // 3. Si quedaron más ruletas en cola, arrancamos la siguiente; si no, reanudamos interacciones
                if (this.cola.length > 0) {
                    this.iniciarSiguiente();
                } else {
                    this.sala.sistemaInteracciones.procesarSiguiente();
                }
            }, 650);
        }, 5000);
    }

    private iniciarSiguiente(): void {
        if (this.enCurso || this.sala.state.estadoJuego === "Terminado") return;

        while (this.cola.length > 0) {
            const solicitud = this.cola.shift()!;
            const victima = this.sala.state.jugadores.get(solicitud.idJugador);

            if (!victima || !victima.estaVivo) {
                continue;
            }

            const casillas = solicitud.esEmbrujo
                ? this.construirCasillasEmbrujo(victima)
                : this.construirCasillasNormales(solicitud, victima);

            this.enCurso = { solicitud, casillas, girando: false };

            this.sala.state.jugadorDesenfundando = solicitud.idJugador;
            this.sala.state.motivoDesenfundar = solicitud.motivo;
            this.sala.state.tituloRuleta = solicitud.titulo ?? "";
            this.sala.state.ruletaVerde = solicitud.spriteVerde ?? "";
            this.sala.state.ruletaRojo = solicitud.spriteRojo ?? "";

            this.sala.state.layoutRuleta.clear();
            for (const c of casillas) {
                this.sala.state.layoutRuleta.push(c.visual);
            }

            GestorNPC.verificarRuletaNpc(this.sala);
            return;
        }
    }

    private construirCasillasEmbrujo(victima: Jugador): FichaRuleta[] {
        const casillas: FichaRuleta[] = [];
        for (let i = 0; i < TOTAL_CASILLAS; i++) {
            const visual = i < victima.embrujos.length ? victima.embrujos[i] : "vacio";
            const verde = TEXTOS_EMBRUJO[visual]?.verde ?? true;
            casillas.push({
                tipo: verde ? "exito" : "fallo",
                visual,
                ownerId: ""
            });
        }
        return this.mezclar(casillas);
    }

    private construirCasillasNormales(solicitud: SolicitudRuleta, victima: Jugador): FichaRuleta[] {
        const ctx = new ContextoRuleta(solicitud.motivo, victima, solicitud.idJugador);

        if (solicitud.permiteModificadoresSuerte !== false) {
            // Suerte local (personaje de la víctima + sus cartas/equipamientos)
            this.sala.motorEventos.disparar(victima, "modificarRuletaLocal", ctx);

            // Suerte global (personajes/cartas de toda la mesa, ej. Maggey, Cubo)
            this.sala.motorEventos.dispararGlobal("modificarRuletaGlobal", ctx);
        }

        // Siempre mínimo 1 verde y mínimo 1 rojo
        const verdes = Math.max(1, Math.min(TOTAL_CASILLAS - 1, solicitud.probabilidadBase + ctx.bonusSuerte));
        const rojos = TOTAL_CASILLAS - verdes;

        // Separamos y mezclamos fichas especiales por color: si exceden el cupo, entran al azar sin priorizar nada
        const especialesVerdes = this.mezclar(
            ctx.fichasEspeciales.filter((f) => f.tipo === "exito")
        ).slice(0, verdes);

        const especialesRojas = this.mezclar(
            ctx.fichasEspeciales.filter((f) => f.tipo === "fallo")
        ).slice(0, rojos);

        const casillas: FichaRuleta[] = [...especialesVerdes, ...especialesRojas];

        for (let i = especialesVerdes.length; i < verdes; i++) {
            casillas.push({ tipo: "exito", visual: "exito", ownerId: "" });
        }
        for (let i = especialesRojas.length; i < rojos; i++) {
            casillas.push({ tipo: "fallo", visual: "fallo", ownerId: "" });
        }

        return this.mezclar(casillas);
    }

    private limpiarEstadoVisual(): void {
        this.sala.state.jugadorDesenfundando = "";
        this.sala.state.motivoDesenfundar = "";
        this.sala.state.tituloRuleta = "";
        this.sala.state.ruletaVerde = "";
        this.sala.state.ruletaRojo = "";
    }

    /** Mezcla Fisher-Yates uniforme (sin sesgos de sort) */
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

    public limpiarTodo(): void {
        this.cola = [];
        this.enCurso = null;
        this.sala.state.faseTransicion = false;
        this.limpiarEstadoVisual();
    }
}