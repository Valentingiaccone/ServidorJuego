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
    
    // Si el jugador se va, lo borramos de la pizarra
    this.state.jugadores.delete(client.sessionId);
    
    // (Más adelante haremos lógica por si el que se va es el Anfitrión, 
    // para pasarle la corona a otro, pero por ahora esto está perfecto).
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}