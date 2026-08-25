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
        sala.evaluarMuerte(victima, atacante);
    }

    public static agregarEscudos(jugador: any, cantidad: number, duracion: number): void {
        if (!jugador || !jugador.estaVivo) return;

        // 1. Inicializamos la memoria si no existe
        if (!jugador.turnosEscudos) jugador.turnosEscudos = [];

        // 2. Sumamos la salud visual para Cocos
        jugador.vidasEscudo += cantidad;

        // 3. Añadimos cada escudo a la memoria con su tiempo de expiración
        for (let i = 0; i < cantidad; i++) {
            jugador.turnosEscudos.push(duracion);
        }
    }
}