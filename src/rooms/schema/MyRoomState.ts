import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class OpcionCartaSeleccion extends Schema {
    @type("string") idRespuesta: string = "";
    @type("string") nombreVisual: string = "";
    @type("string") descripcionVisual: string = "";
    @type("string") spriteReferencia: string = "";
    @type("boolean") esConjurada: boolean = false;
    @type("boolean") tienePerro: boolean = false;
}

export class SeleccionCartasRequest extends Schema {
    @type("string") idJugadorObjetivo: string = "";
    @type("string") titulo: string = "";
    @type("string") temaVisual: string = "normal";
    @type("string") tipoAccion: string = "";
    @type("boolean") esCancelable: boolean = false;
    @type("boolean") esPublica: boolean = false; // true = todos ven las cartas (ej. Tiendas), false = solo el objetivo
    @type([OpcionCartaSeleccion]) opciones = new ArraySchema<OpcionCartaSeleccion>();
}

export class OpcionInteraccion extends Schema {
    @type("string") idAccion: string = "";
    @type("string") texto: string = "";
    @type("boolean") habilitado: boolean = true;
    @type("string") color: string = "blanco";
}

export class InteraccionRequest extends Schema {
    @type("string") idJugadorObjetivo: string = "";
    @type("string") titulo: string = "";
    @type("string") temaVisual: string = "";
    @type([OpcionInteraccion]) opciones = new ArraySchema<OpcionInteraccion>();
}

export class Carta extends Schema {
    @type("string") id: string = "";
    @type("string") nombre: string = "";
    @type("string") descripcion: string = "";
    @type("string") tipoDeUso: string = ""; // "instantanea" | "equipamiento" | "objetivo" | "oculto"
    @type("string") efecto: string = "";
    @type("boolean") esConjurada: boolean = false;
    @type("string") tipoEmbrujo: "bueno" | "malo" | "" = "";
    @type("string") idDuenoDelPerro: string = "";
    @type("string") idGranDesaparicion: string = "";
    @type("boolean") esPlanta: boolean = false;
    @type({ map: "number" }) number = new MapSchema<number>();
    @type({ map: "string" }) string = new MapSchema<string>();
}

export class HabilidadActiva extends Schema {
    @type("string") id: string = "";
    @type("string") textoBoton: string = "";
    @type("string") spriteBoton: string = "";
    @type("string") tooltip: string = "";
}

export class OpcionPersonaje extends Schema {
    @type("string") nombre: string = "";
    @type("string") habilidad: string = "";
    @type("number") vidasBase: number = 4;
    @type("boolean") spriteFueraDeJuego: boolean = false;
}

export class Jugador extends Schema {
    @type([OpcionPersonaje]) opcionesPersonaje = new ArraySchema<OpcionPersonaje>();
    @type("boolean") yaEligioPersonaje: boolean = false;
    @type("string") nombre: string = "";
    @type("number") avatar: number = 1;
    @type("boolean") esAnfitrion: boolean = false;
    @type("string") rol: string = "";
    @type("number") vidas: number = 4;
    @type("boolean") estaVivo: boolean = true;
    @type("number") vidasMaximas: number = 4;
    @type("boolean") yaDisparo: boolean = false;

    // Identidad técnica vs. nombre visible en UI/registros (ej: personaje="Leon_oculto", nombreMostrar="Leon")
    @type("string") personaje: string = "";
    @type("string") nombreMostrar: string = "";
    @type("string") habilidad: string = "";
    @type("string") sfxDefault: string = "sfxMensaje";
    @type("string") spriteAvatarOpcional: string = "";

    // Datos solo de servidor (no se sincronizan por red)
    sfxMuerte: [string, boolean, number?] = ["muerteAmongus", false];
    turnosEscudos: number[] = [];

    @type([Carta]) mano = new ArraySchema<Carta>();
    @type({ map: Carta }) equipamiento = new MapSchema<Carta>();
    @type(["string"]) embrujos = new ArraySchema<string>();
    @type([HabilidadActiva]) habilidadesActivas = new ArraySchema<HabilidadActiva>();

    @type("boolean") estaDesconectado: boolean = false;
    @type("boolean") yaJugoFantasma: boolean = false;
    @type("boolean") puedeUsarFallo: boolean = true;
    @type("number") vidasEscudo: number = 0;
    @type("boolean") tieneBarrilPasiva: boolean = false;
    @type("number") modificarDistancia: number = 0;
    @type("number") modificarAlcance: number = 0;
    @type("boolean") estaMuertoFalso: boolean = false;
    @type("number") rondasMuerto: number = 0;
    @type("boolean") beneficiarseDeSuMuerte: boolean = true;
    @type("boolean") transformarCuraEnEscudo: boolean = false;
    @type("string") geometryDashModo: string = "";

    @type({ map: "number" }) number = new MapSchema<number>();
    @type({ map: "boolean" }) boolean = new MapSchema<boolean>();
    @type({ map: "string" }) string = new MapSchema<string>();
    @type({ map: "number" }) efecto = new MapSchema<number>();
    @type({ map: "number" }) estadistica = new MapSchema<number>();

    @type("boolean") esNpc: boolean = false;
    @type("string") idDueno: string = "";
    @type("boolean") reroll: boolean = false;
}

export class MyRoomState extends Schema {
    @type({ map: Jugador }) jugadores = new MapSchema<Jugador>();
    @type("string") estadoJuego: string = "Lobby";
    @type("string") turnoActual: string = "";

    @type([Carta]) mazo = new ArraySchema<Carta>();
    @type([Carta]) descarte = new ArraySchema<Carta>();
    @type([Carta]) cartasTienda = new ArraySchema<Carta>();

    @type("number") cantidadAlguaciles: number = 0;
    @type("number") cantidadForajidos: number = 0;

    // Estado visual de la ruleta activa
    @type("string") jugadorDesenfundando: string = "";
    @type("string") motivoDesenfundar: string = "";
    @type("string") tituloRuleta: string = "";
    @type(["string"]) layoutRuleta = new ArraySchema<string>();
    @type("string") ruletaVerde: string = "";
    @type("string") ruletaRojo: string = "";
    @type("boolean") faseTransicion: boolean = false;

    @type(["string"]) ordenSillasFisicas = new ArraySchema<string>();
    @type(["string"]) ordenTurnos = new ArraySchema<string>();

    @type(InteraccionRequest) interaccionActiva = new InteraccionRequest();
    @type(SeleccionCartasRequest) seleccionCartasActiva = new SeleccionCartasRequest();
    @type("string") spriteFlecha: string = "";
}