// EfectosCartas.ts

import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { GestorPersonajes } from "./Personajes.js";
import { Carta, Jugador } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

export interface IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean;
}

export class EfectoCurar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 1, "BOTIQUIN", false);

            sala.broadcast("notificacion_turno", `🩹 ${jugador.personaje} usó un Botiquín.`);
            sala.ejecutarAnimacionCarta(client, cartaJugada)
            sala.broadcast("sfx", "curacion");

            jugador.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            return true;
        } else {
            client.send("alerta_personal", "No podes curarte ahora mismo.");
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
            client.send("alerta_personal", "No podes curarte ahora mismo.");
            return false;
        }
        if (!Utilidades.puedeRecibirCuracion(sala, victima)) {
            client.send("alerta_personal", "El objetivo no puede curarse ahora mismo.");
            return false;
        }

        Utilidades.aplicarCuracion(sala, jugadorQueJuega, 1, "CURADUO", false);
        Utilidades.aplicarCuracion(sala, victima, 1, "CURADUO", false);

        sala.broadcast("notificacion_turno", `🤝 ¡${jugadorQueJuega.personaje} y ${victima.personaje} compartieron curación!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.broadcast("sfx", "curacion");

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        return true; 
    }
}

export class EfectoEquipar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "arma");
        jugador.mano.splice(indiceCarta, 1);
        
        sala.broadcast("notificacion_turno", `🔫 ¡${jugador.personaje} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        const numero = Math.floor(Math.random() * 3);
        sala.broadcast("sfx", "equiparArma" + numero);
        return true;
    }
}

export class EfectoRobar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let cantidad = parseInt(parametros[1]); 
        sala.repartirCartas(jugador, cantidad, "carta");
        
        console.log(`🃏 ${jugador.personaje} usó ${cartaJugada.nombre} y robó ${cantidad} cartas.`);
        sala.broadcast("notificacion_turno", `🃏 ${jugador.personaje} jugó ${cartaJugada.nombre}.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        
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
            client.send("alerta_personal", "No hay ningun jugador que se pueda curar ahora mismo.");
            return false;
        }

        sala.state.jugadores.forEach((j: any) => {
            if (Utilidades.puedeRecibirCuracion(sala, j)){
                Utilidades.aplicarCuracion(sala, j, 1, "CURARTODOS", false);
            } 
        });

        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.nombre} jugó ${cartaJugada.nombre} y curó a todos!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
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
            sala.state.atacanteActual = client.sessionId;

            // --- LA CORRECCIÓN ACÁ ---
            sala.causaDePeligro = "TIRATACHUELA"; // Le avisamos a la cola qué es
            sala.state.danoPendiente = 1;         // Arreglamos el bug del Super Bang
            
            sala.broadcast("notificacion_turno", `🌧️ ¡${jugadorQueJuega.nombre} usó un Tiratachuela! ¡Todos a cubierto!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada)
            sala.agregarAlDescarte(cartaJugada);
            sala.broadcast("musica", "tiratachueladaOst")
            
            sala.state.spriteFlecha = "tiratachuela"
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
        let victimasIds: string[] = [];
        
        sala.state.jugadores.forEach((j: any, sessionId: string) => {
            if (j.estaVivo && sessionId !== client.sessionId) victimasIds.push(sessionId);
        });

        if (victimasIds.length > 0) {
            jugadorQueJuega.mano.splice(indiceCarta, 1);
            
            sala.broadcast("notificacion_turno", `🔥 ¡${jugadorQueJuega.personaje} lanzó un ataque de ¡Indios!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada)
            sala.agregarAlDescarte(cartaJugada);
            sala.broadcast("musica", "indiadaOst")
            sala.state.atacanteActual = client.sessionId;
            
            // --- EL NUEVO SISTEMA EN ACCIÓN ---
            victimasIds.forEach(idVictima => {
                let victima = sala.state.jugadores.get(idVictima);
                // Le evaluamos la mano para saber si habilitar el botón
                let tieneBang = victima.mano.some((c: any) => c.nombre === "BANG!");
                
                sala.encolarInteraccion(idVictima, `¡${jugadorQueJuega.personaje} te ataca con indios!`, "indios", [
                    { idAccion: "indios_descartar", texto: "Descartar BANG!", habilitado: tieneBang, color: "verde" },
                    { idAccion: "indios_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
                ]);
            });
            
            // Disparamos el primer panel
            sala.state.spriteFlecha = "indio"
            sala.procesarSiguienteInteraccion();
            return true;
        } else {
            client.send("alerta_personal", "No hay nadie vivo para atacar.");
            return false;
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
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada);
        
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
        
        sala.state.tipoTiendaActual = "Juju";

        for(let i = 0; i < vivosIds.length; i++) {
            let cartaMaldita = CatalogoCartasEspeciales.crearCartaMalditaAleatoria();
            sala.state.cartasTienda.push(cartaMaldita);
        }

        // 3. Consumir la carta e iniciar la tienda
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("sfx", "sfxJujuTienda");
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada);
        
        // Llamamos a la función unificada
        sala.avanzarColaTienda();
        
        return true;
    }
}

export class EfectoEquiparMustang implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "mustang");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🐎 ${jugador.personaje} montó un Caballo.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoEquiparMira implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "mira");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🛖 ${jugador.personaje} equipó una Monoaldea.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoEquiparBarril implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "barril");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🛢️ ${jugador.personaje} se escondió detrás de un Barril.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        const numero = Math.floor(Math.random() * 3);
        sala.broadcast("sfx", "barril" + numero);
        return true;
    }
}

export class EfectoEquiparMustangPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "mustang");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🐎 ${jugador.personaje} montó un Caballo Pro.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoEquiparMiraPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "mira");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🔭 ${jugador.personaje} equipó una Monoaldea Pro.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoEquiparBarrilPro implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "barril");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🛢️ ${jugador.personaje} se escondió detrás de un Barril Pro.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        const numero = Math.floor(Math.random() * 3);
        sala.broadcast("sfx", "barril" + numero);
        return true;
    }
}

export class EfectoEquiparDinamita implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        Utilidades.equiparCarta(sala, jugador, cartaJugada, "dinamita");
        jugador.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🧨 ¡${jugador.personaje} encendió una Dinamita!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.broadcast("sfx", "dinamita");
        return true;
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
            client.send("alerta_personal", `${victima.personaje} no tiene ningún equipamiento para quitarle.`);
            return false;
        }

        let nombresCartas = cartasVoladas.join(" y ");
        sala.broadcast("notificacion_turno", `🌪️ ¡${jugadorQueJuega.personaje} lanzó ${cartaJugada.nombre}! ${victima.personaje} perdió ${nombresCartas}, directo al descarte.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        if (cartaJugada.nombre == "Come piedras"){
            sala.reproducirSfx("sfxComePiedras")
        }
        
        return true; 
    }
}

