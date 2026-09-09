import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { IMyRoom } from "./IMyRoom.js";
import { Carta, Jugador } from "./schema/MyRoomState.js";

export class Utilidades {

    public static procesarDano(sala: any, victima: Jugador, atacante: Jugador, cantidad: number, causa: string, ignoraEscudo: boolean = false): void {
        if (!victima){
            console.error("ERROR: victima no existe en procesarDano");
            return;
        }
        if (!victima.estaVivo){
            return;
        }

        // --- SISTEMA NUEVO: CALABAZA ---
        let cartaCalabaza = victima.equipamiento.get("calabaza");
        if (cartaCalabaza){
            sala.agregarAlDescarte(cartaCalabaza, victima, null);
            victima.equipamiento.delete("calabaza");
            sala.broadcast("notificacion_turno", `🎃 La Calabaza de ${victima.personaje} lo protege del ataque.`);
            return;
        }

        // --- SISTEMA NUEVO: HUMOSETA ---
        if (atacante && atacante.equipamiento.has("humoseta")){
            ignoraEscudo = true;
        }

        if (causa == "BANG"){
            if (atacante){
                if (atacante.boolean.get("chispitasCargado")){
                    atacante.boolean.set("chispitasCargado", false);
                    cantidad = 999;
                }
                // --- SISTEMA NUEVO: PLANTORCHA ---
                if (atacante.equipamiento.has("plantorcha")){
                    cantidad += 1;
                }
                if (atacante.boolean.get("mercyActivada")){
                    this.aplicarCuracion(sala, victima, cantidad, causa, false);
                    this.aplicarCuracion(sala, atacante, 1, causa, false)
                    return;              
                }
            }
        }

        let danoRestante = cantidad;
        let cantidadDanoEscudo = 0;

        if (!ignoraEscudo) {
            while (danoRestante > 0 && victima.turnosEscudos && victima.turnosEscudos.length > 0) {
                victima.turnosEscudos.shift(); 
                victima.vidasEscudo--;         
                cantidadDanoEscudo++;
                danoRestante--;
            }
        }

        let cantidadDanoCuerpo = danoRestante;
        if (cantidadDanoCuerpo > 0) {
            victima.vidas -= cantidadDanoCuerpo;
        }

        let pasivaVictima = sala.gestorPersonajes.obtener(victima.personaje);
        if (pasivaVictima && pasivaVictima.onRecibirDano) {
            pasivaVictima.onRecibirDano(sala, victima, atacante, causa, cantidad, cantidadDanoCuerpo, cantidadDanoEscudo);
        }

        let pasivaAtacante = sala.gestorPersonajes.obtener(atacante?.personaje);
        if (pasivaAtacante && pasivaAtacante.onGolpear) {
            pasivaAtacante.onGolpear(sala, atacante, victima);
        }

        sala.broadcast("animacionJugador", {personaje: victima.personaje, animacion: "recibirDano"});
        sala.evaluarMuerte(victima, atacante, ignoraEscudo);
    }

    public static agregarEscudos(sala: any, jugador: any, cantidad: number, duracion: number, causa: string): void {
        if (!jugador || !jugador.estaVivo) return;
        if (!jugador.turnosEscudos) jugador.turnosEscudos = [];

        for (let i = 0; i < cantidad; i++) {
            if (jugador.turnosEscudos.length < 10){
                jugador.turnosEscudos.push(duracion);
            }
        }
        jugador.vidasEscudo = jugador.turnosEscudos.length;

        let pasiva = sala.gestorPersonajes.obtener(jugador.personaje);
        if (pasiva && pasiva.onRecibirEscudo) {
            pasiva.onRecibirEscudo(sala, jugador, cantidad, causa);
        }
    }

    public static puedeRecibirCuracion(sala: any, jugador: any): boolean {
        if (!jugador || !jugador.estaVivo) return false;
        if (jugador.transformarCuraEnEscudo) return true;

        let totalVivos = 0;
        sala.state.jugadores.forEach((j: any) => {
            if (j && j.estaVivo) totalVivos++;
        });

        if (totalVivos === 2) return true;
        return jugador.vidas < jugador.vidasMaximas;
    }

