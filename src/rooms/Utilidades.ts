export class Utilidades {
    
    public static procesarDano(sala: any, victima: any, atacante: any, cantidad: number, causa: string, ignoraEscudo: boolean = false): void {
        
        if (!victima || !victima.estaVivo) return; 

        let danoRestante = cantidad;
        let danoAbsorbidoEscudo = 0;

        // 1. ROMPER ESCUDOS (Solo si NO es Daño Verdadero)
        if (!ignoraEscudo) {
            while (danoRestante > 0 && victima.turnosEscudos && victima.turnosEscudos.length > 0) {
                victima.turnosEscudos.shift(); 
                victima.vidasEscudo--;         
                danoAbsorbidoEscudo++;
                danoRestante--;
            }
        }

        // 2. DAÑO AL CUERPO (Lo que atravesó o el daño directo)
        let danoCuerpoNum = danoRestante;
        if (danoCuerpoNum > 0) {
            victima.vidas -= danoCuerpoNum;
        }

        let huboDanoCuerpo = danoCuerpoNum > 0;
        let huboDanoEscudo = danoAbsorbidoEscudo > 0;

        // 3. AVISAR A LAS PASIVAS
        let pasivaVictima = sala.gestorPersonajes.obtener(victima.personaje);
        if (pasivaVictima && pasivaVictima.onRecibirDano) {
            pasivaVictima.onRecibirDano(sala, victima, atacante, causa, cantidad, huboDanoCuerpo, huboDanoEscudo);
        }

        // 4. EL VEREDICTO FINAL
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
        
        // Raymundo SIEMPRE es un objetivo válido para curarse (porque lo hace escudo)
        if (jugador.personaje === "Raymundo Escudos") return true;

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

        // 2. La magia de RAYMUNDO ESCUDOS
        if (jugador.personaje === "Raymundo Escudos") {
            // Le damos la cantidad de curación, pero en forma de Escudos que duran "infinito" (999 rondas)
            Utilidades.agregarEscudos(jugador, cantidadFinal, 999, "CURACION");
            
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