export class EfectoDescartar implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, carta: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        let tipoMaldicion = parametros[1]; // "venenoso", "reductor", "comilon", "maldita"
        let cantidad = parametros[2] ? parseInt(parametros[2]) : 1;

        if (tipoMaldicion === "venenoso") {
            sala.broadcast("notificacion_turno", `🍄 ¡${jugador.personaje} descartó un ${carta.nombre} y el veneno le quita ${cantidad} vida (Daño directo)!`);
            Utilidades.procesarDano(sala, jugador, null, cantidad, "MALDICION", true);
        }
        else if (tipoMaldicion === "reductor") {
            if (jugador.vidasMaximas == jugador.vidas){
                sala.broadcast("notificacion_turno", `⬇️ ${jugador.personaje} descartó un ${carta.nombre} pero no le afecta porque tiene la salud al maximo`);
            } else if (jugador.vidasMaximas > 1){
                sala.broadcast("notificacion_turno", `⬇️ ¡${jugador.personaje} descartó un ${carta.nombre} y su salud máxima bajó en ${cantidad}!`);
                jugador.vidasMaximas -= cantidad;
                if (jugador.vidas > jugador.vidasMaximas) {
                    jugador.vidas = jugador.vidasMaximas;
                    sala.evaluarMuerte(jugador); 
                }
            } else {
                sala.broadcast("notificacion_turno", `⬇️ ${jugador.personaje} descartó un ${carta.nombre} pero su salud maxima no puede bajar de 1`);
            }
        } 
        else if (tipoMaldicion === "comilon") {
            for (let i = 0; i < cantidad; i++) {
                
                let cartaDevorada = Utilidades.descartarEquipamientoAleatorio(sala, jugador, client);

                if (cartaDevorada) {
                    sala.broadcast("notificacion_turno", `👾 ¡Una maldición devoró un equipamiento (${cartaDevorada.nombre}) de ${jugador.personaje}!`);
                } else {
                    sala.broadcast("notificacion_turno", `👾 Una maldición intentó actuar, pero ${jugador.personaje} ya no tenía equipamiento.`);
                    break; 
                }
            }
        }
        else if (tipoMaldicion === "maldita") {
            for (let i = 0; i < cantidad; i++) {
                if (jugador.mano.length > 0) {
                    let indiceRandom = Math.floor(Math.random() * jugador.mano.length);
                    let cartaExtra = jugador.mano.splice(indiceRandom, 1)[0];
                    
                    sala.broadcast("notificacion_turno", `👻 ¡Una maldición obligó a ${jugador.personaje} a descartar ${cartaExtra.nombre}!`);
                    
                    sala.descartarCarta(cartaExtra, jugador, "VOLUNTARIO")
                } else {
                    sala.broadcast("notificacion_turno", `👻 Una maldición intentó actuar, pero la mano de ${jugador.personaje} ya estaba vacía.`);
                    break;
                }
            }
        }
        else if (tipoMaldicion === "zombidito") {
            if (jugador.boolean.get("esZombistein")){
                sala.broadcast("notificacion_turno", `🧟 ¡${jugador.personaje} descartó un ${carta.nombre} y lo muerde pero como es Zombistein, lo cura ${cantidad} vida!`);
                if (Utilidades.puedeRecibirCuracion(sala, jugador)){
                    Utilidades.aplicarCuracion(sala, jugador, 1, "carta", false)
                }
            } else {
                sala.broadcast("notificacion_turno", `🧟 ¡${jugador.personaje} descartó un ${carta.nombre} y lo muerde quitandole ${cantidad} vida!`);
                Utilidades.procesarDano(sala, jugador, null, cantidad, "MALDICION", false);
            }
            sala.reproducirSfx("zombiditoDescarte")
        }
        else if (tipoMaldicion === "huevoExplosivo") {
            sala.broadcast("notificacion_turno", `🥚 ¡${jugador.personaje} descartó un ${carta.nombre} y explota quitandole ${cantidad} vida!`);
            Utilidades.procesarDano(sala, jugador, null, cantidad, "MALDICION", false);
        }

        return true;
    }
}

export class EfectoEquiparPapapum implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, carta: any, indiceCarta: number, parametros: string[]): boolean {
        // Validamos buscando en los mapas de todos si alguien ya lo tiene
        let papaEnJuego = false;
        sala.state.jugadores.forEach((j: any) => {
            if (j.equipamiento && j.equipamiento.has("papa")) papaEnJuego = true;
        });

        if (papaEnJuego) {
            client.send("alerta_personal", "Ya hay un Papapum activo en el juego. No podés equipar otra.");
            return false;
        }

        Utilidades.equiparCarta(sala, jugador, carta, "papa");
        sala.state.probabilidadPapa = 1; 

        sala.broadcast("notificacion_turno", `🥔 ¡${jugador.personaje} activó al Papapum!`);
        sala.broadcast("sfx", "sfxPapapumColocandose");
        sala.ejecutarAnimacionCarta(client, carta);

        jugador.mano.splice(indiceCarta, 1);
        return true;
    }
}

export class EfectoRayo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        // ¡LA MAGIA ACÁ! 1. Consumimos la carta ANTES de hacer cualquier cálculo.
        // Así el índice nunca se rompe por recompensas, robos pasivos o muertes.
        jugadorQueJuega.mano.splice(indiceCarta, 1);

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
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.broadcast("sfx", "rayo")

        // 4. Aplicamos el daño
        victimasIds.forEach(id => {
            let victima = sala.state.jugadores.get(id);
            if (victima && victima.estaVivo) {
                sala.broadcast("notificacion_turno", `⚡ ¡KABOOM! El rayo impacta a ${victima.personaje} y pierde 1 vida.`);
                Utilidades.procesarDano(sala, victima, jugadorQueJuega, 1, "RAYO");
            }
        });

        return true;
    }
}

export class EfectoEscudo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        Utilidades.agregarEscudos(sala, jugadorQueJuega, 1, 1, "EFECTOESCUDO");

        sala.broadcast("notificacion_turno", `🛡️ ¡${jugadorQueJuega.personaje} usó ${cartaJugada.nombre}! Obtiene vida extra temporal.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
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
            client.send("alerta_personal", `La ruleta de ${victima.personaje} ya está demasiado embrujada, no cabe este maleficio.`);
            return false;
        }

        if (victima.boolean.get("dahliaSheriff") && cartaJugada.tipoEmbrujo == "malo"){
            client.send("alerta_personal", `No podés embrujar de forma negativa a ${victima.personaje} ya que tiene una pasiva que lo protege.`)
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
        
        sala.broadcast("notificacion_turno", `👻 ¡Un espíritu maligno ha lanzado un embrujo en secreto!`);

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

        let indiceAleatorio = Math.floor(Math.random() * cartasOriginalesEnMano.length);
        let cartaAClonar = cartasOriginalesEnMano[indiceAleatorio];

        let indiceEnMano = jugadorQueJuega.mano.findIndex((c: any) => c.id === cartaAClonar.id);
        if (indiceEnMano !== -1) {
            jugadorQueJuega.mano.splice(indiceEnMano, 1);
            sala.agregarAlDescarte(cartaAClonar, jugadorQueJuega, client); 
        }

        for (let i = 0; i < 2; i++) {
            let clon = Utilidades.clonarCarta(cartaAClonar, "clon");
            clon.esConjurada = true; 
            jugadorQueJuega.mano.push(clon);
        }

        sala.broadcast("notificacion_turno", `🪞 ¡${jugadorQueJuega.personaje} jugó ${cartaJugada.nombre}, sacrificó una carta original y fabricó 2 clones!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.broadcast("sfx", "tilinkPasiva");

        return true;
    }
}

