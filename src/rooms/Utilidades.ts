import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import type { IMyRoom } from "./IMyRoom.js";
import { Carta, Jugador } from "./schema/MyRoomState.js";

export type TipoEstadistica =
    | "🔫daño"
    | "💚curacion"
    | "🛡️escudos"
    | "💔daño recibido"
    | "🃏jugadas";

interface ReglaMejoraEquipamiento {
    hueco: string;
    texto: string;
    crear: () => Carta;
}

const SECUENCIA_ARMAS_BASICAS: ReadonlyArray<{ nombre: string; alcance: number }> = [
    { nombre: "Colt .45", alcance: 1 },
    { nombre: "Pistola de Shion", alcance: 2 },
    { nombre: "Revolver de Casiddy", alcance: 3 },
    { nombre: "Rifle de Ashe", alcance: 4 },
    { nombre: "Francotirador", alcance: 5 }
];

const TABLA_MEJORAS: Record<string, ReglaMejoraEquipamiento> = {
    "Caballo": {
        hueco: "mustang",
        texto: "su Caballo",
        crear: () => CatalogoCartasEspeciales.crearCaballoPro()
    },
    "Caballo maldito": {
        hueco: "mustang",
        texto: "su Caballo maldito",
        crear: () => CatalogoCartasEspeciales.crearCaballoMalditoPro()
    },
    "Monoaldea": {
        hueco: "mira",
        texto: "su Monoaldea",
        crear: () => CatalogoCartasEspeciales.crearMonoaldeaPro()
    },
    "Monoaldea maldita": {
        hueco: "mira",
        texto: "su Monoaldea maldita",
        crear: () => CatalogoCartasEspeciales.crearMonoaldeaMalditaPro()
    },
    "Barril": {
        hueco: "barril",
        texto: "su Barril",
        crear: () => CatalogoCartasEspeciales.crearBarrilPro()
    },
    "Dinamita": {
        hueco: "dinamita",
        texto: "su Dinamita",
        crear: () => CatalogoCartasEspeciales.crearDinamitaPro()
    },
    "Mini dinamita": {
        hueco: "miniDinamita",
        texto: "su Mini dinamita",
        crear: () => CatalogoCartasEspeciales.crearMiniDinamitaPro()
    },
    "Papapum": {
        hueco: "papa",
        texto: "su Papapum a Papapum primitiva",
        crear: () => CatalogoCartasEspeciales.crearPapapumPrimitiva()
    },
    "Girasol": {
        hueco: "girasol",
        texto: "su Girasol",
        crear: () => CatalogoCartasEspeciales.crearBirasol()
    },
    "Espiritu alegre": {
        hueco: "espiritu",
        texto: "su Espiritu alegre",
        crear: () => CatalogoCartasEspeciales.crearEspirituAlegrePro()
    },
    "Espiritu enojado": {
        hueco: "espiritu",
        texto: "su Espiritu enojado",
        crear: () => CatalogoCartasEspeciales.crearEspirituEnojadoPro()
    },
    "Espantacocoroch": {
        hueco: "espantacocoroch",
        texto: "su Espantacocoroch",
        crear: () => CatalogoCartasEspeciales.crearEspantacocorochPro()
    },
    "Pistola de Tracer": {
        hueco: "arma",
        texto: "su arma a Pistola de Tracer Pro",
        crear: () => CatalogoCartasEspeciales.crearPistolaDeTracerPro()
    },
    "Escopetas de Reaper": {
        hueco: "arma",
        texto: "su arma a Escopetas de Reaper Pro",
        crear: () => CatalogoCartasEspeciales.crearEscopetasReaperPro()
    },
    "Tirachinas": {
        hueco: "arma",
        texto: "su arma a Tirachinas maestro",
        crear: () => CatalogoCartasEspeciales.crearTirachinasMaestro()
    },
    "Espada galactica": {
        hueco: "arma",
        texto: "su arma a Espada galactica Pro",
        crear: () => CatalogoCartasEspeciales.crearEspadaGalacticaPro()
    }
};

export class Utilidades {
    // =========================================================================
    // 1. IDENTIDAD, BLOQUEO, CONTROL DE IA Y BÚSQUEDA DE JUGADORES
    // =========================================================================

