import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Carta extends Schema {
    @type("string") id: string = "";
    @type("string") nombre: string = "";
    @type("string") descripcion: string = "";
    @type("string") descripcionEnCatalan: string = "";
    @type("string") tipoDeUso: string = ""; // Ej: "instantanea", "objetivo", "reaccion"
    @type("string") efecto: string = "";    // Ej: "curar_1", "dano_1"
    @type("boolean") esConjurada: boolean = false;
    // ---------------------------------------------
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
    @type("string") nombreArma: string = "Colt .45"; // El arma por defecto
    @type("number") alcanceArma: number = 1;         // Alcance base
    @type(Carta) cartaArma: Carta;
    @type("string") personaje: string = "";
    @type("string") habilidad: string = "";
    @type("string") habilidadEnCatalan: string = "";
    @type("string") sfxDefault: string = "sfxMensaje";
    sfxMuerte: [string, boolean, number?] = ["muerteAmongus", false];
    @type([Carta]) mano = new ArraySchema<Carta>();
    @type(Carta) cartaMustang: Carta;
    @type(Carta) cartaMira: Carta;
    @type("boolean") tieneMustangPro: boolean = false;
    @type("boolean") tieneMiraPro: boolean = false;
    @type("boolean") tieneBarrilPro: boolean = false;
    @type("boolean") tieneMustang: boolean = false;
    @type("boolean") tieneMira: boolean = false;
    @type("boolean") tieneBarril: boolean = false;
    @type(Carta) cartaBarril: Carta;
    @type("boolean") estaEnPrision: boolean = false;
    @type(Carta) cartaPrision: Carta;
    @type("boolean") tieneDinamita: boolean = false;
    @type(Carta) cartaDinamita: Carta;
    @type("string") spriteAvatarOpcional: string = ""
    @type("boolean") tienePapa: boolean = false;
    @type(Carta) cartaPapa: Carta;
    @type("boolean") estaDesconectado: boolean = false;
    @type(["string"]) embrujos = new ArraySchema<string>();
    @type("boolean") yaJugoFantasma: boolean = false;
    @type("boolean") puedeUsarFallo: boolean = true;
    @type("number") vidasEscudo: number = 0;
    @type("boolean") tieneBarrilPasiva: boolean = false;
    turnosEscudos: number[] = []; // Memoria secreta del servidor
    @type("number") danoExtraArmaBang: number = 0;
    @type("number") alcanceMinimoArma: number = 0;
    @type("number") modificarDistancia: number = 0; // distancia que los demas te ven a vos
    @type("number") modificarAlcance: number = 0; // alcance que tenes
    @type([HabilidadActiva]) habilidadesActivas = new ArraySchema<HabilidadActiva>();

    // ----------------------------------------
    // roles especificos
    // ----------------------------------------
    @type("number") alturaFlowery: number = 0;
    @type("boolean") estaMuertoFalso: boolean = false;
    @type("number") rondasMuerto: number = 0;
    @type("boolean") beneficiarseDeSuMuerte: boolean = true
    @type("number") usosArtesanaEsteTurno: number = 0;
    @type("number") clonesCreadosEsteTurno: number = 0;
    @type("boolean") lucierganaPrendida: boolean = false
    @type("number") robinDescartes: number = 0;
    @type("boolean") mikotobaEstaGordo: boolean = false
    @type("boolean") transformarCuraEnEscudo: boolean = false
    @type("string") geometryDashModo: string = ""
    @type("number") usosBallEsteTurno: number = 0;
    @type("number") usosUfo: number = 0;
    @type("boolean") swingCopterPuedeProteger: boolean = false
    @type("boolean") leslySapa: boolean = false
    @type("boolean") ocultarEstadisticas: boolean = false
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
    @type("number") usosBarril: number = 0;
    @type(["string"]) layoutRuleta = new ArraySchema<string>();
    @type("number") cantidadAlguaciles: number = 0;
    @type("number") cantidadForajidos: number = 0;
    @type("number") danoPendiente: number = 1;
    @type("string") tipoTiendaActual: string = "Griff";
    @type("number") probabilidadPapa: number = 1;
    @type("string") ruletaVerde: string = "";
    @type("string") ruletaRojo: string = "";
    @type("boolean") faseTransicion: boolean = false; // anti bug prision
}

