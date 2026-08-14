// EfectosCartas.ts

import { GestorPersonajes } from "./Personajes.js";

// 1. EL CONTRATO: Todas las cartas que agregues en el futuro DEBEN tener este método "ejecutar"
export interface IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean;
}

// 2. LAS ESTRATEGIAS: Cada efecto es una clase separada y limpia

export class EfectoCurar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let totalVivos = 0;

        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo) {
                totalVivos++;
            }
        });

        if (totalVivos == 2){
            client.send("alerta_personal", "No se puede usar curacion cuando quedan 2 jugadores.");
            return false
        }
        
        if (jugador.vidas < jugador.vidasMaximas) {
            jugador.vidas++

            let pasivaJugadorActual = gestorPersonajes.obtener(jugador.personaje);
            if (pasivaJugadorActual && pasivaJugadorActual.modificarCuraBotiquin){
                jugador.vidas += pasivaJugadorActual.modificarCuraBotiquin()
            }
            if (pasivaJugadorActual && pasivaJugadorActual.onRecibirCuracion){
                pasivaJugadorActual.onRecibirCuracion(jugador)
            }

            if (jugador.vidas >= jugador.vidasMaximas){
                jugador.vidas = jugador.vidasMaximas
            }

            console.log(`🩹 ${jugador.nombre} se curó 1 vida.`);
            sala.broadcast("notificacion_turno", `🩹 ${jugador.nombre} usó un Botiquín.`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
            sala.broadcast("sfx", "curacion")

            // Consumimos la carta
            jugador.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            return true
        } else {
            client.send("alerta_personal", "Tu vida ya está al máximo.");
            return false
        }
    }
}

export class EfectoEquipar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let nuevoAlcance = parseInt(parametros[2]); 
        
        if (jugador.cartaArma) {
            sala.agregarAlDescarte(jugador.cartaArma);
            console.log(`🗑️ El arma vieja de ${jugador.nombre} fue al descarte.`);
        }
        
        jugador.nombreArma = cartaJugada.nombre;
        jugador.alcanceArma = nuevoAlcance;
        jugador.cartaArma = cartaJugada;
        
        jugador.mano.splice(indiceCarta, 1);
        
        console.log(`🔫 ${jugador.nombre} se equipó una ${cartaJugada.nombre} (Alcance: ${nuevoAlcance}).`);
        sala.broadcast("notificacion_turno", `🔫 ¡${jugador.nombre} se equipó ${cartaJugada.nombre}!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        const numero: number = Math.floor(Math.random() * 3);
        const sfx: string = "equiparArma" + numero
        sala.broadcast("sfx", sfx)
        return true
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
        let totalVivos = 0;

        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo) {
                totalVivos++;
            }
        });

        if (totalVivos == 2){
            client.send("alerta_personal", "No se puede usar curacion cuando quedan 2 jugadores.");
            return false
        }
        
        let alguienNecesitaCura = false;
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.vidas < j.vidasMaximas) alguienNecesitaCura = true;
        });

        if (!alguienNecesitaCura) {
            client.send("alerta_personal", "Todos los jugadores vivos ya tienen la salud al máximo.");
            return false
        }

        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.vidas < j.vidasMaximas){
                j.vidas++;
                let pasivaJugadorActual = gestorPersonajes.obtener(j.personaje);
                if (pasivaJugadorActual && pasivaJugadorActual.onRecibirCuracion){
                    pasivaJugadorActual.onRecibirCuracion(j)
                }
            } 
        });

        console.log(`✨ ${jugadorQueJuega.nombre} curó a todos.`);
        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.nombre} jugó ${cartaJugada.nombre} y curó a todos!`);
        sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
        sala.broadcast("sfx", "poco")

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);

        return true
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
            
            sala.broadcast("notificacion_turno", `🌧️ ¡${jugadorQueJuega.nombre} usó un Tiratachuela! ¡Todos a cubierto!`);
            sala.broadcast("animacion_carta", { idJugador: client.sessionId, nombre: cartaJugada.nombre, descripcion: cartaJugada.descripcion, esConjurada: cartaJugada.esConjurada, descripcionCatalan: cartaJugada.descripcionEnCatalan});
            
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
        
        sala.broadcast("notificacion_turno", `🔭 ${jugador.nombre} equipó una Mira Telescópica.`);
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
        "equiparBarrilPro": new EfectoEquiparBarrilPro()
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