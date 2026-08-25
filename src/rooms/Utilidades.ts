export class Utilidades {

    public static procesarDano(sala: any, victima: any, atacante: any, cantidad: number, causa: string, ignoraEscudo: boolean = false): void {
        
        if (!victima || !victima.estaVivo) return; 

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

        sala.evaluarMuerte(victima, atacante, ignoraEscudo);
    }

    public static agregarEscudos(sala: any, jugador: any, cantidad: number, duracion: number, causa: string): void {
        if (!jugador || !jugador.estaVivo) return;

        if (!jugador.turnosEscudos) jugador.turnosEscudos = [];

        jugador.vidasEscudo += cantidad;

        for (let i = 0; i < cantidad; i++) {
            jugador.turnosEscudos.push(duracion);
        }

        // --- EL AVISO A LAS PASIVAS ---
        let pasiva = sala.gestorPersonajes.obtener(jugador.personaje);
        if (pasiva && pasiva.onRecibirEscudo) {
            pasiva.onRecibirEscudo(sala, jugador, cantidad, causa);
        }
    }

    public static puedeRecibirCuracion(jugador: any): boolean {
        if (!jugador || !jugador.estaVivo) return false;
        
        if (jugador.transformarCuraEnEscudo) return true;

        // Para los demás, solo si no están al máximo
        return jugador.vidas < jugador.vidasMaximas;
    }

    public static aplicarCuracion(sala: any, jugador: any, cantidadBase: number, causa: string): void {
        if (!jugador || !jugador.estaVivo) return;

        let cantidadFinal = cantidadBase;
        let pasiva = sala.gestorPersonajes.obtener(jugador.personaje);

        // 1. Aplicamos modificadores (Pam/Mikotoba) si es un Botiquín
        if (causa === "BOTIQUIN" && pasiva && pasiva.modificarCuraBotiquin) {
            cantidadFinal += pasiva.modificarCuraBotiquin(sala, jugador);
        }

        if (jugador.transformarCuraEnEscudo) {
            // Le damos la cantidad de curación, pero en forma de Escudos que duran "infinito" (999 rondas)
            Utilidades.agregarEscudos(sala, jugador, cantidadFinal, Infinity, "CURACION");
            
        } else {
            // 3. Jugadores Normales
            jugador.vidas += cantidadFinal;
            if (jugador.vidas > jugador.vidasMaximas) {
                jugador.vidas = jugador.vidasMaximas;
            }

            // Avisamos a las pasivas normales (Como Mikotoba que cambia de sprite al curarse)
            if (pasiva && pasiva.onRecibirCuracion) {
                pasiva.onRecibirCuracion(sala, jugador);
            }
        }
    }
}