    public static obtenerNombreVisual(jugador: Jugador | null | undefined): string {
        if (!jugador) return "Alguien";
        return jugador.nombreMostrar || jugador.personaje || jugador.nombre || "Alguien";
    }

    public static estaBloqueado(jugador: Jugador | null | undefined): boolean {
        if (!jugador || !jugador.efecto) return false;
        return (jugador.efecto.get("bloqueado") ?? 0) > 0;
    }

    public static puedeUsarCartaFallo(jugador: Jugador): boolean {
        if (this.estaBloqueado(jugador)) return true;
        return jugador.puedeUsarFallo && !jugador.boolean.get("frankFallo");
    }

    public static esControladoPorIA(jugador: Jugador | null | undefined): boolean {
        if (!jugador) return false;
        return jugador.esNpc || jugador.equipamiento.has("manipulacion");
    }

    public static obtenerIdControlador(jugador: Jugador): string {
        const manipulacion = jugador.equipamiento.get("manipulacion");
        if (manipulacion) {
            return manipulacion.string.get("idManipulador") ?? "";
        }
        return jugador.idDueno;
    }

    public static obtenerSessionIdDeJugador(sala: IMyRoom, jugadorBuscado: Jugador): string {
        if (!sala || !jugadorBuscado) return "";

        let idEncontrado = "";
        sala.getJugadores().forEach((j: Jugador, sessionId: string) => {
            if (j === jugadorBuscado) {
                idEncontrado = sessionId;
            }
        });
        return idEncontrado;
    }

    public static obtenerJugadorPorSessionId(sala: IMyRoom, sessionId: string): Jugador | null {
        if (!sala || !sessionId) return null;
        return sala.getJugadores().get(sessionId) ?? null;
    }

    // =========================================================================
    // 2. ESCUDOS Y CURACIÓN
    // =========================================================================

    public static agregarEscudos(
        sala: IMyRoom,
        jugador: Jugador,
        cantidad: number,
        duracion: number,
        causa: string
    ): void {
        if (!jugador || !jugador.estaVivo || cantidad <= 0) return;
        if (!jugador.turnosEscudos) jugador.turnosEscudos = [];

        for (let i = 0; i < cantidad; i++) {
            if (jugador.turnosEscudos.length < 10) {
                jugador.turnosEscudos.push(duracion);
            }
        }
        jugador.vidasEscudo = jugador.turnosEscudos.length;

        sala.motorEventos.disparar(jugador, "onRecibirEscudo", jugador, cantidad, causa);
        this.agregarEstadistica(jugador, cantidad, "🛡️escudos");
    }

    public static puedeRecibirCuracion(sala: IMyRoom, jugador: Jugador): boolean {
        if (!jugador || !jugador.estaVivo) return false;
        const bloqueado = this.estaBloqueado(jugador);

        if (jugador.transformarCuraEnEscudo && !bloqueado) return true;
        const npcCurable =
            (jugador.boolean.get("lawrieCura") || jugador.boolean.get("npcPuedeCurarse")) && !bloqueado;
        if (jugador.esNpc && !npcCurable) return false;
        if (jugador.efecto.has("malestar")) return false;

        if (sala.getTotalJugadoresVivos() === 2) return true;
        return jugador.vidas < jugador.vidasMaximas;
    }

    public static aplicarCuracion(
        sala: IMyRoom,
        jugador: Jugador,
        cantidadBase: number,
        causa: string,
        forzarCuracion: boolean = false
    ): void {
        if (!jugador || !jugador.estaVivo) return;

        let cantidadFinal = cantidadBase;
        if (causa === "BOTIQUIN") {
            cantidadFinal += sala.motorEventos.sumar(jugador, "modificarCuraBotiquin", jugador);
        }
        cantidadFinal += sala.motorEventos.sumar(jugador, "modificarCuracion", jugador);

        const totalVivos = sala.getTotalJugadoresVivos();

        if (jugador.transformarCuraEnEscudo && !this.estaBloqueado(jugador) && !forzarCuracion) {
            this.agregarEscudos(sala, jugador, cantidadFinal, Infinity, "CURACION");
            return;
        }

        if (totalVivos === 2 && !forzarCuracion) {
            this.agregarEscudos(sala, jugador, cantidadFinal, 1, "CURACION");
            sala.agregarRegistro(
                `🛡️ ¡En duelo a muerte, la curación de ${this.obtenerNombreVisual(jugador)} se transforma en Escudo Temporal!`
            );
            return;
        }

        const vidasAntes = jugador.vidas;
        jugador.vidas += cantidadFinal;
        const excedente = Math.max(0, jugador.vidas - jugador.vidasMaximas);

        if (jugador.vidas > jugador.vidasMaximas) {
            jugador.vidas = jugador.vidasMaximas;
        }

        if (jugador.boolean.get("botiquinExcedenteAEscudo") && excedente > 0) {
            this.agregarEscudos(sala, jugador, excedente, 1, "PASIVA");
        }

        sala.motorEventos.disparar(jugador, "onRecibirCuracion", jugador);

        const vidasCuradas = jugador.vidas - vidasAntes;
        if (vidasCuradas > 0) {
            this.agregarEstadistica(jugador, vidasCuradas, "💚curacion");
        }

        const idJugador = this.obtenerSessionIdDeJugador(sala, jugador);
        if (idJugador) {
            sala.animacionJugador(idJugador, "recibirCuracion");
        }
    }

