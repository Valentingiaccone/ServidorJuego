import { Room, Client } from "colyseus";
import { Carta, HabilidadActiva, Jugador, MyRoomState, OpcionPersonaje } from "./schema/MyRoomState.js";
import { DespachadorDeCartas } from "./EfectosCartas.js";
import { GestorPersonajes } from "./Personajes.js";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { Utilidades } from "./Utilidades.js";
import { IMyRoom } from "./IMyRoom.js";
import { MapSchema } from "@colyseus/schema";

export class MyRoom extends Room implements IMyRoom{
    maxClients = 15;
    state = new MyRoomState();

    colaDePeligro: string[] = [];
    causaDePeligro: string = "";
    colaIndios: string[] = [];
    colaTienda: string[] = [];
    ruletaInterna: any[] = []; // <-- NUEVO
    
    
    // Instanciamos nuestros nuevos motores
    despachadorCartas = new DespachadorDeCartas();
    gestorPersonajes = new GestorPersonajes();

    private musicaNormal: boolean = false

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
            this.actualizarMusicaAutomatica();
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
            this.state.atacanteActual = "";
            this.actualizarMusicaAutomatica()
            this.broadcast("notificacion_turno", `⛺ El ataque de los Indios ha terminado.`);
        }
    }

    avanzarColaTienda() {
        if (this.colaTienda.length > 0) {
            this.state.jugadorEligiendoTienda = this.colaTienda.shift();
            let jugador = this.state.jugadores.get(this.state.jugadorEligiendoTienda);
            
            if (jugador && jugador.estaVivo){
                let nombreTienda = this.state.tipoTiendaActual === "Juju" ? "Juju" : "Griff";
                this.broadcast("notificacion_turno", `🏪 ${jugador?.nombre} está eligiendo en La tienda de ${nombreTienda}.`);
                
                let musica = this.state.tipoTiendaActual === "Juju" ? "tiendaDeJuju" : "tiendaDeGriff";
                this.broadcast("musica", musica);
            } else {
                this.avanzarColaTienda();
            }
        } else {
            this.state.jugadorEligiendoTienda = "";
            this.state.cartasTienda.clear(); 
            
            let nombreTienda = this.state.tipoTiendaActual === "Juju" ? "Juju" : "Griff";
            this.broadcast("notificacion_turno", `🏪 La tienda de ${nombreTienda} ha cerrado.`);
            
            this.actualizarMusicaAutomatica();
            this.state.tipoTiendaActual = "Griff"; // Reseteamos la bandera por seguridad
        }
    }

    actualizarMusicaAutomatica(){
        if (this.state.estadoJuego === "Terminado") return

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
            if (this.musicaNormal){
                this.broadcast("musica", "juego")
            } else {
                this.broadcast("musica", "juego_V2")
            }
            return
        }

        if (this.musicaNormal){
            if (totalVivos > 5){
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
        } else {
            if (totalVivos > 5){
                this.broadcast("musica", "juego_V2")
            } else if (totalVivos == 5){
                this.broadcast("musica", "juegoQuedan5_V2")
            } else if (totalVivos == 4){
                this.broadcast("musica", "juegoQuedan4_V2")
            } else if (totalVivos == 3){
                this.broadcast("musica", "juegoQuedan3_V2")
            } else if (totalVivos == 2){
                this.broadcast("musica", "juegoQuedan2_V2")
            }
        }
    }

    evaluarMuerte(victima: any, asesino: any = null, fueDanoVerdadero: boolean = false) {
        
        let totalVivos = 0;

        this.state.jugadores.forEach((j: any) => {
            if (j.estaVivo) {
                totalVivos++;
            }
        });

        // --- 1. INTENTO DE SUPERVIVENCIA (Botiquines Automáticos) ---
        while (victima.vidas <= 0 && totalVivos !== 2 && !victima.estaDesconectado) {
            
            if (victima.transformarCuraEnEscudo) break; 

            let indiceBotiquin = victima.mano.findIndex((c: any) => c.efecto === "curar_1");
            
            if (indiceBotiquin !== -1) {
                let botiquin = victima.mano.splice(indiceBotiquin, 1)[0];
                this.agregarAlDescarte(botiquin);
                
                // ¡Llamamos a nuestro médico centralizado!
                Utilidades.aplicarCuracion(this, victima, 1, "BOTIQUIN", false);
                
                this.broadcast("notificacion_turno", `🩹 ¡${victima.nombre} usó un ${botiquin.nombre} automáticamente para evitar la muerte!`);
                
            } else {
                break; // No tiene más botiquines, muere oficialmente
            }
        }

        // Si la vida subió a 1 o más, se salvó. Cortamos acá.
        if (victima.vidas > 0) return; 

        // --- 2. MUERTE CONFIRMADA ---
        if (victima.vidas <= 0) {
            victima.estaVivo = false;
            victima.vidas = 0;

            if (victima.rol !== "Sheriff" && !victima.estaDesconectado){
                this.broadcast("sfx", { 
                    sfx: victima.sfxMuerte[0], 
                    silencio: victima.sfxMuerte[1],
                    vol: victima.sfxMuerte[2] ?? 1.0
                });
            }

            if (victima.personaje === "Kazuma" && victima.rol !== "Sheriff" && !victima.estaMuertoFalso) {
                victima.estaMuertoFalso = true;
                victima.rondasMuerto = Math.floor(Math.random() * 2) + 2
                this.broadcast("notificacion_turno", `☠️ ${victima.nombre} ha sido ELIMINADO?.`);
            } else {
                victima.estaMuertoFalso = false;
                console.log(`☠️ ${victima.nombre} ha sido ELIMINADO.`);
            }

            // --- 3. RECOMPENSAS Y CASTIGOS POR ASESINATO ---
            if (asesino && asesino.estaVivo) {
                if (victima.rol === "Forajido") {
                    if (victima.beneficiarseDeSuMuerte){
                        this.broadcast("notificacion_turno", `💰 ¡${asesino.nombre} eliminó a un Forajido y cobra la recompensa de 2 cartas!`);
                        this.repartirCartas(asesino, 2, "recompensa_forajido");
                    } else {
                        this.broadcast("notificacion_turno", `${asesino.nombre} no roba cartas por elimininacion porque ${victima.nombre} ya murió antes`)
                    }
                } 
                else if (victima.rol === "Alguacil" && asesino.rol === "Sheriff") {
                    if (victima.beneficiarseDeSuMuerte){
                        this.broadcast("notificacion_turno", `🤦‍♂️ ¡El Sheriff mató a su propio Alguacil! Como castigo, pierde todas sus cartas y equipamiento.`);
                    
                        asesino.mano.forEach((carta: any) => this.agregarAlDescarte(carta));
                        asesino.mano.clear();
                        
                        if (asesino.cartaArma) this.agregarAlDescarte(asesino.cartaArma);
                        asesino.nombreArma = "Colt .45";
                        asesino.alcanceArma = 1;
                        asesino.danoExtraArmaBang = 0; // RESET
                        asesino.alcanceMinimoArma = 0; // RESET
                        asesino.cartaArma = null;

                        if (asesino.cartaMustang) { this.agregarAlDescarte(asesino.cartaMustang); asesino.tieneMustang = false; asesino.tieneMustangPro = false; asesino.cartaMustang = null; }
                        if (asesino.cartaMira) { this.agregarAlDescarte(asesino.cartaMira); asesino.tieneMira = false; asesino.tieneMiraPro = false; asesino.cartaMira = null; }
                        if (asesino.cartaBarril) { this.agregarAlDescarte(asesino.cartaBarril); asesino.tieneBarril = false; asesino.tieneBarrilPro = false; asesino.cartaBarril = null; }
                        if (asesino.cartaPrision) { this.agregarAlDescarte(asesino.cartaPrision); asesino.estaEnPrision = false; asesino.cartaPrision = null; }
                        if (asesino.cartaDinamita) { this.agregarAlDescarte(asesino.cartaDinamita); asesino.tieneDinamita = false; asesino.cartaDinamita = null; }
                        if (asesino.cartaPapa) { this.agregarAlDescarte(asesino.cartaPapa); asesino.tienePapa = false; asesino.cartaPapa = null; }
                    } else {
                        this.broadcast("notificacion_turno", `El Sheriff no pierde nada ya que ${victima.nombre} ya murió anteriormente`)
                    }
                }
            }

            // --- 4. LIMPIEZA DE EQUIPAMIENTO Y MANO DE LA VÍCTIMA ---
            victima.mano.forEach((carta: any) => this.agregarAlDescarte(carta));
            victima.mano.clear();

            // LIMPIEZA DE ESCUDOS
            victima.vidasEscudo = 0;
            victima.turnosEscudos = [];

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
            if (victima.cartaPapa) this.agregarAlDescarte(victima.cartaPapa, victima);
            victima.tienePapa = false;
            victima.cartaPapa = null;
            
            victima.embrujos.clear()

            victima.nombreArma = "Colt .45";
            victima.alcanceArma = 1;
            victima.danoExtraArmaBang = 0; // RESET
            victima.alcanceMinimoArma = 0; // RESET

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
            totalVivos = 0;

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

            victima.beneficiarseDeSuMuerte = false

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
        let escudosIniciales = false; //muca nerda que me hacen crearlo aqui

        this.onMessage("iniciar_partida", (client, message) => {
            const jugador = this.state.jugadores.get(client.sessionId);

            if (jugador && jugador.esAnfitrion && this.state.estadoJuego === "Lobby") {
                const totalJugadores = this.state.jugadores.size;
                console.log(`🔥 ¡El Anfitrión dio la orden! Inicia la partida con ${totalJugadores} jugadores.`);

                let arrayJugadores = Array.from(this.state.jugadores.entries());
                
                arrayJugadores.sort(() => Math.random() - 0.5); 
                
                this.state.jugadores.clear(); 
                
                arrayJugadores.forEach(([id, jug]) => {
                    this.state.jugadores.set(id, jug); 
                });

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

                if (totalJugadores >= 6){
                    escudosIniciales = true;
                } 

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
                    for (let k = 0; k < 3; k++) {
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
                
                for (let c = 0; c < 5; c++) { // originalmente 6
                    const nuevaCarta = new Carta();
                    nuevaCarta.id = `botiquin_${c}`;
                    nuevaCarta.nombre = "Botiquín";
                    nuevaCarta.descripcion = "+1 vida, te salva de morir.";
                    nuevaCarta.descripcionEnCatalan = "+1 vida, et salva de morir."
                    nuevaCarta.tipoDeUso = "instantanea";
                    nuevaCarta.efecto = "curar_1";
                    this.state.mazo.push(nuevaCarta);
                }

                for (let c = 0; c < 8; c++) { // originalmente 12
                    this.state.mazo.push(CatalogoCartasEspeciales.crearFallo())
                }

                for (let i = 0; i < 4; i++){
                    this.state.mazo.push(CatalogoCartasEspeciales.crearSpooky())
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
                    cat.descripcion = "Un jugador descarta una carta de la mano o equipada.";
                    cat.descripcionEnCatalan = "Un jugador descarta una carta de la mà o que tingui equipada."
                    cat.tipoDeUso = "objetivoGlobal";
                    cat.efecto = "forzar_enemigo"; 
                    this.state.mazo.push(cat);

                    this.state.mazo.push(CatalogoCartasEspeciales.crearPanico());
                }

                for (let i = 0; i < 1; i++) {
                    const poco = new Carta();
                    poco.id = `musicoterapia_${i}`;
                    poco.nombre = "Musicoterapia";
                    poco.descripcion = "+1 vida para todos.";
                    poco.descripcionEnCatalan = "+1 vida per a tothom."
                    poco.tipoDeUso = "instantanea";
                    poco.efecto = "curarATodos";
                    this.state.mazo.push(poco);
                }

                for (let i = 0; i < 1; i++) { // originalmente 1
                    const tira = new Carta();
                    tira.id = `tiratachuela_${i}`;
                    tira.nombre = "Tiratachuela";
                    tira.descripcion = "Dispara a todos los demás jugadores uno por uno.";
                    tira.descripcionEnCatalan = "Dispara a tots els altres jugadors un per un."
                    tira.tipoDeUso = "instantanea";
                    tira.efecto = "tiratachuela";   
                    this.state.mazo.push(tira);
                }

                for (let i = 0; i < 2; i++) {  // originalmente 2
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
                    duelo.descripcion = "Desafía a un jugador: descartan BANG! por turnos. Quien no pueda, pierde 1 vida.";
                    duelo.descripcionEnCatalan = "Desafia un jugador: descarten BANG! per torns. Qui no pugui, perd 1 vida."
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
                    barril.descripcion = "Podes usar el barril para tener 25% de esquivar un disparo.";
                    barril.descripcionEnCatalan = "Pots fer servir el barril per tenir un 25% de probabilitat d’esquivar un tret."
                    barril.tipoDeUso = "equipamiento";
                    barril.efecto = "equiparBarril";
                    this.state.mazo.push(barril);
                }

                for (let i = 0; i < 3; i++) {
                    const prision = new Carta();
                    prision.id = `prision_${i}`;
                    prision.nombre = "Prisión";
                    prision.descripcion = "Un jugador tiene 37.5% de salir de la carcel o perder el turno (no afecta al Sheriff).";
                    prision.descripcionEnCatalan = "Un jugador té un 37,5% de sortir de la presó o perdre el torn (no afecta el Sheriff)."
                    prision.tipoDeUso = "objetivoGlobal"; 
                    prision.efecto = "prision";
                    this.state.mazo.push(prision);
                }

                for (let i = 0; i < 1; i++) {
                    const dinamita = new Carta();
                    dinamita.id = `dinamita_${i}`;
                    dinamita.nombre = "Dinamita";
                    dinamita.descripcion = "Tenes 12,5% de que explote y perder 3 vidas, si no pasa al siguiente.";
                    dinamita.descripcionEnCatalan = "Tens un 12,5% que exploti i perdis 3 vides; si no, passa al següent."
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
                        nombre: "Revolver de Casiddy", 
                        descripcion: "Equipa esta arma para obtener alcance: 3", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 3.",
                        alcance: 3 },
                    { id: "arma_5", 
                        nombre: "Rifle de Ashe", 
                        descripcion: "Equipa esta arma para obtener alcance: 4", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 4.",
                        alcance: 4 },
                    { id: "arma_6", 
                        nombre: "Francotirador", 
                        descripcion: "Equipa esta arma para obtener alcance: 5", 
                        descripcionEnCatalan: "Equipa aquesta arma per obtenir un abast de 5.",
                        alcance: 5 },
                    { id: "arma_7", 
                        nombre: "Pistola de Tracer", 
                        descripcion: "Equipa esta arma para no tener limites de uso de BANG!", 
                        descripcionEnCatalan: "Equipa aquesta arma per no tenir límits d'ús de BANG!.",
                        alcance: 1 },
                    { id: "arma_8", 
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

                let cantidadDeCartasExtension = 8
                
                let poolRaras = CatalogoCartasEspeciales.obtenerPoolExtensiones();
                
                poolRaras.sort(() => Math.random() - 0.5); 
                
                let extensionesSeleccionadas = poolRaras.slice(0, cantidadDeCartasExtension); 
                
                extensionesSeleccionadas.forEach(config => {
                    for (let i = 0; i < config.copias; i++) {
                        let cartaRara = CatalogoCartasEspeciales.crearCartaExtension(config.id);
                        if (cartaRara) {
                            cartaRara.esConjurada = false;
                            this.state.mazo.push(cartaRara);
                        }
                    }
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

                this.musicaNormal = !this.musicaNormal
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

                // Traemos todos los personajes del gestor
                let todosLosPersonajes = this.gestorPersonajes.obtenerTodosParaRepartir();
                // Buscamos la clase real que coincida con el nombre
                let personajeReal = todosLosPersonajes.find((p: any) => p.nombre === elegida.nombre);
                
                // Si la clase tiene un sonido configurado, pisa al de Among Us
                // Si encontramos la clase real, le copiamos sus sonidos al Jugador
                if (personajeReal) {
                    
                    // 1. El de muerte (que ya tenías)
                    if (personajeReal.sfxMuerte) {
                        jugador.sfxMuerte = personajeReal.sfxMuerte;
                    }

                    // 2. NUEVO: El de tocar el avatar (Info)
                    if (personajeReal.sfxDefault) {
                        jugador.sfxDefault = personajeReal.sfxDefault;
                    }
                }
                
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
                
                if (sheriff) {
                    let pasiva = this.gestorPersonajes.obtener(sheriff.personaje)
                    if (pasiva && pasiva.onIniciarTurno){
                        pasiva.onIniciarTurno(this, sheriff)
                    }
                    this.repartirCartas(sheriff, 2, "turno");
                }

                this.state.estadoJuego = "Jugando";

                this.state.jugadores.forEach((j) => {
                    let pasiva = this.gestorPersonajes.obtener(j.personaje);
                    if (pasiva && pasiva.onIniciarPartida) {
                        pasiva.onIniciarPartida(this, j)
                    }

                    //DANDO ESCUDOS A TODOS SI SON MAS DE CHINCH
                    
                    if (escudosIniciales && j.rol != "Sheriff"){
                        Utilidades.agregarEscudos(this, j, 1, 1, "inicio")
                    } 

                });



                const numero: number = Math.floor(Math.random() * 2)

                if (numero == 0){
                    this.musicaNormal = true
                } else {
                    this.musicaNormal = false
                }

                if (this.musicaNormal){
                    this.broadcast("musica", "juego")
                } else {
                    this.broadcast("musica", "juego_V2")
                }
            }
        });

        this.onMessage("pasar_turno", (client, message) => {
            if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId) {

                let modificacion: number = 0
                let jugadorActual = this.state.jugadores.get(client.sessionId);

                // se le borra las cartas en mano al fantasma al pasar el turno
                if (!jugadorActual.estaVivo) {
                    jugadorActual.mano.clear();
                    jugadorActual.yaJugoFantasma = false;
                    this.avanzarAlSiguienteTurno(client.sessionId);
                    return; 
                }

                let pasivaJugadorActual = this.gestorPersonajes.obtener(jugadorActual.personaje);
                if (pasivaJugadorActual && pasivaJugadorActual.modificarCartasEnManoAlPasarTurno) {
                    modificacion = pasivaJugadorActual.modificarCartasEnManoAlPasarTurno(this, jugadorActual);
                }

                if (jugadorActual) {
                    if (jugadorActual.mano.length > jugadorActual.vidas + modificacion && jugadorActual.mano.length !== 0) {
                        let excedente = jugadorActual.mano.length - jugadorActual.vidas - modificacion;
                        client.send("alerta_personal", `Tenés demasiadas cartas. Descartá ${excedente} para pasar el turno.`);
                        return; 
                    }

                    // --- HOOK PASAR TURNO ---
                    if (pasivaJugadorActual && pasivaJugadorActual.onPasarTurno) {
                        pasivaJugadorActual.onPasarTurno(this, jugadorActual);
                    }
                }

                //this.broadcast("notificacion_turno", `¡El jugador ${jugadorActual?.nombre} ha pasado su turno!`);
                
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

        this.onMessage("jugar_carta_1objetivo", (client, datos) => {
            if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId && !this.juegoPausado()) {
                let jugador = this.state.jugadores.get(client.sessionId);
                
                if (!jugador.estaVivo && jugador.yaJugoFantasma) {
                    client.send("alerta_personal", "Los muertos solo pueden lanzar un maleficio por turno.");
                    return;
                }

                // Exigimos que venga el idObjetivo
                if (jugador && datos.idObjetivo) {
                    let indiceCarta = jugador.mano.findIndex((c: any) => c.id === datos.idCarta);
                    if (indiceCarta !== -1) {
                        let cartaJugada = jugador.mano[indiceCarta];
                        let partesEfecto = cartaJugada.efecto.split("_");
                        
                        // EL TRUCO: Le empujamos el objetivo al final de los parámetros
                        // Así el despachador puede leerlo como parametros[parametros.length - 1]
                        partesEfecto.push(datos.idObjetivo);
                        
                        let jugadaExitosa = this.despachadorCartas.ejecutarEfecto(partesEfecto[0], this, client, jugador, cartaJugada, indiceCarta, partesEfecto, this.gestorPersonajes);

                        // Si fue válida (nadie tenía la vida llena, etc.), activamos pasivas
                        if (jugadaExitosa) {
                            let pasivaJugadorActual = this.gestorPersonajes.obtener(jugador.personaje);
                            if (pasivaJugadorActual && pasivaJugadorActual.onJugarCarta) {
                                pasivaJugadorActual.onJugarCarta(this, jugador, cartaJugada);
                            }
                        }
                    }
                }
            }
        })

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
                victima.danoExtraArmaBang = 0; // RESET
                victima.alcanceMinimoArma = 0; // RESET
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
            } else if (datos.zonaObjetivo === "papa" && victima.cartaPapa) {
                cartaAfectada = victima.cartaPapa;
                victima.cartaPapa = null;
                victima.tienePapa = false;
            }

            if (!cartaAfectada) return; 

            if (accion === "robar") {
                atacante.mano.push(cartaAfectada);
                this.ejecutarAnimacionCarta(client, cartaSabotaje)
                this.broadcast("notificacion_turno", `🕵️ ${atacante.nombre} le robó una carta a ${victima.nombre}.`);
                this.broadcast("sfx", "panico")

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
                this.ejecutarAnimacionCarta(client, cartaUsada)

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
                victima.danoExtraArmaBang = 0; // RESET
                victima.alcanceMinimoArma = 0; // RESET
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
            } else if (datos.zona === "papa" && victima.cartaPapa) {
                cartaAfectada = victima.cartaPapa;
                victima.cartaPapa = null;
                victima.tienePapa = false;
            }

            if (cartaAfectada) {
                this.agregarAlDescarte(cartaAfectada, victima, client);
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
            if (victima.tieneBarrilPasiva) maxUsos++;

            if (maxUsos === 0 || this.state.usosBarril >= maxUsos) return;

            this.state.usosBarril++;
            
            this.prepararDesenfundar(client.sessionId, "Barril");
            
            this.broadcast("notificacion_turno", `🛢️ ¡${victima.nombre} tira de la ruleta del Barril!`);
        });

        this.onMessage("voltear_carta", (client, datos) => {
            if (this.state.jugadorDesenfundando !== client.sessionId) return;

            let victima = this.state.jugadores.get(client.sessionId);
            let motivoActual = this.state.motivoDesenfundar; 
            
            let indiceObjetivo = Math.floor(Math.random() * 16);
            
            // Lógica Sombra si es Fase Normal (Embrujos usa layoutRuleta normal)
            let fueExitoStr = ""; // Esta variable engañará al código viejo de Walencia
            let nombreRealFicha = ""; // Esta guarda el string real (ej: "exitoChester") para las pasivas
            let fichaElegida: any = null;
            
            if (motivoActual === "Embrujo") {
                fueExitoStr = this.state.layoutRuleta[indiceObjetivo];
                nombreRealFicha = fueExitoStr;
            } else {
                fichaElegida = this.ruletaInterna[indiceObjetivo];

                if (!fichaElegida) {
                    console.error(`ERROR CRÍTICO (Servidor): fichaElegida indefinida en la ruleta. Indice: ${indiceObjetivo}, Tamaño array: ${this.ruletaInterna.length}`);
                    fueExitoStr = "fallo"; // Nos adaptamos forzando un fallo genérico para no crashear
                    nombreRealFicha = "fallo";
                } else {
                    nombreRealFicha = fichaElegida.visual; 
                    
                    if (nombreRealFicha.startsWith("exito")) {
                        fueExitoStr = "exito"; 
                    } else {
                        fueExitoStr = nombreRealFicha; 
                    }
                }
            }
            
            // Como ya disfrazamos la variable, todo vuelve a ser como antes:
            let colorVerde = (fueExitoStr === "exito");
            let textoVisual = colorVerde ? "¡ÉXITO!" : "FALLÓ";

            // ASIGNACIÓN DE TEXTOS Y COLORES SEGÚN EL TIPO DE RULETA
            if (motivoActual === "Dinamita" || motivoActual === "Papa") {
                textoVisual = fueExitoStr === "exito" ? "¡A SALVO!" : "¡BOOM!";
            } else if (motivoActual === "Embrujo") {
                if (fueExitoStr === "vacio") { textoVisual = "¡SE SALVÓ!"; colorVerde = true; }
                else if (fueExitoStr === "curar") { textoVisual = "¡CURACIÓN!"; colorVerde = true; }
                else if (fueExitoStr === "robar") { textoVisual = "¡ROBO!"; colorVerde = true; }
                else if (fueExitoStr === "dano") { textoVisual = "¡DAÑO!"; colorVerde = false; }
                else if (fueExitoStr === "descartar") { textoVisual = "¡DESCARTE!"; colorVerde = false; }
                else if (fueExitoStr === "comilon") { textoVisual = "¡COMILON!"; colorVerde = false; }
            }

            this.broadcast("resultado_ruleta", { 
                exito: colorVerde,
                texto: textoVisual,
                objetivoIndex: indiceObjetivo // Mandamos el índice exacto a Cocos
            });

            // 2. EL SUSPENSO (Le damos 4.5 segundos a la animación visual en Cocos)
            this.clock.setTimeout(() => {
                
                // Le decimos a Cocos que CIERRE EL PANEL 
                this.state.jugadorDesenfundando = "";
                this.state.motivoDesenfundar = "";

                this.state.faseTransicion = true;

                this.clock.setTimeout(() => {

                    this.state.faseTransicion = false;
                    
                    // --- HELPER DE SEGURIDAD (Evita que Colyseus crashee el estado) ---
                    let descartarEquipamientoSeguro = (cartaVieja: any) => {
                        if (!cartaVieja) return;
                        let clon = new Carta();
                        clon.id = cartaVieja.id; 
                        clon.nombre = cartaVieja.nombre; 
                        clon.descripcion = cartaVieja.descripcion;
                        clon.descripcionEnCatalan = cartaVieja.descripcionEnCatalan;
                        clon.tipoDeUso = cartaVieja.tipoDeUso; 
                        clon.efecto = cartaVieja.efecto;
                        clon.esConjurada = cartaVieja.esConjurada;
                        this.agregarAlDescarte(clon);
                    };

                    //CONSECUENCIAS FICHA ESPECIAL
                    if (motivoActual !== "Embrujo" && fichaElegida && fichaElegida.ownerId !== "") {
                    // Buscamos a ese jugador en la mesa
                    let dueno = this.state.jugadores.get(fichaElegida.ownerId);
                    
                        if (dueno && dueno.estaVivo) {
                            // Buscamos su clase en nuestro Gestor
                            let pasivaDueno = this.gestorPersonajes.obtener(dueno.personaje);
                            
                            // Si el personaje tiene programada la función, ¡la disparamos!
                            if (pasivaDueno && pasivaDueno.onFichaEspecialSeleccionada) {
                                pasivaDueno.onFichaEspecialSeleccionada(this, dueno, victima, nombreRealFicha);
                            }
                        }
                    }

                    // 3. EJECUTAMOS LAS CONSECUENCIAS
                    if (motivoActual === "Barril") {
                        if (fueExitoStr === "exito") {
                            this.broadcast("notificacion_turno", `❤️ ¡Salió Verde! El Barril salvó a ${victima?.nombre}.`);
                            if (this.colaDePeligro && this.colaDePeligro.length > 0) this.avanzarColaDePeligro();
                            else { this.state.jugadorEnPeligro = ""; this.state.atacanteActual = ""; this.state.usosBarril = 0; }
                        } else {
                            this.broadcast("notificacion_turno", `💥 ¡Salió Rojo! El Barril no aguantó el disparo.`);
                        }
                    } 
                    else if (motivoActual === "Dinamita") {
                        if (fueExitoStr !== "exito") { // Explotó
                            this.broadcast("notificacion_turno", `💥 ¡BOOOOOOM! Salió Rojo. La dinamita explotó en la cara de ${victima?.nombre}.`);
                            const numero: number = Math.floor(Math.random() * 3);
                            const sfx: string = "explosion" + numero;
                            this.broadcast("sfx", sfx);
                            
                            if (victima && victima.cartaDinamita) descartarEquipamientoSeguro(victima.cartaDinamita);
                            if (victima) victima.tieneDinamita = false;
                            if (victima) victima.cartaDinamita = null;

                            Utilidades.procesarDano(this, victima, null, 3, "DINAMITA");
                            
                            if (victima && victima.estaVivo) this.evaluarFasePapa(client.sessionId);
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

                            this.evaluarFasePapa(client.sessionId);
                        }
                    }
                    else if (motivoActual === "Papa") {
                        if (fueExitoStr !== "exito") { // EXPLOTÓ
                            this.broadcast("notificacion_turno", `💥 ¡PAPA PAPA PAPAPUM, BOOOM! Salió Rojo. El Papapum explotó encima de ${victima?.nombre}.`);
                            const numero = Math.floor(Math.random() * 3);
                            this.broadcast("sfx", "explosion" + numero);
                            
                            if (victima && victima.cartaPapa) descartarEquipamientoSeguro(victima.cartaPapa);
                            if (victima) victima.tienePapa = false;
                            if (victima) victima.cartaPapa = null;
                            this.state.probabilidadPapa = 1; // Reseteamos el peligro global
                            
                            Utilidades.procesarDano(this, victima, null, 2, "PAPA");
                            
                            if (victima && victima.estaVivo) this.evaluarFasePrision(client.sessionId);
                            else this.avanzarAlSiguienteTurno(client.sessionId);
                            
                        } else { // SE SALVÓ
                            this.state.probabilidadPapa++;
                            this.state.probabilidadPapa++;
                            let p: number = this.state.probabilidadPapa;
                            if (p > 15) p = 15;
                            
                            this.broadcast("notificacion_turno", `💨 ¡Salió Verde! La Papapum no explotó, pero la probabilidad aumentó a ${p}/16.`);
                            this.evaluarFasePrision(client.sessionId);
                        }
                    }
                    else if (motivoActual === "Prision") {
                        if (fueExitoStr === "exito") {
                            this.broadcast("notificacion_turno", `❤️ ¡Salió Verde! ${victima?.nombre} escapó de la cárcel.`);
                            let pasiva = this.gestorPersonajes.obtener(victima.personaje)
                            if (pasiva && pasiva.onIniciarTurno){
                                pasiva.onIniciarTurno(this, victima)
                            }
                            this.repartirCartas(victima, 2, "turno");
                            this.broadcast("notificacion_turno", `¡Es el turno de ${victima?.nombre}!`);
                        } else {
                            this.broadcast("notificacion_turno", `⛓️ ¡Salió Rojo! ${victima?.nombre} se queda encerrado.`);
                            let pasivaJugadorActual = this.gestorPersonajes.obtener(victima?.personaje);
                            if (pasivaJugadorActual && pasivaJugadorActual.onPasarTurno) {
                                pasivaJugadorActual.onPasarTurno(this, victima);
                            }
                            this.avanzarAlSiguienteTurno(client.sessionId);
                        }
                        
                        if (victima && victima.cartaPrision) {
                            descartarEquipamientoSeguro(victima.cartaPrision);
                            victima.cartaPrision = null;
                            victima.estaEnPrision = false;
                        }
                    }
                    // --- NUEVA FASE: EMBRUJOS FANTASMALES ---
                    else if (motivoActual === "Embrujo") {
                        if (victima) victima.embrujos.clear(); // Limpiamos la ruleta de embrujos para el proximo turno
                        
                        if (fueExitoStr === "dano") {
                            this.broadcast("notificacion_turno", `👻 ¡El embrujo hirió a ${victima?.nombre}! Pierde 1 vida.`);
                            Utilidades.procesarDano(this, victima, null, 1, "EMBRUJO", true);
                        } else if (fueExitoStr === "curar") {
                            if (victima && Utilidades.puedeRecibirCuracion(this, victima)) {
                                Utilidades.aplicarCuracion(this, victima, 1, "EMBRUJO", true);
                                this.broadcast("notificacion_turno", `👻 ¡El embrujo sanó a ${victima?.nombre}!`);
                            } else {
                                this.broadcast("notificacion_turno", `👻 El embrujo intentó sanar a ${victima?.nombre}, pero ya estaba al máximo.`);
                            }
                        } else if (fueExitoStr === "robar") {
                            if (victima) this.repartirCartas(victima, 1, "embrujo");
                            this.broadcast("notificacion_turno", `👻 ¡El embrujo le dio una carta extra a ${victima?.nombre}!`);
                        } else if (fueExitoStr === "descartar") {
                            if (victima && victima.mano.length > 0) {
                                let c = victima.mano.splice(Math.floor(Math.random() * victima.mano.length), 1)[0];
                                this.descartarCarta(c, victima, "EMBRUJO")
                                this.broadcast("notificacion_turno", `👻 ¡El embrujo descartó una carta de ${victima.nombre}!`);
                            } else {
                                this.broadcast("notificacion_turno", `👻 El embrujo falló, la mano de ${victima?.nombre} estaba vacía.`);
                            }
                        } else if (fueExitoStr === "comilon") {
                            let cartaDevorada = Utilidades.descartarEquipamientoAleatorio(this, victima, client);
                            if (cartaDevorada) {
                                this.broadcast("notificacion_turno", `👻 ¡El embrujo devoró un equipamiento ${cartaDevorada.nombre} de ${victima.nombre}!`);
                            } else {
                                this.broadcast("notificacion_turno", `👻 El embrujo falló, ${victima?.nombre} no tenía ningún equipamiento.`);
                            }
                        } else {
                            this.broadcast("notificacion_turno", `💨 ¡${victima?.nombre} tuvo suerte y se salvó del embrujo!`);
                        }

                        let pasiva = this.gestorPersonajes.obtener(victima.personaje)
                        if (pasiva && pasiva.onSacarEmbrujoEnRuleta){
                            pasiva.onSacarEmbrujoEnRuleta(this, victima, fueExitoStr)
                        }

                        // El flujo natural: Si sigue vivo después del embrujo, evaluamos la dinamita
                        if (victima && victima.estaVivo) this.evaluarFaseDinamita(client.sessionId);
                        else this.avanzarAlSiguienteTurno(client.sessionId);
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
                this.broadcast("notificacion_turno", `🩸 ¡${victima.nombre} recibió 1 de daño por los Indios!`);
                let asesino = this.state.jugadores.get(this.state.atacanteActual);
                
                Utilidades.procesarDano(this, victima, asesino, 1, "INDIOS");

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
                let distanciaFisica = Math.min(diferencia, n - diferencia);

                // --- NUEVO: REGLA DE ALCANCE MÍNIMO (Mortero) ---
                let minArma = atacante.alcanceMinimoArma || 0;
                if (distanciaFisica < minArma) {
                    client.send("alerta_personal", `El arma está diseñada para largo alcance. No podés dispararle a alguien tan cerca.`);
                    return;
                }

                let indiceCarta = atacante.mano.findIndex((c: any) => c.id === datosDelDisparo.idCarta);
                let cartaUsada = (indiceCarta !== -1) ? atacante.mano[indiceCarta] : null;

                let alcanceMaximo = atacante.alcanceArma;

                if (cartaUsada && cartaUsada.tipoDeUso === "objetivoVecino") {
                    alcanceMaximo = 1
                } else {
                    if (atacante.tieneMiraPro) distancia -= 2;
                    else if (atacante.tieneMira) distancia -= 1;

                    if (victima.tieneMustangPro) distancia += 2;
                    else if (victima.tieneMustang) distancia += 1;

                    if (atacante.modificarAlcance){
                        distancia -= atacante.modificarAlcance // lo puse negativo ya que con mas alcance, la distancia al objetivo se reduce
                    }

                    if (victima.modificarDistancia){
                        distancia += victima.modificarDistancia
                    }
                }

                // --- HOOK MODIFICAR DISTANCIA (ATACANTE) ---
                if (pasivaAtacante && pasivaAtacante.modificarDistancia) {
                    distancia = pasivaAtacante.modificarDistancia(this, atacante, victima, distancia);
                }

                // --- HOOK MODIFICAR DISTANCIA (VÍCTIMA) ---
                let pasivaVictimaDistancia = this.gestorPersonajes.obtener(victima.personaje);
                if (pasivaVictimaDistancia && pasivaVictimaDistancia.modificarDistancia) {
                    distancia = pasivaVictimaDistancia.modificarDistancia(this, atacante, victima, distancia);
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
                    
                    // --- NUEVO: MEMORIZAMOS EL DAÑO Y LA CAUSA ---
                    let danoBase = (cartaUsada.efecto === "dano_2") ? 2 : 1;
                    
                    // ¡EL FRENO DE BALANCE! Solo sumamos el daño extra del arma si es un BANG normal
                    let bonusDano = (cartaUsada.efecto === "dano_1") ? (atacante.danoExtraArmaBang || 0) : 0;
                    
                    this.state.danoPendiente = danoBase + bonusDano; 
                    this.causaDePeligro = "BANG";
                    this.state.usosBarril = 0;
                    
                    this.broadcast("notificacion_turno", `⚠️ ¡${atacante.nombre} le atacó a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
                    this.ejecutarAnimacionCarta(client, cartaUsada)
                
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
                this.ejecutarAnimacionCarta(client, cartaUsada)

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

            let totalVivos = 0;

            this.state.jugadores.forEach((j: any) => {
                if (j.estaVivo) {
                    totalVivos++;
                }
            });

            if (totalVivos == 2){
                client.send("alerta_personal", "No se puede usar prision cuando quedan 2 jugadores.");
                return false
            }
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
                
                this.ejecutarAnimacionCarta(client, cartaUsada)
                this.broadcast("notificacion_turno", `⛓️ ¡${atacante.nombre} mandó a la cárcel a ${victima.nombre}!`);
                this.broadcast("sfx", "prision")

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
                let ganadorDuelo = this.state.jugadores.get(this.state.oponenteDuelo);
                this.broadcast("notificacion_turno", `🩸 ¡${jugadorActual.nombre} no pudo defenderse y perdió el duelo contra ${ganadorDuelo?.nombre}!`);
                
                Utilidades.procesarDano(this, jugadorActual, ganadorDuelo, 1, "DUELO");
                
                this.state.jugadorEnDuelo = "";
                this.state.oponenteDuelo = "";
            }
        });

        this.onMessage("responder_ataque", (client, idCartaFallo) => {
            if (client.sessionId !== this.state.jugadorEnPeligro) return;

            let victima = this.state.jugadores.get(client.sessionId);
            let atacante = this.state.jugadores.get(this.state.atacanteActual);
            
            let sobrevivioAlAtaque = true; 

            let recibioBalazo = false;

            if (victima) {
                if (idCartaFallo) {
                    let indice = victima.mano.findIndex((c: any) => c.id === idCartaFallo);
                    
                    if (indice !== -1 && victima.mano[indice].efecto === "esquivar") {
                        let carta = victima.mano[indice];
                        victima.mano.splice(indice, 1);
                        this.agregarAlDescarte(carta)
                        
                        this.broadcast("notificacion_turno", `🛡️ ¡Uf! ${victima.nombre} usó un ¡Fallo! y esquivó la bala.`);
                        this.ejecutarAnimacionCarta(client, carta)
                    
                        let pasivaJugadorActual = this.gestorPersonajes.obtener(victima.personaje);
                        if (pasivaJugadorActual && pasivaJugadorActual.onJugarCarta) {
                            pasivaJugadorActual.onJugarCarta(this, victima, carta);
                        }
                    }
                }
                else {
                    recibioBalazo = true;
                    
                    // Mensaje dinámico según la causa
                    if (this.causaDePeligro === "TIRATACHUELA") {
                        this.broadcast("notificacion_turno", `💥 ¡${victima.nombre} no pudo esquivar el Tiratachuela de ${atacante?.nombre}!`);
                    } else {
                        this.broadcast("notificacion_turno", `💥 ¡${victima.nombre} recibió el balazo de ${atacante?.nombre}!`);
                    }
                    
                    const numero: number = Math.floor(Math.random() * 3);
                    this.broadcast("sfx", "bang" + numero);

                    Utilidades.procesarDano(this, victima, atacante, this.state.danoPendiente, this.causaDePeligro);
                    
                    if (victima.vidas <= 0) {
                        sobrevivioAlAtaque = false;
                    }
                }
            }

            if (sobrevivioAlAtaque) {

                if (recibioBalazo && atacante && atacante.tienePapa && this.causaDePeligro == "BANG") {
                    victima.tienePapa = true;
                    victima.cartaPapa = atacante.cartaPapa;
                    atacante.tienePapa = false;
                    atacante.cartaPapa = null;
                    this.broadcast("notificacion_turno", `🥔 ¡${atacante.nombre} le pasó el Papapum a ${victima.nombre}!`);
                }

                if (this.colaDePeligro && this.colaDePeligro.length > 0) {
                    this.avanzarColaDePeligro();
                } else {
                    this.state.jugadorEnPeligro = "";
                    this.state.atacanteActual = "";
                    this.state.usosBarril = 0;
                    this.actualizarMusicaAutomatica()
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
                    this.descartarCarta(cartaDescartada, jugador, "VOLUNTARIO")

                    this.agregarRegistro(`🗑️ ${jugador.nombre} descartó una carta.`)
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

        this.onMessage("usar_habilidad_activa", (client, idHabilidad) => {
            if (this.state.estadoJuego === "Jugando" && this.state.turnoActual === client.sessionId && !this.juegoPausado()) {
                let jugador = this.state.jugadores.get(client.sessionId);
                
                if (jugador && jugador.estaVivo) {
                    let pasiva = this.gestorPersonajes.obtener(jugador.personaje);
                    if (pasiva && pasiva.ejecutarHabilidadActiva) {
                        pasiva.ejecutarHabilidadActiva(this, jugador, client, idHabilidad);
                    }
                }
            }
        });

        this.onMessage("pin", (client, pin) => {
            let jugador = this.state.jugadores.get(client.sessionId);
            this.broadcast("pin", {personaje: jugador.personaje, pin: pin})
        })

        this.onMessage("accion", (client, accion) => {
            let jugador = this.state.jugadores.get(client.sessionId);
            this.broadcast("animacionJugador", {personaje: jugador.personaje, animacion: accion})
        })

        this.onMessage("enviarChat", (client, mensaje) => {
            let jugador = this.state.jugadores.get(client.sessionId);
            this.broadcast("chat", {jugador: jugador, mensaje: mensaje})
        })
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
            jugadorQueSeVa.vidas = -999;
            jugadorQueSeVa.estaMuertoFalso = false;
            jugadorQueSeVa.estaDesconectado = true
            this.broadcast("sfx", "desconectado")
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

    repartirCartas(jugador: Jugador, cantidad: number, causa: string) {
        let pasivaJugadorActual = this.gestorPersonajes.obtener(jugador.personaje);
        if (pasivaJugadorActual && pasivaJugadorActual.modificarRepartirCarta) {
            cantidad += pasivaJugadorActual.modificarRepartirCarta(this, jugador, causa)
        }

        for (let i = 0; i < cantidad; i++) {
            if (this.state.mazo.length === 0 && this.state.descarte.length > 0) {
                let arrayDescarte = Array.from(this.state.descarte);
                arrayDescarte.sort(() => Math.random() - 0.5)
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
            
            // LÓGICA GENERAL: ¿No está desconectado?
            if (jugadorSiguiente && !jugadorSiguiente.estaDesconectado) {
                
                // LÓGICA ESPECIAL DE KAZUMA
                if (!jugadorSiguiente.estaVivo && jugadorSiguiente.estaMuertoFalso) {
                    jugadorSiguiente.rondasMuerto--;
                    
                    if (jugadorSiguiente.rondasMuerto <= 0) {
                        // KAZUMA REVIVE (Pasa a estar VIVO)
                        jugadorSiguiente.estaMuertoFalso = false;
                        jugadorSiguiente.estaVivo = true;
                        jugadorSiguiente.vidas = 1;
                        this.repartirCartas(jugadorSiguiente, 1, "pasiva");
                        this.broadcast("notificacion_turno", `⚡ ¡KAZUMA HA RESUCITADO DE ENTRE LOS MUERTOS!`);
                        this.broadcast("sfx", {sfx: "kazumaRevive", silencio: true});
                        jugadorSiguiente.spriteAvatarOpcional = "Kazuma blanco";
                        jugadorSiguiente.beneficiarseDeSuMuerte = false;
                        this.actualizarMusicaAutomatica();
                        break; // FRENAMOS: Es su turno como VIVO
                    } else {
                        // KAZUMA AÚN NO REVIVE
                        break; // FRENAMOS: Es su turno como FANTASMA
                    }
                } 
                else {
                    // JUGADOR NORMAL (Vivo o Fantasma común)
                    
                    // --- NUEVA GESTIÓN DE EXPIRACIÓN DE ESCUDO ---
                    if (jugadorSiguiente.estaVivo && jugadorSiguiente.turnosEscudos && jugadorSiguiente.turnosEscudos.length > 0) {
                        
                        // 1. Restar 1 turno de vida a cada escudo activo
                        for (let e = 0; e < jugadorSiguiente.turnosEscudos.length; e++) {
                            jugadorSiguiente.turnosEscudos[e]--;
                        }
                        
                        // 2. Filtrar para quedarnos solo con los escudos que aún tienen tiempo (> 0)
                        let escudosRestantes = jugadorSiguiente.turnosEscudos.filter((t: number) => t > 0);
                        let escudosPerdidos = jugadorSiguiente.turnosEscudos.length - escudosRestantes.length;
                        
                        jugadorSiguiente.turnosEscudos = escudosRestantes;
                        
                        // 3. Ajustar la variable visual de Cocos si se rompió alguno
                        if (escudosPerdidos > 0) {
                            jugadorSiguiente.vidasEscudo -= escudosPerdidos;
                            
                            // Medida de seguridad por si acaso
                            if (jugadorSiguiente.vidasEscudo < 0) jugadorSiguiente.vidasEscudo = 0; 
                            
                            let textoEscudos = escudosPerdidos > 1 ? `${escudosPerdidos} Escudos` : "un Escudo";
                            this.broadcast("notificacion_turno", `⏳ El efecto de ${textoEscudos} de ${jugadorSiguiente.nombre} se ha desvanecido.`);
                            
                            // Si tienes un sonido de escudo rompiéndose, podés agregarlo acá:
                            // this.broadcast("sfx", "escudoRoto"); 
                        }
                    }

                    break; // FRENAMOS: Es su turno
                }
            }

            // Avanzamos al siguiente
            siguienteIdx = (siguienteIdx + 1) % idsJugadores.length;
            iteradorId = idsJugadores[siguienteIdx];
            jugadorSiguiente = this.state.jugadores.get(iteradorId);
            vueltas++;
        }

        if (vueltas >= idsJugadores.length) {
            this.state.turnoActual = "";
        } else {
            this.state.turnoActual = iteradorId;
            if (jugadorSiguiente) jugadorSiguiente.yaDisparo = false;
            
            // AHORA LA FASE 1 ES EL EMBRUJO, NO LA DINAMITA
            this.evaluarFaseEmbrujo(iteradorId); 
        }
    }

    evaluarFaseEmbrujo(idJugador: string) {
        let jugador = this.state.jugadores.get(idJugador);
        if (!jugador) return;

        if (jugador.estaVivo && jugador.embrujos.length > 0) {
            this.broadcast("notificacion_turno", `👻 ¡${jugador.nombre} siente una presencia! La ruleta del Embrujo gira...`);
            this.prepararDesenfundar(idJugador, "Embrujo");
        } else {
            this.evaluarFaseDinamita(idJugador);
        }
    }

    evaluarFaseDinamita(idJugador: string) {
        let jugador = this.state.jugadores.get(idJugador);
        if (!jugador) return;

        if (jugador.tieneDinamita) {
            this.broadcast("notificacion_turno", `🧨 ¡La Dinamita arde frente a ${jugador.nombre}! Debe desenfundar...`);
            this.prepararDesenfundar(idJugador, "Dinamita");
        } else {
            this.evaluarFasePapa(idJugador);
        }
    }

    evaluarFasePapa(idJugador: string) {
        let jugador = this.state.jugadores.get(idJugador);
        if (!jugador) return;

        if (jugador.tienePapa) {
            this.broadcast("notificacion_turno", `🥔 ¡El Papapum quema en las manos de ${jugador.nombre}! Debe desenfundar...`);
            this.prepararDesenfundar(idJugador, "Papa");
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
            if (!jugador.estaVivo) {
                jugador.yaJugoFantasma = false;
                for (let i = 0; i < 2; i++) {
                    let cartaFantasma = CatalogoCartasEspeciales.crearCartaFantasmaAleatoria();
                    if (cartaFantasma) jugador.mano.push(cartaFantasma);
                }
                this.broadcast("notificacion_turno", `👻 ¡Es el turno del espíritu de ${jugador.nombre}!`);
            } else {
                let pasiva = this.gestorPersonajes.obtener(jugador.personaje)
                if (pasiva && pasiva.onIniciarTurno){
                    pasiva.onIniciarTurno(this, jugador)
                }
                this.repartirCartas(jugador, 2, "turno");
                this.broadcast("notificacion_turno", `¡Es el turno de ${jugador.nombre}!`);
            }
        }
    }

    prepararDesenfundar(idJugador: string, motivo: string) {
        this.state.jugadorDesenfundando = idJugador;
        this.state.motivoDesenfundar = motivo;

        let victima = this.state.jugadores.get(idJugador);
        if (!victima) return;

        if (motivo === "Embrujo") {
            // --- FASE FANTASMAL ---
            this.state.ruletaVerde = "";
            this.state.ruletaRojo = "";
            
            let layout: string[] = []; // <-- Lo movemos aquí adentro
            let misEmbrujos = victima.embrujos;
            for (let i = 0; i < 16; i++) {
                if (i < misEmbrujos.length) {
                    layout.push(misEmbrujos[i]);
                } else {
                    layout.push("vacio");
                }
            }

            // Mezclamos y guardamos (Solo para fantasmas)
            layout.sort(() => Math.random() - 0.5);
            this.state.layoutRuleta.clear();
            layout.forEach(str => this.state.layoutRuleta.push(str));

        } else {
            // --- FASE NORMAL (Barril, Dinamita, Prision, Papa) ---
            let puntosVerdes: number = 4;
            let fichasEspeciales: { visual: string, ownerId: string }[] = []; 
            
            if (motivo === "Barril") { puntosVerdes = 4; this.state.ruletaVerde = ""; this.state.ruletaRojo = ""; } 
            else if (motivo === "Prision") { puntosVerdes = 6; this.state.ruletaVerde = ""; this.state.ruletaRojo = ""; } 
            else if (motivo === "Dinamita") { puntosVerdes = 14; this.state.ruletaVerde = ""; this.state.ruletaRojo = "ruletaExplosion"; } 
            else if (motivo === "Papa") { puntosVerdes = 16 - this.state.probabilidadPapa; this.state.ruletaVerde = ""; this.state.ruletaRojo = "ruletaExplosion"; }

            //procesador Suerte
            const procesarSuerte = (resultado: any, ownerId: string) => {
                if (typeof resultado === "number") {
                    puntosVerdes += resultado;
                } else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) puntosVerdes += resultado.cambio;
                    if (resultado.fichas && Array.isArray(resultado.fichas)) {
                        resultado.fichas.forEach((f: string) => fichasEspeciales.push({ visual: f, ownerId: ownerId }));
                    }
                }
            };

            //Suerte Local
            let personajeVictima = this.gestorPersonajes.obtener(victima?.personaje);
            // tarea para el que lea esto: cambiar la suerte ruleta normal por barril y colocarle a chester la habilidad esta de prision
            if (motivo == "Prision" && personajeVictima && personajeVictima.modificarSuerteLocalPrision){
                procesarSuerte(personajeVictima.modificarSuerteLocalPrision(this, victima), idJugador)
            }
            if ((motivo !== "Dinamita" && motivo !== "Papa") && personajeVictima && personajeVictima.modificarSuerteRuletaNormal) {
                procesarSuerte(personajeVictima.modificarSuerteRuletaNormal(this, victima), idJugador);
            } else if ((motivo === "Dinamita" || motivo === "Papa") && personajeVictima && personajeVictima.modificarSuerteRuletaDinamita) {
                procesarSuerte(personajeVictima.modificarSuerteRuletaDinamita(this, victima), idJugador);
            }

            //Suerte Global
            this.state.jugadores.forEach((j: any, sessionId: string) => {
                if (j.estaVivo) {
                    const jPersonaje = this.gestorPersonajes.obtener(j.personaje);
                    if (jPersonaje) {
                        if (motivo === "Barril" && jPersonaje.modificarSuerteGlobalBarril) procesarSuerte(jPersonaje.modificarSuerteGlobalBarril(this, victima, j), sessionId);
                        else if (motivo === "Prision" && jPersonaje.modificarSuerteGlobalPrision) procesarSuerte(jPersonaje.modificarSuerteGlobalPrision(this, victima, j), sessionId);
                        else if (motivo === "Dinamita" && jPersonaje.modificarSuerteGlobalDinamita) procesarSuerte(jPersonaje.modificarSuerteGlobalDinamita(this, victima, j), sessionId);
                        else if (motivo === "Papa" && jPersonaje.modificarSuerteGlobalPapapum) procesarSuerte(jPersonaje.modificarSuerteGlobalPapapum(this, victima, j), sessionId);
                    }
                }
            });

            // --- NUEVA LÓGICA DE REEMPLAZO DE FICHAS ---
            
            // 1. MÍNIMO 1 VERDE Y MÍNIMO 1 ROJO SIEMPRE
            // Aseguramos que los puntos verdes estén estrictamente entre 1 y 15
            if (puntosVerdes < 1) puntosVerdes = 1;
            if (puntosVerdes > 15) puntosVerdes = 15;

            // 2. Creamos la ruleta base puramente matemática (solo genéricos)
            let ruletaTemp: any[] = [];
            for (let i = 0; i < puntosVerdes; i++) ruletaTemp.push({ visual: "exito", ownerId: "" });
            while (ruletaTemp.length < 16) ruletaTemp.push({ visual: "fallo", ownerId: "" });

            // 3. Sustituimos los genéricos por las fichas especiales si corresponde
            fichasEspeciales.forEach(ficha => {
                if (ficha.visual.startsWith("exito")) {
                    // Buscamos el primer "exito" genérico disponible
                    let indice = ruletaTemp.findIndex(f => f.visual === "exito");
                    if (indice !== -1) {
                        ruletaTemp[indice] = ficha; // Lo pisamos
                    }
                } else if (ficha.visual.startsWith("fallo")) {
                    // Buscamos el primer "fallo" genérico disponible
                    let indice = ruletaTemp.findIndex(f => f.visual === "fallo");
                    if (indice !== -1) {
                        ruletaTemp[indice] = ficha; // Lo pisamos
                    }
                }
            });

            // 4. Mezclamos y guardamos el resultado final
            ruletaTemp.sort(() => Math.random() - 0.5);
            this.ruletaInterna = ruletaTemp; 

            // Actualizamos la ruleta visual para Cocos
            this.state.layoutRuleta.clear();
            ruletaTemp.forEach(f => this.state.layoutRuleta.push(f.visual));
        }
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
        return (this.state.faseTransicion ||
                this.state.jugadorEnPeligro !== "" || 
                this.state.jugadorDebeDescartar !== "" || 
                this.state.jugadorBajoAtaqueIndio !== "" ||
                this.state.jugadorEligiendoTienda !== "" ||
                this.state.jugadorEnDuelo !== "" ||
                this.state.jugadorDesenfundando !== "");
    }

    descartarCarta(cartaDescartada: Carta, jugador: Jugador, motivo: string){
        if (!jugador) {
            console.error(`ERROR CRÍTICO (Servidor): 'jugador' es null en descartarCarta. Motivo: ${motivo}`);
            this.agregarAlDescarte(cartaDescartada, null, null);
            return;
        }
        if (!cartaDescartada) {
            console.error(`ERROR CRÍTICO (Servidor): 'cartaDescartada' es null. Jugador: ${jugador.nombre}`);
            return;
        }

        let pasiva = this.gestorPersonajes.obtener(jugador.personaje)
        if (pasiva && pasiva.onDescartarCarta){
            pasiva.onDescartarCarta(this, jugador, cartaDescartada, motivo)
        }

        if (cartaDescartada.idDuenoDelPerro && cartaDescartada.idDuenoDelPerro != ""){
            const atacante = this.state.jugadores.get(cartaDescartada.idDuenoDelPerro);
            
            if (!atacante) {
                console.error(`AVISO ADAPTADO: El dueño del perro (${cartaDescartada.idDuenoDelPerro}) ya no existe en la sala.`);
                Utilidades.procesarDano(this, jugador, null, 1, "DESCARTE", false)
            } else {
                Utilidades.procesarDano(this, jugador, atacante, 1, "DESCARTE", false)
            }
        }

        this.agregarAlDescarte(cartaDescartada, jugador, null)
    }

    agregarAlDescarte(cartaDescartada: Carta, jugador: Jugador = null, client: any = null): void {
        if (!cartaDescartada.esConjurada){
            cartaDescartada.idDuenoDelPerro = ""
            this.state.descarte.push(cartaDescartada);
        }

        if (jugador && cartaDescartada.efecto && cartaDescartada.efecto.startsWith("descartar")) {
            let partesEfecto = cartaDescartada.efecto.split("_");
            this.despachadorCartas.ejecutarEfecto(partesEfecto[0], this, client, jugador, cartaDescartada, -1, partesEfecto, this.gestorPersonajes);
        }
    }

    agregarRegistro(mensaje: string): void {
        this.broadcast("notificacion_turno", mensaje)
    }

    reproducirSfx(sfx: string): void {
        this.broadcast("sfx", sfx)
    }

    getJugadores(): MapSchema<Jugador> {
        return this.state.jugadores
    }

    ejecutarAnimacionCarta(client: any, carta: Carta): void {
        this.broadcast("animacion_carta", { idJugador: client.sessionId, carta: carta});
    }
}