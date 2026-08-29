import { Jugador } from "./schema/MyRoomState.js";

export class Utilidades {

    public static procesarDano(sala: any, victima: Jugador, atacante: Jugador, cantidad: number, causa: string, ignoraEscudo: boolean = false): void {
        
        if (!victima || !victima.estaVivo) return; 

        if (causa == "BANG"){
            if (atacante.boolean.get("chispitasCargado")){
                atacante.boolean.set("chispitasCargado", false)
                cantidad = 999
            }
            if (atacante.boolean.get("mercyActivada")){
                this.aplicarCuracion(sala, victima, cantidad, causa) 
                return              
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

        sala.broadcast("animacionJugador", {personaje: victima.personaje, animacion: "recibirDano"})

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

        jugador.vidasEscudo = jugador.turnosEscudos.length

        // --- EL AVISO A LAS PASIVAS ---
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
            if (j.estaVivo) totalVivos++;
        });

        // para 1vs1
        if (totalVivos === 2) return true;

        return jugador.vidas < jugador.vidasMaximas;
    }

    public static aplicarCuracion(sala: any, jugador: any, cantidadBase: number, causa: string): void {
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

        if (jugador.transformarCuraEnEscudo) {
            Utilidades.agregarEscudos(sala, jugador, cantidadFinal, Infinity, "CURACION");
            
        } else if (totalVivos === 2) {
            Utilidades.agregarEscudos(sala, jugador, cantidadFinal, 1, "CURACION");
            sala.broadcast("notificacion_turno", `🛡️ ¡En duelo a muerte, la curación de ${jugador.nombre} se transforma en Escudo Temporal!`);
            
        } else {
            jugador.vidas += cantidadFinal;
            if (jugador.vidas > jugador.vidasMaximas) {
                jugador.vidas = jugador.vidasMaximas;
            }

            if (pasiva && pasiva.onRecibirCuracion) {
                pasiva.onRecibirCuracion(sala, jugador);
            }

            sala.broadcast("animacionJugador", {personaje: jugador.personaje, animacion: "recibirCuracion"})
        }
    }

    public static descartarEquipamientoAleatorio(sala: any, jugador: any, client: any): any | null {
        let opciones: string[] = [];
        
        if (jugador.cartaArma) opciones.push("arma");
        if (jugador.cartaMustang) opciones.push("mustang");
        if (jugador.cartaMira) opciones.push("mira");
        if (jugador.cartaBarril) opciones.push("barril");
        if (jugador.cartaPrision) opciones.push("prision");
        if (jugador.cartaDinamita) opciones.push("dinamita");
        if (jugador.cartaPapa) opciones.push("papa");

        if (opciones.length === 0) return null;

        let elegida = opciones[Math.floor(Math.random() * opciones.length)];
        let cartaPerdida = null;

        if (elegida === "arma") { 
            cartaPerdida = jugador.cartaArma; 
            jugador.cartaArma = null; 
            jugador.nombreArma = "Colt .45"; 
            jugador.alcanceArma = 1; 
            jugador.danoExtraArmaBang = 0; 
            jugador.alcanceMinimoArma = 0;
        } 
        else if (elegida === "mustang") { cartaPerdida = jugador.cartaMustang; jugador.cartaMustang = null; jugador.tieneMustang = false; jugador.tieneMustangPro = false; } 
        else if (elegida === "mira") { cartaPerdida = jugador.cartaMira; jugador.cartaMira = null; jugador.tieneMira = false; jugador.tieneMiraPro = false; } 
        else if (elegida === "barril") { cartaPerdida = jugador.cartaBarril; jugador.cartaBarril = null; jugador.tieneBarril = false; jugador.tieneBarrilPro = false; }
        else if (elegida === "prision") { cartaPerdida = jugador.cartaPrision; jugador.cartaPrision = null; jugador.estaEnPrision = false; }
        else if (elegida === "dinamita") { cartaPerdida = jugador.cartaDinamita; jugador.cartaDinamita = null; jugador.tieneDinamita = false; }
        else if (elegida === "papa") { cartaPerdida = jugador.cartaPapa; jugador.cartaPapa = null; jugador.tienePapa = false; }

        if (cartaPerdida) {
            sala.agregarAlDescarte(cartaPerdida, jugador, client);
            return cartaPerdida;
        }

        return null; // no eliminó ningun equipamiento
    }
}