    // =========================================================================
    // 3. EQUIPAMIENTO Y MEJORAS
    // =========================================================================

    public static equiparCarta(sala: IMyRoom, jugador: Jugador, carta: Carta, hueco: string): void {
        carta.idDuenoDelPerro = "";
        carta.estaHackeada = false;

        if (jugador.equipamiento.has(hueco)) {
            const cartaVieja = jugador.equipamiento.get(hueco);
            if (cartaVieja) {
                sala.agregarAlDescarte(cartaVieja);
            }
        }
        jugador.equipamiento.set(hueco, carta);

        sala.motorEventos.disparar(jugador, "onEquiparCarta", jugador, carta, hueco);
    }

    public static quitarEquipamiento(jugador: Jugador, hueco: string): Carta | null {
        if (!jugador || !jugador.equipamiento || !jugador.equipamiento.has(hueco)) return null;
        const cartaRemovida = jugador.equipamiento.get(hueco) ?? null;
        jugador.equipamiento.delete(hueco);
        return cartaRemovida;
    }

    public static descartarEquipamientoAleatorio(sala: IMyRoom, jugador: Jugador): Carta | null {
        if (jugador.equipamiento.size === 0) return null;

        const claves = Array.from(jugador.equipamiento.keys());
        const claveElegida = claves[Math.floor(Math.random() * claves.length)];
        const cartaPerdida = this.quitarEquipamiento(jugador, claveElegida);

        if (cartaPerdida) {
            sala.agregarAlDescarte(cartaPerdida);
            return cartaPerdida;
        }
        return null;
    }

    public static destruirTodosLosEquipamientos(sala: IMyRoom, jugador: Jugador): void {
        jugador.equipamiento.forEach((carta: Carta) => {
            sala.agregarAlDescarte(carta);
        });
        jugador.equipamiento.clear();
    }

    public static mejorarEquipamientoAleatorio(sala: IMyRoom, jugador: Jugador): string {
        const opciones: ReglaMejoraEquipamiento[] = [];

        jugador.equipamiento.forEach((carta: Carta) => {
            const regla = TABLA_MEJORAS[carta.nombre];
            if (regla) opciones.push(regla);
        });

        const armaActual = sala.sistemaCombate.getDatosArma(jugador);
        const idxArma = SECUENCIA_ARMAS_BASICAS.findIndex((a) => a.nombre === armaActual.nombre);
        if (idxArma !== -1 && idxArma < SECUENCIA_ARMAS_BASICAS.length - 1) {
            const siguiente = SECUENCIA_ARMAS_BASICAS[idxArma + 1];
            opciones.push({
                hueco: "arma",
                texto: `su arma a ${siguiente.nombre}`,
                crear: () => CatalogoCartasEspeciales.crearArma(siguiente.nombre, siguiente.alcance)
            });
        }

        if (opciones.length === 0) return "";

        const elegida = opciones[Math.floor(Math.random() * opciones.length)];
        const cartaVieja = jugador.equipamiento.get(elegida.hueco);
        const cartaMejorada = elegida.crear();
        cartaMejorada.esConjurada = true;

        if (cartaVieja?.number.has("probabilidadPapa")) {
            cartaMejorada.number.set("probabilidadPapa", cartaVieja.number.get("probabilidadPapa") ?? 1);
        }

        this.equiparCarta(sala, jugador, cartaMejorada, elegida.hueco);
        return elegida.texto;
    }

