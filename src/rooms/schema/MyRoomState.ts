import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

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
    @type("string") descripcionEnCatalan: string = "";
    @type("string") tipoDeUso: string = ""; 
    @type("string") efecto: string = "";    
    @type("boolean") esConjurada: boolean = false;
    @type("string") tipoEmbrujo: "bueno" | "malo" | "" = ""; 
    @type("number") prioridadBang: number = 0; 
    @type("string") idDuenoDelPerro: string = "";
    @type("string") idGranDesaparicion: string = "";
    @type("boolean") esPlanta: boolean = false;
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
    @type("string") habilidadEnCatalan: string = "";
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
    
    @type("string") personaje: string = "";
    @type("string") habilidad: string = "";
    @type("string") habilidadEnCatalan: string = "";
    @type("string") sfxDefault: string = "sfxMensaje";
    sfxMuerte: [string, boolean, number?] = ["muerteAmongus", false];
    
    @type([Carta]) mano = new ArraySchema<Carta>();
    
    // --- EL NUEVO REY DEL EQUIPAMIENTO ---
    @type({ map: Carta }) equipamiento = new MapSchema<Carta>();
    // ------------------------------------

    @type("string") spriteAvatarOpcional: string = ""
    @type("boolean") estaDesconectado: boolean = false;
    @type(["string"]) embrujos = new ArraySchema<string>();
    @type("boolean") yaJugoFantasma: boolean = false;
    @type("boolean") puedeUsarFallo: boolean = true;
    @type("number") vidasEscudo: number = 0;
    @type("boolean") tieneBarrilPasiva: boolean = false; // Mantenida porque es genética de Darryl, no una carta
    turnosEscudos: number[] = []; 
    
    @type("number") modificarDistancia: number = 0; 
    @type("number") modificarAlcance: number = 0; 
    @type([HabilidadActiva]) habilidadesActivas = new ArraySchema<HabilidadActiva>();
    @type("number") alturaFlowery: number = 0;
    @type("boolean") estaMuertoFalso: boolean = false;
    @type("number") rondasMuerto: number = 0;
    @type("boolean") beneficiarseDeSuMuerte: boolean = true
    @type("number") usosArtesanaEsteTurno: number = 0;
    @type("number") clonesCreadosEsteTurno: number = 0;
    @type("number") robinDescartes: number = 0;
    @type("boolean") mikotobaEstaGordo: boolean = false
    @type("boolean") transformarCuraEnEscudo: boolean = false
    @type("string") geometryDashModo: string = ""
    @type("number") usosBallEsteTurno: number = 0;
    @type("number") usosUfo: number = 0;
    @type("boolean") ocultarEstadisticas: boolean = false
    @type("number") descartesBerry: number = 0;
    @type({ map: "number" }) number = new MapSchema<number>();
    @type({ map: "boolean" }) boolean = new MapSchema<boolean>();
    @type({ map: "string" }) string = new MapSchema<string>();
    @type({ map: Jugador }) jugador = new MapSchema<Jugador>();
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
    @type("string") jugadorDesenfundando: string = "";
    @type("string") motivoDesenfundar: string = ""; 
    @type(Carta) cartaDesenfundada: Carta = new Carta();
    @type("number") usosBarril: number = 0;
    @type(["string"]) layoutRuleta = new ArraySchema<string>();
    @type("number") cantidadAlguaciles: number = 0;
    @type("number") cantidadForajidos: number = 0;
    @type("number") danoPendiente: number = 1;
    @type("string") tipoTiendaActual: string = "Griff";
    @type("number") probabilidadPapa: number = 1;
    @type("string") ruletaVerde: string = "";
    @type("string") ruletaRojo: string = "";
    @type("boolean") faseTransicion: boolean = false; 
    @type(["string"]) ordenSillasFisicas = new ArraySchema<string>();
    @type(InteraccionRequest) interaccionActiva = new InteraccionRequest();
}