export class EfectoValerieLadrona implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        if (victima.mano.length === 0) {
            client.send("alerta_personal", `${victima.personaje} no tiene cartas en la mano para robarle.`);
            return false;
        }

        let cartaRobada = victima.mano.splice(0, 1)[0];
        jugadorQueJuega.mano.push(cartaRobada);

        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `🐸 ¡${jugadorQueJuega.personaje} jugó ${cartaJugada.nombre} y le robó una carta a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.broadcast("sfx", "sfxLesly"); 

        return true; 
    }
}

export class EfectoLanzaguisantes implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: Jugador, cartaJugada: Carta, indiceCarta: number, parametros: string[]): boolean { 
        if (!jugador || !cartaJugada) return false;

        let armaActual = jugador.equipamiento.get("arma");

        if (cartaJugada.nombre == "Repetidora"){
            Utilidades.equiparCarta(sala, jugador, cartaJugada, "arma");
            jugador.mano.splice(indiceCarta, 1);
            sala.broadcast("notificacion_turno", `🔫 ¡${jugador.personaje} se equipó ${cartaJugada.nombre}!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            return true;
            
        } else if (armaActual?.nombre == "Repetidora"){
            sala.broadcast("notificacion_turno", `${jugador.personaje} jugó ${cartaJugada.nombre} pero ya tiene el Lanzaguisantes mejorado.`);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            jugador.mano.splice(indiceCarta, 1);
            return true;
            
        } else if (armaActual?.nombre == "Lanzaguisantes"){
            const cartaRepetidora: Carta = CatalogoCartasEspeciales.crearRepetidora();
            cartaRepetidora.esConjurada = true;
            
            Utilidades.equiparCarta(sala, jugador, cartaRepetidora, "arma");
            jugador.mano.splice(indiceCarta, 1);
            sala.broadcast("notificacion_turno", `🔫 ¡${jugador.personaje} mejoró su arma a ${cartaRepetidora.nombre}!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            return true;
            
        } else {
            Utilidades.equiparCarta(sala, jugador, cartaJugada, "arma");
            jugador.mano.splice(indiceCarta, 1);
            sala.broadcast("notificacion_turno", `🔫 ¡${jugador.personaje} se equipó ${cartaJugada.nombre}!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            return true;
        }
    }
}

export class EfectoCalabaza implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "calabaza");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🎃 ¡${jugadorQueJuega.nombre} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoPlantorcha implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "plantorcha");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🔥 ¡${jugadorQueJuega.nombre} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoImitadora implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega){
            console.error("ERROR: el jugador es null en imitadora")
            return false
        }
        if (!cartaJugada){
            console.error("ERROR: la carta jugada es null en imitadora")
            return false
        }

        let cartasPlanta = jugadorQueJuega.mano.filter((c: any, index: number) => 
            c.esPlanta === true && 
            index !== indiceCarta && 
            c.efecto !== "imitadora"
        );

        if (cartasPlanta.length === 0) {
            if (client){
                client.send("alerta_personal", "Necesitás al menos otra carta planta en tu mano para poder usarla.");
            } else {
                console.error("ERROR: client es null en imitadora")
            }

            return false;
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);

        let indiceAleatorio = Math.floor(Math.random() * cartasPlanta.length);
        let cartaAClonar = cartasPlanta[indiceAleatorio];

        let clon = new Carta();
        clon.id = `clon_imitadora_${cartaAClonar.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = cartaAClonar.nombre;
        clon.descripcion = cartaAClonar.descripcion;
        clon.descripcionEnCatalan = cartaAClonar.descripcionEnCatalan;
        clon.tipoDeUso = cartaAClonar.tipoDeUso;
        clon.efecto = cartaAClonar.efecto;
        
        clon.esConjurada = true; 
        clon.esPlanta = true;

        jugadorQueJuega.mano.push(clon);

        sala.broadcast("notificacion_turno", `🌱 ¡${jugadorQueJuega.nombre} jugó ${cartaJugada.nombre} y creó un clon de una planta!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        sala.broadcast("sfx", "tilinkPasiva");

        return true;
    }
}

export class EfectoTrebolador implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega){
            console.error("ERROR: el jugador es null en trebolador")
            return false
        }
        if (!cartaJugada){
            console.error("ERROR: la carta jugada es null en trebolador")
            return false
        }

        let idObjetivo = parametros[parametros.length - 1]
        if (!idObjetivo){
            console.error("ERROR: idObjetivo es null en trebolador")
            return false
        }

        let victima = sala.state.jugadores.get(idObjetivo)
        if (!victima){
            console.error("ERROR: victima es null en trebolador")
        }

        const carta: Carta = Utilidades.descartarCartaAleatoriaDeLaMano(victima)
        if (!carta){
            if (client){
                client.send("alerta_personal", `No se pudo descartar ninguna carta de ${victima.personaje}`)
            } else {
                console.error("ERROR: client es null en trebolador")
            }

            return false
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.descartarCarta(carta, victima, "ATAQUE")

        sala.agregarRegistro(`☘️ ${jugadorQueJuega.personaje} jugó un Trebolador y le descartó a ${victima.personaje} un ${carta.nombre}`)
    
        return true
    }
}