    // =========================================================================
    // 4. MANO, CARTAS Y CLONADO
    // =========================================================================

    public static descartarCartaAleatoriaDeLaMano(jugador: Jugador): Carta | null {
        if (!jugador || !jugador.mano || jugador.mano.length === 0) return null;
        const indiceAleatorio = Math.floor(Math.random() * jugador.mano.length);
        return jugador.mano.splice(indiceAleatorio, 1)[0] ?? null;
    }

    public static eliminarCartaDeLaMano(jugador: Jugador, carta: Carta): boolean {
        const idx = jugador.mano.findIndex((c: Carta) => c === carta || c.id === carta.id);
        if (idx === -1) return false;
        jugador.mano.splice(idx, 1);
        return true;
    }

    public static buscarCartaPorNombre(jugador: Jugador, nombreCarta: string): Carta | null {
        if (!jugador || !jugador.mano) return null;
        return jugador.mano.find((c: Carta) => c.nombre === nombreCarta) ?? null;
    }

    public static contarCartasPorNombre(jugador: Jugador, nombreCarta: string): number {
        if (!jugador || !jugador.mano) return 0;
        return jugador.mano.filter((c: Carta) => c.nombre === nombreCarta).length;
    }

    public static clonarCarta(
        cartaOriginal: Carta,
        prefijoId: string = "clon",
        forzarConjurada: boolean = true
    ): Carta {
        const clon = new Carta();
        clon.id = `${prefijoId}_${cartaOriginal.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = cartaOriginal.nombre;
        clon.descripcion = cartaOriginal.descripcion;
        clon.tipoDeUso = cartaOriginal.tipoDeUso;
        clon.efecto = cartaOriginal.efecto;
        clon.esConjurada = forzarConjurada ? true : cartaOriginal.esConjurada;
        clon.tipoEmbrujo = cartaOriginal.tipoEmbrujo;
        clon.idDuenoDelPerro = cartaOriginal.idDuenoDelPerro;
        clon.idGranDesaparicion = cartaOriginal.idGranDesaparicion;
        clon.esPlanta = cartaOriginal.esPlanta;
        clon.estaHackeada = false;

        if (cartaOriginal.number) {
            cartaOriginal.number.forEach((valor: number, clave: string) => {
                clon.number.set(clave, valor);
            });
        }

        if (cartaOriginal.string) {
            cartaOriginal.string.forEach((valor: string, clave: string) => {
                clon.string.set(clave, valor);
            });
        }

        return clon;
    }

    // =========================================================================
    // 5. POSICIONES EN MESA E INVOCACIÓN DE NPCS
    // =========================================================================

    public static moverPosicionFisica(
        sala: IMyRoom,
        jugador: Jugador,
        direccion: "antihorario" | "horario"
    ): Jugador | null {
        const direccionInterna = direccion === "antihorario" ? "horario" : "antihorario";
        const idOrigen = this.obtenerSessionIdDeJugador(sala, jugador);
        if (!idOrigen) return null;

        const arraySillas = sala.state.ordenSillasFisicas;
        const idxOrigen = arraySillas.indexOf(idOrigen);
        if (idxOrigen === -1) return null;

        const n = arraySillas.length;
        const paso = direccionInterna === "antihorario" ? 1 : -1;

        for (let i = 1; i < n; i++) {
            const idxTest = (idxOrigen + paso * i + n) % n;
            const idTest = arraySillas[idxTest];
            const jugTest = sala.state.jugadores.get(idTest);

            if (jugTest && jugTest.estaVivo) {
                const temp = arraySillas[idxOrigen];
                arraySillas[idxOrigen] = arraySillas[idxTest];
                arraySillas[idxTest] = temp;
                return jugTest;
            }
        }

        return null;
    }

    public static intercambiarPosicionesFisicas(
        sala: IMyRoom,
        jugador1: Jugador,
        jugador2: Jugador
    ): boolean {
        const id1 = this.obtenerSessionIdDeJugador(sala, jugador1);
        const id2 = this.obtenerSessionIdDeJugador(sala, jugador2);
        if (!id1 || !id2) return false;

        const arraySillas = sala.state.ordenSillasFisicas;
        const idx1 = arraySillas.indexOf(id1);
        const idx2 = arraySillas.indexOf(id2);
        if (idx1 === -1 || idx2 === -1) return false;

        const temp = arraySillas[idx1];
        arraySillas[idx1] = arraySillas[idx2];
        arraySillas[idx2] = temp;
        return true;
    }

    public static obtenerJugadoresEnOrdenHorario(
        sala: IMyRoom,
        jugadorInicial: Jugador,
        soloVivos: boolean
    ): Jugador[] {
        const listaOrdenada: Jugador[] = [];
        const idInicial = this.obtenerSessionIdDeJugador(sala, jugadorInicial);
        if (!idInicial) return listaOrdenada;

        const sillasFisicas = Array.from(sala.state.ordenSillasFisicas);
        const idxActual = sillasFisicas.indexOf(idInicial);
        if (idxActual === -1) return listaOrdenada;

        for (let i = 0; i < sillasFisicas.length; i++) {
            const indiceHorario = (idxActual + i) % sillasFisicas.length;
            const jugadorObjetivo = sala.state.jugadores.get(sillasFisicas[indiceHorario]);
            if (jugadorObjetivo && (!soloVivos || jugadorObjetivo.estaVivo)) {
                listaOrdenada.push(jugadorObjetivo);
            }
        }

        return listaOrdenada;
    }

    public static obtenerVecinoVivoEnSentido(
        sala: IMyRoom,
        jugador: Jugador,
        sentido: "horario" | "antihorario"
    ): Jugador | null {
        const idOrigen = this.obtenerSessionIdDeJugador(sala, jugador);
        if (!idOrigen) return null;

        const arraySillas = sala.state.ordenSillasFisicas;
        const idxOrigen = arraySillas.indexOf(idOrigen);
        if (idxOrigen === -1) return null;

        const n = arraySillas.length;
        const paso = sentido === "horario" ? 1 : -1;

        for (let i = 1; i < n; i++) {
            const idxTest = (idxOrigen + paso * i + n) % n;
            const jugTest = sala.state.jugadores.get(arraySillas[idxTest]);
            if (jugTest && jugTest.estaVivo) {
                return jugTest;
            }
        }
        return null;
    }

    public static obtenerSiguienteVivoHorario(sala: IMyRoom, jugador: Jugador): Jugador | null {
        return this.obtenerVecinoVivoEnSentido(sala, jugador, "horario");
    }

    public static invocarNpcEnMesa(
        sala: IMyRoom,
        invocador: Jugador,
        nombrePersonajeNpc: string,
        vidasNpc: number,
        cartasIniciales: number = 0,
        posicionAparicion: "antihorario" | "horario",
        nombrePersonalizado: string = ""
    ): Jugador | null {
        const idInvocador = this.obtenerSessionIdDeJugador(sala, invocador);
        if (!idInvocador) return null;

        const idDuenoRaiz =
            invocador.esNpc && invocador.idDueno !== "" ? invocador.idDueno : idInvocador;

        const idNpc = `npc_${nombrePersonajeNpc.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const npc = new Jugador();

        const datosClase = sala.gestorPersonajes.obtener(nombrePersonajeNpc);
        const nombreVisual = datosClase?.nombreMostrar ?? nombrePersonajeNpc;

        npc.nombre = nombrePersonalizado !== "" ? nombrePersonalizado : nombreVisual;
        npc.personaje = nombrePersonajeNpc;
        npc.nombreMostrar = nombreVisual;
        npc.esNpc = true;
        npc.idDueno = idDuenoRaiz;
        npc.rol = "";
        npc.vidas = vidasNpc;
        npc.vidasMaximas = vidasNpc;
        npc.estaVivo = true;
        npc.yaEligioPersonaje = true;
        npc.beneficiarseDeSuMuerte = false;

        if (datosClase) {
            npc.habilidad = datosClase.habilidad;
            if (datosClase.sfxMuerte) npc.sfxMuerte = datosClase.sfxMuerte;
            if (datosClase.sfxDefault) npc.sfxDefault = datosClase.sfxDefault;
        }

        const offset = posicionAparicion === "horario" ? 1 : 0;

        const sillasTemp = Array.from(sala.state.ordenSillasFisicas);
        const idxFisico = sillasTemp.indexOf(idInvocador);
        if (idxFisico !== -1) sillasTemp.splice(idxFisico + offset, 0, idNpc);
        else sillasTemp.push(idNpc);
        sala.state.ordenSillasFisicas.clear();
        sillasTemp.forEach((id) => sala.state.ordenSillasFisicas.push(id));

        const turnosTemp = Array.from(sala.state.ordenTurnos);
        const idxTurno = turnosTemp.indexOf(idInvocador);
        if (idxTurno !== -1) turnosTemp.splice(idxTurno + offset, 0, idNpc);
        else turnosTemp.push(idNpc);
        sala.state.ordenTurnos.clear();
        turnosTemp.forEach((id) => sala.state.ordenTurnos.push(id));

        sala.state.jugadores.set(idNpc, npc);

        const duenoRaiz = sala.state.jugadores.get(idDuenoRaiz);
        if (duenoRaiz) {
            sala.motorEventos.disparar(duenoRaiz, "onInvocarNpc", duenoRaiz, npc);
        }

        if (cartasIniciales > 0) {
            sala.repartirCartas(npc, cartasIniciales, "inicio_npc");
        }

        if (datosClase?.onAsignar) {
            datosClase.onAsignar(sala, npc, false);
        }

        sala.agregarRegistro(
            `🤖 ¡${this.obtenerNombreVisual(invocador)} invocó a ${this.obtenerNombreVisual(npc)} en la mesa!`
        );
        return npc;
    }

    // =========================================================================
    // 6. EFECTOS, SOLES, ESTADÍSTICAS Y MISCELÁNEOS
    // =========================================================================

    public static agregarEfecto(jugador: Jugador, efecto: string, cantidad: number): number {
        const actual = jugador.efecto.get(efecto) ?? 0;
        const nuevo = actual + cantidad;
        jugador.efecto.set(efecto, nuevo);
        return nuevo;
    }

    public static restarEfecto(jugador: Jugador, efecto: string, cantidad: number): number {
        if (!jugador.efecto.has(efecto)) return 0;
        const nuevo = (jugador.efecto.get(efecto) ?? 0) - cantidad;
        if (nuevo <= 0) {
            jugador.efecto.delete(efecto);
            return 0;
        }
        jugador.efecto.set(efecto, nuevo);
        return nuevo;
    }

    public static eliminarTodosLosEfectos(jugador: Jugador): void {
        jugador.efecto.clear();
    }

    public static darSol(sala: IMyRoom, jugador: Jugador, soles: number): void {
        const nuevoTotal = Math.max(0, (jugador.number.get("soles") ?? 0) + soles);
        jugador.number.set("soles", nuevoTotal);

        while ((jugador.number.get("soles") ?? 0) >= 1) {
            jugador.number.set("soles", (jugador.number.get("soles") ?? 0) - 1);
            const planta = CatalogoCartasEspeciales.crearCartaPlantaAleatoria();
            if (planta) {
                planta.esConjurada = true;
                jugador.mano.push(planta);
                sala.agregarRegistro(
                    `🌻 ¡${this.obtenerNombreVisual(jugador)} obtuvo una planta porque obtuvo 1 sol!`
                );
            }
        }

        sala.reproducirSfx("girasol");
    }

    public static agregarEstadistica(
        jugador: Jugador | null | undefined,
        cantidad: number,
        estadistica: TipoEstadistica
    ): void {
        if (!jugador) return;
        const actual = jugador.estadistica.get(estadistica) ?? 0;
        jugador.estadistica.set(estadistica, actual + cantidad);
    }

    public static bajarVidaMaxima(jugador: Jugador, cantidad: number): number {
        jugador.vidasMaximas = Math.max(1, jugador.vidasMaximas - cantidad);
        if (jugador.vidas > jugador.vidasMaximas) {
            jugador.vidas = jugador.vidasMaximas;
        }
        return jugador.vidasMaximas;
    }

    public static removerBotonActivo(jugador: Jugador, idBoton: string): void {
        const indice = jugador.habilidadesActivas.findIndex((b) => b.id === idBoton);
        if (indice !== -1) {
            jugador.habilidadesActivas.splice(indice, 1);
        }
    }

    public static capitalizar(texto: string): string {
        if (!texto) return "";
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    }
}