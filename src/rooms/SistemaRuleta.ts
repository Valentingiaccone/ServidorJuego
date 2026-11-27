import type {
    FichaRuleta,
    IContextoRuleta,
    IMyRoom,
    SolicitudRuleta
} from "./IMyRoom.js";
import type { Jugador } from "./schema/MyRoomState.js";
import { GestorNPC } from "./GestorNPC.js";
import { Utilidades } from "./Utilidades.js";

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
    private generacion: number = 0;

    constructor(private sala: IMyRoom) {}

    public estaActiva(): boolean {
        return this.enCurso !== null || this.sala.state.faseTransicion;
    }

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

    public cancelarSiPerteneceA(idJugador: string): void {
        this.cola = this.cola.filter((s) => s.idJugador !== idJugador);

        if (this.enCurso && this.enCurso.solicitud.idJugador === idJugador && !this.enCurso.girando) {
            this.limpiarEstadoVisual();
            this.enCurso = null;
            this.iniciarSiguiente();
        }
    }

    public limpiarTodo(): void {
        this.generacion++;
        this.cola = [];
        this.enCurso = null;
        this.sala.state.faseTransicion = false;
        this.limpiarEstadoVisual();
    }

    public procesarGiro(idJugador: string, esClienteNpc: boolean = false): void {
        if (!this.enCurso) return;
        if (this.enCurso.solicitud.idJugador !== idJugador) return;
        if (this.enCurso.girando) return;

        const victimaCheck = this.sala.state.jugadores.get(idJugador);
        if (victimaCheck && Utilidades.esControladoPorIA(victimaCheck) && !esClienteNpc) {
            return;
        }

        const ruleta = this.enCurso;
        const generacionActual = this.generacion;
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

        this.sala.clock.setTimeout(() => {
            if (this.generacion !== generacionActual) return;

            this.limpiarEstadoVisual();
            this.sala.state.faseTransicion = true;

            this.sala.clock.setTimeout(() => {
                if (this.generacion !== generacionActual) return;

                this.sala.state.faseTransicion = false;
                this.enCurso = null;

                if (this.sala.state.estadoJuego === "Terminado") {
                    this.cola = [];
                    return;
                }

                const victima = this.sala.state.jugadores.get(idJugador);

                if (!ruleta.solicitud.esEmbrujo && fichaElegida.ownerId && fichaElegida.onActivar) {
                    const dueno = this.sala.state.jugadores.get(fichaElegida.ownerId);
                    if (dueno && dueno.estaVivo && victima) {
                        fichaElegida.onActivar(this.sala, dueno, victima);
                    }
                }

                ruleta.solicitud.onResultado(esExito, fichaElegida.visual);

                // Si Subaru retrocedió el tiempo dentro de onResultado, cortamos acá
                if (this.generacion !== generacionActual) return;

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
            casillas.push({ tipo: verde ? "exito" : "fallo", visual, ownerId: "" });
        }
        return this.mezclar(casillas);
    }

    private construirCasillasNormales(solicitud: SolicitudRuleta, victima: Jugador): FichaRuleta[] {
        const ctx = new ContextoRuleta(solicitud.motivo, victima, solicitud.idJugador);

        if (solicitud.permiteModificadoresSuerte !== false) {
            this.sala.motorEventos.disparar(victima, "modificarRuletaLocal", ctx);
            this.sala.motorEventos.dispararGlobal("modificarRuletaGlobal", ctx);
        }

        const verdes = Math.max(1, Math.min(TOTAL_CASILLAS - 1, solicitud.probabilidadBase + ctx.bonusSuerte));
        const rojos = TOTAL_CASILLAS - verdes;

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