export class EfectoPetaseta implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        let ordenMesa: string[] = [];
        
        for (let i = 0; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            ordenMesa.push(idsJugadores[idx] as string);
        }

        let victimasIds = ordenMesa.filter(id => {
            let j = sala.state.jugadores.get(id);
            return j && j.estaVivo;
        });

        sala.broadcast("notificacion_turno", `🌋 ¡${jugadorQueJuega.personaje} invocó una Petaseta!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        victimasIds.forEach(id => {
            let victima = sala.state.jugadores.get(id);
            if (victima && victima.estaVivo) {
                Utilidades.destruirTodosLosEquipamientos(sala, victima)
                Utilidades.procesarDano(sala, victima, jugadorQueJuega, 1, "PETASETA", false);
            }
        });

        return true;
    }
}

export class EfectoHumoseta implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "humoseta");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🫧 ¡${jugadorQueJuega.personaje} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoGranDesaparicion implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega){
            console.error("ERROR: jugadorQueJuega es null en EfectoGranDesaparicion")
            return false
        }
        if (!sala){
            console.error("ERROR: sala es null en EfectoGranDesaparicion")
            return false
        }
        if (!cartaJugada){
            console.error("ERROR: cartaJugada es null en EfectoGranDesaparicion")
            return false
        }

        if (cartaJugada.idGranDesaparicion != ""){
            const jugadorVinculado: Jugador = Utilidades.obtenerJugadorPorSessionId(sala, cartaJugada.idGranDesaparicion)
            if (jugadorVinculado){
                if (jugadorVinculado.equipamiento.size <= 0){
                    if (client){
                        client.send("alerta_personal", `${jugadorVinculado.personaje} no tiene ningun equipamiento para descartarle`)
                    } else {
                        console.error("ERROR: client es null en gran desaparicion")
                    }

                    return false
                }

                jugadorQueJuega.mano.splice(indiceCarta, 1);
                Utilidades.destruirTodosLosEquipamientos(sala, jugadorVinculado)
                sala.agregarRegistro(`🎩 ${jugadorQueJuega.personaje} le hace desaparecer todo el equipamiento a ${jugadorVinculado.personaje}`)
                sala.ejecutarAnimacionCarta(client, cartaJugada)
                sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
                sala.reproducirSfx("granDesaparicion")
                
                return true
            }
        }
    }
}

export class EfectoHordaBloons implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Identificamos a la víctima
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        // 2. Consumimos la carta
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `🎈 ¡${jugadorQueJuega.personaje} le mandó una Horda de Bloons a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        sala.state.atacanteActual = client.sessionId;

        let tieneBang = victima.mano.some((c: any) => c.nombre === "BANG!");
        let tieneBarril = victima.equipamiento.has("barril");

        sala.encolarInteraccion(idObjetivo, `¡${jugadorQueJuega.personaje} te ataca con Bloons!`, "bloons", [
            { idAccion: "bloons_bang", texto: "Reventarlos (Usa BANG!)", habilitado: tieneBang, color: "verde" },
            { idAccion: "bloons_barril", texto: "Cubrirse (Pierde Barril)", habilitado: tieneBarril, color: "azul" },
            { idAccion: "bloons_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
        ]);

        sala.state.spriteFlecha = "bloon"
        sala.procesarSiguienteInteraccion();
        
        return true;
    }
}

export class EfectoDuelo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `⚔️ ¡${jugadorQueJuega.nombre} retó a duelo a ${victima.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        sala.state.atacanteActual = client.sessionId; 

        let tieneBang = victima.mano.some((c: any) => c.nombre === "BANG!");

        sala.encolarInteraccion(idObjetivo, `¡${jugadorQueJuega.nombre} te retó a un Duelo!`, "duelo", [
            { idAccion: "duelo_descartar", texto: "Descartar BANG!", habilitado: tieneBang, color: "verde" },
            { idAccion: "duelo_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
        ]);

        sala.state.spriteFlecha = "duelo"
        sala.procesarSiguienteInteraccion();
        return true;
    }
}

export class EfectoPatadaKillo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        // Consumimos la carta
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `🦶 ¡${jugadorQueJuega.personaje} le dio una Patada Killo a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.state.atacanteActual = client.sessionId;

        // Evaluamos qué tiene la víctima (le sumamos la validación de Mikotoba para el Fallo)
        let tieneFallo = victima.mano.some((c: any) => c.efecto === "esquivar") && victima.puedeUsarFallo;
        let tieneBarril = victima.equipamiento.has("barril");
        let tieneCaballo = victima.equipamiento.has("mustang");

        // Armamos los 4 botones
        sala.encolarInteraccion(idObjetivo, `¡${jugadorQueJuega.personaje} te dio una Patada Killo!`, "patadaKillo", [
            { idAccion: "patada_fallo", texto: "Esquivar (Usa ¡Fallo!)", habilitado: tieneFallo, color: "verde" },
            { idAccion: "patada_barril", texto: "Cubrirse (Pierde Barril)", habilitado: tieneBarril, color: "azul" },
            { idAccion: "patada_caballo", texto: "Alejarse (Pierde Caballo)", habilitado: tieneCaballo, color: "azul" },
            { idAccion: "patada_dano", texto: "Recibir 2 de Daño", habilitado: true, color: "rojo" }
        ]);

        sala.state.spriteFlecha = "patadaKillo"
        sala.procesarSiguienteInteraccion();
        return true;
    }
}

export class EfectoMacetaKillo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        // Consumimos la carta
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `🪴 ¡${jugadorQueJuega.personaje} le arrojó una Maceta Killo a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.state.atacanteActual = client.sessionId;

        // Evaluamos
        let tieneBang = victima.mano.some((c: any) => c.nombre === "BANG!");
        let tieneFallo = victima.mano.some((c: any) => c.efecto === "esquivar") && victima.puedeUsarFallo;

        // Armamos los 3 botones
        sala.encolarInteraccion(idObjetivo, `¡${jugadorQueJuega.nombre} te arrojó una Maceta Killo!`, "macetaKillo", [
            { idAccion: "maceta_fallo", texto: "Esquivar (Usa ¡Fallo!)", habilitado: tieneFallo, color: "verde" },
            { idAccion: "maceta_bang", texto: "Destruirla (Descartar BANG!)", habilitado: tieneBang, color: "azul" },
            { idAccion: "maceta_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
        ]);

        sala.state.spriteFlecha = "macetaKillo"
        sala.procesarSiguienteInteraccion();
        return true;
    }
}

export class EfectoNutriente implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {

        let textoMejora = Utilidades.mejorarEquipamientoAleatorio(sala, jugadorQueJuega);

        if (textoMejora !== "") {
            jugadorQueJuega.mano.splice(indiceCarta, 1);

            sala.broadcast("notificacion_turno", `🌱 ¡${jugadorQueJuega.personaje} usó un Nutriente y mejoró ${textoMejora}!`);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
            sala.reproducirSfx("robinMejora");
            
            return true;
        } else {
            client.send("alerta_personal", "No tenés ningún equipamiento que se pueda seguir mejorando.");
            return false;
        }
    }
}

export class EfectoDomoProtector implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        let ordenMesa: string[] = [];
        
        for (let i = 0; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            ordenMesa.push(idsJugadores[idx] as string);
        }

        let victimasIds = ordenMesa.filter(id => {
            let j = sala.state.jugadores.get(id);
            return j && j.estaVivo;
        });

        sala.broadcast("notificacion_turno", `🛡️ ¡${jugadorQueJuega.personaje} les dió a todos 1 de escudo!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        victimasIds.forEach(id => {
            let victima = sala.state.jugadores.get(id);
            if (victima && victima.estaVivo) {
                Utilidades.agregarEscudos(sala, victima, 1, 1, "carta")
            }
        });

        sala.reproducirSfx("eolia")

        return true
    }
}

