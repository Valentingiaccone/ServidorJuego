import { Room, Client, CloseCode } from "colyseus";
import { Jugador, MyRoomState } from "./schema/MyRoomState.js";

export class MyRoom extends Room {
  // Lo preparamos para los 8 jugadores que mencionaste
  maxClients = 8;
  state = new MyRoomState();

  // AQUÍ RECIBIMOS LOS MENSAJES DE COCOS:
  messages = {
    pasar_turno: (client: Client, message: any) => {
      console.log("El jugador", client.sessionId, "apretó el botón.");
      
      // Le enviamos un mensaje de vuelta a TODOS los jugadores conectados
      this.broadcast("notificacion_turno", "¡El jugador " + client.sessionId + " ha pasado su turno!");
    }
  }

  onCreate (options: any) {
    console.log("¡La sala se creó correctamente!");
    
    // ¡Acá instanciamos la pizarra y la colgamos en la sala!
    this.setState(new MyRoomState());
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "entró a la sala!");

    // 1. Creamos un nuevo jugador usando el molde que hicimos antes
    const nuevoJugador = new Jugador();

    // 2. ¿Es el primero en entrar? Si la lista de jugadores está vacía (tamaño 0), es el Anfitrión.
    if (this.state.jugadores.size === 0) {
      nuevoJugador.esAnfitrion = true;
      console.log("¡" + client.sessionId + " es el Anfitrión!");
    }

    // 3. Lo anotamos en la pizarra central
    this.state.jugadores.set(client.sessionId, nuevoJugador);
  }

  onLeave (client: Client, code: number) {
    console.log(client.sessionId, "se fue de la sala.");
    
    // 1. Guardamos el dato: ¿el que se está yendo era el anfitrión?
    const jugadorQueSeVa = this.state.jugadores.get(client.sessionId);
    const eraAnfitrion = jugadorQueSeVa ? jugadorQueSeVa.esAnfitrion : false;

    // 2. Borramos al jugador de la pizarra
    this.state.jugadores.delete(client.sessionId);
    
    // 3. SISTEMA DE HERENCIA (Host Migration)
    // Si el que se fue era el anfitrión, y todavía queda gente en la sala...
    if (eraAnfitrion && this.state.jugadores.size > 0) {
        // Agarramos al primero que encontremos en la lista y le damos la corona
        for (let [id, jugador] of this.state.jugadores.entries()) {
            jugador.esAnfitrion = true;
            console.log(`👑 ¡El anfitrión original huyó! El nuevo anfitrión es: ${id}`);
            break; // Cortamos el bucle para que solo haya un rey
        }
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}