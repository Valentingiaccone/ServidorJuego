import { Room, Client, CloseCode } from "colyseus";
import { Carta, Jugador, MyRoomState } from "./schema/MyRoomState.js";

const GestorDeEfectos: Record<string, Function> = {
    
    // Lógica para cartas tipo "curar_X"
    "curar": (sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        if (jugador.vidas < jugador.vidasMaximas) {
            jugador.vidas++; 
            console.log(`🩹 ${jugador.nombre} se curó 1 vida.`);
            sala.broadcast("notificacion_turno", `🩹 ${jugador.nombre} usó un Botiquín.`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
            // Consumimos la carta
            jugador.mano.splice(indiceCarta, 1);
            sala.state.descarte.push(cartaJugada);
        } else {
            client.send("alerta_personal", "Tu vida ya está al máximo.");
        }
    },

    // Lógica para cartas tipo "equipar_arma_X"
    "equipar": (sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        // Los parametros vienen de cortar el texto. Ej: ["equipar", "arma", "3"]
        let nuevoAlcance = parseInt(parametros[2]); 
        
        if (jugador.cartaArma) {
            sala.state.descarte.push(jugador.cartaArma);
            console.log(`🗑️ El arma vieja de ${jugador.nombre} fue al descarte.`);
        }
        
        jugador.nombreArma = cartaJugada.nombre;
        jugador.alcanceArma = nuevoAlcance;
        jugador.cartaArma = cartaJugada;
        
        // Consumimos la carta a la mesa
        jugador.mano.splice(indiceCarta, 1);
        
        console.log(`🔫 ${jugador.nombre} se equipó una ${cartaJugada.nombre} (Alcance: ${nuevoAlcance}).`);
        sala.broadcast("notificacion_turno", `🔫 ¡${jugador.nombre} se equipó un(a) ${cartaJugada.nombre}!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
    },

    "robar": (sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        // Leemos cuántas cartas dice el efecto (Ej: "robar_2" -> 2)
        let cantidad = parseInt(parametros[1]); 
        
        // Usamos la nueva herramienta de la sala para darle las cartas
        sala.repartirCartas(jugador, cantidad);
        
        console.log(`🃏 ${jugador.nombre} usó ${cartaJugada.nombre} y robó ${cantidad} cartas.`);
        sala.broadcast("notificacion_turno", `🃏 ${jugador.nombre} jugó un(a) ${cartaJugada.nombre}.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
        
        // Consumimos la carta
        jugador.mano.splice(indiceCarta, 1);
        sala.state.descarte.push(cartaJugada);
    },

    "curarATodos": (sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        let alguienNecesitaCura = false;
        
        // 1. Verificamos si AL MENOS UN jugador vivo necesita curación
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.vidas < j.vidasMaximas) {
                alguienNecesitaCura = true;
            }
        });

        // 2. Si absolutamente todos están al máximo, rebotamos la carta
        if (!alguienNecesitaCura) {
            client.send("alerta_personal", "No podés jugar esta carta ahora.\nTodos los jugadores vivos ya tienen la salud al máximo.");
            client.send("bajar_cartas"); // Limpiamos la UI por las dudas
            return; // Cortamos acá, la carta NO se consume y vuelve a tu mano.
        }

        // 3. Si pasamos la validación, repartimos la salud a los heridos
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.vidas < j.vidasMaximas) {
                j.vidas++;
            }
        });

        console.log(`✨ ${jugadorQueJuega.nombre} usó ${cartaJugada.nombre} y curó a todos 1 vida.`);
        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.nombre} jugó un(a) ${cartaJugada.nombre} y curó a todos!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
        // 4. Consumimos la carta y va al descarte
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.state.descarte.push(cartaJugada);
    },

    "tiratachuela": (sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        // 1. Limpiamos la cola por las dudas
        sala.colaDePeligro = [];
        
        // 2. Metemos a todos los jugadores vivos (menos a vos) en la lista de ejecución
        sala.state.jugadores.forEach((j: any, sessionId: string) => {
            if (j.estaVivo && sessionId !== client.sessionId) {
                sala.colaDePeligro.push(sessionId);
            }
        });

        if (sala.colaDePeligro.length > 0) {
            // 3. Consumimos la carta
            jugadorQueJuega.mano.splice(indiceCarta, 1);
            sala.state.descarte.push(cartaJugada);

            // 4. Activamos el ataque masivo
            sala.state.atacanteActual = client.sessionId;
            sala.broadcast("notificacion_turno", `🌧️ ¡${jugadorQueJuega.nombre} usó un Tiratachuela! ¡Todos a cubierto!`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
            sala.avanzarColaDePeligro(); // Arranca el primer disparo
        } else {
            client.send("alerta_personal", "No hay nadie vivo para atacar.");
            client.send("bajar_cartas");
        }
    },

    "indios": (sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]) => {
        sala.colaIndios = [];
        sala.state.jugadores.forEach((j: any, sessionId: string) => {
            if (j.estaVivo && sessionId !== client.sessionId) sala.colaIndios.push(sessionId);
        });

        if (sala.colaIndios.length > 0) {
            jugadorQueJuega.mano.splice(indiceCarta, 1);
            sala.state.descarte.push(cartaJugada);
            sala.broadcast("notificacion_turno", `🔥 ¡${jugadorQueJuega.nombre} lanzó un ataque de ¡Indios!`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion });
            sala.avanzarColaIndios(); 
        } else {
            client.send("alerta_personal", "No hay nadie vivo para atacar.");
            client.send("bajar_cartas");
        }
    },
};