    public static aplicarCuracion(sala: any, jugador: any, cantidadBase: number, causa: string, forzarCuracion: boolean): void {
        if (!jugador || !jugador.estaVivo) return;

        let cantidadFinal = cantidadBase;
        let pasiva = sala.gestorPersonajes.obtener(jugador.personaje);

        if (causa === "BOTIQUIN" && pasiva && pasiva.modificarCuraBotiquin) {
            cantidadFinal += pasiva.modificarCuraBotiquin(sala, jugador);
        }

        let totalVivos = 0;
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo) totalVivos++;
        });

        if (jugador.transformarCuraEnEscudo && !forzarCuracion) {
            Utilidades.agregarEscudos(sala, jugador, cantidadFinal, Infinity, "CURACION");
        } else if (totalVivos === 2 && !forzarCuracion) {
            Utilidades.agregarEscudos(sala, jugador, cantidadFinal, 1, "CURACION");
            sala.broadcast("notificacion_turno", `🛡️ ¡En duelo a muerte, la curación de ${jugador.personaje} se transforma en Escudo Temporal!`);
        } else {
            jugador.vidas += cantidadFinal;
            let excedente = Math.max(0, jugador.vidas - jugador.vidasMaximas);
            if (jugador.vidas > jugador.vidasMaximas) {
                jugador.vidas = jugador.vidasMaximas;
            }

            if (jugador.boolean.get("botiquinExcedenteAEscudo")){
                this.agregarEscudos(sala, jugador, excedente, 1, "PASIVA");
            }

            if (pasiva && pasiva.onRecibirCuracion) {
                pasiva.onRecibirCuracion(sala, jugador);
            }
            sala.broadcast("animacionJugador", {personaje: jugador.personaje, animacion: "recibirCuracion"});
        }
    }

    // ==============================================================
    // NUEVO SISTEMA DE EQUIPAMIENTO CENTRALIZADO
    // ==============================================================

    /**
     * Equipa una carta en el mapa. Si ya había una en ese hueco, la descarta.
     * Huecos comunes: "arma", "mustang", "mira", "barril", "prision", "dinamita", "papa", "calabaza", "plantorcha", "humoseta".
     */
    public static equiparCarta(sala: any, jugador: Jugador, carta: Carta, hueco: string): void {
        if (jugador.equipamiento.has(hueco)) {
            let cartaVieja = jugador.equipamiento.get(hueco);
            sala.agregarAlDescarte(cartaVieja, jugador, null);
        }
        jugador.equipamiento.set(hueco, carta);
    }

    /**
     * Devuelve las stats del arma calculadas dinámicamente desde el efecto de la carta.
     * Si no hay arma, devuelve las stats por defecto (Colt .45)
     */
    public static getDatosArma(jugador: Jugador) {
        let arma = jugador.equipamiento.get("arma");
        if (!arma) return { nombre: "Colt .45", alcance: 1, danoExtra: 0, alcanceMinimo: 0 };
        
        // Formato esperado en el efecto de armas: "equipar_arma_alcance_danoExtra_alcanceMinimo"
        // Ej: "equipar_arma_3_0_0" o "equipar_arma_999_0_2"
        let partes = arma.efecto.split("_");
        return {
            nombre: arma.nombre,
            alcance: parseInt(partes[2]) || 1,
            danoExtra: parseInt(partes[3]) || 0,
            alcanceMinimo: parseInt(partes[4]) || 0
        };
    }

    /**
     * Descarta un equipamiento aleatorio. 100% dinámico y escalable.
     */
    public static descartarEquipamientoAleatorio(sala: any, jugador: Jugador, client: any): Carta | null {
        if (jugador.equipamiento.size === 0) return null;

        let claves = Array.from(jugador.equipamiento.keys());
        let claveElegida = claves[Math.floor(Math.random() * claves.length)];
        
        let cartaPerdida = jugador.equipamiento.get(claveElegida);
        jugador.equipamiento.delete(claveElegida);

        if (cartaPerdida) {
            sala.agregarAlDescarte(cartaPerdida, jugador, client);
            return cartaPerdida;
        }
        return null; 
    }

    /**
     * Limpia la mesa entera del jugador (Por muerte o por Petaseta).
     */
    public static destruirTodosLosEquipamientos(sala: any, jugador: Jugador): void {
        jugador.equipamiento.forEach((carta: Carta, clave: string) => {
            sala.agregarAlDescarte(carta, jugador, null);
        });
        jugador.equipamiento.clear();
    }

    public static descartarCartaAleatoriaDeLaMano(jugador: any): any | null {
        if (!jugador || !jugador.mano || jugador.mano.length === 0) return null;
        let indiceAleatorio = Math.floor(Math.random() * jugador.mano.length);
        return jugador.mano.splice(indiceAleatorio, 1)[0];
    }

    // ==============================================================
    // FUNCIONES DE MEJORA PARA ROBIN (Y FUTURAS CARTAS)
    // ==============================================================

    public static mejorarEquipamientoAleatorio(sala: any, jugador: Jugador): string {
        let opcionesDeMejora: string[] = [];

        let mustang = jugador.equipamiento.get("mustang");
        if (mustang && mustang.nombre === "Caballo") opcionesDeMejora.push("mustang");

        let mira = jugador.equipamiento.get("mira");
        if (mira && mira.nombre === "Monoaldea") opcionesDeMejora.push("mira");

        let barril = jugador.equipamiento.get("barril");
        if (barril && barril.nombre === "Barril") opcionesDeMejora.push("barril");

        let datosArmaActual = this.getDatosArma(jugador);
        let siguienteArma = this.obtenerSiguienteArma(datosArmaActual.nombre);
        if (siguienteArma) opcionesDeMejora.push("arma");

        if (opcionesDeMejora.length === 0) return "";

        let eleccion = opcionesDeMejora[Math.floor(Math.random() * opcionesDeMejora.length)];
        
        return this.mejorarEquipamientoEspecifico(sala, jugador, eleccion, siguienteArma);
    }

    public static mejorarEquipamientoEspecifico(sala: any, jugador: Jugador, hueco: string, datosNuevaArma: any = null): string {
        let textoMejora = "";

        if (hueco === "mustang") {
            let cartaMejorada = CatalogoCartasEspeciales.crearCaballoPro();
            this.equiparCarta(sala, jugador, cartaMejorada, "mustang");
            textoMejora = "su Caballo";
        } 
        else if (hueco === "mira") {
            let cartaMejorada = CatalogoCartasEspeciales.crearMonoaldeaPro();
            this.equiparCarta(sala, jugador, cartaMejorada, "mira");
            textoMejora = "su Monoaldea";
        } 
        else if (hueco === "barril") {
            let cartaMejorada = CatalogoCartasEspeciales.crearBarrilPro();
            this.equiparCarta(sala, jugador, cartaMejorada, "barril");
            textoMejora = "su Barril";
        } 
        else if (hueco === "arma" && datosNuevaArma) {
            let cartaArmaNueva = CatalogoCartasEspeciales.crearArma(datosNuevaArma.nombre, datosNuevaArma.alcance);
            this.equiparCarta(sala, jugador, cartaArmaNueva, "arma");
            textoMejora = `su arma a ${datosNuevaArma.nombre}`;
        }

        return textoMejora;
    }

    private static obtenerSiguienteArma(armaActual: string): any {
        const secuencia = [
            { nombre: "Colt .45", alcance: 1 },
            { nombre: "Pistola de Shion", alcance: 2 },
            { nombre: "Revolver de Casiddy", alcance: 3 },
            { nombre: "Rifle de Ashe", alcance: 4 },
            { nombre: "Francotirador", alcance: 5 }
        ];

        let index = secuencia.findIndex(a => a.nombre === armaActual);
        if (index !== -1 && index < secuencia.length - 1) {
            return secuencia[index + 1];
        }
        return null; 
    }

    /**
     * Desequipa una carta del mapa, la elimina del equipamiento y la devuelve.
     * Ideal para Pánico, Cocoroch o cuando un equipamiento se consume (Dinamita/Prisión).
     */
    public static quitarEquipamiento(jugador: Jugador, hueco: string): Carta | null {
        if (!jugador || !jugador.equipamiento) return null;

        if (jugador.equipamiento.has(hueco)) {
            let cartaRemovida = jugador.equipamiento.get(hueco);
            jugador.equipamiento.delete(hueco);
            return cartaRemovida;
        }

        return null;
    }

    /**
     * Busca en la sala a un jugador específico y devuelve su Session ID (Client ID).
     * Devuelve un string vacío "" si no lo encuentra.
     */
    public static obtenerSessionIdDeJugador(sala: IMyRoom, jugadorBuscado: Jugador): string {
        if (!sala || !jugadorBuscado) return "";
        
        let idEncontrado = "";
        
        sala.getJugadores().forEach((j: any, sessionId: string) => {
            if (j === jugadorBuscado) {
                idEncontrado = sessionId;
            }
        });
        
        return idEncontrado;
    }

    /**
     * Busca en la sala a un jugador usando su Session ID (Client ID) y devuelve el objeto Jugador.
     * Devuelve null si no lo encuentra (por ejemplo, si se desconectó).
     */
    public static obtenerJugadorPorSessionId(sala: IMyRoom, sessionId: string): Jugador | null {
        if (!sala || !sessionId) return null;
        
        // El MapSchema nos permite buscar directamente por la clave
        let jugador = sala.getJugadores().get(sessionId);
        
        return jugador || null;
    }

    /**
     * Mueve físicamente a un jugador en la mesa intercambiando su silla con el rival vivo más cercano en esa dirección.
     * No afecta el orden de los turnos. Devuelve el jugador desplazado o null si falló.
     */
    public static moverPosicionFisica(sala: IMyRoom, jugador: Jugador, direccion: "antihorario" | "horario"): Jugador | null {
        // esto lo hago porque visualmente es al reves, si decis antihorario, visualmente será antihorario pero en codigo será horario
        if (direccion == "antihorario"){
            direccion = "horario"
        } else {
            direccion = "antihorario"
        }

        let state = (sala as any).state;
        let idOrigen = this.obtenerSessionIdDeJugador(sala, jugador);
        if (!idOrigen) return null;

        let arraySillas = state.ordenSillasFisicas;
        let idxOrigen = arraySillas.indexOf(idOrigen);
        if (idxOrigen === -1) return null;

        let n = arraySillas.length;
        // Derecha suma (+1), Izquierda resta (-1)
        let paso = (direccion === "antihorario") ? 1 : -1; 
        
        let idxDestino = -1;
        let jugadorDestino: Jugador | null = null;

        // Buscamos la siguiente silla que tenga a alguien VIVO
        for (let i = 1; i < n; i++) {
            // El (+ n) % n asegura que si estamos en el índice 0 y restamos 1, demos la vuelta al final de la mesa
            let idxTest = (idxOrigen + (paso * i) + n) % n; 
            let idTest = arraySillas[idxTest];
            let jugTest = state.jugadores.get(idTest);
            
            if (jugTest && jugTest.estaVivo) {
                idxDestino = idxTest;
                jugadorDestino = jugTest;
                break;
            }
        }

        if (idxDestino !== -1 && jugadorDestino) {
            // ¡Intercambiamos los IDs en el array visual/físico!
            let temp = arraySillas[idxOrigen];
            arraySillas[idxOrigen] = arraySillas[idxDestino];
            arraySillas[idxDestino] = temp;

            //sala.agregarRegistro(`🪑 ¡${jugador.personaje} se movió a la ${direccion} e intercambió asiento con ${jugadorDestino.personaje}!`);
            
            return jugadorDestino;
        }

        return null; // Nadie vivo para intercambiar
    }
}