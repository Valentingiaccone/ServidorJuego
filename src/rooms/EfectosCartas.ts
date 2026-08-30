// EfectosCartas.ts

import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { GestorPersonajes } from "./Personajes.js";
import { Carta } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

export interface IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean;
}

export class EfectoCurar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 1, "BOTIQUIN", false);

            sala.broadcast("notificacion_turno", `🩹 ${jugador.nombre} usó un Botiquín.`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
            sala.broadcast("sfx", "curacion");

            jugador.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            return true;
        } else {
            client.send("alerta_personal", "Tu salud ya está al máximo.");
            return false;
        }
    }
}

export class EfectoCurarDuo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }

        if (!Utilidades.puedeRecibirCuracion(sala, jugadorQueJuega)) {
            client.send("alerta_personal", "Tu salud ya está al máximo.");
            return false;
        }
        if (!Utilidades.puedeRecibirCuracion(sala, victima)) {
            client.send("alerta_personal", "El objetivo ya tiene la salud al máximo.");
            return false;
        }

        Utilidades.aplicarCuracion(sala, jugadorQueJuega, 1, "CURADUO", false);
        Utilidades.aplicarCuracion(sala, victima, 1, "CURADUO", false);

        sala.broadcast("notificacion_turno", `🤝 ¡${jugadorQueJuega.nombre} y ${victima.nombre} compartieron curación!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "curacion");

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        return true; 
    }
}

export class EfectoEquipar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let nuevoAlcance = parseInt(parametros[2]); 
        let danoExtraBang = parametros[3] ? parseInt(parametros[3]) : 0;
        let alcanceMin = parametros[4] ? parseInt(parametros[4]) : 0;
        
        if (jugador.cartaArma) {
            sala.agregarAlDescarte(jugador.cartaArma);
        }
        
        jugador.nombreArma = cartaJugada.nombre;
        jugador.alcanceArma = nuevoAlcance;
        
        // --- ASIGNAMOS LOS VALORES NUEVOS ---
        jugador.danoExtraArmaBang = danoExtraBang;
        jugador.alcanceMinimoArma = alcanceMin;
        
        jugador.cartaArma = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🔫 ¡${jugador.nombre} se equipó ${cartaJugada.nombre}!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        const numero: number = Math.floor(Math.random() * 3);
        sala.broadcast("sfx", "equiparArma" + numero);
        return true;
    }
}

export class EfectoRobar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let cantidad = parseInt(parametros[1]); 
        sala.repartirCartas(jugador, cantidad, "carta");
        
        console.log(`🃏 ${jugador.nombre} usó ${cartaJugada.nombre} y robó ${cantidad} cartas.`);
        sala.broadcast("notificacion_turno", `🃏 ${jugador.nombre} jugó ${cartaJugada.nombre}.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        
        jugador.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        return true
    }
}

export class EfectoCurarATodos implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        let alguienNecesitaCura = false;
        sala.state.jugadores.forEach((j: any) => {
            if (Utilidades.puedeRecibirCuracion(sala, j)) alguienNecesitaCura = true;
        });

        if (!alguienNecesitaCura) {
            client.send("alerta_personal", "Todos los jugadores vivos ya tienen la salud al máximo.");
            return false;
        }

        sala.state.jugadores.forEach((j: any) => {
            if (Utilidades.puedeRecibirCuracion(sala, j)){
                Utilidades.aplicarCuracion(sala, j, 1, "CURARTODOS", false);
            } 
        });

        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.nombre} jugó ${cartaJugada.nombre} y curó a todos!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "poco");

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        return true;
    }
}

export class EfectoTiratachuela implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        sala.colaDePeligro = [];
        
        sala.state.jugadores.forEach((j: any, sessionId: string) => {
            if (j.estaVivo && sessionId !== client.sessionId) {
                sala.colaDePeligro.push(sessionId);
            }
        });

        if (sala.colaDePeligro.length > 0) {
            jugadorQueJuega.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            sala.state.atacanteActual = client.sessionId;

            // --- LA CORRECCIÓN ACÁ ---
            sala.causaDePeligro = "TIRATACHUELA"; // Le avisamos a la cola qué es
            sala.state.danoPendiente = 1;         // Arreglamos el bug del Super Bang
            
            sala.broadcast("notificacion_turno", `🌧️ ¡${jugadorQueJuega.nombre} usó un Tiratachuela! ¡Todos a cubierto!`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
            sala.broadcast("musica", "tiratachueladaOst")
            
            sala.avanzarColaDePeligro();
            return true
        } else {
            client.send("alerta_personal", "No hay nadie vivo para atacar.")
            return false
        }
    }
}

