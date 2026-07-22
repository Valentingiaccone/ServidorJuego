import { Schema, type, MapSchema } from "@colyseus/schema";
// falta importar Context

// 1. Definimos el "molde" de un Jugador
export class Jugador extends Schema {
    @type("string") nombre: string = "Vaquero Misterioso";
    @type("number") avatar: number = 1;
    @type("boolean") esAnfitrion: boolean = false;
    @type("number") vidas: number = 0; // Las balas que le quedan
    @type("string") rol: string = "";  // Sheriff, Forajido, Renegado, Alguacil
    @type("boolean") estaVivo: boolean = true;
}

// 2. Definimos la Pizarra Central de la Sala
export class MyRoomState extends Schema {
    // --- MAGIA NUEVA: Control de la partida ---
    @type("string") estadoJuego: string = "Lobby"; // Empezamos siempre en el "Lobby"
    @type("string") turnoActual: string = "";      // Acá guardaremos el ID del jugador al que le toca
    // ------------------------------------------

    @type({ map: Jugador }) jugadores = new MapSchema<Jugador>();
}