export class EfectoSecador implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega){
            console.error("ERROR: el jugador es null en secador")
            return false
        }
        if (!cartaJugada){
            console.error("ERROR: la carta jugada es null en secador")
            return false
        }

        let idObjetivo = parametros[parametros.length - 1]
        if (!idObjetivo){
            console.error("ERROR: idObjetivo es null en secador")
            return false
        }

        let victima = sala.state.jugadores.get(idObjetivo)
        if (!victima){
            console.error("ERROR: victima es null en secador")
        }
        if (!victima.estaVivo){
            return false
        }

        Utilidades.agregarEscudos(sala, victima, 1, 1, "carta")

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.ejecutarAnimacionCarta(client, cartaJugada)

        sala.agregarRegistro(`𖣘 ${jugadorQueJuega.personaje} jugó un Secador y le dio 1 de escudo a ${victima.personaje}.`)
        sala.reproducirSfx("sfxSecador")

        return true
    }
}

export class EfectoTiendaPierre implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        
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
        
        sala.state.tipoTiendaActual = "Pierre";

        for(let i = 0; i < vivosIds.length; i++) {
            let cartaPierre = CatalogoCartasEspeciales.crearCartaPierreAleatoria();
            cartaPierre.esConjurada = true
            sala.state.cartasTienda.push(cartaPierre);
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("sfx", "sfxPierreTienda");
        sala.ejecutarAnimacionCarta(client, cartaJugada)
        sala.agregarAlDescarte(cartaJugada);
        
        sala.avanzarColaTienda();
        
        return true;
    }
}

export class EfectoForzarEnemigo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let idObjetivo = parametros[parametros.length - 1];
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }
        if (victima.mano.length === 0 && victima.equipamiento.size === 0) {
            client.send("alerta_personal", `${victima.nombre} no tiene nada para descartar.`);
            return false;
        }
        if (victima.equipamiento.has("espantacocoroch")){
            client.send("alerta_personal", `${victima.nombre} tiene un Espantacocoroch, no podes usar un Cocoroch en este jugador.`)
            return false
        }

        // Consumimos el Cocoroch
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada);
        if (jugadorQueJuega.equipamiento.has("espantacocoroch")){
            const c: Carta = jugadorQueJuega.equipamiento.get("espantacocoroch")
            if (c){
                if (c.nombre == "Espantacocoroch"){
                    sala.repartirCartas(jugadorQueJuega, 1, "equipamiento")
                    sala.agregarRegistro(`${jugadorQueJuega.personaje} roba una carta por su Espantacocoroch.`)
                } else if (c.nombre == "Espantacocoroch Pro"){
                    sala.repartirCartas(jugadorQueJuega, 2, "equipamiento")
                    sala.agregarRegistro(`${jugadorQueJuega.personaje} roba 2 cartas por su Espantacocoroch Pro.`)
                } else {
                    console.error("ERROR: tiene un espantapajaros el jugador que juega pero no corresponde a ninguno.")
                }
            }
        }

        sala.broadcast("notificacion_turno", `🪳 ¡${jugadorQueJuega.nombre} le jugó un Cocoroch a ${victima.nombre}!`);
        const numero = Math.floor(Math.random() * 2);
        sala.broadcast("sfx", "cocoroch" + numero);

        sala.armarPanelSeleccion(idObjetivo, "¡Te tiraron un Cocoroch y tenés que descartar!", "normal", "cocoroch");
        
        victima.equipamiento.forEach((carta: any, clave: string) => {
            // USAMOS |
            sala.agregarOpcionSeleccion(`equip|${clave}`, carta, "Equipado en mesa", "Equipat");
        });
        victima.mano.forEach((carta: any, idx: number) => {
            // USAMOS |
            sala.agregarOpcionSeleccion(`mano|${idx}`, carta, "", "");
        });

        return true;
    }
}

export class EfectoRobarEnemigo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[]): boolean {
        let idObjetivo = parametros[parametros.length - 1];
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }
        if (victima.mano.length === 0 && victima.equipamiento.size === 0) {
            client.send("alerta_personal", `${victima.nombre} no tiene nada para robarle.`);
            return false;
        }

        sala.armarPanelSeleccion(client.sessionId, `¿Qué querés robarle a ${victima.nombre}?`, "normal", "panico");
        
        victima.equipamiento.forEach((carta: any, clave: string) => {
            // USAMOS |
            sala.agregarOpcionSeleccion(`equip|${clave}|${idObjetivo}|${cartaJugada.id}`, carta, "Equipado en mesa", "Equipat");
        });
        victima.mano.forEach((carta: any, idx: number) => {
            // USAMOS |
            sala.agregarOpcionSeleccion(`mano|${idx}|${idObjetivo}|${cartaJugada.id}`, carta, "¿?", "¿?", "Carta Oculta", "CartaOculta");
        });

        return false;
    }
}

export class EfectoEnsalada implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {

            let totalVivos = 0;
            sala.state.jugadores.forEach((j: any) => {
                if (j && j.estaVivo) totalVivos++;
            });

            if (totalVivos == 2){
                jugador.vidas++
            } else {
                jugador.vidas += 2
            }

            if (jugador.vidas > jugador.vidasMaximas){
                jugador.vidas = jugador.vidasMaximas
            }

            sala.broadcast("notificacion_turno", `🥗 ${jugador.personaje} comió su Ensalada.`);
            sala.ejecutarAnimacionCarta(client, cartaJugada)
            sala.broadcast("sfx", "curacion");

            jugador.mano.splice(indiceCarta, 1);
            sala.agregarAlDescarte(cartaJugada);
            return true;
        } else {
            client.send("alerta_personal", "No podes curarte ahora mismo.");
            return false;
        }
    }
}