export class EfectoIndios implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        sala.colaIndios = [];
        
        sala.state.jugadores.forEach((j: any, sessionId: string) => {
            if (j.estaVivo && sessionId !== client.sessionId) sala.colaIndios.push(sessionId);
        });

        if (sala.colaIndios.length > 0) {
            jugadorQueJuega.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            
            sala.broadcast("notificacion_turno", `🔥 ¡${jugadorQueJuega.nombre} lanzó un ataque de ¡Indios!`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
            sala.broadcast("musica", "indiadaOst")
            sala.state.atacanteActual = client.sessionId;
            sala.avanzarColaIndios();
            return true
        } else {
            client.send("alerta_personal", "No hay nadie vivo para atacar.");
            return false
        }
    }
}

export class EfectoTiendaGriff implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        // 1. Encontrar a todos los vivos en orden (empezando por el que la jugó)
        let vivosIds: string[] = [];
        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        
        for(let i = 0; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            let sessionId = idsJugadores[idx] as string;
            let j = sala.state.jugadores.get(sessionId);
            if(j && j.estaVivo) vivosIds.push(sessionId);
        }

        sala.colaTienda = vivosIds;
        sala.state.cartasTienda.clear();

        sala.state.tipoTiendaActual = "Griff";

        // 2. Sacar 1 carta por jugador vivo
        for(let i = 0; i < vivosIds.length; i++) {
            if (sala.state.mazo.length === 0 && sala.state.descarte.length > 0) {
                let arrayDescarte = Array.from(sala.state.descarte);
                arrayDescarte.sort(() => Math.random() - 0.5);
                sala.state.descarte.clear();
                arrayDescarte.forEach((c: any) => sala.state.mazo.push(c));
            }
            if (sala.state.mazo.length > 0) sala.state.cartasTienda.push(sala.state.mazo.pop());
        }

        // 3. Consumir la carta e iniciar la tienda
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        
        sala.avanzarColaTienda();
        return true
    }
}

export class EfectoTiendaJuju implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        
        let vivosIds: string[] = [];
        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        
        // 1. Encontrar a todos los vivos (EXCEPTO al que la jugó)
        for(let i = 0; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            let sessionId = idsJugadores[idx] as string;
            let j = sala.state.jugadores.get(sessionId);
            
            // LA CLAVE: Exigimos que el ID sea distinto al del cliente actual
            if(j && j.estaVivo && sessionId !== client.sessionId) {
                vivosIds.push(sessionId);
            }
        }

        sala.colaTienda = vivosIds;
        sala.state.cartasTienda.clear();
        
        // Avisamos al servidor que estamos en modo Juju
        sala.state.tipoTiendaActual = "Juju";

        // 2. Sacar 1 carta MALDITA por jugador víctima
        for(let i = 0; i < vivosIds.length; i++) {
            let cartaMaldita = CatalogoCartasEspeciales.crearCartaMalditaAleatoria();
            sala.state.cartasTienda.push(cartaMaldita);
        }

        // 3. Consumir la carta e iniciar la tienda
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        sala.broadcast("sfx", "sfxJujuTienda");
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        
        // Llamamos a la función unificada
        sala.avanzarColaTienda();
        
        return true;
    }
}

export class EfectoEquiparMustang implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneMustang && jugador.cartaMustang) {
            sala.agregarAlDescarte(jugador.cartaMustang);
        }
        jugador.tieneMustang = true;
        jugador.tieneMustangPro = false
        jugador.cartaMustang = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🐎 ${jugador.nombre} montó un Caballo.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        return true
    }
}

export class EfectoEquiparMira implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneMira && jugador.cartaMira) {
            sala.agregarAlDescarte(jugador.cartaMira); 
        }
        jugador.tieneMira = true;
        jugador.tieneMiraPro = false
        jugador.cartaMira = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🛖 ${jugador.nombre} equipó una Monoaldea.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        return true
    }
}

export class EfectoEquiparBarril implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneBarril && jugador.cartaBarril) {
            sala.agregarAlDescarte(jugador.cartaBarril); 
        }
        jugador.tieneBarril = true;
        jugador.tieneBarrilPro = false
        jugador.cartaBarril = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🛢️ ${jugador.nombre} se escondió detrás de un Barril.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        const numero: number = Math.floor(Math.random() * 3);
        const sfx: string = "barril" + numero
        sala.broadcast("sfx", sfx)
        return true
    }
}

