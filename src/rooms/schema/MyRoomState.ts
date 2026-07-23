import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// --- MAGIA NUEVA: El molde orientado a objetos de nuestra Carta ---
export class Carta extends Schema {
    @type("string") id: string = "";
    @type("string") nombre: string = "";
    @type("string") descripcion: string = "";
}
// -----------------------------------------------------------------

export class Jugador extends Schema {
    @type("string") nombre: string = "";
    @type("number") avatar: number = 1;
    @type("boolean") esAnfitrion: boolean = false;
    @type("string") rol: string = "";
    @type("number") vidas: number = 4;
    @type("boolean") estaVivo: boolean = true;
    @type("number") vidasMaximas: number = 4;
    
    // --- MAGIA NUEVA: La mano del jugador ---
    @type([Carta]) mano = new ArraySchema<Carta>();
    // ----------------------------------------
}

export class MyRoomState extends Schema {
    @type({ map: Jugador }) jugadores = new MapSchema<Jugador>();
    @type("string") estadoJuego: string = "Lobby";
    @type("string") turnoActual: string = "";

    // --- MAGIA NUEVA: Los mazos de la mesa ---
    @type([Carta]) mazo = new ArraySchema<Carta>();
    @type([Carta]) descarte = new ArraySchema<Carta>();
    // -----------------------------------------
}