export class EfectoEspantacocoroch implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "espantacocoroch");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `👨🏼‍🌾 ¡${jugadorQueJuega.personaje} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoWarpTotem implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Identificamos al objetivo
        let idObjetivo = parametros[parametros.length - 1]; 
        let objetivo = sala.state.jugadores.get(idObjetivo);

        if (!objetivo || !objetivo.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está muerto.");
            return false;
        }

        if (objetivo === jugadorQueJuega) {
            client.send("alerta_personal", "No podés intercambiar de lugar con vos mismo.");
            return false;
        }

        // 2. Consumimos la carta
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        // 3. Ejecutamos el intercambio de asientos
        Utilidades.intercambiarPosicionesFisicas(sala, jugadorQueJuega, objetivo);

        // 4. Robamos la carta extra
        sala.repartirCartas(jugadorQueJuega, 1, "carta");

        // 5. Aplicamos la curación (si es que no tiene la vida máxima)
        let textoCura = "";
        if (Utilidades.puedeRecibirCuracion(sala, jugadorQueJuega)) {
            Utilidades.aplicarCuracion(sala, jugadorQueJuega, 1, "WARP_TOTEM", false);
            textoCura = " y se curó 1 de salud";
        }

        // 6. Avisamos a la mesa
        sala.broadcast("notificacion_turno", `🗿 ¡${jugadorQueJuega.personaje} usó un Warp Totem! Intercambió su asiento con ${objetivo.personaje}, robó 1 carta${textoCura}.`);
        
        // Ejecutamos animaciones y descartamos
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        return true;
    }
}

export class EfectoBomba implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Buscamos a los vivos en orden físico
        let vivosIds: string[] = [];
        sala.state.ordenSillasFisicas.forEach((id: string) => {
            let j = sala.state.jugadores.get(id);
            if (j && j.estaVivo) vivosIds.push(id);
        });

        // 2. Determinamos quiénes son los vecinos (distancia 1)
        let victimasIds = new Set<string>();
        if (vivosIds.length > 1) {
            let miIndice = vivosIds.indexOf(client.sessionId);
            let idxIzq = (miIndice - 1 + vivosIds.length) % vivosIds.length;
            let idxDer = (miIndice + 1) % vivosIds.length;
            
            victimasIds.add(vivosIds[idxIzq]);
            victimasIds.add(vivosIds[idxDer]);
        }

        if (victimasIds.size === 0) {
            client.send("alerta_personal", "No hay jugadores vivos para atacar.");
            return false;
        }

        // 3. Consumimos la carta y avisamos
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `💣 ¡${jugadorQueJuega.personaje} lanzó una Bomba a sus vecinos!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        sala.state.atacanteActual = client.sessionId;

        // 4. Encolamos las interacciones para las víctimas
        victimasIds.forEach(idVictima => {
            let victima = sala.state.jugadores.get(idVictima);
            let tieneCartas = victima.mano.length > 0;
            
            sala.encolarInteraccion(idVictima, `¡${jugadorQueJuega.personaje} te tiró una Bomba!`, "bomba", [
                { idAccion: "bomba_descartar", texto: "Descartar carta izquierda", habilitado: tieneCartas, color: "verde" },
                { idAccion: "bomba_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
            ]);
        });

        sala.state.spriteFlecha = "bomba";
        sala.procesarSiguienteInteraccion();
        
        return true;
    }
}

export class EfectoMegaBomba implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        let vivosIds: string[] = [];
        sala.state.ordenSillasFisicas.forEach((id: string) => {
            let j = sala.state.jugadores.get(id);
            if (j && j.estaVivo) vivosIds.push(id);
        });

        let victimasIds = new Set<string>();
        
        if (vivosIds.length > 1) {
            let miIndice = vivosIds.indexOf(client.sessionId);
            let n = vivosIds.length;
            
            // Distancia 1 (Vecinos directos)
            victimasIds.add(vivosIds[(miIndice - 1 + n) % n]);
            victimasIds.add(vivosIds[(miIndice + 1) % n]);
            
            // Distancia 2 (Vecinos de los vecinos)
            victimasIds.add(vivosIds[(miIndice - 2 + n) % n]);
            victimasIds.add(vivosIds[(miIndice + 2) % n]);
        }

        // SALVAGUARDIA: Si la mesa es muy chica (ej: 3 jugadores), la distancia 2 da la vuelta
        // y te apunta a vos. Con esto, evitamos que te explotes a vos mismo.
        victimasIds.delete(client.sessionId);

        if (victimasIds.size === 0) {
            client.send("alerta_personal", "No hay jugadores vivos para atacar.");
            return false;
        }

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `💣💣 ¡${jugadorQueJuega.personaje} lanzó una MEGA BOMBA a la mesa!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        sala.state.atacanteActual = client.sessionId;
        sala.broadcast("sfx", "explosion"); // Si tuvieras un sonido más fuerte, iría acá

        victimasIds.forEach(idVictima => {
            let victima = sala.state.jugadores.get(idVictima);
            // Validamos que tenga AL MENOS 2 cartas para habilitar el botón
            let tieneCartasSuficientes = victima.mano.length >= 2;
            
            sala.encolarInteraccion(idVictima, `¡${jugadorQueJuega.personaje} tiró una Mega Bomba!`, "megabomba", [
                { idAccion: "megaBomba_descartar", texto: "Descartar 2 cartas izquierdas", habilitado: tieneCartasSuficientes, color: "verde" },
                { idAccion: "megaBomba_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
            ]);
        });

        sala.state.spriteFlecha = "megabomba"; 
        sala.procesarSiguienteInteraccion();
        
        return true;
    }
}

export class EfectoFestivalDelHuevo implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Consumimos la carta y avisamos a la mesa
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🥚 ¡${jugadorQueJuega.personaje} inició el Festival del Huevo! Todos roban 1 carta.`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);

        // 2. TODOS los jugadores vivos roban 1 carta
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo) {
                sala.repartirCartas(j, 1, "FESTIVAL");
            }
        });

        // 3. Recalculamos quién tiene MÁS cartas DESPUÉS de haber robado
        let maxCartas = -1;
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.mano.length > maxCartas) {
                maxCartas = j.mano.length;
            }
        });

        // 4. Repartimos el huevo misterioso a los ganadores (puede ser 1 o un empate)
        let ganadores: string[] = [];
        
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.mano.length === maxCartas) {
                let huevo = CatalogoCartasEspeciales.crearCartaHuevoAleatorio();
                if (huevo) {
                    huevo.esConjurada = true; // La marcamos como conjurada para el borde brillante
                    j.mano.push(huevo);
                    ganadores.push(j.personaje);
                }
            }
        });

        // 5. Anunciamos a los ganadores sin revelar qué huevo les tocó
        if (ganadores.length > 0) {
            let nombres = ganadores.join(" y ");
            sala.broadcast("notificacion_turno", `🥚 ¡${nombres} tenían más cartas y ganaron un Huevo Misterioso!`);
        }

        return true;
    }
}

