import {
    Carta,
    HabilidadActiva,
    Jugador,
    OpcionPersonaje
} from "./schema/MyRoomState.js";
import type { IMyRoom } from "./IMyRoom.js";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { GestorNPC } from "./GestorNPC.js";
import { Utilidades } from "./Utilidades.js";

interface SnapshotCarta {
    id: string;
    nombre: string;
    descripcion: string;
    tipoDeUso: string;
    efecto: string;
    esConjurada: boolean;
    tipoEmbrujo: "bueno" | "malo" | "";
    idDuenoDelPerro: string;
    idGranDesaparicion: string;
    esPlanta: boolean;
    estaHackeada: boolean;
    number: Array<[string, number]>;
    string: Array<[string, string]>;
}

interface SnapshotJugador {
    id: string;
    opcionesPersonaje: Array<{
        nombre: string;
        habilidad: string;
        vidasBase: number;
        spriteFueraDeJuego: boolean;
    }>;
    yaEligioPersonaje: boolean;
    nombre: string;
    avatar: number;
    esAnfitrion: boolean;
    rol: string;
    vidas: number;
    estaVivo: boolean;
    vidasMaximas: number;
    yaDisparo: boolean;
    personaje: string;
    nombreMostrar: string;
    habilidad: string;
    sfxDefault: string;
    spriteAvatarOpcional: string;
    sfxMuerte: [string, boolean, number?];
    turnosEscudos: number[];
    mano: SnapshotCarta[];
    equipamiento: Array<[string, SnapshotCarta]>;
    embrujos: string[];
    habilidadesActivas: Array<{
        id: string;
        textoBoton: string;
        spriteBoton: string;
        tooltip: string;
    }>;
    estaDesconectado: boolean;
    yaJugoFantasma: boolean;
    puedeUsarFallo: boolean;
    vidasEscudo: number;
    tieneBarrilPasiva: boolean;
    modificarDistancia: number;
    modificarAlcance: number;
    estaMuertoFalso: boolean;
    rondasMuerto: number;
    beneficiarseDeSuMuerte: boolean;
    transformarCuraEnEscudo: boolean;
    geometryDashModo: string;
    number: Array<[string, number]>;
    boolean: Array<[string, boolean]>;
    string: Array<[string, string]>;
    efecto: Array<[string, number]>;
    estadistica: Array<[string, number]>;
    esNpc: boolean;
    idDueno: string;
    reroll: boolean;
}

export interface FasePendienteSnapshot {
    idJugador: string;
    indiceFase: number;
}

interface SnapshotSala {
    turnoActual: string;
    ordenSillasFisicas: string[];
    ordenTurnos: string[];
    mazo: SnapshotCarta[];
    descarte: SnapshotCarta[];
    jugadores: SnapshotJugador[];
    faseInicioTurno?: FasePendienteSnapshot;
}

const CAUSAS_CONJURAN_FALLO = new Set<string>([
    "BANG",
    "Orbita BANG!",
    "TIRATACHUELA",
    "PATADA",
    "MACETA",
    "Manipulación BANG!"
]);

const CAUSAS_CONJURAN_BANG = new Set<string>(["INDIOS", "DUELO"]);

export class SistemaTiempo {
    private ultimoSnapshot: SnapshotSala | null = null;
    private retrocediendo: boolean = false;

    constructor(private sala: IMyRoom) {}

    public hayAlguienConRetroceso(): boolean {
        let existe = false;
        this.sala.state.jugadores.forEach((j: Jugador) => {
            if (
                j.estaVivo &&
                !Utilidades.estaBloqueado(j) &&
                this.sala.motorEventos.algunPersonaje(j, "puedeRetrocederEnElTiempo", j)
            ) {
                existe = true;
            }
        });
        return existe;
    }

