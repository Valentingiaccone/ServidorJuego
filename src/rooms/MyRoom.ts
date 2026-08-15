import { Room, Client } from "colyseus";
import { Carta, Jugador, MyRoomState, OpcionPersonaje } from "./schema/MyRoomState.js";
import { DespachadorDeCartas } from "./EfectosCartas.js";
import { GestorPersonajes } from "./Personajes.js";

export class MyRoom extends Room {
    maxClients = 10;
    state = new MyRoomState();

    colaDePeligro: string[] = [];
    colaIndios: string[] = [];
    colaTienda: string[] = [];
    
    // Instanciamos nuestros nuevos motores
    despachadorCartas = new DespachadorDeCartas();
    gestorPersonajes = new GestorPersonajes();

    avanzarColaDePeligro() {
        this.state.usosBarril = 0;

        if (this.colaDePeligro.length > 0) {
            this.state.jugadorEnPeligro = this.colaDePeligro.shift(); 
            let victima = this.state.jugadores.get(this.state.jugadorEnPeligro);
            if (victima && victima.estaVivo) {
                this.broadcast("notificacion_turno", `⚠️ ¡El Tiratachuela apunta a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
            } else {
                this.avanzarColaDePeligro()
            }
        } else {
            this.state.jugadorEnPeligro = "";
            this.state.atacanteActual = "";
            this.broadcast("notificacion_turno", `💨 El ataque de Tiratachuela ha terminado.`);
        }
    }

    avanzarColaIndios() {
        if (this.colaIndios.length > 0) {
            this.state.jugadorBajoAtaqueIndio = this.colaIndios.shift(); 
            let victima = this.state.jugadores.get(this.state.jugadorBajoAtaqueIndio);
            if (victima && victima.estaVivo) {
                this.broadcast("notificacion_turno", `🏹 ¡Los Indios atacan a ${victima.nombre}! ¿Tendrá un BANG!?`);
            } else {
                this.avanzarColaIndios()
            }
        } else {
            this.state.jugadorBajoAtaqueIndio = "";
            this.broadcast("notificacion_turno", `⛺ El ataque de los Indios ha terminado.`);
        }
    }

    avanzarColaTienda() {
        if (this.colaTienda.length > 0) {
            this.state.jugadorEligiendoTienda = this.colaTienda.shift();
            let jugador = this.state.jugadores.get(this.state.jugadorEligiendoTienda);
            if (jugador && jugador.estaVivo){
                this.broadcast("notificacion_turno", `🏪 ${jugador?.nombre} está eligiendo en La tienda de Griff.`);
            } else {
                this.avanzarColaTienda()
            }
            this.broadcast("musica", "tiendaDeGriff")
        } else {
            this.state.jugadorEligiendoTienda = "";
            this.state.cartasTienda.clear(); // Limpieza por si sobraron (ej. alguien murió)
            this.broadcast("notificacion_turno", `🏪 La tienda de Griff ha cerrado.`);
            this.actualizarMusicaAutomatica()
        }
    }

    actualizarMusicaAutomatica(){
        let totalVivos = 0;
        let todosVivos: boolean = true

        this.state.jugadores.forEach((j) => {
            if (j.estaVivo) {
                totalVivos++;
            } else {
                todosVivos = false
            }
        });

        if (todosVivos){
            this.broadcast("musica", "juego")
            return
        }

        if (totalVivos > 4){
            this.broadcast("musica", "juego")
        } else if (totalVivos == 5){
            this.broadcast("musica", "juegoQuedan5")
        } else if (totalVivos == 4){
            this.broadcast("musica", "juegoQuedan4")
        } else if (totalVivos == 3){
            this.broadcast("musica", "juegoQuedan3")
        } else if (totalVivos == 2){
            this.broadcast("musica", "juegoQuedan2")
        }
    }

    evaluarMuerte(victima: any) {
        if (victima.vidas <= 0) {
            victima.estaVivo = false;
            victima.vidas = 0;

            if (victima.personaje === "Kazuma" && victima.rol !== "Sheriff" && !victima.estaMuertoFalso) {
                victima.estaMuertoFalso = true;
                victima.rondasMuerto = 2; 
                this.broadcast("notificacion_turno", `☠️ ${victima.nombre} ha sido ELIMINADO?.`);
                this.broadcast("sfx", "kazumaMuere")
                victima.spriteAvatarOpcional = "Kazuma muerto"
            } else {
                victima.estaMuertoFalso = false;
                console.log(`☠️ ${victima.nombre} ha sido ELIMINADO.`);
            }

            victima.mano.forEach((carta: any) => this.agregarAlDescarte(carta));
            victima.mano.clear();
            if (victima.cartaArma) this.agregarAlDescarte(victima.cartaArma);
            if (victima.cartaMustang) this.agregarAlDescarte(victima.cartaMustang);
            victima.tieneMustang = false;
            victima.tieneMustangPro = false
            victima.cartaMustang = null;
            if (victima.cartaMira) this.agregarAlDescarte(victima.cartaMira);
            victima.tieneMira = false;
            victima.tieneMiraPro = false
            victima.cartaMira = null;
            if (victima.cartaBarril) this.agregarAlDescarte(victima.cartaBarril);
            victima.tieneBarril = false;
            victima.tieneBarrilPro = false
            victima.cartaBarril = null;
            if (victima.cartaPrision) this.agregarAlDescarte(victima.cartaPrision);
            victima.estaEnPrision = false;
            victima.cartaPrision = null;
            if (victima.cartaDinamita) this.agregarAlDescarte(victima.cartaDinamita)
            victima.tieneDinamita = false;
            victima.cartaDinamita = null;

            victima.nombreArma = "Colt .45";
            victima.alcanceArma = 1;

            let idVictima = "";
            this.state.jugadores.forEach((j, id) => {
                if (j === victima) idVictima = id;
            });

            // DESTRABADORES (Por si muere mientras el juego lo esperaba)
            if (this.state.jugadorEnPeligro === idVictima) {
                this.avanzarColaDePeligro();
            }
            if (this.state.jugadorDebeDescartar === idVictima) {
                this.state.jugadorDebeDescartar = "";
            }
            if (this.state.jugadorBajoAtaqueIndio === idVictima) {
                this.avanzarColaIndios();
            }
            if (this.state.jugadorEligiendoTienda === idVictima) {
                this.avanzarColaTienda();
            }
            if (this.state.jugadorEnDuelo === idVictima) {
                this.state.jugadorEnDuelo = "";
                this.state.oponenteDuelo = "";
            }
            if (this.state.jugadorDesenfundando === idVictima) {
                this.state.jugadorDesenfundando = "";
                this.state.motivoDesenfundar = "";
            }

            let vivos = { Sheriff: 0, Forajido: 0, Renegado: 0, Alguacil: 0 };
            let totalVivos = 0;

            this.state.jugadores.forEach((j) => {
                if (j.estaVivo) {
                    vivos[j.rol as keyof typeof vivos]++;
                    totalVivos++;
                    
                    let pasivaJugadorActual = this.gestorPersonajes.obtener(j.personaje);
                    if (pasivaJugadorActual && pasivaJugadorActual.onMuereOtroPersonaje) {
                        pasivaJugadorActual.onMuereOtroPersonaje(this, victima, j);
                    }
                }
            });

            let totalJugadores: number = this.state.jugadores.size;
            let todosVivos: boolean = totalJugadores == totalVivos

            if (vivos.Sheriff === 0) {
                this.state.estadoJuego = "Terminado";
                this.broadcast("musica", "fin")
                if (totalVivos === 1 && vivos.Renegado === 1) {
                    this.broadcast("victoria", "🏆 ¡EL RENEGADO GANA LA PARTIDA!");
                } else {
                    this.broadcast("victoria", "🏆 ¡LOS FORAJIDOS GANAN LA PARTIDA!");
                }
            } else if (vivos.Forajido === 0 && vivos.Renegado === 0) {
                this.state.estadoJuego = "Terminado";
                this.broadcast("victoria", "🏆 ¡EL SHERIFF GANA LA PARTIDA!");
                this.broadcast("musica", "fin")
            } else if (!todosVivos){
                this.actualizarMusicaAutomatica()
            }
        }
    }

    onCreate (options: any) {
        console.log("La sala se creó correctamente");
        this.setState(new MyRoomState());

        this.onMessage("iniciar_partida", (client, message) => {
            const jugador = this.state.jugadores.get(client.sessionId);

            if (jugador && jugador.esAnfitrion && this.state.estadoJuego === "Lobby") {
                const totalJugadores = this.state.jugadores.size;
                console.log(`🔥 ¡El Anfitrión dio la orden! Inicia la partida con ${totalJugadores} jugadores.`);

                this.broadcast("musica", "seleccionDePersonaje")
                
                let mazoRoles: string[] = [];
                if (totalJugadores <= 2) mazoRoles = ["Sheriff", "Renegado"];
                else if (totalJugadores === 3) mazoRoles = ["Sheriff", "Renegado", "Forajido"];
                else if (totalJugadores === 4) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido"];
                else if (totalJugadores === 5) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Alguacil"];
                else if (totalJugadores === 6) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Alguacil"];
                else if (totalJugadores === 7) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Alguacil", "Alguacil"];
                else if (totalJugadores === 8) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Forajido", "Alguacil", "Alguacil"];
                else if (totalJugadores === 9) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Forajido", "Alguacil", "Alguacil", "Alguacil"];
                else if (totalJugadores === 10) mazoRoles = ["Sheriff", "Renegado", "Forajido", "Forajido", "Forajido", "Forajido", "Alguacil", "Alguacil", "Alguacil", "Alguacil"];

                this.state.cantidadForajidos = mazoRoles.filter(rol => rol === "Forajido").length;
                this.state.cantidadAlguaciles = mazoRoles.filter(rol => rol === "Alguacil").length;

                mazoRoles.sort(() => Math.random() - 0.5);

                // --- REPARTO DE ROLES Y OPCIONES DE PERSONAJES ---
                let listaPersonajes = this.gestorPersonajes.obtenerTodosParaRepartir();
                let indicePersonaje = 0;
                
                let i = 0;
                this.state.jugadores.forEach((j, sessionId) => {
                    // Le damos su rol
                    j.rol = mazoRoles[i];
                    if (j.rol === "Sheriff") this.state.turnoActual = sessionId;

                    // Le damos 2 opciones únicas de personaje
                    for (let k = 0; k < 2; k++) {
                        let p = listaPersonajes[indicePersonaje % listaPersonajes.length];
                        let opcion = new OpcionPersonaje();
                        opcion.nombre = p.nombre;
                        opcion.habilidad = p.habilidad;
                        opcion.habilidadEnCatalan = p.habilidadEnCatalan;
                        opcion.vidasBase = p.vidasBase;
                        j.opcionesPersonaje.push(opcion);
                        indicePersonaje++;
                    }
                    i++;
                });

                this.state.mazo.clear();
                
                // Creación del mazo...
                for (let c = 0; c < 26; c++) { // originalmente 25
                    const nuevaCarta = new Carta();
                    nuevaCarta.id = `bang_${c}`;
                    nuevaCarta.nombre = "BANG!";
                    nuevaCarta.descripcion = "Quita 1 vida a un jugador a tu alcance.";
                    nuevaCarta.descripcionEnCatalan = "Treu 1 vida a un jugador al teu abast."
                    nuevaCarta.tipoDeUso = "objetivo";
                    nuevaCarta.efecto = "dano_1";
                    this.state.mazo.push(nuevaCarta);
                }
                
                for (let c = 0; c < 6; c++) {
                    const nuevaCarta = new Carta();
                    nuevaCarta.id = `botiquin_${c}`;
                    nuevaCarta.nombre = "Botiquín";
                    nuevaCarta.descripcion = "Recupera 1 vida (No funciona cuando quedan 2 vivos).";
                    nuevaCarta.descripcionEnCatalan = "Recupera 1 punt de vida (No funciona quan només queden 2 jugadors vius)."
                    nuevaCarta.tipoDeUso = "instantanea";
                    nuevaCarta.efecto = "curar_1";
                    this.state.mazo.push(nuevaCarta);
                }

                for (let c = 0; c < 11; c++) { // originalmente 12
                    const nuevaCarta = new Carta();
                    nuevaCarta.id = `fallo_${c}`;
                    nuevaCarta.nombre = "¡Fallo!";
                    nuevaCarta.descripcion = "Esquiva un BANG! que te hayan disparado.";
                    nuevaCarta.descripcionEnCatalan = "Esquiva un BANG! que t'hagin disparat."
                    nuevaCarta.tipoDeUso = "oculto"; 
                    nuevaCarta.efecto = "esquivar"; 
                    this.state.mazo.push(nuevaCarta);
                }

                for (let i = 0; i < 3; i++) { // originalmente 2
                    const diligencia = new Carta();
                    diligencia.id = `cofre_${i}`;
                    diligencia.nombre = "Cofre";
                    diligencia.descripcion = "Roba 2 cartas del mazo.";
                    diligencia.descripcionEnCatalan = "Roba 2 cartes de la baralla."
                    diligencia.tipoDeUso = "instantanea";
                    diligencia.efecto = "robar_2";
                    this.state.mazo.push(diligencia);
                }

                for (let i = 0; i < 1; i++) {
                    const diligencia = new Carta();
                    diligencia.id = `cofreSuperMagico_${i}`;
                    diligencia.nombre = "Cofre super magico";
                    diligencia.descripcion = "Roba 3 cartas del mazo.";
                    diligencia.descripcionEnCatalan = "Roba 3 cartes de la baralla."
                    diligencia.tipoDeUso = "instantanea";
                    diligencia.efecto = "robar_3";
                    this.state.mazo.push(diligencia);
                }

                for (let i = 0; i < 4; i++) {
                    const cat = new Carta();
                    cat.id = `cocoroch_${i}`;
                    cat.nombre = "Cocoroch";
                    cat.descripcion = "Haz que un jugador descarte una carta de la mano o de la mesa.";
                    cat.descripcionEnCatalan = "Fes que un jugador descarti una carta de la mà o de la taula."
                    cat.tipoDeUso = "objetivoGlobal";
                    cat.efecto = "forzar_enemigo"; 
                    this.state.mazo.push(cat);

                    const panico = new Carta();
                    panico.id = `panico_${i}`;
                    panico.nombre = "¡Pánico!";
                    panico.descripcion = "Robale una carta de su mano o mesa a un jugador a distancia 1.";
                    panico.descripcionEnCatalan = "Roba-li una carta de la mà o de la taula a un jugador a distància 1."
                    panico.tipoDeUso = "objetivo1";
                    panico.efecto = "robar_enemigo"; 
                    this.state.mazo.push(panico);
                }

                for (let i = 0; i < 1; i++) {
                    const poco = new Carta();
                    poco.id = `musicoterapia_${i}`;
                    poco.nombre = "Musicoterapia";
                    poco.descripcion = "Recupera 1 vida a todos los jugadores vivos en la mesa (No funciona cuando quedan 2 vivos).";
                    poco.descripcionEnCatalan = "Recupera 1 punt de vida a tots els jugadors vius de la taula (No funciona quan només queden 2 jugadors vius)."
                    poco.tipoDeUso = "instantanea";
                    poco.efecto = "curarATodos";
                    this.state.mazo.push(poco);
                }

                for (let i = 0; i < 2; i++) { // originalmente 1
                    const tira = new Carta();
                    tira.id = `tiratachuela_${i}`;
                    tira.nombre = "Tiratachuela";
                    tira.descripcion = "Dispara a todos los demás jugadores uno por uno.";
                    tira.descripcionEnCatalan = "Dispara a tots els altres jugadors un per un."
                    tira.tipoDeUso = "instantanea";
                    tira.efecto = "tiratachuela";   
                    this.state.mazo.push(tira);
                }

                for (let i = 0; i < 3; i++) {  // originalmente 2
                    const indios = new Carta();
                    indios.id = `indios_${i}`;
                    indios.nombre = "¡Indios!";
                    indios.descripcion = "Todos los demás jugadores descartan un BANG! o pierden 1 vida.";
                    indios.descripcionEnCatalan = "Tots els altres jugadors descarten un BANG! o perden 1 punt de vida."
                    indios.tipoDeUso = "instantanea"; 
                    indios.efecto = "indios";   
                    this.state.mazo.push(indios);
                }

                for (let i = 0; i < 2; i++) { 
                    const tienda = new Carta();
                    tienda.id = `tienda_griff_${i}`;
                    tienda.nombre = "La tienda de Griff";
                    tienda.descripcion = "Revela cartas, empezando por vos, cada jugador elige una.";
                    tienda.descripcionEnCatalan = "Revela cartes, començant per tu; cada jugador en tria una."
                    tienda.tipoDeUso = "instantanea";
                    tienda.efecto = "tienda";   
                    this.state.mazo.push(tienda);
                }

                for (let i = 0; i < 3; i++) {
                    const duelo = new Carta();
                    duelo.id = `duelo_${i}`;
                    duelo.nombre = "Duelo";
                    duelo.descripcion = "Desafía a cualquier jugador. Deben turnarse para descartar un BANG!. El primero que no lo haga, pierde 1 vida.";
                    duelo.descripcionEnCatalan = "Desafia qualsevol jugador. Us heu d'alternar per descartar un BANG!. El primer que no ho faci, perd 1 punt de vida."
                    duelo.tipoDeUso = "objetivoGlobal"; // Alcance infinito
                    duelo.efecto = "duelo"; 
                    this.state.mazo.push(duelo);
                }

                for (let i = 0; i < 2; i++) {
                    const mustang = new Carta();
                    mustang.id = `caballo_${i}`;
                    mustang.nombre = "Caballo";
                    mustang.descripcion = "Los demás te ven a distancia +1.";
                    mustang.descripcionEnCatalan = "Els altres et veuen a distància +1."
                    mustang.tipoDeUso = "equipamiento";
                    mustang.efecto = "equiparMustang";
                    this.state.mazo.push(mustang);
                }
                
                for (let i = 0; i < 2; i++) { // originalmemte 1
                    const mira = new Carta();
                    mira.id = `monoAldea_${i}`;
                    mira.nombre = "Monoaldea";
                    mira.descripcion = "Ves a los demás a distancia -1.";
                    mira.descripcionEnCatalan = "Veus els altres a distància -1."
                    mira.tipoDeUso = "equipamiento";
                    mira.efecto = "equiparMira";
                    this.state.mazo.push(mira);
                }

                for (let i = 0; i < 2; i++) {
                    const barril = new Carta();
                    barril.id = `barril_${i}`;
                    barril.nombre = "Barril";
                    barril.descripcion = "Si te disparan, podes usar el barril, tenes 25% de esquivar el tiro.";
                    barril.descripcionEnCatalan = "Si et disparen, pots utilitzar el barril; tens un 25 % de probabilitats d'esquivar el tret."
                    barril.tipoDeUso = "equipamiento";
                    barril.efecto = "equiparBarril";
                    this.state.mazo.push(barril);
                }

                for (let i = 0; i < 3; i++) {
                    const prision = new Carta();
                    prision.id = `prision_${i}`;
                    prision.nombre = "Prisión";
                    prision.descripcion = "Equipala a otro jugador (menos al Sheriff). Tiene 25% de salir de la carcel o perder el turno.";
                    prision.descripcionEnCatalan = "Equipa-la a un altre jugador (excepte el Sheriff). Té un 25 % de probabilitats de sortir de la presó o de perdre el torn."
                    prision.tipoDeUso = "objetivoGlobal"; 
                    prision.efecto = "prision";
                    this.state.mazo.push(prision);
                }

                for (let i = 0; i < 1; i++) {
                    const dinamita = new Carta();
                    dinamita.id = `dinamita_${i}`;
                    dinamita.nombre = "Dinamita";
                    dinamita.descripcion = "Tenes 12,5% de que te explote la dinamita y perder 3 vidas, en caso contrario pasa al siguiente.";
                    dinamita.descripcionEnCatalan = "Tens un 12,5 % de probabilitats que t'exploti la dinamita i perdis 3 vides; en cas contrari, passa al següent."
                    dinamita.tipoDeUso = "equipamiento";
                    dinamita.efecto = "equiparDinamita";
                    this.state.mazo.push(dinamita);
                }

                const armas = [
                    { id: "arma_1", 
                        nombre: "Pistola de Shion", 
                        descripcion: "Equipa esta arma para obtener alcance: 2", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 2.",
                        alcance: 2 },
                    { id: "arma_2", 
                        nombre: "Pistola de Shion", 
                        descripcion: "Equipa esta arma para obtener alcance: 2", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 2.",
                        alcance: 2 },
                    { id: "arma_3", 
                        nombre: "Revolver de Casiddy", 
                        descripcion: "Equipa esta arma para obtener alcance: 3", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 3.",
                        alcance: 3 },
                    { id: "arma_4", 
                        nombre: "Rifle de Ashe", 
                        descripcion: "Equipa esta arma para obtener alcance: 4", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 4.",
                        alcance: 4 },
                    { id: "arma_5", 
                        nombre: "Francotirador", 
                        descripcion: "Equipa esta arma para obtener alcance: 5", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 5.",
                        alcance: 5 },
                    { id: "arma_6", 
                        nombre: "Pistola de Tracer", 
                        descripcion: "Equipa esta arma para no tener limites de uso de BANG!", 
                        descripcionEnCatalan: "Equipa aquesta arma per no tenir límits d'ús de BANG!.",
                        alcance: 1 },
                    { id: "arma_7", 
                        nombre: "Pistola de Tracer", 
                        descripcion: "Equipa esta arma para no tener limites de uso de BANG!",
                        descripcionEnCatalan: "Equipa aquesta arma per no tenir límits d'ús de BANG!.",
                        alcance: 1 },
                ];

                armas.forEach(arma => {
                    const nuevaCarta = new Carta();
                    nuevaCarta.id = arma.id;
                    nuevaCarta.nombre = arma.nombre;
                    nuevaCarta.descripcion = arma.descripcion;
                    nuevaCarta.descripcionEnCatalan = arma.descripcionEnCatalan
                    nuevaCarta.tipoDeUso = "equipamiento";
                    nuevaCarta.efecto = `equipar_arma_${arma.alcance}`;
                    this.state.mazo.push(nuevaCarta);
                });

                // --- MEZCLAR EL MAZO ---
                let arrayTemporal = Array.from(this.state.mazo);
                
                // Ordena el array de forma aleatoria
                arrayTemporal.sort(() => Math.random() - 0.5);
                
                // Vaciamos el mazo original y lo volvemos a llenar ya mezclado
                this.state.mazo.clear();
                arrayTemporal.forEach(carta => this.state.mazo.push(carta));

                this.state.estadoJuego = "SeleccionPersonaje";
                this.lock();
            }
        });

        this.onMessage("elegir_personaje", (client, nombreElegido) => {
            if (this.state.estadoJuego !== "SeleccionPersonaje") return;
            
            let jugador = this.state.jugadores.get(client.sessionId);
            if (!jugador || jugador.yaEligioPersonaje) return;

            // Buscamos la opción que tocó
            let elegida = jugador.opcionesPersonaje.find((o: any) => o.nombre === nombreElegido);
            if (elegida) {
                jugador.personaje = elegida.nombre;
                jugador.habilidad = elegida.habilidad;
                jugador.habilidadEnCatalan = elegida.habilidadEnCatalan;
                
                // Aplicamos las vidas, considerando si es Sheriff
                jugador.vidas = elegida.vidasBase;
                if (jugador.rol === "Sheriff") jugador.vidas++;
                jugador.vidasMaximas = jugador.vidas;
                
                jugador.yaEligioPersonaje = true;
                console.log(`✅ ${jugador.nombre} eligió a ${jugador.personaje}.`);
            }

            // ¿Ya eligieron todos?
            let todosEligieron = true;
            this.state.jugadores.forEach(j => {
                if (!j.yaEligioPersonaje) todosEligieron = false;
            });

            if (todosEligieron) {
                console.log("🔥 Todos eligieron. ¡Repartiendo cartas iniciales!");
                
                // Ahora sí, le damos a cada quien su mano inicial según su vida máxima
                this.state.jugadores.forEach((j, sessionId) => {
                    j.mano.clear();
                    for (let balas = 0; balas < j.vidas; balas++) {
                        if (this.state.mazo.length > 0) j.mano.push(this.state.mazo.pop());
                    }
                });
                
                let sheriff = this.state.jugadores.get(this.state.turnoActual);
                if (sheriff) this.repartirCartas(sheriff, 2, "turno");

                this.state.estadoJuego = "Jugando";

                this.broadcast("musica", "juego")
            }
        });

        this.onMessage("pasar_turno", (client, message) => {
            if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId) {

                let modificacion: number = 0
                let jugadorActual = this.state.jugadores.get(client.sessionId);
                let pasivaJugadorActual = this.gestorPersonajes.obtener(jugadorActual.personaje);
                if (pasivaJugadorActual && pasivaJugadorActual.modificarCartasEnManoAlPasarTurno) {
                    modificacion = pasivaJugadorActual.modificarCartasEnManoAlPasarTurno();
                }

                if (jugadorActual) {
                    if (jugadorActual.mano.length > jugadorActual.vidas + modificacion) {
                        let excedente = jugadorActual.mano.length - jugadorActual.vidas - modificacion;
                        client.send("alerta_personal", `Tenés demasiadas cartas. Descartá ${excedente} para pasar el turno.`);
                        return; 
                    }

                    // --- HOOK PASAR TURNO ---
                    if (pasivaJugadorActual && pasivaJugadorActual.onPasarTurno) {
                        pasivaJugadorActual.onPasarTurno(this, jugadorActual);
                    }
                }

                this.broadcast("notificacion_turno", `¡El jugador ${jugadorActual?.nombre} ha pasado su turno!`);
                
                // ¡Llamamos a nuestra nueva función!
                this.avanzarAlSiguienteTurno(client.sessionId);
            }
        });

        this.onMessage("jugar_carta", (client, idCarta) => {
            if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId && !this.juegoPausado()) {
                let jugador = this.state.jugadores.get(client.sessionId);
                if (jugador) {
                    let indiceCarta = jugador.mano.findIndex((c: any) => c.id === idCarta);
                    if (indiceCarta !== -1) {
                        let cartaJugada = jugador.mano[indiceCarta];
                        let partesEfecto = cartaJugada.efecto.split("_");
                        
                        // --- EL DESPACHADOR ACTÚA ---
                        const esValido: boolean = this.despachadorCartas.ejecutarEfecto(partesEfecto[0], this, client, jugador, cartaJugada, indiceCarta, partesEfecto, this.gestorPersonajes);
                        if (esValido){
                            let pasiva = this.gestorPersonajes.obtener(jugador.personaje)
                            if (pasiva && pasiva.onJugarCarta){
                                pasiva.onJugarCarta(this, jugador, cartaJugada)
                            }
                        }
                    }
                }
            }
        });

        this.onMessage("panico", (client, datos) => {
            if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return;
            let atacante = this.state.jugadores.get(client.sessionId);
            let victima = this.state.jugadores.get(datos.idObjetivo);
            
            if (!atacante || !victima || !victima.estaVivo) return;

            let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
            if (indiceCartaJugada === -1) return;
            
            let cartaSabotaje = atacante.mano[indiceCartaJugada];
            let accion = cartaSabotaje.efecto.split("_")[0]; 
            let cartaAfectada = null;

            // Extraemos la carta exacta que pidieron
            if (datos.zonaObjetivo === "mano" && datos.indiceCarta >= 0 && datos.indiceCarta < victima.mano.length) {
                cartaAfectada = victima.mano.splice(datos.indiceCarta, 1)[0];
            } else if (datos.zonaObjetivo === "arma" && victima.cartaArma) {
                cartaAfectada = victima.cartaArma;
                victima.cartaArma = null;
                victima.nombreArma = "Colt .45";
                victima.alcanceArma = 1;
            } else if (datos.zonaObjetivo === "mustang" && victima.cartaMustang) {
                cartaAfectada = victima.cartaMustang;
                victima.cartaMustang = null;
                victima.tieneMustang = false;
                victima.tieneMustangPro = false
            } else if (datos.zonaObjetivo === "mira" && victima.cartaMira) {
                cartaAfectada = victima.cartaMira;
                victima.cartaMira = null;
                victima.tieneMira = false;
                victima.tieneMiraPro = false
            } else if (datos.zonaObjetivo === "barril" && victima.cartaBarril) {
                cartaAfectada = victima.cartaBarril;
                victima.cartaBarril = null;
                victima.tieneBarril = false;
                victima.tieneBarrilPro = false
            } else if (datos.zonaObjetivo === "prision" && victima.cartaPrision) {
                cartaAfectada = victima.cartaPrision;
                victima.cartaPrision = null;
                victima.estaEnPrision = false;
            } else if (datos.zonaObjetivo === "dinamita" && victima.cartaDinamita) {
                cartaAfectada = victima.cartaDinamita;
                victima.cartaDinamita = null;
                victima.tieneDinamita = false;
            }

            if (!cartaAfectada) return; 

            if (accion === "robar") {
                atacante.mano.push(cartaAfectada);
                this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaSabotaje.nombre, descripcion: cartaSabotaje.descripcion, esConjurada: cartaSabotaje.esConjurada, descripcionCatalan: cartaSabotaje.descripcionEnCatalan});
                this.broadcast("notificacion_turno", `🕵️ ${atacante.nombre} le robó una carta a ${victima.nombre}.`);
            
                let pasiva = this.gestorPersonajes.obtener(atacante.personaje)
                if (pasiva && pasiva.onJugarCarta){
                    pasiva.onJugarCarta(this, atacante, cartaSabotaje)
                }
            }

            atacante.mano.splice(indiceCartaJugada, 1);
            this.agregarAlDescarte(cartaSabotaje)
        });

        this.onMessage("lanzar_cocoroch", (client, datos) => {
            if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return;

            let atacante = this.state.jugadores.get(client.sessionId);
            let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
            
            if (indiceCartaJugada !== -1) {
                let cartaUsada = atacante.mano.splice(indiceCartaJugada, 1)[0];
                this.agregarAlDescarte(cartaUsada)
                this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaUsada.nombre, descripcion: cartaUsada.descripcion, esConjurada: cartaUsada.esConjurada, descripcionCatalan: cartaUsada.descripcionEnCatalan});

                this.state.jugadorDebeDescartar = datos.idObjetivo;
                this.broadcast("notificacion_turno", `🪳 ¡${atacante.nombre} le jugó un Cocoroch a alguien!`);
                const numero: number = Math.floor(Math.random() * 2);
                const sfx: string = "cocoroch" + numero
                this.broadcast("sfx", sfx)

                let pasiva = this.gestorPersonajes.obtener(atacante.personaje)
                if (pasiva && pasiva.onJugarCarta){
                    pasiva.onJugarCarta(this, atacante, cartaUsada)
                }
            }
        });

        this.onMessage("responder_descarte", (client, datos) => {
            if (this.state.jugadorDebeDescartar !== client.sessionId) return; 

            let victima = this.state.jugadores.get(client.sessionId);
            let cartaAfectada = null;

            if (datos.zona === "mano") {
                cartaAfectada = victima.mano.splice(datos.indice, 1)[0];
            } else if (datos.zona === "arma" && victima.cartaArma) {
                cartaAfectada = victima.cartaArma;
                victima.cartaArma = null;
                victima.nombreArma = "Colt .45";
                victima.alcanceArma = 1;
            } else if (datos.zona === "mustang" && victima.cartaMustang) {
                cartaAfectada = victima.cartaMustang;
                victima.cartaMustang = null;
                victima.tieneMustang = false;
                victima.tieneMustangPro = false
            } else if (datos.zona === "mira" && victima.cartaMira) {
                cartaAfectada = victima.cartaMira;
                victima.cartaMira = null;
                victima.tieneMira = false;
                victima.tieneMiraPro = false
            } else if (datos.zona === "barril" && victima.cartaBarril) {
                cartaAfectada = victima.cartaBarril;
                victima.cartaBarril = null;
                victima.tieneBarril = false;
                victima.tieneBarrilPro = false
            } else if (datos.zona === "prision" && victima.cartaPrision) {
                cartaAfectada = victima.cartaPrision;
                victima.cartaPrision = null;
                victima.estaEnPrision = false;
            } else if (datos.zona === "dinamita" && victima.cartaDinamita) {
                cartaAfectada = victima.cartaDinamita;
                victima.cartaDinamita = null;
                victima.tieneDinamita = false;
            }

            if (cartaAfectada) {
                this.agregarAlDescarte(cartaAfectada)
                this.broadcast("notificacion_turno", `🗑️ ${victima.nombre} decidió descartar su ${cartaAfectada.nombre}.`);
                
                let pasivaVictima = this.gestorPersonajes.obtener(victima.personaje);
                if (pasivaVictima && pasivaVictima.onDescartarCarta) {
                    pasivaVictima.onDescartarCarta(this, victima, cartaAfectada, "COCOROCH");
                }
            }

            this.state.jugadorDebeDescartar = "";
        });

        this.onMessage("intentar_barril", (client, datos) => {
            if (client.sessionId !== this.state.jugadorEnPeligro) return;
            
            let victima = this.state.jugadores.get(client.sessionId);
            let maxUsos = 0;
            if (victima.tieneBarril) maxUsos++;
            if (victima.tieneBarrilPro) maxUsos++;
            if (victima.personaje === "Darryl") maxUsos++;

            if (maxUsos === 0 || this.state.usosBarril >= maxUsos) return;

            this.state.usosBarril++;
            
            this.prepararDesenfundar(client.sessionId, "Barril");
            
            this.broadcast("notificacion_turno", `🛢️ ¡${victima.nombre} tira de la ruleta del Barril!`);
        });

        this.onMessage("voltear_carta", (client, datos) => {
            if (this.state.jugadorDesenfundando !== client.sessionId) return;

            let victima = this.state.jugadores.get(client.sessionId);
            let motivoActual = this.state.motivoDesenfundar; 
            
            // LA MAGIA AQUÍ: Elegimos un índice al azar de la ruleta generada
            let indiceObjetivo = Math.floor(Math.random() * 16);
            let fueExito = this.state.layoutRuleta[indiceObjetivo];
            
            let textoVisual = fueExito ? "¡ÉXITO!" : "FALLÓ";
            if (motivoActual === "Dinamita") textoVisual = fueExito ? "¡A SALVO!" : "¡BOOM!";

            this.broadcast("resultado_ruleta", { 
                exito: fueExito,
                texto: textoVisual,
                objetivoIndex: indiceObjetivo // Mandamos el índice exacto a Cocos
            });

            // 2. EL SUSPENSO (Le damos 4.5 segundos a la animación visual en Cocos)
            this.clock.setTimeout(() => {
                
                // Le decimos a Cocos que CIERRE EL PANEL 
                this.state.jugadorDesenfundando = "";
                this.state.motivoDesenfundar = "";

                this.clock.setTimeout(() => {

                    // --- HELPER DE SEGURIDAD (Evita que Colyseus crashee el estado) ---
                    let descartarEquipamientoSeguro = (cartaVieja: any) => {
                        if (!cartaVieja) return;
                        let clon = new Carta();
                        clon.id = cartaVieja.id; 
                        clon.nombre = cartaVieja.nombre; 
                        clon.descripcion = cartaVieja.descripcion;
                        clon.descripcionEnCatalan = cartaVieja.descripcionEnCatalan
                        clon.tipoDeUso = cartaVieja.tipoDeUso; 
                        clon.efecto = cartaVieja.efecto;
                        clon.esConjurada = cartaVieja.esConjurada
                        this.agregarAlDescarte(clon)
                    };

                    // 3. EJECUTAMOS LAS CONSECUENCIAS
                    if (motivoActual === "Barril") {
                        if (fueExito) {
                            this.broadcast("notificacion_turno", `❤️ ¡Salió Verde! El Barril salvó a ${victima?.nombre}.`);
                            if (this.colaDePeligro && this.colaDePeligro.length > 0) this.avanzarColaDePeligro();
                            else { this.state.jugadorEnPeligro = ""; this.state.atacanteActual = ""; this.state.usosBarril = 0; }
                        } else {
                            this.broadcast("notificacion_turno", `💥 ¡Salió Rojo! El Barril no aguantó el disparo.`);
                        }
                    } 
                    else if (motivoActual === "Dinamita") {
                        if (!fueExito) { // Explotó
                            this.broadcast("notificacion_turno", `💥 ¡BOOOOOOM! Salió Rojo. La dinamita explotó en la cara de ${victima?.nombre}.`);
                            const numero: number = Math.floor(Math.random() * 3);
                            const sfx: string = "explosion" + numero
                            this.broadcast("sfx", sfx)
                            if (victima) victima.vidas -= 3;
                            
                            if (victima && victima.cartaDinamita) descartarEquipamientoSeguro(victima.cartaDinamita);
                            if (victima) victima.tieneDinamita = false;
                            if (victima) victima.cartaDinamita = null;

                            let pasivaVictima = this.gestorPersonajes.obtener(victima?.personaje);
                            if (pasivaVictima && pasivaVictima.onRecibirDano) pasivaVictima.onRecibirDano(this, victima, null, "DINAMITA");

                            this.evaluarMuerte(victima);
                            
                            if (victima && victima.estaVivo) this.evaluarFasePrision(client.sessionId);
                            else this.avanzarAlSiguienteTurno(client.sessionId);
                        } else {
                            this.broadcast("notificacion_turno", `💨 ¡Uf! Salió Verde. La Dinamita pasa al siguiente jugador.`);
                            
                            let siguiente = this.obtenerSiguienteJugadorVivo(client.sessionId);
                            if (siguiente.jugador) {
                                siguiente.jugador.tieneDinamita = true;
                                siguiente.jugador.cartaDinamita = victima?.cartaDinamita;
                            }
                            if (victima) victima.tieneDinamita = false;
                            if (victima) victima.cartaDinamita = null;

                            this.evaluarFasePrision(client.sessionId);
                        }
                    } 
                    else if (motivoActual === "Prision") {
                        if (fueExito) {
                            this.broadcast("notificacion_turno", `❤️ ¡Salió Verde! ${victima?.nombre} escapó de la cárcel.`);
                            this.repartirCartas(victima, 2, "turno");
                            this.broadcast("notificacion_turno", `¡Es el turno de ${victima?.nombre}!`);
                        } else {
                            this.broadcast("notificacion_turno", `⛓️ ¡Salió Rojo! ${victima?.nombre} se queda encerrado.`);
                            this.avanzarAlSiguienteTurno(client.sessionId);
                        }
                        
                        if (victima && victima.cartaPrision) {
                            descartarEquipamientoSeguro(victima.cartaPrision);
                            victima.cartaPrision = null;
                            victima.estaEnPrision = false;
                        }
                    }
                }, 650); 
            }, 5000); //<- ruleta
        });
        
        this.onMessage("responder_indios", (client, datos) => {
            if (this.state.jugadorBajoAtaqueIndio !== client.sessionId) return;

            let victima = this.state.jugadores.get(client.sessionId);
            
            if (datos.accion === "descartar") {
                let indiceBang = victima.mano.findIndex((c: any) => c.id === datos.idCarta);
                if (indiceBang !== -1) {
                    let cartaDescartada = victima.mano.splice(indiceBang, 1)[0];
                    this.agregarAlDescarte(cartaDescartada)
                    this.broadcast("notificacion_turno", `🛡️ ${victima.nombre} descartó un BANG! y ahuyentó a los Indios.`);
                }
                
                // Como esquivó y está vivo, avanzamos la cola manualmente
                this.avanzarColaIndios(); 
                
            } else if (datos.accion === "dano") {
                victima.vidas--;
                this.broadcast("notificacion_turno", `🩸 ¡${victima.nombre} recibió 1 de daño por los Indios!`);
                
                let pasivaVictima = this.gestorPersonajes.obtener(victima.personaje);
                if (pasivaVictima && pasivaVictima.onRecibirDano) {
                    pasivaVictima.onRecibirDano(this, victima, null, "INDIOS");
                }
                
                this.evaluarMuerte(victima); 
                
                // ¡LA CLAVE!: Solo avanzamos la cola manualmente si el jugador sobrevivió.
                // Si murió, evaluarMuerte ya la avanzó por nosotros a través de los destrabadores.
                if (victima.vidas > 0) {
                    this.avanzarColaIndios();
                }
            }
        });

        this.onMessage("disparar_jugador", (client, datosDelDisparo) => {
            let atacante = this.state.jugadores.get(client.sessionId);
            let victima = this.state.jugadores.get(datosDelDisparo.objetivoId);
            
            if (atacante && victima && this.state.turnoActual === client.sessionId && victima.estaVivo && !this.juegoPausado()) {
                
                let pasivaAtacante = this.gestorPersonajes.obtener(atacante.personaje);
                let puedeDispararExtra = pasivaAtacante && pasivaAtacante.puedeDispararBang ? pasivaAtacante.puedeDispararBang(this, atacante, victima) : false;

                if (atacante.yaDisparo && !puedeDispararExtra && atacante.nombreArma !== "Pistola de Tracer") {
                    client.send("alerta_personal", "Ya disparaste un BANG! en este turno, no podés disparar dos BANG! por turno.");
                    return; 
                }

                let vivos: string[] = [];
                this.state.jugadores.forEach((j, id) => {
                    if (j.estaVivo) vivos.push(id);
                });

                let idxAtacante = vivos.indexOf(client.sessionId);
                let idxVictima = vivos.indexOf(datosDelDisparo.objetivoId);

                let n = vivos.length;
                let diferencia = Math.abs(idxAtacante - idxVictima);
                let distancia = Math.min(diferencia, n - diferencia);

                if (atacante.tieneMiraPro) distancia -= 2;
                else if (atacante.tieneMira) distancia -= 1;

                if (victima.tieneMustangPro) distancia += 2;
                else if (victima.tieneMustang) distancia += 1;

                // --- HOOK MODIFICAR DISTANCIA (ATACANTE) ---
                if (pasivaAtacante && pasivaAtacante.modificarDistancia) {
                    distancia = pasivaAtacante.modificarDistancia(this, atacante, victima, distancia);
                }

                // --- HOOK MODIFICAR DISTANCIA (VÍCTIMA) ---
                let pasivaVictimaDistancia = this.gestorPersonajes.obtener(victima.personaje);
                if (pasivaVictimaDistancia && pasivaVictimaDistancia.modificarDistancia) {
                    distancia = pasivaVictimaDistancia.modificarDistancia(this, atacante, victima, distancia);
                }

                let alcanceMaximo = atacante.alcanceArma;
                
                // --- NUEVO: PREPARAMOS LA CARTA PARA EVALUAR SU ALCANCE ESPECIAL (KAMURA) ---
                let indiceCarta = atacante.mano.findIndex((c: any) => c.id === datosDelDisparo.idCarta);
                let cartaUsada = (indiceCarta !== -1) ? atacante.mano[indiceCarta] : null;

                // KAMURA: Su alcance siempre es 1, ignorando el arma equipada.
                if (cartaUsada && cartaUsada.tipoDeUso === "objetivo1") {
                    alcanceMaximo = 1;
                }
                
                if (distancia > alcanceMaximo) {
                    client.send("alerta_personal", `${victima.nombre} está fuera de tu alcance.`);
                    return; 
                }
                
                // --- NUEVO: ACEPTAMOS TANTO dano_1 COMO dano_2 ---
                if (cartaUsada && (cartaUsada.efecto === "dano_1" || cartaUsada.efecto === "dano_2")) {
                    
                    atacante.yaDisparo = true;
                    atacante.mano.splice(indiceCarta, 1);
                    this.agregarAlDescarte(cartaUsada)
                    
                    this.state.jugadorEnPeligro = datosDelDisparo.objetivoId;
                    this.state.atacanteActual = client.sessionId;
                    
                    // --- NUEVO: MEMORIZAMOS EL DAÑO Y RESETEAMOS EL BARRIL ---
                    this.state.danoPendiente = (cartaUsada.efecto === "dano_2") ? 2 : 1;
                    this.state.usosBarril = 0; 
                    
                    this.broadcast("notificacion_turno", `⚠️ ¡${atacante.nombre} le atacó a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
                    this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaUsada.nombre, descripcion: cartaUsada.descripcion, esConjurada: cartaUsada.esConjurada, descripcionCatalan: cartaUsada.descripcionEnCatalan});
                
                    let pasiva = this.gestorPersonajes.obtener(atacante.personaje)
                    if (pasiva && pasiva.onJugarCarta){
                        pasiva.onJugarCarta(this, atacante, cartaUsada)
                    }
                }
            }
        });

        this.onMessage("lanzar_duelo", (client, datos) => {
            if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return;

            let atacante = this.state.jugadores.get(client.sessionId);
            let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
            
            if (indiceCartaJugada !== -1) {
                let cartaUsada = atacante.mano.splice(indiceCartaJugada, 1)[0];
                this.agregarAlDescarte(cartaUsada)
                this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaUsada.nombre, descripcion: cartaUsada.descripcion, esConjurada: cartaUsada.esConjurada, descripcionCatalan: cartaUsada.descripcionEnCatalan});

                // Seteamos quién empieza defendiéndose y quién es el oponente
                this.state.jugadorEnDuelo = datos.idObjetivo;
                this.state.oponenteDuelo = client.sessionId;
                
                let victima = this.state.jugadores.get(datos.idObjetivo);
                this.broadcast("notificacion_turno", `⚔️ ¡${atacante.nombre} retó a duelo a ${victima?.nombre}!`);
            
                let pasiva = this.gestorPersonajes.obtener(atacante.personaje)
                if (pasiva && pasiva.onJugarCarta){
                    pasiva.onJugarCarta(this, atacante, cartaUsada)
                }
            }
        });

        this.onMessage("encarcelar_jugador", (client, datos) => {
            if (this.state.estadoJuego !== "Jugando" || this.state.turnoActual !== client.sessionId || this.juegoPausado()) return;

            let atacante = this.state.jugadores.get(client.sessionId);
            let victima = this.state.jugadores.get(datos.idObjetivo);
            
            if (!atacante || !victima) return;

            // REGLAS: No al Sheriff, no a uno mismo, no si ya está preso
            if (victima.rol === "Sheriff") {
                client.send("alerta_personal", "No podés meter preso al Sheriff.");
                return;
            }
            if (client.sessionId === datos.idObjetivo) {
                client.send("alerta_personal", "No te podés meter preso a vos mismo.");
                return;
            }
            if (victima.estaEnPrision) {
                client.send("alerta_personal", `${victima.nombre} ya está en prisión.`);
                return;
            }

            let indiceCartaJugada = atacante.mano.findIndex((c: any) => c.id === datos.idCartaJugada);
            if (indiceCartaJugada !== -1) {
                let cartaUsada = atacante.mano.splice(indiceCartaJugada, 1)[0];
                
                // Le equipamos la prisión a la víctima
                victima.estaEnPrision = true;
                victima.cartaPrision = cartaUsada;
                
                this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaUsada.nombre, descripcion: cartaUsada.descripcion, esConjurada: cartaUsada.esConjurada, descripcionCatalan: cartaUsada.descripcionEnCatalan});
                this.broadcast("notificacion_turno", `⛓️ ¡${atacante.nombre} mandó a la cárcel a ${victima.nombre}!`);
            
                let pasiva = this.gestorPersonajes.obtener(atacante.personaje)
                if (pasiva && pasiva.onJugarCarta){
                    pasiva.onJugarCarta(this, atacante, cartaUsada)
                }
            }
        });

        this.onMessage("responder_duelo", (client, datos) => {
            if (this.state.jugadorEnDuelo !== client.sessionId) return;

            let jugadorActual = this.state.jugadores.get(client.sessionId);
            
            if (datos.accion === "descartar") {
                let indiceBang = jugadorActual.mano.findIndex((c: any) => c.id === datos.idCarta);
                if (indiceBang !== -1) {
                    let cartaDescartada = jugadorActual.mano.splice(indiceBang, 1)[0];
                    this.agregarAlDescarte(cartaDescartada)
                    
                    this.broadcast("notificacion_turno", `🛡️ ${jugadorActual.nombre} descartó un BANG! ¡El duelo vuelve!`);
                    
                    // EFECTO PING-PONG: Intercambiamos los roles
                    let temp = this.state.jugadorEnDuelo;
                    this.state.jugadorEnDuelo = this.state.oponenteDuelo;
                    this.state.oponenteDuelo = temp;
                }
            } else if (datos.accion === "dano") {
                jugadorActual.vidas--;
                
                let ganadorDuelo = this.state.jugadores.get(this.state.oponenteDuelo);
                this.broadcast("notificacion_turno", `🩸 ¡${jugadorActual.nombre} no pudo defenderse y perdió el duelo contra ${ganadorDuelo?.nombre}!`);
                
                // HOOK RECIBIR DAÑO
                let pasivaVictima = this.gestorPersonajes.obtener(jugadorActual.personaje);
                if (pasivaVictima && pasivaVictima.onRecibirDano) {
                    pasivaVictima.onRecibirDano(this, jugadorActual, ganadorDuelo, "DUELO");
                }
                
                this.evaluarMuerte(jugadorActual);
                
                // Fin del duelo
                this.state.jugadorEnDuelo = "";
                this.state.oponenteDuelo = "";
            }
        });

        this.onMessage("responder_ataque", (client, idCartaFallo) => {
            if (client.sessionId !== this.state.jugadorEnPeligro) return;

            let victima = this.state.jugadores.get(client.sessionId);
            let atacante = this.state.jugadores.get(this.state.atacanteActual);
            
            // Bandera para saber si el jugador murió en este disparo
            let sobrevivioAlAtaque = true; 

            if (victima) {
                if (idCartaFallo) {
                    let indice = victima.mano.findIndex((c: any) => c.id === idCartaFallo);
                    
                    if (indice !== -1 && victima.mano[indice].efecto === "esquivar") {
                        let carta = victima.mano[indice];
                        victima.mano.splice(indice, 1);
                        this.agregarAlDescarte(carta)
                        
                        this.broadcast("notificacion_turno", `🛡️ ¡Uf! ${victima.nombre} usó un ¡Fallo! y esquivó la bala.`);
                        this.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: carta.nombre, descripcion: carta.descripcion, esConjurada: carta.esConjurada, descripcionCatalan: carta.descripcionEnCatalan});
                    
                        let pasivaJugadorActual = this.gestorPersonajes.obtener(victima.personaje);
                        if (pasivaJugadorActual && pasivaJugadorActual.onJugarCarta) {
                            pasivaJugadorActual.onJugarCarta(this, victima, carta);
                        }
                    }
                }
                else {
                    victima.vidas -= this.state.danoPendiente;
                    this.broadcast("notificacion_turno", `💥 ¡${victima.nombre} recibió el balazo de ${atacante?.nombre}!`);
                    const numero: number = Math.floor(Math.random() * 3);
                    const sfx: string = "bang" + numero
                    this.broadcast("sfx", sfx)

                    let pasivaVictima = this.gestorPersonajes.obtener(victima.personaje);
                    if (pasivaVictima && pasivaVictima.onRecibirDano) {
                        pasivaVictima.onRecibirDano(this, victima, atacante, "BANG");
                    }

                    this.evaluarMuerte(victima);
                    
                    // Verificamos si logico/físicamente murió
                    if (victima.vidas <= 0) {
                        sobrevivioAlAtaque = false;
                    }
                }
            }

            // ¡LA CLAVE!: Solo limpiamos variables o avanzamos la cola de Tiratachuela 
            // si el jugador NO murió. Si murió, evaluarMuerte ya lo destrabó.
            if (sobrevivioAlAtaque) {
                if (this.colaDePeligro && this.colaDePeligro.length > 0) {
                    this.avanzarColaDePeligro();
                } else {
                    this.state.jugadorEnPeligro = "";
                    this.state.atacanteActual = "";
                    this.state.usosBarril = 0;
                }
            }
        });

        this.onMessage("descartar_carta", (client, idCarta) => {
            let jugador = this.state.jugadores.get(client.sessionId);
            
            if (jugador && this.state.turnoActual === client.sessionId) {
                let indiceCarta = jugador.mano.findIndex((c: any) => c.id === idCarta);
                
                if (indiceCarta !== -1) {
                    let cartaDescartada = jugador.mano[indiceCarta];
                    jugador.mano.splice(indiceCarta, 1);
                    this.agregarAlDescarte(cartaDescartada)

                    this.broadcast("notificacion_turno", `🗑️ ${jugador.nombre} descartó una carta.`);
                    
                    // --- HOOK DESCARTAR CARTA ---
                    let pasivaJugador = this.gestorPersonajes.obtener(jugador.personaje);
                    if (pasivaJugador && pasivaJugador.onDescartarCarta) {
                        pasivaJugador.onDescartarCarta(this, jugador, cartaDescartada, "VOLUNTARIO");
                    }
                }
            }
        });

        this.onMessage("elegir_carta_tienda", (client, idCarta) => {
            if (this.state.jugadorEligiendoTienda !== client.sessionId) return;

            let jugador = this.state.jugadores.get(client.sessionId);
            let indiceCarta = this.state.cartasTienda.findIndex((c: any) => c.id === idCarta);

            if (jugador && indiceCarta !== -1) {
                let cartaElegida = this.state.cartasTienda.splice(indiceCarta, 1)[0];
                jugador.mano.push(cartaElegida);

                this.broadcast("notificacion_turno", `🛍️ ${jugador.nombre} agarró una carta.`);
                this.avanzarColaTienda();
            }
        });
    }

    onJoin (client: Client, options: any) {
        const nuevoJugador = new Jugador();
        if (options.nombre && options.nombre.trim() !== "") nuevoJugador.nombre = options.nombre;
        if (options.avatar) nuevoJugador.avatar = options.avatar;

        if (this.state.jugadores.size === 0) {
            nuevoJugador.esAnfitrion = true;
        }
        this.state.jugadores.set(client.sessionId, nuevoJugador);
    }

    onLeave (client: Client, code: number) {
        const jugadorQueSeVa = this.state.jugadores.get(client.sessionId);
        if (!jugadorQueSeVa) return;

        const eraAnfitrion = jugadorQueSeVa.esAnfitrion;

        // LA MAGIA ACÁ: Solo lo matamos si el estado es ESTRICTAMENTE "Jugando".
        // Si el juego no empezó (Lobby o Selección) o ya Termino, simplemente lo borramos de la sala.
        if (this.state.estadoJuego !== "Jugando") {
            this.state.jugadores.delete(client.sessionId);
        } else {
            // SI EL JUEGO ESTÁ EN CURSO, LO MATAMOS (No lo borramos del mapa para no romper distancias ni el orden)
            this.broadcast("notificacion_turno", `🏃 ${jugadorQueSeVa.nombre} ha abandonado la partida y su personaje muere.`);

            // 1. Le ponemos la vida en 0 y llamamos a tu función de muerte para que suelte sus cartas
            jugadorQueSeVa.vidas = 0;
            jugadorQueSeVa.estaMuertoFalso = false;
            this.evaluarMuerte(jugadorQueSeVa);

            // 2. Si era su turno, lo pasamos al siguiente
            if (this.state.turnoActual === client.sessionId) {
                this.avanzarAlSiguienteTurno(client.sessionId);
            }

            // 3. Destrabamos el juego si estábamos esperando que respondiera a algo
            if (this.state.jugadorEnPeligro === client.sessionId) {
                this.avanzarColaDePeligro();
            }
            if (this.state.jugadorDebeDescartar === client.sessionId) {
                this.state.jugadorDebeDescartar = "";
            }
            if (this.state.jugadorBajoAtaqueIndio === client.sessionId) {
                this.avanzarColaIndios();
            }
            if (this.state.jugadorEligiendoTienda === client.sessionId) {
                this.avanzarColaTienda();
            }
            if (this.state.jugadorEnDuelo === client.sessionId) {
                // Si estaba en duelo y huye, el duelo se cancela
                this.state.jugadorEnDuelo = "";
                this.state.oponenteDuelo = "";
            }
            if (this.state.jugadorDesenfundando === client.sessionId) {
                this.state.jugadorDesenfundando = "";
                this.state.motivoDesenfundar = "";
            }
        }

        // 4. Reasignamos al anfitrión si el que se fue era el líder
        if (eraAnfitrion && this.state.jugadores.size > 0) {
            for (let [id, jugador] of this.state.jugadores.entries()) {
                jugador.esAnfitrion = true;
                break; 
            }
        }
    }

    repartirCartas(jugador: any, cantidad: number, causa: string) {
        let pasivaJugadorActual = this.gestorPersonajes.obtener(jugador.personaje);
        if (pasivaJugadorActual && pasivaJugadorActual.modificarRepartirCarta) {
            cantidad += pasivaJugadorActual.modificarRepartirCarta(causa)
        }

        for (let i = 0; i < cantidad; i++) {
            if (this.state.mazo.length === 0 && this.state.descarte.length > 0) {
                let arrayDescarte = Array.from(this.state.descarte);
                arrayDescarte.sort(() => Math.random() - 0.5);
                this.state.descarte.clear();
                arrayDescarte.forEach(carta => this.state.mazo.push(carta));
            }
            if (this.state.mazo.length > 0) {
                jugador.mano.push(this.state.mazo.pop());
            }
        }
    }

    avanzarAlSiguienteTurno(idJugadorActual: string) {
        const idsJugadores = Array.from(this.state.jugadores.keys());
        if (idsJugadores.length === 0) return;

        let idxActual = idsJugadores.indexOf(idJugadorActual);
        let siguienteIdx = (idxActual + 1) % idsJugadores.length;
        let iteradorId = idsJugadores[siguienteIdx];
        let jugadorSiguiente = this.state.jugadores.get(iteradorId);

        let vueltas = 0;

        while (vueltas < idsJugadores.length) {
            // LÓGICA: ¿Pasamos por un fantasma?
            if (jugadorSiguiente && !jugadorSiguiente.estaVivo && jugadorSiguiente.estaMuertoFalso) {
                jugadorSiguiente.rondasMuerto--;
                if (jugadorSiguiente.rondasMuerto <= 0) {
                    jugadorSiguiente.estaMuertoFalso = false;
                    jugadorSiguiente.estaVivo = true;
                    jugadorSiguiente.vidas = 1;
                    this.repartirCartas(jugadorSiguiente, 1, "pasiva")
                    this.broadcast("notificacion_turno", `⚡ ¡KAZUMA HA RESUCITADO DE ENTRE LOS MUERTOS!`);
                    this.broadcast("sfx", "kazumaRevive")
                    jugadorSiguiente.spriteAvatarOpcional = "Kazuma blanco"
                    this.actualizarMusicaAutomatica()
                    break; // FRENAMOS EL BUCLE: ¡Es su turno!
                }
            }

            // LÓGICA NORMAL: ¿Está vivo?
            if (jugadorSiguiente && jugadorSiguiente.estaVivo) {
                break; 
            }

            // Avanzamos al siguiente
            siguienteIdx = (siguienteIdx + 1) % idsJugadores.length;
            iteradorId = idsJugadores[siguienteIdx];
            jugadorSiguiente = this.state.jugadores.get(iteradorId);
            vueltas++;
        }

        if (vueltas >= idsJugadores.length && !jugadorSiguiente?.estaVivo) {
            this.state.turnoActual = "";
        } else {
            this.state.turnoActual = iteradorId;
            if (jugadorSiguiente) jugadorSiguiente.yaDisparo = false;
            this.evaluarFaseDinamita(iteradorId); // Esto se encarga de darle sus 2 cartas también
        }
    }

    evaluarFaseDinamita(idJugador: string) {
        let jugador = this.state.jugadores.get(idJugador);
        if (!jugador) return;

        if (jugador.tieneDinamita) {
            this.broadcast("notificacion_turno", `🧨 ¡La Dinamita arde frente a ${jugador.nombre}! Debe desenfundar...`);
            this.prepararDesenfundar(idJugador, "Dinamita");
        } else {
            this.evaluarFasePrision(idJugador);
        }
    }

    evaluarFasePrision(idJugador: string) {
        let jugador = this.state.jugadores.get(idJugador);
        if (!jugador) return;

        if (jugador.estaEnPrision) {
            this.broadcast("notificacion_turno", `⚖️ ¡${jugador.nombre} está en Prisión! Debe desenfundar...`);
            this.prepararDesenfundar(idJugador, "Prision");
        } else {
            this.repartirCartas(jugador, 2, "turno");
            console.log(`🃏 ${jugador.nombre} robó 2 cartas.`);
            this.broadcast("notificacion_turno", `¡Es el turno de ${jugador.nombre}!`);
        }
    }

    prepararDesenfundar(idJugador: string, motivo: string) {
        this.state.jugadorDesenfundando = idJugador;
        this.state.motivoDesenfundar = motivo;

        let victima = this.state.jugadores.get(idJugador);
        
        // 1. Definir probabilidad base
        let puntosVerdes = (motivo === "Dinamita") ? 14 : 4;

        // 2. Aplicar la pasiva de Chester (o cualquier otro personaje)
        let personajeVictima = this.gestorPersonajes.obtener(victima?.personaje);
        if (motivo !== "Dinamita" && personajeVictima && personajeVictima.modificarSuerteRuletaNormal) {
            puntosVerdes += personajeVictima.modificarSuerteRuletaNormal();
        } else if (motivo === "Dinamita" && personajeVictima && personajeVictima.modificarSuerteRuletaDinamita) {
            puntosVerdes += personajeVictima.modificarSuerteRuletaDinamita();
        }

        // 3. Traducir probabilidad a cantidad exacta de puntos sobre 16
        let totalPuntos = 16;
        let cantidadVerdes = puntosVerdes

        // 4. Crear el array y llenarlo con la cantidad exacta de verdes y rojos
        let layout = [];
        for (let i = 0; i < totalPuntos; i++) {
            layout.push(i < cantidadVerdes); // true si es verde, false si es rojo
        }

        // 5. Mezclar el array (sin patrones, esparcidos aleatoriamente)
        layout.sort(() => Math.random() - 0.5);

        // 6. Guardarlo en el estado sincronizado
        this.state.layoutRuleta.clear();
        layout.forEach(esVerde => this.state.layoutRuleta.push(esVerde));
    }

    obtenerSiguienteJugadorVivo(idActual: string): { id: string, jugador: any } {
        const idsJugadores = Array.from(this.state.jugadores.keys());
        if (idsJugadores.length === 0) return { id: "", jugador: null };

        const indiceActual = idsJugadores.indexOf(idActual);
        
        let siguienteIndice = (indiceActual + 1) % idsJugadores.length;
        let siguienteId = idsJugadores[siguienteIndice];
        let jugadorSiguiente = this.state.jugadores.get(siguienteId);

        // FRENO DE SEGURIDAD: Límite de vueltas
        let vueltas = 0;

        while (jugadorSiguiente && !jugadorSiguiente.estaVivo && vueltas < idsJugadores.length) {
            siguienteIndice = (siguienteIndice + 1) % idsJugadores.length;
            siguienteId = idsJugadores[siguienteIndice];
            jugadorSiguiente = this.state.jugadores.get(siguienteId);
            vueltas++;
        }

        // Si dimos toda la vuelta y nadie está vivo, devolvemos null
        if (vueltas >= idsJugadores.length) {
            return { id: "", jugador: null };
        }

        return { id: siguienteId, jugador: jugadorSiguiente };
    }

    juegoPausado(): boolean {
        return (this.state.jugadorEnPeligro !== "" || 
                this.state.jugadorDebeDescartar !== "" || 
                this.state.jugadorBajoAtaqueIndio !== "" ||
                this.state.jugadorEligiendoTienda !== "" ||
                this.state.jugadorEnDuelo !== "" ||
                this.state.jugadorDesenfundando !== "");
    }

    agregarAlDescarte(cartaDescartada: Carta): void {
        if (!cartaDescartada.esConjurada){
            this.state.descarte.push(cartaDescartada);
        }
    }
}