import { Schema, type, MapSchema } from "@colyseus/schema";
// falta importar Context

// 1. Definimos el "molde" de un Jugador
export class Jugador extends Schema {
    @type("string") nombre: string = "Vaquero Misterioso";
    @type("number") avatar: number = 1;
    @type("boolean") esAnfitrion: boolean = false;
}

// 2. Definimos la Pizarra Central de la Sala
export class MyRoomState extends Schema {
    // Creamos un "diccionario" o lista para guardar a todos los jugadores
    // La llave será el ID (ej: wp24cDJQ8) y el valor será toda su ficha de Jugador
    @type({ map: Jugador }) jugadores = new MapSchema<Jugador>();
}