    /**
     * Captura una foto completa del estado de la mesa justo antes de que inicie una acción
     * o una fase de ruleta de inicio de turno. Solo hace trabajo si hay un Subaru activo con usos.
     */
    public capturarPuntoDeRetorno(faseInicioTurno?: FasePendienteSnapshot): void {
        if (this.sala.state.estadoJuego !== "Jugando" || this.retrocediendo) return;
        if (!this.hayAlguienConRetroceso()) {
            this.ultimoSnapshot = null;
            return;
        }

        const jugadores: SnapshotJugador[] = [];
        this.sala.state.jugadores.forEach((j: Jugador, id: string) => {
            jugadores.push(this.serializarJugador(id, j));
        });

        this.ultimoSnapshot = {
            turnoActual: this.sala.state.turnoActual,
            ordenSillasFisicas: Array.from(this.sala.state.ordenSillasFisicas),
            ordenTurnos: Array.from(this.sala.state.ordenTurnos),
            mazo: Array.from(this.sala.state.mazo).map((c) => this.serializarCarta(c)),
            descarte: Array.from(this.sala.state.descarte).map((c) => this.serializarCarta(c)),
            jugadores,
            faseInicioTurno
        };
    }

    /**
     * Intenta activar el retroceso temporal si `victima` tiene la habilidad de Subaru con usos restantes.
     * Devuelve `true` si el tiempo retrocedió y se canceló la muerte.
     */
    public intentarRetrocederPorMuerte(victima: Jugador, causaMuerte: string): boolean {
        if (this.retrocediendo || !this.ultimoSnapshot) return false;
        if (victima.estaDesconectado || Utilidades.estaBloqueado(victima)) return false;

        const puede = this.sala.motorEventos.algunPersonaje(victima, "puedeRetrocederEnElTiempo", victima);
        if (!puede) return false;

        const idSubaru = Utilidades.obtenerSessionIdDeJugador(this.sala, victima);
        const usosActuales = victima.number.get("subaruUsos") ?? 0;
        if (!idSubaru || usosActuales <= 0) return false;

        const nuevosUsos = usosActuales - 1;
        const snap = this.ultimoSnapshot;
        this.retrocediendo = true;

        try {
            // 1. Cancelamos cualquier interacción, ruleta, selección o temporizador de NPC activo
            this.sala.sistemaInteracciones.limpiarTodo();
            this.sala.sistemaRuleta.limpiarTodo();
            GestorNPC.reiniciarTemporizadores();

            // 2. Restauramos el estado completo de la mesa con instancias frescas de Colyseus Schema
            this.restaurarSnapshot(snap);

            // 3. Aplicamos el descuento de uso y la preparación defensiva a Subaru
            const subaruRestaurado = this.sala.state.jugadores.get(idSubaru);
            if (subaruRestaurado) {
                subaruRestaurado.number.set("subaruUsos", nuevosUsos);

                let textoPreparacion = "";
                if (CAUSAS_CONJURAN_FALLO.has(causaMuerte)) {
                    const fallo = CatalogoCartasEspeciales.crearFallo();
                    fallo.esConjurada = true;
                    subaruRestaurado.mano.push(fallo);
                    textoPreparacion = "Conjuró un ¡Fallo! para prepararse.";
                } else if (CAUSAS_CONJURAN_BANG.has(causaMuerte)) {
                    const bang = CatalogoCartasEspeciales.crearBang();
                    bang.esConjurada = true;
                    subaruRestaurado.mano.push(bang);
                    textoPreparacion = "Conjuró un BANG! para prepararse.";
                } else {
                    Utilidades.agregarEscudos(this.sala, subaruRestaurado, 1, 1, "pasiva");
                    textoPreparacion = "Obtuvo 1 escudo para resistir la muerte.";
                }

                this.sala.agregarRegistro(
                    `⏪ ¡${Utilidades.obtenerNombreVisual(subaruRestaurado)} regresó de la muerte! El tiempo retrocedió. ${textoPreparacion} (${nuevosUsos} usos restantes)`
                );
                this.sala.reproducirSfx("sfxSubaruRevive");
            }

            this.sala.gestorMusica.actualizarAutomatica();

            // 4. Actualizamos el snapshot con la nueva preparación (por si vuelve a morir en el reintento)
            this.retrocediendo = false;
            this.capturarPuntoDeRetorno(snap.faseInicioTurno);

            // 5. Reanudamos fase de inicio de turno (ej. Dinamita/Papapum) o turno IA si corresponde
            if (snap.faseInicioTurno) {
                this.sala.sistemaTurnos.reanudarFaseDesde(
                    snap.faseInicioTurno.idJugador,
                    snap.faseInicioTurno.indiceFase
                );
            } else {
                const turnoJugador = this.sala.state.jugadores.get(this.sala.state.turnoActual);
                if (turnoJugador && turnoJugador.estaVivo && Utilidades.esControladoPorIA(turnoJugador)) {
                    GestorNPC.iniciarTurnoNpc(this.sala, this.sala.state.turnoActual);
                }
            }

            return true;
        } finally {
            this.retrocediendo = false;
        }
    }

