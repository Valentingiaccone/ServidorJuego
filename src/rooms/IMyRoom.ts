import { ArraySchema, MapSchema } from "@colyseus/schema"
import { Carta, Jugador } from "./schema/MyRoomState.js"
import { IPersonaje } from "./Personajes.js"

export interface IMyRoom {

    agregarRegistro(mensaje: string): void

    repartirCartas(jugador: Jugador, cantidad: number, causa: string): void

    // en un futuro borrar client, creo que no sirve
    agregarAlDescarte(carta: Carta, jugador: Jugador, client: any): void

    descartarCarta(cartaDescartada: Carta, jugador: Jugador, motivo: string): void

    reproducirSfx(sfx: string): void

    getJugadores(): MapSchema<Jugador>

    getSillasFisicas(): ArraySchema<string>
    
    getTotalNpc(): number

    getTotalJugadoresMuertos(): number

    encolarInteraccionBang(victima: Jugador, atacante: Jugador, titulo: string, flecha: string, fallosRequeridos: number, ejecutarInmediatamente: boolean, encolarinmediatamente: boolean): void

    obtenerIPersonaje(personaje: string): IPersonaje
}