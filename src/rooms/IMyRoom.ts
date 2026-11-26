import type { ArraySchema, MapSchema } from "@colyseus/schema";
import type { Carta, Jugador, MyRoomState } from "./schema/MyRoomState.js";
import type { IPersonaje, GestorPersonajes } from "./Personajes.js";
import type { SistemaCombate } from "./SistemaCombate.js";
import type { SistemaRuleta } from "./SistemaRuleta.js";
import type { SistemaInteracciones } from "./SistemaInteracciones.js";
import type { SistemaTurnos } from "./SistemaTurnos.js";
import type { SistemaCartas } from "./SistemaCartas.js";
import type { GestorMusica } from "./GestorMusica.js";
import { MotorEventos } from "./MotorEventos.js";

export interface ClienteJuego {
    sessionId: string;
    send(type: string, message?: unknown): void;
}

export type SfxPayload = string | { sfx: string; silencio?: boolean; vol?: number };

export type TipoInmunidad = "cocoroch" | "panico" | "prision" | "embrujo_malo";

export interface ContextoDano {
    victima: Jugador;
    atacante: Jugador | null;
    cantidad: number;
    causa: string;
    cartaOrigen?: Carta | null;
    ignoraEscudo: boolean;
    cancelado: boolean;
    danoCuerpo: number;
    danoEscudo: number;
}

export interface FichaRuleta {
    tipo: "exito" | "fallo";
    visual: string;
    ownerId: string;
    onActivar?: (sala: IMyRoom, dueno: Jugador, victima: Jugador) => void;
}

export interface IContextoRuleta {
    motivo: string;
    victima: Jugador;
    idVictima: string;
    bonusSuerte: number;
    fichasEspeciales: FichaRuleta[];
    agregarFicha(ficha: FichaRuleta, cantidad?: number): void;
}

export interface SolicitudRuleta {
    idJugador: string;
    motivo: string;
    titulo?: string;
    probabilidadBase: number; // Casillas verdes base sobre 16 (ej. 4 para Barril, 6 para Prisión)
    spriteVerde?: string;
    spriteRojo?: string;
    permiteModificadoresSuerte?: boolean;
    esEmbrujo?: boolean;
    textoExito?: string;
    textoFallo?: string;
    onResultado: (exito: boolean, fichaVisual: string) => void;
}

export interface ReglaObjetivo {
    tipo: "ninguno" | "jugador";
    alcance?: "arma" | "vecino" | "global";
    usaAlcanceMinimoArma?: boolean;
    respetaModificadoresDistancia?: boolean;
    bonusAlcanceCarta?: number;
    puedeAutoObjetivo?: boolean;
    esBeneficiosa?: boolean;
    ignoraGravedad?: boolean;
    validarObjetivo?: (sala: IMyRoom, atacante: Jugador, objetivo: Jugador, carta: Carta) => string | null;
}

export type ResultadoJugada = "consumir" | "equipar" | "pendiente" | "cancelado";

export interface ContextoJugada {
    sala: IMyRoom;
    client: ClienteJuego;
    idJugador: string;
    jugador: Jugador;
    carta: Carta;
    idObjetivo?: string;
    objetivo?: Jugador | null;
}

export interface IMyRoom {
    state: MyRoomState;
    clock: { setTimeout(callback: () => void, ms: number): unknown };

    motorEventos: MotorEventos;
    sistemaCombate: SistemaCombate;
    sistemaRuleta: SistemaRuleta;
    sistemaInteracciones: SistemaInteracciones;
    sistemaTurnos: SistemaTurnos;
    sistemaCartas: SistemaCartas;
    gestorPersonajes: GestorPersonajes;
    gestorMusica: GestorMusica;

    broadcast(evento: string, datos?: unknown): void;

    // Estado privado por sessionId (para Tracer, Volpina, Leon, etc. sin pisarse entre copias)
    obtenerEstadoPrivado(idJugador: string): Record<string, unknown>;
    limpiarEstadoPrivado(idJugador: string): void;

    agregarRegistro(mensaje: string): void;
    reproducirSfx(sfx: SfxPayload): void;
    enviarAlerta(idJugador: string, mensaje: string): void;
    ejecutarAnimacionCarta(idJugador: string, carta: Carta): void;
    animacionJugador(idJugador: string, animacion: string): void;

    repartirCartas(jugador: Jugador, cantidad: number, causa: string): void;
    descartarCarta(cartaDescartada: Carta, jugador: Jugador, motivo: string): void;
    agregarAlDescarte(carta: Carta): void;
    evaluarMuerte(victima: Jugador, asesino?: Jugador | null, fueDanoVerdadero?: boolean): void;
    ejecutarPasivasAlJugarCarta(jugador: Jugador, carta: Carta): void;

    juegoPausado(): boolean;
    getJugadores(): MapSchema<Jugador>;
    getSillasFisicas(): ArraySchema<string>;
    getTotalNpc(): number;
    getTotalJugadoresMuertos(): number;
    getTotalJugadoresVivos(): number;
    renegadoEstaVivo(): boolean;
    obtenerIPersonaje(personaje: string): IPersonaje | null;

    // Procesadores accesibles por GestorNPC
    procesarPasarTurno(client: ClienteJuego): void;
    procesarJugarCarta(client: ClienteJuego, idCarta: string, idObjetivo?: string): boolean;
    procesarDescartarCarta(client: ClienteJuego, idCarta: string): void;
    procesarResponderInteraccion(client: ClienteJuego, idAccion: string): void;
    procesarRespuestaSeleccionCarta(client: ClienteJuego, idRespuesta: string): void;
    procesarVoltearCarta(client: ClienteJuego): void;
}