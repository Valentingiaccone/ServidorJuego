import type { IMyRoom } from "./IMyRoom.js";
import type { Carta, Jugador } from "./schema/MyRoomState.js";
import type { IPersonaje } from "./Personajes.js";

export class MotorEventos {
    constructor(private sala: IMyRoom) {}

    /**
     * Devuelve todas las clases IPersonaje activas para un jugador,
     * resolviendo personajes delegados (Maya -> muertos, Volpina -> imitado)
     * con protección contra bucles infinitos.
     */
    public obtenerPersonajesActivos(jugador: Jugador): IPersonaje[] {
        if (!jugador) return [];

        const resultado: IPersonaje[] = [];
        const visitados = new Set<string>();

        const recolectar = (nombrePersonaje: string) => {
            if (!nombrePersonaje || visitados.has(nombrePersonaje)) return;
            visitados.add(nombrePersonaje);

            const clase = this.sala.gestorPersonajes.obtener(nombrePersonaje);
            if (!clase) return;

            resultado.push(clase);

            if (clase.obtenerPersonajesDelegados && jugador.estaVivo) {
                const delegados = clase.obtenerPersonajesDelegados(this.sala, jugador);
                for (const nombreDelegado of delegados) {
                    recolectar(nombreDelegado);
                }
            }
        };

        recolectar(jugador.personaje);
        return resultado;
    }

    /**
     * Si el personaje base tiene `mantenerSpritePropio` (Maya, Volpina),
     * impide que un hook delegado le pise su sprite visual.
     */
    private protegerSpritePropio(jugador: Jugador): void {
        if (!jugador) return;
        const base = this.sala.gestorPersonajes.obtener(jugador.personaje);
        if (base?.mantenerSpritePropio) {
            jugador.spriteAvatarOpcional = "";
            jugador.boolean.set("spriteFueraDeJuego", false);
        }
    }

    /**
     * Recolecta una instantánea segura de todas las cartas activas del jugador (mano + equipamiento).
     */
    private obtenerCartasActivas(jugador: Jugador): Array<{ carta: Carta; zona: "mano" | "equipamiento" }> {
        if (!jugador) return [];
        const resultado: Array<{ carta: Carta; zona: "mano" | "equipamiento" }> = [];
        if (jugador.mano) {
            for (const carta of jugador.mano) resultado.push({ carta, zona: "mano" });
        }
        if (jugador.equipamiento) {
            for (const carta of jugador.equipamiento.values()) resultado.push({ carta, zona: "equipamiento" });
        }
        return resultado;
    }

    // =========================================================================
    // DESPACHO SOBRE PERSONAJES DEL JUGADOR
    // =========================================================================

    public dispararPersonaje(jugador: Jugador, metodo: string, ...args: any[]): void {
        if (!jugador) return;
        const personajes = this.obtenerPersonajesActivos(jugador);

        for (const p of personajes) {
            const fn = (p as any)[metodo];
            if (typeof fn === "function") {
                fn.apply(p, [this.sala, ...args]);
            }
        }

        this.protegerSpritePropio(jugador);
    }

    public sumarPersonaje(jugador: Jugador, metodo: string, ...args: any[]): number {
        if (!jugador) return 0;
        let total = 0;
        const personajes = this.obtenerPersonajesActivos(jugador);

        for (const p of personajes) {
            const fn = (p as any)[metodo];
            if (typeof fn === "function") {
                const res = fn.apply(p, [this.sala, ...args]);
                if (typeof res === "number") total += res;
            }
        }

        return total;
    }

    public algunPersonaje(jugador: Jugador, metodo: string, ...args: any[]): boolean {
        if (!jugador) return false;
        const personajes = this.obtenerPersonajesActivos(jugador);

        for (const p of personajes) {
            const fn = (p as any)[metodo];
            if (typeof fn === "function") {
                if (fn.apply(p, [this.sala, ...args]) === true) return true;
            }
        }

        return false;
    }

    // =========================================================================
    // DESPACHO SOBRE CARTAS DEL JUGADOR (MANO + EQUIPAMIENTO)
    // =========================================================================

    public dispararCartas(jugador: Jugador, metodo: string, ...args: unknown[]): void {
        if (!jugador) return;
        for (const { carta, zona } of this.obtenerCartasActivas(jugador)) {
            if (!this.cartaActivaEnZona(carta.nombre, zona)) continue;
            const def = this.sala.sistemaCartas.obtener(carta.nombre);
            const fn = (def as unknown as Record<string, unknown>)?.[metodo];
            if (typeof fn === "function") {
                (fn as (...a: unknown[]) => unknown).apply(def, [this.sala, ...args, carta]);
            }
        }
    }

    public sumarCartas(jugador: Jugador, metodo: string, ...args: unknown[]): number {
        if (!jugador) return 0;
        let total = 0;
        for (const { carta, zona } of this.obtenerCartasActivas(jugador)) {
            if (!this.cartaActivaEnZona(carta.nombre, zona)) continue;
            const def = this.sala.sistemaCartas.obtener(carta.nombre);
            const fn = (def as unknown as Record<string, unknown>)?.[metodo];
            if (typeof fn === "function") {
                const res = (fn as (...a: unknown[]) => unknown).apply(def, [this.sala, ...args, carta]);
                if (typeof res === "number") total += res;
            }
        }
        return total;
    }

    public algunaCarta(jugador: Jugador, metodo: string, ...args: unknown[]): boolean {
        if (!jugador) return false;
        for (const { carta, zona } of this.obtenerCartasActivas(jugador)) {
            if (!this.cartaActivaEnZona(carta.nombre, zona)) continue;
            const def = this.sala.sistemaCartas.obtener(carta.nombre);
            const fn = (def as unknown as Record<string, unknown>)?.[metodo];
            if (typeof fn === "function") {
                if ((fn as (...a: unknown[]) => unknown).apply(def, [this.sala, ...args, carta]) === true) {
                    return true;
                }
            }
        }
        return false;
    }

    // =========================================================================
    // DESPACHO UNIFICADO (PERSONAJES + CARTAS A LA VEZ)
    // =========================================================================

    public disparar(jugador: Jugador, metodo: string, ...args: any[]): void {
        this.dispararPersonaje(jugador, metodo, ...args);
        this.dispararCartas(jugador, metodo, ...args);
    }

    public sumar(jugador: Jugador, metodo: string, ...args: any[]): number {
        return this.sumarPersonaje(jugador, metodo, ...args) + this.sumarCartas(jugador, metodo, ...args);
    }

    public alguno(jugador: Jugador, metodo: string, ...args: any[]): boolean {
        return this.algunPersonaje(jugador, metodo, ...args) || this.algunaCarta(jugador, metodo, ...args);
    }

    /**
     * Dispara un evento global sobre TODOS los jugadores vivos de la mesa.
     * Pasa automáticamente cada jugador vivo `j` como primer argumento después de `sala`.
     */
    public dispararGlobal(metodo: string, ...args: any[]): void {
        const jugadores = Array.from(this.sala.state.jugadores.values());

        for (const j of jugadores) {
            if (!j || !j.estaVivo) continue;
            this.disparar(j, metodo, j, ...args);
        }
    }

    private cartaActivaEnZona(nombreCarta: string, zona: "mano" | "equipamiento"): boolean {
        const def = this.sala.sistemaCartas.obtener(nombreCarta);
        if (!def) return false;
        const zonaPermitida = def.zonaPasiva ?? (def.huecoEquipamiento ? "equipamiento" : "mano");
        return zonaPermitida === "ambas" || zonaPermitida === zona;
    }
}