export class EfectoEquiparMustangPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneMustang && jugador.cartaMustang) {
            sala.agregarAlDescarte(jugador.cartaMustang); 
        }
        jugador.tieneMustang = true;
        jugador.tieneMustangPro = true; // ACTIVAMOS LA VARIABLE PRO
        jugador.cartaMustang = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🐎 ${jugador.nombre} montó un Caballo Pro.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        return true;
    }
}

export class EfectoEquiparMiraPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneMira && jugador.cartaMira) {
            sala.agregarAlDescarte(jugador.cartaMira); 
        }
        jugador.tieneMira = true;
        jugador.tieneMiraPro = true; // ACTIVAMOS LA VARIABLE PRO
        jugador.cartaMira = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🔭 ${jugador.nombre} equipó una Monoaldea Pro.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        return true;
    }
}

export class EfectoEquiparBarrilPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneBarril && jugador.cartaBarril) {
            sala.agregarAlDescarte(jugador.cartaBarril); 
        }
        jugador.tieneBarril = true;
        jugador.tieneBarrilPro = true; // ACTIVAMOS LA VARIABLE PRO
        jugador.cartaBarril = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🛢️ ${jugador.nombre} se escondió detrás de un Barril Pro.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        const numero: number = Math.floor(Math.random() * 3);
        sala.broadcast("sfx", "barril" + numero);
        return true;
    }
}

export class EfectoEquiparDinamita implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        if (jugador.tieneDinamita && jugador.cartaDinamita) {
            sala.agregarAlDescarte(jugador.cartaDinamita); 
        }
        jugador.tieneDinamita = true;
        jugador.cartaDinamita = cartaJugada;
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🧨 ¡${jugador.nombre} encendió una Dinamita!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "dinamita")
        return true
    }
}

export class EfectoDesequipar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }

        let cantidad = 1; 
        if (parametros.length >= 3 && !isNaN(parseInt(parametros[1]))) {
            cantidad = parseInt(parametros[1]);
        }

        let cartasVoladas: string[] = [];

        for (let i = 0; i < cantidad; i++) {
            let cartaDestruida = Utilidades.descartarEquipamientoAleatorio(sala, victima, client);
            
            if (cartaDestruida) {
                cartasVoladas.push(cartaDestruida.nombre);
            } else {
                break;
            }
        }

        if (cartasVoladas.length === 0) {
            client.send("alerta_personal", `${victima.nombre} no tiene ningún equipamiento para quitarle.`);
            return false;
        }

        let nombresCartas = cartasVoladas.join(" y ");
        sala.broadcast("notificacion_turno", `🌪️ ¡${jugadorQueJuega.nombre} lanzó ${cartaJugada.nombre}! ${victima.nombre} perdió ${nombresCartas}, directo al descarte.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        return true; 
    }
}

export class EfectoDescartar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, carta: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        let tipoMaldicion = parametros[1]; // "venenoso", "reductor", "comilon", "maldita"
        let cantidad = parametros[2] ? parseInt(parametros[2]) : 1;

        if (tipoMaldicion === "venenoso") {
            sala.broadcast("notificacion_turno", `🍄 ¡${jugador.nombre} descartó un ${carta.nombre} y el veneno le quita ${cantidad} vida (Daño directo)!`);
            Utilidades.procesarDano(sala, jugador, null, cantidad, "MALDICION", true);
        }
        else if (tipoMaldicion === "reductor") {
            if (jugador.vidasMaximas == jugador.vidas){
                sala.broadcast("notificacion_turno", `⬇️ ${jugador.nombre} descartó un ${carta.nombre} pero no le afecta porque tiene la salud al maximo`);
            } else if (jugador.vidasMaximas > 1){
                sala.broadcast("notificacion_turno", `⬇️ ¡${jugador.nombre} descartó un ${carta.nombre} y su salud máxima bajó en ${cantidad}!`);
                jugador.vidasMaximas -= cantidad;
                if (jugador.vidas > jugador.vidasMaximas) {
                    jugador.vidas = jugador.vidasMaximas;
                    sala.evaluarMuerte(jugador); 
                }
            } else {
                sala.broadcast("notificacion_turno", `⬇️ ${jugador.nombre} descartó un ${carta.nombre} pero su salud maxima no puede bajar de 1`);
            }
        } 
        else if (tipoMaldicion === "comilon") {
            for (let i = 0; i < cantidad; i++) {
                
                let cartaDevorada = Utilidades.descartarEquipamientoAleatorio(sala, jugador, client);

                if (cartaDevorada) {
                    sala.broadcast("notificacion_turno", `👾 ¡Una maldición devoró un equipamiento (${cartaDevorada.nombre}) de ${jugador.nombre}!`);
                } else {
                    sala.broadcast("notificacion_turno", `👾 Una maldición intentó actuar, pero ${jugador.nombre} ya no tenía equipamiento.`);
                    break; 
                }
            }
        }
        else if (tipoMaldicion === "maldita") {
            for (let i = 0; i < cantidad; i++) {
                if (jugador.mano.length > 0) {
                    let indiceRandom = Math.floor(Math.random() * jugador.mano.length);
                    let cartaExtra = jugador.mano.splice(indiceRandom, 1)[0];
                    
                    sala.broadcast("notificacion_turno", `👻 ¡Una maldición obligó a ${jugador.nombre} a descartar ${cartaExtra.nombre}!`);
                    
                    sala.descartarCarta(cartaExtra, jugador, "VOLUNTARIO")
                } else {
                    sala.broadcast("notificacion_turno", `👻 Una maldición intentó actuar, pero la mano de ${jugador.nombre} ya estaba vacía.`);
                    break;
                }
            }
        }

        return true;
    }
}

export class EfectoEquiparPapapum implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, carta: any, indiceCarta: number, parametros: string[]): boolean {
        
        // 1. Validamos que NO haya otra papa ya equipada en la mesa
        let papaEnJuego = false;
        sala.state.jugadores.forEach((j: any) => {
            if (j.tienePapa) papaEnJuego = true;
        });

        if (papaEnJuego) {
            client.send("alerta_personal", "Ya hay un Papapum activo en el juego. No podés equipar otra.");
            return false;
        }

        // 2. Equipamos la carta y reseteamos el peligro global a 1/16
        jugador.tienePapa = true;
        jugador.cartaPapa = carta;
        sala.state.probabilidadPapa = 1; 

        sala.broadcast("notificacion_turno", `🥔 ¡${jugador.nombre} activó al Papapum!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: carta.nombre, descripcion: carta.descripcion, esConjurada: carta.esConjurada, descripcionCatalan: carta.descripcionEnCatalan});

        jugador.mano.splice(indiceCarta, 1);
        return true;
    }
}

