import { MapSchema } from "@colyseus/schema"
import { Carta, Jugador } from "./schema/MyRoomState.js"

export interface IMyRoom {

    agregarRegistro(mensaje: string): void

    repartirCartas(jugador: Jugador, cantidad: number, causa: string): void

    // en un futuro borrar client, creo que no sirve
    agregarAlDescarte(carta: Carta, jugador: Jugador, client: any): void

    reproducirSfx(sfx: string): void

    getJugadores(): MapSchema<Jugador>
}