export class MyRoom extends Room {
  // Lo preparamos para los 8 jugadores que mencionaste
  maxClients = 8;
  state = new MyRoomState();

  colaDePeligro: string[] = [];
  colaIndios: string[] = [];

  avanzarColaDePeligro() {
      if (this.colaDePeligro.length > 0) {
          // Sacamos al primero de la lista y lo ponemos frente al cañón
          this.state.jugadorEnPeligro = this.colaDePeligro.shift(); 
          
          let victima = this.state.jugadores.get(this.state.jugadorEnPeligro);
          if (victima) {
              this.broadcast("notificacion_turno", `⚠️ ¡El Tiratachuela apunta a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
          }
      } else {
          // Se acabaron las balas
          this.state.jugadorEnPeligro = "";
          this.state.atacanteActual = "";
          this.broadcast("notificacion_turno", `💨 El ataque de Tiratachuela ha terminado.`);
      }
  }

  avanzarColaIndios() {
        if (this.colaIndios.length > 0) {
            this.state.jugadorBajoAtaqueIndio = this.colaIndios.shift(); 
            let victima = this.state.jugadores.get(this.state.jugadorBajoAtaqueIndio);
            if (victima) this.broadcast("notificacion_turno", `🏹 ¡Los Indios atacan a ${victima.nombre}! ¿Tendrá un BANG!?`);
        } else {
            this.state.jugadorBajoAtaqueIndio = "";
            this.broadcast("notificacion_turno", `⛺ El ataque de los Indios ha terminado.`);
        }
    }

  evaluarMuerte(victima: any) {
        if (victima.vidas <= 0) {
            victima.estaVivo = false;
            victima.vidas = 0;
            console.log(`☠️ ${victima.nombre} ha sido ELIMINADO.`);

            // Vaciamos bolsillos
            victima.mano.forEach((carta: any) => this.state.descarte.push(carta));
            victima.mano.clear();
            if (victima.cartaArma) this.state.descarte.push(victima.cartaArma);
            victima.nombreArma = "Colt .45";
            victima.alcanceArma = 1;

            // Contamos vivos y decidimos si termina el juego
            let vivos = { Sheriff: 0, Forajido: 0, Renegado: 0, Alguacil: 0 };
            let totalVivos = 0;

            this.state.jugadores.forEach((j) => {
                if (j.estaVivo) {
                    vivos[j.rol as keyof typeof vivos]++;
                    totalVivos++;
                }
            });

            if (vivos.Sheriff === 0) {
                this.state.estadoJuego = "Terminado";
                if (totalVivos === 1 && vivos.Renegado === 1) {
                    this.broadcast("victoria", "🏆 ¡EL RENEGADO GANA LA PARTIDA!");
                } else {
                    this.broadcast("victoria", "🏆 ¡LOS FORAJIDOS GANAN LA PARTIDA!");
                }
            } else if (vivos.Forajido === 0 && vivos.Renegado === 0) {
                this.state.estadoJuego = "Terminado";
                this.broadcast("victoria", "🏆 ¡EL SHERIFF GANA LA PARTIDA!");
            }
        }
    }

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

                j.vidasMaximas = j.vidas;

                console.log(`🎭 Jugador ${j.nombre} (${sessionId}) -> Rol: ${j.rol} | Vidas: ${j.vidas}`);
                i++;
            });

            this.state.mazo.clear();
            
            for (let c = 0; c < 25; c++) {
                const nuevaCarta = new Carta();
                nuevaCarta.id = `bang_${c}`;
                nuevaCarta.nombre = "BANG!";
                nuevaCarta.descripcion = "Quita 1 vida a un jugador a tu alcance.";
                nuevaCarta.tipoDeUso = "objetivo"; // ¡La interfaz sabrá que tiene que apuntar!
                nuevaCarta.efecto = "dano_1";      // ¡El servidor sabrá que tiene que restar vida!
                this.state.mazo.push(nuevaCarta);
            }
            
            for (let c = 0; c < 6; c++) {
                const nuevaCarta = new Carta();
                nuevaCarta.id = `botiquin_${c}`;
                nuevaCarta.nombre = "Botiquín";
                nuevaCarta.descripcion = "Recupera 1 vida.";
                nuevaCarta.tipoDeUso = "instantanea"; // ¡La interfaz la jugará con un solo clic!
                nuevaCarta.efecto = "curar_1";        // ¡El servidor sabrá que tiene que sumar vida!
                this.state.mazo.push(nuevaCarta);
            }

            for (let c = 0; c < 12; c++) {
                const nuevaCarta = new Carta();
                nuevaCarta.id = `fallo_${c}`;
                nuevaCarta.nombre = "¡Fallo!";
                nuevaCarta.descripcion = "Esquiva un BANG! que te hayan disparado.";
                nuevaCarta.tipoDeUso = "oculto"; // Solo se usa al ser atacado
                nuevaCarta.efecto = "esquivar";    // Cancela el daño
                this.state.mazo.push(nuevaCarta);
            }

            for (let i = 0; i < 2; i++) {
                const diligencia = new Carta();
                diligencia.id = `cofre_${i}`;
                diligencia.nombre = "Cofre";
                diligencia.descripcion = "Roba 2 cartas del mazo.";
                diligencia.tipoDeUso = "instantanea";
                diligencia.efecto = "robar_2";
                this.state.mazo.push(diligencia);
            }

            for (let i = 0; i < 1; i++) {
                const diligencia = new Carta();
                diligencia.id = `cofre super magico_${i}`;
                diligencia.nombre = "Cofre super magico";
                diligencia.descripcion = "Roba 3 cartas del mazo.";
                diligencia.tipoDeUso = "instantanea";
                diligencia.efecto = "robar_3";
                this.state.mazo.push(diligencia);
            }

            for (let i = 0; i < 4; i++) {
                const cat = new Carta();
                cat.id = `cocoroch_${i}`;
                cat.nombre = "Cocoroch";
                cat.descripcion = "Haz que un jugador descarte una carta de la mano o de la mesa.";
                cat.tipoDeUso = "objetivoGlobal";
                cat.efecto = "forzar_enemigo"; 
                this.state.mazo.push(cat);

                const panico = new Carta();
                panico.id = `panico_${i}`;
                panico.nombre = "¡Pánico!";
                panico.descripcion = "Robale una carta de su mano o mesa a un jugador a distancia 1.";
                panico.tipoDeUso = "objetivo1";
                panico.efecto = "robar_enemigo"; 
                this.state.mazo.push(panico);
            }

            for (let i = 0; i < 1; i++) {
                const poco = new Carta();
                poco.id = `musicoterapia_${i}`;
                poco.nombre = "Musicoterapia";
                poco.descripcion = "Recupera 1 vida a todos los jugadores vivos en la mesa.";
                poco.tipoDeUso = "instantanea";
                poco.efecto = "curarATodos";
                this.state.mazo.push(poco);
            }

            for (let i = 0; i < 1; i++) { 
                const tira = new Carta();
                tira.id = `tiratachuela_${i}`;
                tira.nombre = "Tiratachuela";
                tira.descripcion = "Dispara a todos los demás jugadores uno por uno.";
                tira.tipoDeUso = "instantanea";
                tira.efecto = "tiratachuela";   
                this.state.mazo.push(tira);
            }

            for (let i = 0; i < 2; i++) { 
                const indios = new Carta();
                indios.id = `indios_${i}`;
                indios.nombre = "¡Indios!";
                indios.descripcion = "Todos los demás jugadores descartan un BANG! o pierden 1 vida.";
                indios.tipoDeUso = "instantanea"; 
                indios.efecto = "indios";   
                this.state.mazo.push(indios);
            }

            const armas = [
                { id: "arma_1", nombre: "Pistola de Shion", descripcion: "Equipa esta arma para obtener alcance: 2", alcance: 2 },
                { id: "arma_2", nombre: "Pistola de Shion", descripcion: "Equipa esta arma para obtener alcance: 2", alcance: 2 },
                { id: "arma_3", nombre: "Pistola de Shion", descripcion: "Equipa esta arma para obtener alcance: 2", alcance: 2 },
                { id: "arma_4", nombre: "Revolver de Casiddy", descripcion: "Equipa esta arma para obtener alcance: 3", alcance: 3 },
                { id: "arma_5", nombre: "Rifle de Ashe", descripcion: "Equipa esta arma para obtener alcance: 4", alcance: 4 },
                { id: "arma_6", nombre: "Francotirador", descripcion: "Equipa esta arma para obtener alcance: 5", alcance: 5 }
            ];

            armas.forEach(arma => {
                const nuevaCarta = new Carta();
                nuevaCarta.id = arma.id;
                nuevaCarta.nombre = arma.nombre;
                nuevaCarta.descripcion = arma.descripcion;
                nuevaCarta.tipoDeUso = "equipamiento";
                nuevaCarta.efecto = `equipar_arma_${arma.alcance}`; // Ej: "equipar_arma_2"
                this.state.mazo.push(nuevaCarta);
            });

            // B. Mezclamos el mazo (Barajado aleatorio)
            let arrayTemporal = Array.from(this.state.mazo);
            arrayTemporal.sort(() => Math.random() - 0.5);
            this.state.mazo.clear();
            arrayTemporal.forEach(carta => this.state.mazo.push(carta));
            console.log(`🃏 El mazo ha sido barajado con ${this.state.mazo.length} cartas.`);

            // C. Repartimos a cada jugador tantas cartas como vidas tenga
            this.state.jugadores.forEach((j, sessionId) => {
                // Vaciamos la mano por las dudas (útil si reinician la partida)
                j.mano.clear();
                
                // Le damos una carta por cada bala que tenga
                for (let balas = 0; balas < j.vidas; balas++) {
                    if (this.state.mazo.length > 0) {
                        const cartaRobada = this.state.mazo.pop();
                        j.mano.push(cartaRobada);
                    }
                }
                console.log(`🖐️ ${j.nombre} recibió ${j.mano.length} cartas en su mano.`);
            });
            
            let sheriff = this.state.jugadores.get(this.state.turnoActual);
            if (sheriff) {
              // el sheriff roba 2 cartas extras al inicio
                this.repartirCartas(sheriff, 2);
            }

            this.state.estadoJuego = "Jugando";
            this.lock(); 
        }
    });
    // ------------------------------------------
    this.onMessage("pasar_turno", (client, message) => {
        if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId) {
            
            let jugadorActual = this.state.jugadores.get(client.sessionId);
            if (jugadorActual) {
                if (jugadorActual.mano.length > jugadorActual.vidas) {
                    let excedente = jugadorActual.mano.length - jugadorActual.vidas;
                    // Le mandamos un mensaje PRIVADO solo a este jugador
                    client.send("alerta_personal", `Tenés demasiadas cartas. Descartá ${excedente} para pasar el turno.`);
                    return; // IMPORTANTE: El 'return' corta la función acá. No lo deja pasar el turno.
                }
            }
            // ---------------------------------------------------------

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
            
            if (jugadorSiguiente) {
              jugadorSiguiente.yaDisparo = false;
                for (let i = 0; i < 2; i++) {
                    if (this.state.mazo.length === 0 && this.state.descarte.length > 0) {
                        console.log("🔄 ¡Mazo vacío! Mezclando la pila de descarte...");
                        
                        // 1. Agarramos todas las cartas del descarte
                        let arrayDescarte = Array.from(this.state.descarte);
                        
                        // 2. Las mezclamos al azar
                        arrayDescarte.sort(() => Math.random() - 0.5);
                        
                        // 3. Vaciamos la pila de descarte
                        this.state.descarte.clear();
                        
                        // 4. Las metemos todas de vuelta en el mazo
                        arrayDescarte.forEach(carta => this.state.mazo.push(carta));
                    }
                    // ---------------------------------------

                    // Ahora sí, robamos con total seguridad
                    if (this.state.mazo.length > 0) {
                        const cartaRobada = this.state.mazo.pop();
                        jugadorSiguiente.mano.push(cartaRobada);
                    }
                }
                console.log(`🃏 ${jugadorSiguiente.nombre} robó 2 cartas.`);
            }
            // ----------------------------------------------------------------
            
            const nombreSiguiente = jugadorSiguiente?.nombre;
            this.broadcast("notificacion_turno", `¡Es el turno de ${nombreSiguiente}!`);
            console.log(`⏩ Turno completado. Ahora le toca a: ${nombreSiguiente}`);
        }
    });

    this.onMessage("jugar_carta", (client, idCarta) => {
        // 1. Verificamos turno, que el juego esté activo, y que NO haya pausas por tiroteos o robos
        if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId && !this.juegoPausado()) {
            
            let jugador = this.state.jugadores.get(client.sessionId);
            if (jugador) {
                let indiceCarta = jugador.mano.findIndex((c: any) => c.id === idCarta);
                
                if (indiceCarta !== -1) {
                    let cartaJugada = jugador.mano[indiceCarta];
                    
                    // --- MAGIA NUEVA: EL DESPACHADOR ---
                    // Separamos el string: "curar_1" -> ["curar", "1"] | "equipar_arma_3" -> ["equipar", "arma", "3"]
                    let partesEfecto = cartaJugada.efecto.split("_");
                    let accionPrincipal = partesEfecto[0]; 

                    
                    // Verificamos si la acción existe en nuestro diccionario de arriba
                    if (GestorDeEfectos[accionPrincipal]) {
                        // ¡Ejecutamos la función aislada enviándole todo lo que necesita!
                        GestorDeEfectos[accionPrincipal](this, client, jugador, cartaJugada, indiceCarta, partesEfecto);
                    } else {
                        console.log(`⚠️ Efecto no programado o desconocido: ${cartaJugada.efecto}`);
                    }
                    // -----------------------------------
                }
            }
        }
    });

    this.onMessage("panico", (client, datos) => {
        if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return;
        let atacante = this.state.jugadores.get(client.sessionId);
        let victima = this.state.jugadores.get(datos.idObjetivo);
        
        if (!atacante || !victima || !victima.estaVivo) return;

        // Buscamos la carta de sabotaje en la mano del atacante
        let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
        if (indiceCartaJugada === -1) return;
        
        let cartaSabotaje = atacante.mano[indiceCartaJugada];
        let accion = cartaSabotaje.efecto.split("_")[0]; // "robar" o "descartar"
        let cartaAfectada = null;

        // 1. Extraemos la carta de la víctima (de su mano o de su mesa)
        if (datos.zonaObjetivo === "mano" && datos.indiceCarta >= 0 && datos.indiceCarta < victima.mano.length) {
            // Sacamos la carta de la mano del enemigo
            cartaAfectada = victima.mano.splice(datos.indiceCarta, 1)[0];
        } 
        else if (datos.zonaObjetivo === "equipamiento" && victima.cartaArma) {
            // Le sacamos el arma
            cartaAfectada = victima.cartaArma;
            victima.cartaArma = null;
            victima.nombreArma = "Colt .45";
            victima.alcanceArma = 1;
        }

        if (!cartaAfectada) return; // Fallo de seguridad por si mandan un índice inválido

        // 2. Aplicamos el destino de la carta (Pánico te la da, Cat Balou la destruye)
        if (accion === "robar") {
            atacante.mano.push(cartaAfectada);
            console.log(`🕵️ ${atacante.nombre} le robó una carta a ${victima.nombre} (Pánico!).`);
            let cartaSabotaje = atacante.mano[indiceCartaJugada];
            this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaSabotaje.nombre, descripcion: cartaSabotaje.descripcion });
            this.broadcast("notificacion_turno", `🕵️ ${atacante.nombre} le robó una carta a ${victima.nombre}.`);
        }

        // 3. Consumimos la carta de sabotaje del atacante
        atacante.mano.splice(indiceCartaJugada, 1);
        this.state.descarte.push(cartaSabotaje);
    });

    this.onMessage("lanzar_cocoroch", (client, datos) => {
      if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return

        let atacante = this.state.jugadores.get(client.sessionId);
        let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
        
        if (indiceCartaJugada !== -1) {
            let cartaUsada = atacante.mano.splice(indiceCartaJugada, 1)[0];
            this.state.descarte.push(cartaUsada);

            this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaUsada.nombre, descripcion: cartaUsada.descripcion });

            // ¡Ponemos a la víctima contra la espada y la pared!
            this.state.jugadorDebeDescartar = datos.idObjetivo;
            this.broadcast("notificacion_turno", `🪳 ¡${atacante.nombre} le jugó un Cocoroch a alguien!`);
            
            
        }
    });

    // 2. La víctima elige qué carta sacrificar
    this.onMessage("responder_descarte", (client, datos) => {
        if (this.state.jugadorDebeDescartar !== client.sessionId) return; // Seguridad

        let victima = this.state.jugadores.get(client.sessionId);
        let cartaAfectada = null;

        if (datos.zona === "mano") {
            cartaAfectada = victima.mano.splice(datos.indice, 1)[0];
        } else if (datos.zona === "equipamiento") {
            cartaAfectada = victima.cartaArma;
            victima.cartaArma = null;
            victima.nombreArma = "Colt .45";
            victima.alcanceArma = 1;
        }

        if (cartaAfectada) {
            this.state.descarte.push(cartaAfectada);
            this.broadcast("notificacion_turno", `🗑️ ${victima.nombre} decidió descartar su ${cartaAfectada.nombre}.`);
        }

        // Liberamos a la víctima y el juego sigue
        this.state.jugadorDebeDescartar = "";
    });

    this.onMessage("responder_indios", (client, datos) => {
        if (this.state.jugadorBajoAtaqueIndio !== client.sessionId) return;

        let victima = this.state.jugadores.get(client.sessionId);
        
        if (datos.accion === "descartar") {
            let indiceBang = victima.mano.findIndex((c: any) => c.id === datos.idCarta);
            if (indiceBang !== -1) {
                let cartaDescartada = victima.mano.splice(indiceBang, 1)[0];
                this.state.descarte.push(cartaDescartada);
                this.broadcast("notificacion_turno", `🛡️ ${victima.nombre} descartó un BANG! y ahuyentó a los Indios.`);
            }
        } else if (datos.accion === "dano") {
            victima.vidas--;
            this.broadcast("notificacion_turno", `🩸 ¡${victima.nombre} recibió 1 de daño por los Indios!`);
            this.evaluarMuerte(victima); // Usamos al Juez limpio
        }

        this.avanzarColaIndios(); // Siguiente víctima
    });

    this.onMessage("disparar_jugador", (client, datosDelDisparo) => {
        let atacante = this.state.jugadores.get(client.sessionId);
        let victima = this.state.jugadores.get(datosDelDisparo.objetivoId);
        
        // Verificamos que sea el turno del atacante y que NO haya otro jugador en peligro
        if (atacante && victima && this.state.turnoActual === client.sessionId && victima.estaVivo && !this.juegoPausado()) {
            
          if (atacante.yaDisparo) {
              client.send("alerta_personal", "Ya disparaste un BANG! en este turno, no podés disparar dos BANG! por turno.");
              client.send("bajar_cartas")
              return; // Cortamos la función acá
          }

           let vivos: string[] = [];
            this.state.jugadores.forEach((j, id) => {
                if (j.estaVivo) vivos.push(id);
            });

            // 2. Buscamos en qué índice del círculo están el atacante y la víctima
            let idxAtacante = vivos.indexOf(client.sessionId);
            let idxVictima = vivos.indexOf(datosDelDisparo.objetivoId);

            // 3. Aplicamos la fórmula de distancia circular mínima
            let n = vivos.length;
            let diferencia = Math.abs(idxAtacante - idxVictima);
            let distancia = Math.min(diferencia, n - diferencia);

            let alcanceMaximo = atacante.alcanceArma;
            
            if (distancia > alcanceMaximo) {
                client.send("alerta_personal", `${victima.nombre} está fuera de tu alcance.\n(Distancia de la victima: ${distancia} | Tu arma llega hasta: ${alcanceMaximo})`);
                return; 
            }

            let indiceCarta = atacante.mano.findIndex((c: any) => c.id === datosDelDisparo.idCarta);
            
            if (indiceCarta !== -1 && atacante.mano[indiceCarta].efecto === "dano_1") {
                let carta = atacante.mano[indiceCarta];
                
                atacante.yaDisparo = true;
                // Sacamos la carta del atacante y la descartamos
                atacante.mano.splice(indiceCarta, 1);
                this.state.descarte.push(carta);
                
                // --- ACTIVAMOS LA ALARMA DE PELIGRO ---
                this.state.jugadorEnPeligro = datosDelDisparo.objetivoId;
                this.state.atacanteActual = client.sessionId;
                
                this.broadcast("notificacion_turno", `⚠️ ¡${atacante.nombre} le disparó a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
                this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: carta.nombre, descripcion: carta.descripcion });
              }
        }
    });

    this.onMessage("responder_ataque", (client, idCartaFallo) => {
        // Solo el jugador que está a punta de pistola puede responder
        if (client.sessionId !== this.state.jugadorEnPeligro) return;

        let victima = this.state.jugadores.get(client.sessionId);
        let atacante = this.state.jugadores.get(this.state.atacanteActual);

        if (victima) {
            // ESCENARIO A: La víctima mandó una carta para defenderse
            if (idCartaFallo) {
                let indice = victima.mano.findIndex((c: any) => c.id === idCartaFallo);
                
                if (indice !== -1 && victima.mano[indice].efecto === "esquivar") {
                    let carta = victima.mano[indice];
                    victima.mano.splice(indice, 1);
                    this.state.descarte.push(carta);
                    
                    this.broadcast("notificacion_turno", `🛡️ ¡Uf! ${victima.nombre} usó un ¡Fallo! y esquivó la bala.`);
                    this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: carta.nombre, descripcion: carta.descripcion });
                  }
            } 
            // ESCENARIO B: La víctima no mandó carta, recibe el balazo
            else {
                victima.vidas--;
                this.broadcast("notificacion_turno", `💥 ¡${victima.nombre} recibió el balazo de ${atacante?.nombre}!`);
                
                this.evaluarMuerte(victima)
            }
        }

        if (this.colaDePeligro && this.colaDePeligro.length > 0) {
            this.avanzarColaDePeligro();
        } else {
            // Si era un BANG normal (cola vacía), o la tachuela ya terminó, apagamos todo
            this.state.jugadorEnPeligro = "";
            this.state.atacanteActual = "";
        }
    });

    this.onMessage("descartar_carta", (client, idCarta) => {
        let jugador = this.state.jugadores.get(client.sessionId);
        
        // Solo podés descartar si es tu turno
        if (jugador && this.state.turnoActual === client.sessionId) {
            let indiceCarta = jugador.mano.findIndex((c: any) => c.id === idCarta);
            
            if (indiceCarta !== -1) {
                let cartaDescartada = jugador.mano[indiceCarta];
                
                // La sacamos de la mano y va directo al descarte sin hacer efecto
                jugador.mano.splice(indiceCarta, 1);
                this.state.descarte.push(cartaDescartada);
                console.log(`🗑️ ${jugador.nombre} descartó la carta: ${cartaDescartada.nombre}`);
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

  repartirCartas(jugador: any, cantidad: number) {
      for (let i = 0; i < cantidad; i++) {
          // Si el mazo se vació, reciclamos el descarte
          if (this.state.mazo.length === 0 && this.state.descarte.length > 0) {
              console.log("🔄 ¡Mazo vacío! Mezclando la pila de descarte...");
              let arrayDescarte = Array.from(this.state.descarte);
              arrayDescarte.sort(() => Math.random() - 0.5);
              this.state.descarte.clear();
              arrayDescarte.forEach(carta => this.state.mazo.push(carta));
          }

          // Repartimos la carta
          if (this.state.mazo.length > 0) {
              const cartaRobada = this.state.mazo.pop();
              jugador.mano.push(cartaRobada);
          }
      }
  }

  juegoPausado(): boolean {
      return (this.state.jugadorEnPeligro !== "" || 
              this.state.jugadorDebeDescartar !== "" || 
              this.state.jugadorBajoAtaqueIndio !== "");
  }
}