export class EfectoRayo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        // ¡LA MAGIA ACÁ! 1. Consumimos la carta ANTES de hacer cualquier cálculo.
        // Así el índice nunca se rompe por recompensas, robos pasivos o muertes.
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        // 2. Buscamos cuál es la salud más alta
        let maximaSalud = -1;
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.vidas > maximaSalud) {
                maximaSalud = j.vidas;
            }
        });

        // 3. Obtenemos el orden de la mesa
        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        let ordenMesa: string[] = [];
        
        for (let i = 0; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            ordenMesa.push(idsJugadores[idx] as string);
        }

        let victimasIds = ordenMesa.filter(id => {
            let j = sala.state.jugadores.get(id);
            return j && j.estaVivo && j.vidas === maximaSalud;
        });

        sala.broadcast("notificacion_turno", `⚡ ¡${jugadorQueJuega.nombre} invocó un Rayo sobre los jugadores con más salud!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan });
        sala.broadcast("sfx", "rayo")

        // 4. Aplicamos el daño
        victimasIds.forEach(id => {
            let victima = sala.state.jugadores.get(id);
            if (victima && victima.estaVivo) {
                sala.broadcast("notificacion_turno", `⚡ ¡KABOOM! El rayo impacta a ${victima.nombre} y pierde 1 vida.`);
                Utilidades.procesarDano(sala, victima, jugadorQueJuega, 1, "RAYO");
            }
        });

        return true;
    }
}

export class EfectoEscudo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        Utilidades.agregarEscudos(sala, jugadorQueJuega, 1, 1, "EFECTOESCUDO");

        sala.broadcast("notificacion_turno", `🛡️ ¡${jugadorQueJuega.nombre} usó ${cartaJugada.nombre}! Obtiene vida extra temporal.`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "curacion"); 

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);

        return true;
    }
}

export class EfectoEmbrujar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let idObjetivo = parametros[parametros.length - 1];
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Solo podés embrujar a jugadores vivos.");
            return false;
        }

        let tipo = parametros[1];
        let cantidad = parseInt(parametros[2]);

        let pasiva = sala.gestorPersonajes.obtener(jugadorQueJuega.personaje)
        if (pasiva && pasiva.modificarPuntosAlEmbrujar){
            cantidad += pasiva.modificarPuntosAlEmbrujar(sala, jugadorQueJuega, victima, tipo, cantidad)
        }

        if (victima.embrujos.length + cantidad > 16) {
            client.send("alerta_personal", `La ruleta de ${victima.nombre} ya está demasiado embrujada, no cabe este maleficio.`);
            return false;
        }

        if (victima.boolean.get("dahliaSheriff") && cartaJugada.tipoEmbrujo == "malo"){
            client.send("alerta_personal", `No podés embrujar de forma negativa a ${victima.nombre} ya que tiene una pasiva que lo protege.`)
            return false
        }

        for (let i = 0; i < cantidad; i++) {
            victima.embrujos.push(tipo);
        }

        jugadorQueJuega.yaJugoFantasma = true;
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        // mejorar esta pavada y hacerla funcion
        if (!jugadorQueJuega.estaVivo){
            jugadorQueJuega.mano.clear();
            jugadorQueJuega.yaJugoFantasma = false;
            sala.avanzarAlSiguienteTurno(client.sessionId);
        }
        
        // ¡Mensaje 100% anónimo!
        sala.broadcast("notificacion_turno", `👻 ¡Un espíritu maligno ha lanzado un embrujo en secreto!`);
        // Nota: NO enviamos animacion_carta para que nadie vea la flecha en la mesa

        return true;
    }
}

export class EfectoClonarMano implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        let cartasOriginalesEnMano = jugadorQueJuega.mano.filter((c: any, index: number) => !c.esConjurada && index !== indiceCarta);
        
        if (cartasOriginalesEnMano.length === 0) {
            client.send("alerta_personal", "No tenés otras cartas originales en la mano para clonar.");
            return false;
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        let indiceAleatorio = Math.floor(Math.random() * cartasOriginalesEnMano.length);
        let cartaAClonar = cartasOriginalesEnMano[indiceAleatorio];

        let indiceEnMano = jugadorQueJuega.mano.findIndex((c: any) => c.id === cartaAClonar.id);
        if (indiceEnMano !== -1) {
            jugadorQueJuega.mano.splice(indiceEnMano, 1);
            sala.agregarAlDescarte(cartaAClonar, jugadorQueJuega, client); 
        }

        for (let i = 0; i < 2; i++) {
            let clon = new Carta();
            clon.id = `clon_${i}_${cartaAClonar.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            clon.nombre = cartaAClonar.nombre;
            clon.descripcion = cartaAClonar.descripcion;
            clon.descripcionEnCatalan = cartaAClonar.descripcionEnCatalan;
            clon.tipoDeUso = cartaAClonar.tipoDeUso;
            clon.efecto = cartaAClonar.efecto;
            
            clon.esConjurada = true; 
            
            jugadorQueJuega.mano.push(clon);
        }

        sala.broadcast("notificacion_turno", `🪞 ¡${jugadorQueJuega.nombre} jugó ${cartaJugada.nombre}, sacrificó una carta original y fabricó 2 clones!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "tilinkPasiva");

        return true;
    }
}

// 3. EL DESPACHADOR: Es el encargado de buscar la clase correcta
export class DespachadorDeCartas {
    private efectos: Record<string, IEfectoCarta> = {
        "curar": new EfectoCurar(),
        "equipar": new EfectoEquipar(),
        "robar": new EfectoRobar(),
        "curarATodos": new EfectoCurarATodos(),
        "tiratachuela": new EfectoTiratachuela(),
        "indios": new EfectoIndios(),
        "tienda": new EfectoTiendaGriff(),
        "equiparMustang": new EfectoEquiparMustang(),
        "equiparMira": new EfectoEquiparMira(),
        "equiparBarril": new EfectoEquiparBarril(),
        "equiparDinamita": new EfectoEquiparDinamita(),
        "equiparMustangPro": new EfectoEquiparMustangPro(),
        "equiparMiraPro": new EfectoEquiparMiraPro(),
        "equiparBarrilPro": new EfectoEquiparBarrilPro(),
        "curarDuo": new EfectoCurarDuo(),
        "desequipar": new EfectoDesequipar(),
        "tiendaJuju": new EfectoTiendaJuju(),
        "descartar": new EfectoDescartar(),
        "equiparPapapum": new EfectoEquiparPapapum(),
        "rayo": new EfectoRayo(),
        "embrujar": new EfectoEmbrujar(),
        "equiparEscudo": new EfectoEscudo(),
        "clonarMano": new EfectoClonarMano(),
    };

    public ejecutarEfecto(accion: string, sala: any, client: any, jugador: any, carta: any, indice: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let efecto = this.efectos[accion];
        if (efecto) {
            return efecto.ejecutar(sala, client, jugador, carta, indice, parametros, gestorPersonajes);
        } else {
            console.log(`⚠️ Efecto no programado o manejado en otra fase: ${accion}`);
            return false
        }
    }
}