export class EfectoTormenta implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Obtener orden en base a los IDs de los jugadores en la mesa
        let vivosIds: string[] = [];
        let idsJugadores = Array.from(sala.state.jugadores.keys());
        let indiceInicial = idsJugadores.indexOf(client.sessionId);
        
        // Empezamos desde el siguiente (i = 1) y damos la vuelta completa
        for(let i = 1; i < idsJugadores.length; i++) {
            let idx = (indiceInicial + i) % idsJugadores.length;
            let sessionId = idsJugadores[idx] as string;
            let j = sala.state.jugadores.get(sessionId);
            if(j && j.estaVivo) vivosIds.push(sessionId);
        }

        if (vivosIds.length === 0) {
            client.send("alerta_personal", "No hay nadie a quien afecte la tormenta.");
            return false;
        }

        // 2. Consumir carta y avisar
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `⛈️ ¡${jugadorQueJuega.personaje} desató una Tormenta!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        sala.state.atacanteActual = client.sessionId;

        // 3. Encolar a las víctimas en orden
        vivosIds.forEach(idVictima => {
            let victima = sala.state.jugadores.get(idVictima);
            let tieneEquipamiento = victima.equipamiento.size > 0;
            
            sala.encolarInteraccion(idVictima, `¡${jugadorQueJuega.personaje} invocó una Tormenta!`, "tormenta", [
                { idAccion: "tormenta_descartar", texto: "Descartar Equipamiento", habilitado: tieneEquipamiento, color: "azul" },
                { idAccion: "tormenta_dano", texto: "Recibir 1 de Daño", habilitado: true, color: "rojo" }
            ]);
        });

        // 4. Iniciar la tormenta
        sala.state.spriteFlecha = "tormenta";
        sala.procesarSiguienteInteraccion();
        
        return true;
    }
}

export class EfectoEsquirlaPrismatica implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        
        // 1. Probamos hacer la primera mejora
        let primeraMejora = Utilidades.mejorarEquipamientoAleatorio(sala, jugadorQueJuega);

        // 2. Si falló a la primera, significa que no hay NADA que se pueda mejorar
        if (primeraMejora === "") {
            client.send("alerta_personal", "No hay ningún equipamiento que puedas mejorar.");
            return false; // Retorna false, cancela la jugada y no consume la carta
        }

        // 3. Si llegamos acá, al menos algo mejoró. Hacemos un bucle para el resto.
        while (true) {
            let siguienteMejora = Utilidades.mejorarEquipamientoAleatorio(sala, jugadorQueJuega);
            
            // Si la función devuelve un string vacío, significa que ya todo está al máximo
            if (siguienteMejora === "") {
                break;
            }
        }

        // 4. Recién ahora consumimos el Iridio de la mano
        jugadorQueJuega.mano.splice(indiceCarta, 1);

        sala.broadcast("notificacion_turno", `🌈 ¡${jugadorQueJuega.personaje} usó una Esquirla prismatica y mejoró todo su equipamiento al máximo!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        sala.agregarAlDescarte(cartaJugada, jugadorQueJuega, client);
        
        // Reutilizamos el sonido de mejora
        sala.broadcast("sfx", "robinMejora"); 

        return true;
    }
}

export class EfectoEspirituAlegre implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "espiritu");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.personaje} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoEspirituEnojado implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        let idObjetivo = parametros[parametros.length - 1];
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }

        Utilidades.equiparCarta(sala, victima, cartaJugada, "espiritu");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `✨ ¡${jugadorQueJuega.personaje} le colocó ${cartaJugada.nombre} a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoCafe implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugador: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let bandera: boolean = false

        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 1, "cafe", false);

            sala.broadcast("notificacion_turno", `☕ ${jugador.personaje} se curó 1 por su Café.`);
            sala.broadcast("sfx", "curacion");
            bandera = true
        }

        if (jugador.yaDisparo){
            jugador.yaDisparo = false
            sala.broadcast("notificacion_turno", `☕ ${jugador.personaje} reinicia su limite de Bang! por su Café.`);
            bandera = true
        }

        if (!bandera){
            client.send("alerta_personal", "No podes curarte ni reiniciar tu limite de Bang! ahora mismo.");
            return false;
        } else {
            sala.ejecutarAnimacionCarta(client, cartaJugada)
            jugador.mano.splice(indiceCarta, 1);

            sala.agregarAlDescarte(cartaJugada);
        }

        return bandera
    }
}

export class EfectoGirasol implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: Jugador, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        if (!jugadorQueJuega || !cartaJugada) return false;

        if (jugadorQueJuega.equipamiento.has("girasol")){
            if (jugadorQueJuega.equipamiento.get("girasol").nombre == "Girasol"){
                let birasol: Carta = CatalogoCartasEspeciales.crearBirasol()
                birasol.esConjurada = true
                if (birasol){
                    jugadorQueJuega.mano.splice(indiceCarta, 1);
                    sala.ejecutarAnimacionCarta(client, cartaJugada);
                    Utilidades.equiparCarta(sala, jugadorQueJuega, birasol, "girasol")
                    sala.broadcast("notificacion_turno", `🌻 ¡${jugadorQueJuega.personaje} mejoró su Girasol a ${cartaJugada.nombre}!`);
                    return true
                }
            }
        }

        Utilidades.equiparCarta(sala, jugadorQueJuega, cartaJugada, "girasol");
        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.broadcast("notificacion_turno", `🌻 ¡${jugadorQueJuega.personaje} se equipó ${cartaJugada.nombre}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada);
        return true;
    }
}

export class EfectoCrisalida implements IEfectoCarta {
    ejecutar(sala: any, client: any, jugadorQueJuega: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: GestorPersonajes): boolean {
        let idObjetivo = parametros[parametros.length - 1]; 
        let victima = sala.state.jugadores.get(idObjetivo);

        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido.");
            return false;
        }

        if (victima.equipamiento.has("crisalida")){
            client.send("alerta_personal", "El jugador seleccionado ya tiene una crisalida.");
            return false;
        }

        Utilidades.equiparCarta(sala, victima, cartaJugada, "crisalida")
        sala.reproducirSfx("sfxCrisalida")

        sala.broadcast("notificacion_turno", `🐚 ¡${jugadorQueJuega.personaje} encerró en una crisalida a ${victima.personaje}!`);
        sala.ejecutarAnimacionCarta(client, cartaJugada)

        jugadorQueJuega.mano.splice(indiceCarta, 1);
        sala.agregarAlDescarte(cartaJugada);
        return true; 
    }
}

