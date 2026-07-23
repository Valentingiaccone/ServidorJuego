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
    this.setState(new MyRoomState());

    this.onMessage("iniciar_partida", (client, message) => {
        const jugador = this.state.jugadores.get(client.sessionId);

        if (jugador && jugador.esAnfitrion && this.state.estadoJuego === "Lobby") {
            
            const totalJugadores = this.state.jugadores.size;

            // Opcional: Podés validar que haya al menos 4 jugadores (para testing te dejo probar con menos si querés)
            console.log(`🔥 ¡El Anfitrión dio la orden! Inicia la partida con ${totalJugadores} jugadores.`);
            
            // 1. Armamos la lista de roles según la cantidad de personas
            let mazoRoles: string[] = [];

            if (totalJugadores <= 4) {
                // Configuración para 4 o menos jugadores (ideal para testear)
                mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido"];
            } else if (totalJugadores === 5) {
                mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Alguacil"];
            } else if (totalJugadores === 6) {
                mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Alguacil"];
            } else {
                // 7 jugadores
                mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Alguacil", "Alguacil"];
            }

            // 2. Mezclamos el mazo de roles (Algoritmo de barajado)
            mazoRoles.sort(() => Math.random() - 0.5);

            // 3. Repartimos un rol y asignamos vidas a cada jugador
            let i = 0;
            this.state.jugadores.forEach((j, sessionId) => {
                const rolAsignado = mazoRoles[i];
                j.rol = rolAsignado;

                if (rolAsignado === "Sheriff") {
                    j.vidas = 5;
                    this.state.turnoActual = sessionId;
                    // ---------------------------------------
                } else {
                    j.vidas = 4;
                }

                console.log(`🎭 Jugador ${j.nombre} (${sessionId}) -> Rol: ${j.rol} | Vidas: ${j.vidas}`);
                i++;
            });

            // 4. Cambiamos el estado de la sala a Jugando y cerramos la puerta
            this.state.estadoJuego = "Jugando";
            this.lock(); 
        }
    });
    // ------------------------------------------
    this.onMessage("pasar_turno", (client, message) => {
        if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId) {
            
            // Tu mensaje personalizado:
            this.broadcast("notificacion_turno", `¡El jugador ${client.sessionId} ha pasado su turno!`);

            const idsJugadores = Array.from(this.state.jugadores.keys());
            const indiceActual = idsJugadores.indexOf(client.sessionId);
            
            let siguienteIndice = (indiceActual + 1) % idsJugadores.length;
            let siguienteId = idsJugadores[siguienteIndice];
            let jugadorSiguiente = this.state.jugadores.get(siguienteId);

            // Bucle riguroso: Mientras el jugador que sigue exista y NO esté vivo, pasamos al siguiente
            while (jugadorSiguiente && !jugadorSiguiente.estaVivo) {
                siguienteIndice = (siguienteIndice + 1) % idsJugadores.length;
                siguienteId = idsJugadores[siguienteIndice];
                jugadorSiguiente = this.state.jugadores.get(siguienteId);
            }
            
            this.state.turnoActual = siguienteId;
            
            const nombreSiguiente = jugadorSiguiente?.nombre;
            this.broadcast("notificacion_turno", `¡Es el turno de ${nombreSiguiente}!`);
            console.log(`⏩ Turno completado. Ahora le toca a: ${nombreSiguiente}`);
        }
    });

    this.onMessage("disparar", (client, message) => {
        // 1. Verificamos que sea el turno del jugador que dispara
        if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId) {
            
            // 2. Extraemos el ID de la víctima desde el mensaje que nos manda Cocos
            const objetivoId = message.objetivo;
            const jugadorObjetivo = this.state.jugadores.get(objetivoId);
            const jugadorAtacante = this.state.jugadores.get(client.sessionId);

            // 3. Verificamos que la víctima exista y siga con vida
            if (jugadorObjetivo && jugadorObjetivo.estaVivo) {
                
                // Le restamos una bala (vida)
                jugadorObjetivo.vidas -= 1;
                
                console.log(`💥 ${jugadorAtacante.nombre} le disparó a ${jugadorObjetivo.nombre}!`);
                this.broadcast("notificacion_turno", `💥 ¡${jugadorAtacante.nombre} le disparó a ${jugadorObjetivo.nombre}!`);

                // 4. Verificamos si el jugador objetivo fue eliminado
                if (jugadorObjetivo.vidas <= 0) {
                    jugadorObjetivo.estaVivo = false;
                    jugadorObjetivo.vidas = 0; 
                    
                    console.log(`💀 ${jugadorObjetivo.nombre} ha sido eliminado.`);
                    this.broadcast("notificacion_turno", `💀 ¡${jugadorObjetivo.nombre} ha caído!`);
                    
                    // --- MAGIA NUEVA: El Árbitro revisa si terminó la partida ---
                    let sheriffVivo = false;
                    let forajidosVivos = 0;
                    let renegadoVivo = false;
                    let vivosTotales = 0;

                    // Contamos quiénes quedan en pie
                    this.state.jugadores.forEach((j) => {
                        if (j.estaVivo) {
                            vivosTotales++;
                            if (j.rol === "Sheriff") sheriffVivo = true;
                            if (j.rol === "Forajido") forajidosVivos++;
                            if (j.rol === "Renegado") renegadoVivo = true;
                        }
                    });

                    // Regla 1: Si el Sheriff muere
                    if (!sheriffVivo) {
                        this.state.estadoJuego = "Terminado";
                        
                        // Si el Renegado es el ÚNICO vivo, gana él. Si no, ganan los Forajidos.
                        if (renegadoVivo && vivosTotales === 1) {
                            this.broadcast("notificacion_turno", "🏆 ¡EL RENEGADO GANA LA PARTIDA!");
                        } else {
                            this.broadcast("notificacion_turno", "🏆 ¡LOS FORAJIDOS GANAN LA PARTIDA!");
                        }
                    } 
                    // Regla 2: Si mueren todos los Forajidos y el Renegado
                    else if (forajidosVivos === 0 && !renegadoVivo) {
                        this.state.estadoJuego = "Terminado";
                        this.broadcast("notificacion_turno", "🏆 ¡LA LEY GANA LA PARTIDA! (Sheriff y Alguaciles)");
                    }
                    // -------------------------------------------------------------
                }
            }
        }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "entró a la sala!");

    const nuevoJugador = new Jugador();

    if (options.nombre && options.nombre.trim() !== "") {
        nuevoJugador.nombre = options.nombre;
    }
    if (options.avatar) {
        nuevoJugador.avatar = options.avatar;
    }

    if (this.state.jugadores.size === 0) {
      nuevoJugador.esAnfitrion = true;
      console.log("¡" + client.sessionId + " es el Anfitrión!");
    }

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