    public limpiar(): void {
        this.ultimoSnapshot = null;
    }

    // =========================================================================
    // SERIALIZACIÓN / RESTAURACIÓN LIMPIA DE SCHEMAS
    // =========================================================================

    private restaurarSnapshot(snap: SnapshotSala): void {
        this.sala.state.jugadores.clear();
        for (const sj of snap.jugadores) {
            this.sala.state.jugadores.set(sj.id, this.deserializarJugador(sj));
        }

        this.sala.state.ordenSillasFisicas.clear();
        for (const id of snap.ordenSillasFisicas) this.sala.state.ordenSillasFisicas.push(id);

        this.sala.state.ordenTurnos.clear();
        for (const id of snap.ordenTurnos) this.sala.state.ordenTurnos.push(id);

        this.sala.state.mazo.clear();
        for (const sc of snap.mazo) this.sala.state.mazo.push(this.deserializarCarta(sc));

        this.sala.state.descarte.clear();
        for (const sc of snap.descarte) this.sala.state.descarte.push(this.deserializarCarta(sc));

        this.sala.state.turnoActual = snap.turnoActual;
    }

    private serializarCarta(c: Carta): SnapshotCarta {
        return {
            id: c.id,
            nombre: c.nombre,
            descripcion: c.descripcion,
            tipoDeUso: c.tipoDeUso,
            efecto: c.efecto,
            esConjurada: c.esConjurada,
            tipoEmbrujo: c.tipoEmbrujo,
            idDuenoDelPerro: c.idDuenoDelPerro,
            idGranDesaparicion: c.idGranDesaparicion,
            esPlanta: c.esPlanta,
            estaHackeada: c.estaHackeada,
            number: Array.from(c.number.entries()),
            string: Array.from(c.string.entries())
        };
    }

    private deserializarCarta(sc: SnapshotCarta): Carta {
        const c = new Carta();
        c.id = sc.id;
        c.nombre = sc.nombre;
        c.descripcion = sc.descripcion;
        c.tipoDeUso = sc.tipoDeUso;
        c.efecto = sc.efecto;
        c.esConjurada = sc.esConjurada;
        c.tipoEmbrujo = sc.tipoEmbrujo;
        c.idDuenoDelPerro = sc.idDuenoDelPerro;
        c.idGranDesaparicion = sc.idGranDesaparicion;
        c.esPlanta = sc.esPlanta;
        c.estaHackeada = sc.estaHackeada;
        for (const [k, v] of sc.number) c.number.set(k, v);
        for (const [k, v] of sc.string) c.string.set(k, v);
        return c;
    }

    private serializarJugador(id: string, j: Jugador): SnapshotJugador {
        return {
            id,
            opcionesPersonaje: Array.from(j.opcionesPersonaje).map((o) => ({
                nombre: o.nombre,
                habilidad: o.habilidad,
                vidasBase: o.vidasBase,
                spriteFueraDeJuego: o.spriteFueraDeJuego
            })),
            yaEligioPersonaje: j.yaEligioPersonaje,
            nombre: j.nombre,
            avatar: j.avatar,
            esAnfitrion: j.esAnfitrion,
            rol: j.rol,
            vidas: j.vidas,
            estaVivo: j.estaVivo,
            vidasMaximas: j.vidasMaximas,
            yaDisparo: j.yaDisparo,
            personaje: j.personaje,
            nombreMostrar: j.nombreMostrar,
            habilidad: j.habilidad,
            sfxDefault: j.sfxDefault,
            spriteAvatarOpcional: j.spriteAvatarOpcional,
            sfxMuerte: [...j.sfxMuerte] as [string, boolean, number?],
            turnosEscudos: [...j.turnosEscudos],
            mano: Array.from(j.mano).map((c) => this.serializarCarta(c)),
            equipamiento: Array.from(j.equipamiento.entries()).map(([k, c]) => [
                k,
                this.serializarCarta(c)
            ]),
            embrujos: Array.from(j.embrujos),
            habilidadesActivas: Array.from(j.habilidadesActivas).map((h) => ({
                id: h.id,
                textoBoton: h.textoBoton,
                spriteBoton: h.spriteBoton,
                tooltip: h.tooltip
            })),
            estaDesconectado: j.estaDesconectado,
            yaJugoFantasma: j.yaJugoFantasma,
            puedeUsarFallo: j.puedeUsarFallo,
            vidasEscudo: j.vidasEscudo,
            tieneBarrilPasiva: j.tieneBarrilPasiva,
            modificarDistancia: j.modificarDistancia,
            modificarAlcance: j.modificarAlcance,
            estaMuertoFalso: j.estaMuertoFalso,
            rondasMuerto: j.rondasMuerto,
            beneficiarseDeSuMuerte: j.beneficiarseDeSuMuerte,
            transformarCuraEnEscudo: j.transformarCuraEnEscudo,
            geometryDashModo: j.geometryDashModo,
            number: Array.from(j.number.entries()),
            boolean: Array.from(j.boolean.entries()),
            string: Array.from(j.string.entries()),
            efecto: Array.from(j.efecto.entries()),
            estadistica: Array.from(j.estadistica.entries()),
            esNpc: j.esNpc,
            idDueno: j.idDueno,
            reroll: j.reroll
        };
    }

