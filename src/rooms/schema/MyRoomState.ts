import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Carta extends Schema {
    @type("string") id: string = "";
    @type("string") nombre: string = "";
    @type("string") descripcion: string = "";
    @type("string") tipoDeUso: string = ""; // Ej: "instantanea", "objetivo", "reaccion"
    @type("string") efecto: string = "";    // Ej: "curar_1", "dano_1"
    @type("string") palo: string = "";  // "Corazones", "Picas", "Diamantes", "Treboles"
    @type("string") valor: string = "";
    // ---------------------------------------------
}

export class Jugador extends Schema {
    @type("string") nombre: string = "";
    @type("number") avatar: number = 1;
    @type("boolean") esAnfitrion: boolean = false;
    @type("string") rol: string = "";
    @type("number") vidas: number = 4;
    @type("boolean") estaVivo: boolean = true;
    @type("number") vidasMaximas: number = 4;
    @type("boolean") yaDisparo: boolean = false;
    @type("string") nombreArma: string = "Colt .45"; // El arma por defecto
    @type("number") alcanceArma: number = 1;         // Alcance base
    @type(Carta) cartaArma: Carta;
    @type("string") personaje: string = "";
    @type("string") habilidad: string = "";
    @type([Carta]) mano = new ArraySchema<Carta>();
    @type(Carta) cartaMustang: Carta;
    @type(Carta) cartaMira: Carta;
    @type("boolean") tieneMustang: boolean = false;
    @type("boolean") tieneMira: boolean = false;
    @type("boolean") tieneBarril: boolean = false;
    @type(Carta) cartaBarril: Carta;
    // ----------------------------------------
}

export class MyRoomState extends Schema {
    @type({ map: Jugador }) jugadores = new MapSchema<Jugador>();
    @type("string") estadoJuego: string = "Lobby";
    @type("string") turnoActual: string = "";
    @type("string") jugadorEnPeligro: string = "";
    @type("string") jugadorDebeDescartar: string = "";
    @type("string") atacanteActual: string = "";
    @type("string") jugadorBajoAtaqueIndio: string = "";

    @type([Carta]) mazo = new ArraySchema<Carta>();
    @type([Carta]) descarte = new ArraySchema<Carta>();
    @type([Carta]) cartasTienda = new ArraySchema<Carta>();
    @type("string") jugadorEligiendoTienda: string = "";
    @type("string") jugadorEnDuelo: string = "";
    @type("string") oponenteDuelo: string = "";
    @type("string") jugadorDesenfundando: string = "";
    @type("string") motivoDesenfundar: string = ""; // Puede ser "Barril", "Prision" o "Dinamita"
    @type(Carta) cartaDesenfundada: Carta = new Carta();
}