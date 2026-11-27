import type { IMyRoom } from "./IMyRoom.js";
import type { Carta, Jugador } from "./schema/MyRoomState.js";
import type { IPersonaje } from "./Personajes.js";

export class MotorEventos {
    constructor(private sala: IMyRoom) {}

    public obtenerPersonajesActivos(jugador: Jugador): IPersonaje[] {
        if (!jugador) return [];

        const resultado: IPersonaje[] = [];
        const visitados = new Set<string>();

        const recolectar = (nombrePersonaje: string): void => {
            if (!nombrePersonaje || visitados.has(nombrePersonaje)) return;
            visitados.add(nombrePersonaje);

            const clase = this.sala.gestorPersonajes.obtener(nombrePersonaje);
            if (!clase) return;

            resultado.push(clase);

            if (clase.obtenerPersonajesDelegados && jugador.estaVivo) {
                for (const nombreDelegado of clase.obtenerPersonajesDelegados(this.sala, jugador)) {
                    recolectar(nombreDelegado);
                }
            }
        };

        recolectar(jugador.personaje);
        return resultado;
    }

    private obtenerSoloDelegados(jugador: Jugador): IPersonaje[] {
        if (!jugador) return [];
        const base = this.sala.gestorPersonajes.obtener(jugador.personaje);
        if (!base || !base.obtenerPersonajesDelegados || !jugador.estaVivo) return [];

        const resultado: IPersonaje[] = [];
        const visitados = new Set<string>([jugador.personaje]);

        const recolectar = (nombrePersonaje: string): void => {
            if (!nombrePersonaje || visitados.has(nombrePersonaje)) return;
            visitados.add(nombrePersonaje);

            const clase = this.sala.gestorPersonajes.obtener(nombrePersonaje);
            if (!clase) return;

            resultado.push(clase);

            if (clase.obtenerPersonajesDelegados && jugador.estaVivo) {
                for (const nombreDelegado of clase.obtenerPersonajesDelegados(this.sala, jugador)) {
                    recolectar(nombreDelegado);
                }
            }
        };

        for (const nombreDelegado of base.obtenerPersonajesDelegados(this.sala, jugador)) {
            recolectar(nombreDelegado);
        }

        return resultado;
    }

    private protegerSpritePropio(jugador: Jugador): void {
        if (!jugador) return;
        const base = this.sala.gestorPersonajes.obtener(jugador.personaje);
        if (base?.mantenerSpritePropio) {
            jugador.spriteAvatarOpcional = "";
            jugador.boolean.set("spriteFueraDeJuego", false);
        }
        base?.onPostHookVisual?.(jugador);
    }

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

    private cartaActivaEnZona(nombreCarta: string, zona: "mano" | "equipamiento"): boolean {
        const def = this.sala.sistemaCartas.obtener(nombreCarta);
        if (!def) return false;
        const zonaPermitida = def.zonaPasiva ?? (def.huecoEquipamiento ? "equipamiento" : "mano");
        return zonaPermitida === "ambas" || zonaPermitida === zona;
    }

    // =========================================================================
    // DESPACHO SOBRE PERSONAJES DEL JUGADOR
    // =========================================================================

    public dispararPersonaje(jugador: Jugador, metodo: string, ...args: unknown[]): void {
        if (!jugador) return;

        // 1. Ejecutamos primero el personaje base (permite que Echo cambie su delegación en onIniciarTurno)
        const base = this.sala.gestorPersonajes.obtener(jugador.personaje);
        const fnBase = (base as unknown as Record<string, unknown>)?.[metodo];
        if (typeof fnBase === "function") {
            (fnBase as (...a: unknown[]) => unknown).apply(base, [this.sala, ...args]);
        }

        // 2. Recolectamos y ejecutamos los delegados vigentes DESPUÉS del personaje base
        for (const delegado of this.obtenerSoloDelegados(jugador)) {
            const fn = (delegado as unknown as Record<string, unknown>)[metodo];
            if (typeof fn === "function") {
                (fn as (...a: unknown[]) => unknown).apply(delegado, [this.sala, ...args]);
            }
        }

        // 3. Aplicamos reglas visuales finales (Maya/Volpina mantienen su sprite, Echo restaura el imitado si quedó "")
        this.protegerSpritePropio(jugador);
    }

    public sumarPersonaje(jugador: Jugador, metodo: string, ...args: unknown[]): number {
        if (!jugador) return 0;
        let total = 0;

        for (const p of this.obtenerPersonajesActivos(jugador)) {
            const fn = (p as unknown as Record<string, unknown>)[metodo];
            if (typeof fn === "function") {
                const res = (fn as (...a: unknown[]) => unknown).apply(p, [this.sala, ...args]);
                if (typeof res === "number") total += res;
            }
        }
        return total;
    }

    public algunPersonaje(jugador: Jugador, metodo: string, ...args: unknown[]): boolean {
        if (!jugador) return false;

        for (const p of this.obtenerPersonajesActivos(jugador)) {
            const fn = (p as unknown as Record<string, unknown>)[metodo];
            if (typeof fn === "function") {
                if ((fn as (...a: unknown[]) => unknown).apply(p, [this.sala, ...args]) === true) {
                    return true;
                }
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
    // DESPACHO UNIFICADO Y GLOBAL
    // =========================================================================

    public disparar(jugador: Jugador, metodo: string, ...args: unknown[]): void {
        this.dispararPersonaje(jugador, metodo, ...args);
        this.dispararCartas(jugador, metodo, ...args);
    }

    public sumar(jugador: Jugador, metodo: string, ...args: unknown[]): number {
        return this.sumarPersonaje(jugador, metodo, ...args) + this.sumarCartas(jugador, metodo, ...args);
    }

    public alguno(jugador: Jugador, metodo: string, ...args: unknown[]): boolean {
        return this.algunPersonaje(jugador, metodo, ...args) || this.algunaCarta(jugador, metodo, ...args);
    }

    public dispararGlobal(metodo: string, ...args: unknown[]): void {
        const jugadores = Array.from(this.sala.state.jugadores.values());
        for (const j of jugadores) {
            if (!j || !j.estaVivo) continue;
            this.disparar(j, metodo, j, ...args);
        }
    }
}