    private deserializarJugador(sj: SnapshotJugador): Jugador {
        const j = new Jugador();
        for (const o of sj.opcionesPersonaje) {
            const op = new OpcionPersonaje();
            op.nombre = o.nombre;
            op.habilidad = o.habilidad;
            op.vidasBase = o.vidasBase;
            op.spriteFueraDeJuego = o.spriteFueraDeJuego;
            j.opcionesPersonaje.push(op);
        }
        j.yaEligioPersonaje = sj.yaEligioPersonaje;
        j.nombre = sj.nombre;
        j.avatar = sj.avatar;
        j.esAnfitrion = sj.esAnfitrion;
        j.rol = sj.rol;
        j.vidas = sj.vidas;
        j.estaVivo = sj.estaVivo;
        j.vidasMaximas = sj.vidasMaximas;
        j.yaDisparo = sj.yaDisparo;
        j.personaje = sj.personaje;
        j.nombreMostrar = sj.nombreMostrar;
        j.habilidad = sj.habilidad;
        j.sfxDefault = sj.sfxDefault;
        j.spriteAvatarOpcional = sj.spriteAvatarOpcional;
        j.sfxMuerte = [...sj.sfxMuerte] as [string, boolean, number?];
        j.turnosEscudos = [...sj.turnosEscudos];

        for (const sc of sj.mano) j.mano.push(this.deserializarCarta(sc));
        for (const [k, sc] of sj.equipamiento) j.equipamiento.set(k, this.deserializarCarta(sc));
        for (const e of sj.embrujos) j.embrujos.push(e);
        for (const h of sj.habilidadesActivas) {
            const hab = new HabilidadActiva();
            hab.id = h.id;
            hab.textoBoton = h.textoBoton;
            hab.spriteBoton = h.spriteBoton;
            hab.tooltip = h.tooltip;
            j.habilidadesActivas.push(hab);
        }

        j.estaDesconectado = sj.estaDesconectado;
        j.yaJugoFantasma = sj.yaJugoFantasma;
        j.puedeUsarFallo = sj.puedeUsarFallo;
        j.vidasEscudo = sj.vidasEscudo;
        j.tieneBarrilPasiva = sj.tieneBarrilPasiva;
        j.modificarDistancia = sj.modificarDistancia;
        j.modificarAlcance = sj.modificarAlcance;
        j.estaMuertoFalso = sj.estaMuertoFalso;
        j.rondasMuerto = sj.rondasMuerto;
        j.beneficiarseDeSuMuerte = sj.beneficiarseDeSuMuerte;
        j.transformarCuraEnEscudo = sj.transformarCuraEnEscudo;
        j.geometryDashModo = sj.geometryDashModo;

        for (const [k, v] of sj.number) j.number.set(k, v);
        for (const [k, v] of sj.boolean) j.boolean.set(k, v);
        for (const [k, v] of sj.string) j.string.set(k, v);
        for (const [k, v] of sj.efecto) j.efecto.set(k, v);
        for (const [k, v] of sj.estadistica) j.estadistica.set(k, v);

        j.esNpc = sj.esNpc;
        j.idDueno = sj.idDueno;
        j.reroll = sj.reroll;
        return j;
    }
}