export class EfectoDano implements IEfectoCarta {
    ejecutar(sala: any, client: any, atacante: any, cartaJugada: any, indiceCarta: number, parametros: string[], gestorPersonajes: any): boolean {
        // 1. Identificamos al objetivo
        let idObjetivo = parametros[parametros.length - 1];
        let victima = sala.state.jugadores.get(idObjetivo);

        // Validación básica de supervivencia
        if (!victima || !victima.estaVivo) {
            client.send("alerta_personal", "Objetivo inválido o ya está eliminado.");
            return false;
        }

        // 2. Comprobación del límite de disparos por turno
        let pasivaAtacante = gestorPersonajes.obtener(atacante.personaje);
        let puedeDispararExtra = pasivaAtacante && pasivaAtacante.puedeDispararBang ? pasivaAtacante.puedeDispararBang(sala, atacante, victima) : false;

        let statsArma = Utilidades.getDatosArma(atacante);

        if (atacante.yaDisparo && !puedeDispararExtra && 
            statsArma.nombre !== "Pistola de Tracer" && statsArma.nombre !== "Pistola de Tracer Pro" && 
            statsArma.nombre !== "Tirachinas" && statsArma.nombre !== "Tirachinas mestro" && 
            statsArma.nombre !== "Espada galactica" && statsArma.nombre !== "Espada galactica Pro") {
            
            client.send("alerta_personal", "Ya disparaste un BANG! en este turno, no podés disparar dos BANG! por turno.");
            return false; 
        }

        // 3. Cálculo de las sillas y distancia física base
        let vivos: string[] = [];
        sala.state.ordenSillasFisicas.forEach((id: string) => { 
            let j = sala.state.jugadores.get(id);
            if (j && j.estaVivo) vivos.push(id); 
        });

        let idxAtacante = vivos.indexOf(client.sessionId);
        let idxVictima = vivos.indexOf(idObjetivo);
        let n = vivos.length;
        let diferencia = Math.abs(idxAtacante - idxVictima);
        let distanciaFisica = Math.min(diferencia, n - diferencia);
        let distancia = distanciaFisica;

        // Validación de alcance mínimo
        if (distanciaFisica < statsArma.alcanceMinimo) {
            client.send("alerta_personal", `El arma está diseñada para largo alcance. No podés dispararle a alguien tan cerca.`);
            return false;
        }

        // 4. Modificadores de distancia (Objetos, Cartas y Pasivas)
        let alcanceMaximo = statsArma.alcance;

        if (cartaJugada && cartaJugada.tipoDeUso === "objetivoVecino") {
            alcanceMaximo = 1;
        } else {
            let miraAtacante = atacante.equipamiento.get("mira");
            if (miraAtacante) distancia -= (miraAtacante.nombre === "Monoaldea Pro" ? 2 : 1);

            let mustangVictima = victima.equipamiento.get("mustang");
            if (mustangVictima) distancia += (mustangVictima.nombre === "Caballo Pro" ? 2 : 1);

            if (victima.number.has("jetpackCat")){
                distancia += victima.number.get("jetpackCat");
            }

            if (atacante.modificarAlcance) distancia -= atacante.modificarAlcance;
            if (victima.modificarDistancia) distancia += victima.modificarDistancia;
            if (atacante.number.get("pedroCrecimiento")) distancia -= atacante.number.get("pedroCrecimiento");

            if (atacante && atacante.string.get("angryBird") == "chuck"){
                distancia -= 3;
            }

            if (atacante && atacante.string.get("angryBird") == "blue"){
                distancia -= 2;
            }

            const i: number = Utilidades.contarCartasPorNombre(atacante, "Anillo de iridio");
            if (i > 0){
                distancia -= 3 * i;
            }
        }

        // Pasivas de distancia de los personajes
        if (pasivaAtacante && pasivaAtacante.modificarDistancia) {
            distancia = pasivaAtacante.modificarDistancia(sala, atacante, victima, distancia);
        }

        let pasivaVictimaDistancia = gestorPersonajes.obtener(victima.personaje);
        if (pasivaVictimaDistancia && pasivaVictimaDistancia.modificarDistancia) {
            distancia = pasivaVictimaDistancia.modificarDistancia(sala, atacante, victima, distancia);
        }
        
        // Validación de alcance máximo
        if (distancia > alcanceMaximo) {
            client.send("alerta_personal", `${victima.nombre} está fuera de tu alcance.`);
            return false; 
        }
        
        // 5. Ejecución del ataque
        if (cartaJugada && (cartaJugada.efecto === "dano_1" || cartaJugada.efecto === "dano_2" || cartaJugada.efecto === "dano_3")) {
            atacante.yaDisparo = true;
            
            // Retiramos la carta de la mano y la mandamos al descarte
            atacante.mano.splice(indiceCarta, 1);
            sala.ejecutarAnimacionCarta(client, cartaJugada);
            sala.agregarAlDescarte(cartaJugada);
            
            // Preparación del estado de la sala
            sala.state.jugadorEnPeligro = idObjetivo;
            sala.state.atacanteActual = client.sessionId;
            
            // Cálculo del daño
            let danoBase = 0;
            if (cartaJugada.efecto === "dano_1"){
                danoBase = 1;
            } else if (cartaJugada.efecto === "dano_2"){
                danoBase = 2;
            } else if (cartaJugada.efecto === "dano_3"){
                danoBase = 3;
            }

            let bonusDano = (cartaJugada.efecto === "dano_1") ? statsArma.danoExtra : 0;
            
            sala.state.danoPendiente = danoBase + bonusDano; 
            sala.causaDePeligro = "BANG";
            sala.state.usosBarril = 0;
            
            sala.broadcast("notificacion_turno", `⚠️ ¡${atacante.nombre} le atacó a ${victima.nombre}! ¿Tendrá un ¡Fallo!?`);
        
            sala.ejecutarPasivasAlJugarCarta(atacante, cartaJugada);

            // 6. ¡LA MAGIA DEL NUEVO SISTEMA! 
            // Invocamos la interacción universal que creaste en MyRoom.ts
            sala.enviarInteraccionBang(idObjetivo);
            
            return true;
        }

        return false;
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
        "valerieLadrona": new EfectoValerieLadrona(),
        "lanzaguisantes": new EfectoLanzaguisantes(),
        "calabaza": new EfectoCalabaza(),
        "plantorcha": new EfectoPlantorcha(),
        "imitadora": new EfectoImitadora(),
        "trebolador": new EfectoTrebolador(),
        "petaseta": new EfectoPetaseta(),
        "humoseta": new EfectoHumoseta(),
        "granDesaparicion": new EfectoGranDesaparicion(),
        "hordaBloons": new EfectoHordaBloons(),
        "duelo": new EfectoDuelo(),
        "patadaKillo": new EfectoPatadaKillo(),
        "macetaKillo": new EfectoMacetaKillo(),
        "nutriente": new EfectoNutriente(),
        "domoProtector": new EfectoDomoProtector(),
        "secador": new EfectoSecador(),
        "forzar": new EfectoForzarEnemigo(),
        "robarEnemigo": new EfectoRobarEnemigo(),
        "tiendaPierre": new EfectoTiendaPierre(),
        "ensalada": new EfectoEnsalada(),
        "espantacocoroch": new EfectoEspantacocoroch(),
        "warpTotem": new EfectoWarpTotem(),
        "bomba": new EfectoBomba(),
        "megaBomba": new EfectoMegaBomba(),
        "festivalDelHuevo": new EfectoFestivalDelHuevo(),
        "tormenta": new EfectoTormenta(),
        "esquirlaPrismatica": new EfectoEsquirlaPrismatica(),
        "espirituAlegre": new EfectoEspirituAlegre(),
        "espirituEnojado": new EfectoEspirituEnojado(),
        "cafe": new EfectoCafe(),
        "girasol": new EfectoGirasol(),
        "crisalida": new EfectoCrisalida(),
        "dano": new EfectoDano(),
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