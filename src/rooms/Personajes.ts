// Personajes.ts

import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { Carta } from "./schema/MyRoomState.js";

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface IPersonaje {
    nombre: string;
    habilidad: string;
    habilidadEnCatalan: string;
    vidasBase: number;
    // Tupla opcional: [Archivo de sonido, silenciar música]
    sfxMuerte?: [string, boolean];
    // actualizacion WALENCIA
    // Hooks con esteroides (Ganchos a eventos del juego)
    // causa puede ser: "BANG", "INDIOS", "TIRATACHUELA"
    onRecibirDano?(sala: any, victima: any, atacante: any, causa: string, cantidad: number): void;

    onDescartarCarta?(sala: any, jugador: any, cartaDescartada: any, motivo: string): void;
    
    onPasarTurno?(sala: any, jugador: any): void;
    
    puedeDispararBang?(sala: any, atacante: any, victima: any): boolean;
    
    modificarDistancia?(sala: any, observador: any, objetivo: any, distanciaBase: number): number;

    modificarSuerteRuletaNormal?(): number

    modificarSuerteRuletaDinamita?(): number

    modificarRepartirCarta?(causa: string): number

    modificarCuraBotiquin?(): number

    modificarCartasEnManoAlPasarTurno?(): number

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugadorConPasiva: any): void

    onRecibirCuracion?(jugador: any): void

    onJugarCarta?(sala: any, jugador: any, cartaJugada: any): void;

    modificarSuerteGlobalBarril?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number

    modificarSuerteGlobalPrision?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number

    modificarSuerteGlobalDinamita?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number

    modificarSuerteGlobalPapapum?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number
}

// 2. LAS CLASES DE PERSONAJES

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nCada vez que pierde 1 vida, roba inmediatamente 1 carta.";
    habilidadEnCatalan: string = "Recàrrega a la recambra:\nCada vegada que perd 1 vida, roba immediatament 1 carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteCasiddy", false];

    // Fijate cómo recibimos al atacante, por si mañana querés hacer que le robe a él
    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number) {
        if (victima.vidas > 0) {
            sala.repartirCartas(victima, 1, "pasiva");
            sala.broadcast("notificacion_turno", `🤠 Cole Casiddy robó 1 carta tras recibir daño por ${causa}.`);
            
            // Ejemplo a futuro (comentado): 
            // Si quisieras robarle al atacante directamente:
            // if (atacante && atacante.mano.length > 0) { ... lógica de robo ... }
        }
    }
}

export class Berry implements IPersonaje {
    nombre = "Berry";
    habilidad = "Cartas curativas:\nEn su turno, cada 2 cartas que descarta, recupera 1 de vida y roba una carta.";
    habilidadEnCatalan: string = "Cartes curatives:\nEn el seu torn, per cada 2 cartes que descarta, recupera 1 vida i roba 1 carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteBerry", false];

    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string) {
        // Solo cuenta si lo hace en su turno voluntariamente (no si le tiran un Cocoroch)
        if (motivo !== "VOLUNTARIO") return;

        if (!jugador.contadorDescartes) jugador.contadorDescartes = 0;
        
        jugador.contadorDescartes++;
        if (jugador.contadorDescartes >= 2) {
            jugador.contadorDescartes = 0;
            sala.repartirCartas(jugador, 1, "pasiva")
            let texto: string = `🍓 Berry roba una carta`
            if (jugador.vidas < jugador.vidasMaximas) {
                jugador.vidas++;
                texto += ` y se cura 1 vida`
            }
            texto += ` por su pasiva.`
            sala.broadcast("notificacion_turno", texto);
        }
    }

    onPasarTurno(_sala: any, jugador: any) {
        jugador.contadorDescartes = 0; 
    }
}

export class Maton implements IPersonaje {
    nombre = "Maton";
    habilidad = "Seisei koi kiki:\nPuede jugar cualquier cantidad de BANG! durante su turno.";
    habilidadEnCatalan: string = "Seisei koi kiki:\nPot jugar qualsevol quantitat de BANG! durant el seu torn."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMaton", false];

    puedeDispararBang(_sala: any, _atacante: any, _victima: any): boolean {
        return true; 
    }
}

export class Mandy implements IPersonaje {
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -2.";
    habilidadEnCatalan: string = "Concentració:\nConsidera tots els altres jugadors a distància -2."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMandy", false];

    modificarDistancia(_sala: any, _observador: any, _objetivo: any, distanciaBase: number): number {
        return Math.max(0, distanciaBase - 2);
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl pasar el turno, si no tiene cartas en la mano, recupera 1 vida y roba 2 cartas.";
    habilidadEnCatalan: string = "Els tralaleritos diuen tralalà:\nEn passar el torn, si no té cartes a la mà, recupera 1 punt de vida i roba 2 cartes.."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTralalero", true];

    onPasarTurno(sala: any, jugador: any) {
        if (jugador.mano.length === 0) {

            let curacion: number = 0
            if (jugador.vidas < jugador.vidasMaximas){
                jugador.vidas++;
                curacion++
            }

            sala.repartirCartas(jugador, 2, "pasiva")

            sala.broadcast("notificacion_turno", `🎵 Tralalero recuperó ${curacion} vida y robó 2 cartas gracias a su pasiva.`);
        }
    }
}

export class Darryl implements IPersonaje {
    nombre = "Darryl";
    habilidad = "Darryl el Barryl:\nTiene el efecto de la carta Barril siempre activo, si se equipa un barril, es como si tuviera dos.";
    habilidadEnCatalan: string = "Darryl el Barryl:\nTé l'efecte de la carta Barril sempre actiu; si s'equipa un barril, és com si en tingués dos."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDarryl", false];
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores lo consideran a distancia +1.";
    habilidadEnCatalan: string = "Gat a les altures:\nEls altres jugadors el consideren a distància +1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteJetpackCat", false];

    modificarDistancia(sala: any, observador: any, objetivo: any, distanciaBase: number): number {
        // Si alguien lo está mirando a él para atacarlo, le sumamos 1 a la distancia
        if (objetivo.personaje === this.nombre) {
            return distanciaBase + 1;
        }
        return distanciaBase;
    }
}

export class KayFaraday implements IPersonaje {
    nombre = "Kay Faraday";
    habilidad = "La ladrona:\nCada vez que pierde una vida por un jugador, roba una carta al azar de la mano de ese jugador.";
    habilidadEnCatalan: string = "La lladre:\nCada vegada que perd una vida a causa d'un jugador, roba una carta a l'atzar de la mà d'aquest jugador."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKay", true];

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number) {
        if (atacante && atacante.mano.length > 0) {
            let indiceAleatorio = Math.floor(Math.random() * atacante.mano.length);
            let cartaRobada = atacante.mano.splice(indiceAleatorio, 1)[0];
            victima.mano.push(cartaRobada);
            
            sala.broadcast("notificacion_turno", `🎭 ¡Kay Faraday perdió vida pero le robó una carta ${cartaRobada.nombre} a ${atacante.nombre}!`);
        }
    }
}

export class Chester implements IPersonaje {
    nombre = "Chester";
    habilidad = "Ruleta trucada:\nTiene mucha mas suerte cuando usa la ruleta.";
    habilidadEnCatalan: string = "Ruleta trucada:\nTé molta més sort quan utilitza la ruleta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteChester", false];

    modificarSuerteRuletaNormal(): number {
        return 4
    }

    modificarSuerteRuletaDinamita(): number {
        return 1
    }
}

export class Frank implements IPersonaje {
    nombre = "Frank";
    habilidad = "Esponja:\nTiene +1 de vida.";
    habilidadEnCatalan: string = "Esponja:\nTé +1 de vida."
    vidasBase = 5;
    sfxMuerte: [string, boolean] = ["muerteFrank", true];
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas, roba una extra, pero para pasar el turno, sus cartas en mano deben ser su salud - 1.";
    habilidadEnCatalan: string = "Baralla de cartes:\nCada vegada que roba cartes, en roba una d'extra, però per passar el torn, les cartes que té a la mà han de ser la seva vida - 1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTrucy", false];

    modificarRepartirCarta(causa: string): number {
        return 1
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1
    }
}

export class Pam implements IPersonaje {
    nombre = "Pam";
    habilidad = "Beso materno:\nCuando usa un botiquin se cura 2 en vez de 1.";
    habilidadEnCatalan: string = "Beso matern:\nQuan utilitza un botiquí, es cura 2 en comptes d'1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePam", false];

    modificarCuraBotiquin(): number {
        return 1
    }
}

export class HongoUp implements IPersonaje {
    nombre = "Hongo 1Up";
    habilidad = "Descomposicion:\nCuando otro personaje muere, se cura 2 de vida.";
    habilidadEnCatalan: string = "Descomposició:\nQuan un altre personatge mor, es cura 2 punts de vida."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteHongoUp", true];

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.broadcast("notificacion_turno", `🍄 No puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
            return
        }

        let curacion: number = 0
        if (jugador.vidas < jugador.vidasMaximas){
            jugador.vidas++
            curacion++
        }
        if (jugador.vidas < jugador.vidasMaximas){
            jugador.vidas++
            curacion++
        }
        if (curacion > 0){
            sala.broadcast("notificacion_turno", `🍄 Hongo 1Up se curó ${curacion}.`);
        }
    }
}

export class Hongo implements IPersonaje {
    nombre = "Hongo";
    habilidad = "NEEDAMUSHROOM:\nCuando otro personaje muere, roba 2 cartas.";
    habilidadEnCatalan: string = "NEEDAMUSHROOM:\nQuan un altre personatge mor, roba 2 cartes."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteHongo", false];

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.broadcast("notificacion_turno", `🍄 No puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
            return
        }

        const cartas: number = 2
        sala.repartirCartas(jugador, cartas, "pasiva");
        sala.broadcast("notificacion_turno", `🍄 Hongo robó ${cartas} cartas por su pasiva.`);
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba gordo";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO, estando GORDO, cuando es su turno roba 3 en vez de 2, pero la carta Fallo no sirve, estando FLACO, los botiquines curan 2 y al recibir daño roba una carta.";
    habilidadEnCatalan: string = "Canvi de massa:\nSi té 3 o més vides, es torna GROS; si no, es torna PRIM. Estant GROS, quan és el seu torn roba 3 cartes en comptes de 2, però la carta Fallo no serveix. Estant PRIM, els botiquins curen 2 i, quan rep dany, roba una carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMikotoba", true];

    onRecibirCuracion(jugador: any): void {
        this.actualizarNombre(jugador)
    }

    modificarRepartirCarta(causa: string): number {
        if (causa !== "turno"){
            return 0
        }

        if (this.nombre == "Mikotoba gordo"){
            return 1
        } else {
            return 0
        }
    }

    modificarCuraBotiquin(): number {
        if (this.nombre == "Mikotoba gordo"){
            return 0
        } else {
            return 1
        }
    }

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number) {
        this.actualizarNombre(victima)
        if (this.nombre == "Mikotoba gordo"){
            return
        } else {
            if (victima.vidas > 0) {
                sala.repartirCartas(victima, 1, "pasiva");
                sala.broadcast("notificacion_turno", `Mikotoba robó 1 carta tras recibir daño por ${causa}.`);
            }
        }
    }

    private actualizarNombre(jugador: any): void {
        if (jugador.vidas >= 3){
            this.nombre = "Mikotoba gordo"
        } else {
            this.nombre = "Mikotoba flaco"
        }
        jugador.personaje = this.nombre
    }
}

export class Lesly implements IPersonaje {
    nombre = "Lesly";
    habilidad = "SAPA:\nComo una buena sapa lesly puede sapear la carta de mas a la izquierda de la mano de cada rival en todo momento.";
    habilidadEnCatalan: string = "SAPA:\nCom una bona Sapa Lesly, pot sapear la carta de més a l'esquerra de la mà de cada rival en tot moment."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLesly", false];
}

export class Domino implements IPersonaje {
    nombre = "Domino";
    habilidad = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan.";
    habilidadEnCatalan: string = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDominub", false];

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number): void {
        const numero: number = Math.floor(Math.random() * 3);
        if (numero === 0){
            const dominoCurativo = new Carta();
            dominoCurativo.id = `Domino_${1}`;
            dominoCurativo.nombre = "Domino";
            dominoCurativo.descripcion = "?????";
            dominoCurativo.descripcionEnCatalan = "?????"
            dominoCurativo.tipoDeUso = "instantanea";
            dominoCurativo.efecto = "curar_1";
            dominoCurativo.esConjurada = true
            victima.mano.push(dominoCurativo)
        } else if (numero === 1){
            const dominoRoba = new Carta();
            dominoRoba.id = `Domino_${2}`;
            dominoRoba.nombre = "Domino";
            dominoRoba.descripcion = "?????";
            dominoRoba.descripcionEnCatalan = "?????"
            dominoRoba.tipoDeUso = "instantanea";
            dominoRoba.efecto = "robar_1";
            dominoRoba.esConjurada = true
            victima.mano.push(dominoRoba)
        } else if (numero === 2){
            const dominoArma = new Carta();
            dominoArma.id = `Domino_${3}`;
            dominoArma.nombre = "Domino";
            dominoArma.descripcion = "?????";
            dominoArma.descripcionEnCatalan = "?????"
            dominoArma.tipoDeUso = "equipamiento";
            dominoArma.efecto = `equipar_arma_${3}`;
            dominoArma.esConjurada = true
            victima.mano.push(dominoArma)
        }
        
    }
}

export class Tilink implements IPersonaje {
    nombre = "Tilink";
    habilidad = "Clones de tilinks falsos:\nAl descartar una carta no clonada, una carta original de tu mano se descarta y te otorga 2 clones de la misma (Máx. 3 por turno). Para pasar el turno debe tener su salud -1 cartas en mano.";
    habilidadEnCatalan: string = "Clons de tilinks falsos:\nEn descartar una carta no clonada, descartas una carta original de tu mano y obtienes 2 clones de la misma (máx. 3 por turno). Para pasar el turno, debes tener tantas cartas en mano como tu salud -1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTilink", false];


    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string) {
        // Solo cuenta si lo hace en su turno voluntariamente (no si le tiran un Cocoroch)
        if (motivo !== "VOLUNTARIO") return;
        
        // 1. Inicializamos el contador del turno si no existe
        if (!jugador.clonesCreadosEsteTurno) {
            jugador.clonesCreadosEsteTurno = 0;
        }

        // 2. Freno de seguridad: Límite de 3 por turno
        if (jugador.clonesCreadosEsteTurno >= 3) {
            return;
        }
        
        // 3. Verificamos que la carta descartada inicialmente sea original
        if (!_cartaDescartada.esConjurada) {
            
            // 4. Filtramos la mano para quedarnos solo con las cartas que NO son clones
            let cartasOriginalesEnMano = jugador.mano.filter((c: any) => !c.esConjurada);
            
            // 5. Si tiene al menos una carta original para clonar...
            if (cartasOriginalesEnMano.length > 0) {
                
                // Elegimos una al azar
                let indiceAleatorio = Math.floor(Math.random() * cartasOriginalesEnMano.length);
                let cartaAClonar = cartasOriginalesEnMano[indiceAleatorio];
                
                // --- NUEVO SISTEMA ANTI-EXPLOIT ---
                // Eliminamos la carta original de la mano y la mandamos al descarte real
                let indiceEnMano = jugador.mano.findIndex((c: any) => c.id === cartaAClonar.id);
                if (indiceEnMano !== -1) {
                    jugador.mano.splice(indiceEnMano, 1);
                    sala.agregarAlDescarte(cartaAClonar, jugador); 
                }
                
                // Creamos EXACTAMENTE 2 CLONES para reemplazarla
                for (let i = 0; i < 2; i++) {
                    let clon = new Carta();
                    
                    // ID único por cada clon generado
                    clon.id = `clon_${i}_${cartaAClonar.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    
                    clon.nombre = cartaAClonar.nombre;
                    clon.descripcion = cartaAClonar.descripcion;
                    clon.descripcionEnCatalan = cartaAClonar.descripcionEnCatalan;
                    clon.tipoDeUso = cartaAClonar.tipoDeUso;
                    clon.efecto = cartaAClonar.efecto;
                    
                    // Al marcarlos como conjuradas, nunca más podrán ser seleccionados por este filtro
                    clon.esConjurada = true; 
                    
                    jugador.mano.push(clon);
                }
                
                jugador.clonesCreadosEsteTurno++;
                
                // Actualizamos la notificación para que la mesa entienda el sacrificio
                sala.broadcast("notificacion_turno", `🪞 ¡Tilink sacrificó ${cartaAClonar.nombre} original y fabricó 2 clones! (${jugador.clonesCreadosEsteTurno}/3)`);
                sala.broadcast("sfx", "tilinkPasiva")
            }
        }
    }

    onPasarTurno(sala: any, jugador: any) {
        jugador.clonesCreadosEsteTurno = 0;
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Flowery implements IPersonaje {
    nombre = "Flowery";
    habilidad = "Tu padre es mi mejor amigo:\nPor cada carta jugada crece aleatoriamente entre 0.25 y 0.30 metros. Al descartar decrece entre 0.20 y 0.25 metros. Al llegar a 3.00, inflige 1 de daño a todos de forma inesquivable, los mete a la cárcel (menos al Sheriff), y luego roba 3 cartas del mazo.";
    habilidadEnCatalan = "El teu pare és el meu millor amic:\nPer cada carta jugada creix aleatòriament entre 0,25 i 0,30 metres. En descartar decreix entre 0,20 i 0,25 metres. En arribar a 3,00, infligeix 1 de dany a tots de forma inesquivable, els posa a la presó (excepte al Sheriff), i després roba 3 cartes de la baralla.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFlowery", true];

    onJugarCarta(sala: any, jugador: any, cartaJugada: any) {
        // Genera un número aleatorio entre 25 y 30, luego lo divide por 100
        let crecimiento = (Math.floor(Math.random() * 6) + 25) / 100;
        jugador.alturaFlowery += crecimiento;
        
        this.evaluarCrecimiento(sala, jugador);
    }

    onDescartarCarta(sala: any, jugador: any, cartaDescartada: any, motivo: string) {
        if (jugador.alturaFlowery > 0){
            sala.broadcast("sfx", "floweryDecrece");
        }
        
        // Genera un número aleatorio entre 20 y 25, luego lo divide por 100
        let decrecimiento = (Math.floor(Math.random() * 6) + 20) / 100;
        jugador.alturaFlowery -= decrecimiento;
        
        if (jugador.alturaFlowery < 0) {
            jugador.alturaFlowery = 0;
        }
    }

    private evaluarCrecimiento(sala: any, jugador: any) {
        if (jugador.alturaFlowery >= 3) { // 3
            sala.broadcast("notificacion_turno", `🌻 ¡FLOWERY HACE SU ATAQUE ESPECIAL!`);

            sala.state.jugadores.forEach((v: any, sessionId: string) => {
                if (v.estaVivo && v !== jugador) {
                    
                    v.vidas--;
                    let pasivaVictima = sala.gestorPersonajes.obtener(v.personaje);
                    if (pasivaVictima && pasivaVictima.onRecibirDano) {
                        pasivaVictima.onRecibirDano(sala, v, jugador, "FLOWERY", 1); 
                    }
                    
                    sala.evaluarMuerte(v, jugador);

                    // YA NO ROBA CARTAS DEL RIVAL (Eliminado)

                    if (v.estaVivo && v.rol !== "Sheriff" && !v.estaEnPrision) {
                        const prision = new Carta();
                        
                        // EL PARCHE ANTICRASHEO: Agregamos el sessionId al final para garantizar unicidad absoluta
                        prision.id = `prision_flowery_${Date.now()}_${Math.floor(Math.random() * 100000)}_${sessionId}`;
                        
                        prision.nombre = "Prisión";
                        prision.descripcion = "Equipala a otro jugador (menos al Sheriff). Tiene 25% de salir de la carcel o perder el turno.";
                        prision.descripcionEnCatalan = "Equipa-la a un altre jugador (excepte el Sheriff). Té un 25 % de probabilitats de sortir de la presó o de perdre el torn.";
                        prision.tipoDeUso = "objetivoGlobal"; 
                        prision.efecto = "prision";
                        prision.esConjurada = true;

                        v.estaEnPrision = true;
                        v.cartaPrision = prision;
                    }
                }
            });

            // YA NO SE CURA NI AUMENTA SALUD MÁXIMA (Eliminado)

            // AHORA ROBA 3 CARTAS DEL MAZO
            sala.repartirCartas(jugador, 3, "pasiva");
            
            sala.broadcast("notificacion_turno", `🌻 Flowery infligió daño a todos, enredó a los rivales en Prisión y robó 3 cartas del mazo.`);

            const numero: number = Math.floor(Math.random() * 2);
            const sfx: string = "floweryHabilidad" + numero;
            sala.broadcast("sfx", sfx);

            jugador.alturaFlowery = 0;
        } else {
            // jugó una carta pero aun no llegó al final
            sala.broadcast("sfx", "floweryCrece");
        }
    }
}

export class Leon implements IPersonaje {
    nombre = "Leon";
    habilidad = "Noooo leooooon:\nOculta su salud, cantidad de cartas y equipamiento a los demas.";
    habilidadEnCatalan: string = "Noooo leooooon:\nOculta la seva salut, el nombre de cartes i l’equipament als altres."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLeon", true];
}

export class Kazuma implements IPersonaje {
    nombre = "Kazuma";
    habilidad = "Renacer del Héroe:\nSi no es Sheriff, al morir revive en 2 o 3 rondas con 1 vida y 3 cartas. Si es Sheriff, al recibir daño tiene 50% de crear la espada Karuma (2 de daño a distancia 1).";
    habilidadEnCatalan = "Renaixement de l'Heroi:\nSi no és Sheriff, en morir reviu al cap de 2 o 3 rondes amb 1 vida i 3 cartes. Si és Sheriff, en rebre dany té un 50% de crear l espasa Karuma (2 de dany a distància 1).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["kazumaMuere", true];

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number) {
        if (victima.rol === "Sheriff" && victima.vidas > 0) {
            // 50% de probabilidad
            if (Math.random() < 0.5) {
                const kamura = new Carta();
                kamura.id = `karuma_${Date.now()}_${Math.floor(Math.random() * 100)}`;
                kamura.nombre = "Karuma";
                kamura.descripcion = "Funciona como un BANG! pero inflige 2 de daño a distancia 1.";
                kamura.descripcionEnCatalan = "Funciona com un BANG! però infligeix 2 de dany a distància 1.";
                kamura.tipoDeUso = "objetivo1";
                kamura.efecto = "dano_2";
                kamura.esConjurada = true;
                
                victima.mano.push(kamura);
                sala.broadcast("notificacion_turno", `🗡️ ¡Kazuma ha conjurado su espada Karuma!`);
            }
        }
    }
}

export class Leah implements IPersonaje {
    nombre = "Leah";
    habilidad = "Artesana:\nDos veces por turno, al descartar una carta, robas 1 carta inmediatamente.";
    habilidadEnCatalan = "Artesana:\nDues vegades per torn, en descartar una carta, robes 1 carta immediatament.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];

    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string) {
        if (motivo !== "VOLUNTARIO") return;

        if (!jugador.usosArtesanaEsteTurno) {
            jugador.usosArtesanaEsteTurno = 0;
        }
        
        if (jugador.usosArtesanaEsteTurno < 2) {
            jugador.usosArtesanaEsteTurno++;
            
            sala.repartirCartas(jugador, 1, "pasiva");
            sala.broadcast("notificacion_turno", `🛠️ Leah descartó una carta y su pasiva de Artesana le otorgó 1 carta nueva (${jugador.usosArtesanaEsteTurno}/2).`);
        }
    }

    onPasarTurno(_sala: any, jugador: any) {
        jugador.usosArtesanaEsteTurno = 0; 
    }
}

export class Robin implements IPersonaje {
    nombre = "Robin";
    habilidad = "Carpintera:\nAl descartar una carta en su turno, mejora un equipamiento aleatorio. Las armas evolucionan y el resto se vuelve versión 'Pro'.";
    habilidadEnCatalan = "Fustera:\nEn descartar una carta en el seu torn, millora un equipament aleatori. Les armes evolucionen i la resta es torna versió 'Pro'.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];

    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;

        let opcionesDeMejora: string[] = [];

        if (jugador.tieneMustang && !jugador.tieneMustangPro) opcionesDeMejora.push("Caballo");
        if (jugador.tieneMira && !jugador.tieneMiraPro) opcionesDeMejora.push("Mira");
        if (jugador.tieneBarril && !jugador.tieneBarrilPro) opcionesDeMejora.push("Barril");
        
        let siguienteArma = this.obtenerSiguienteArma(jugador.nombreArma);
        if (siguienteArma) opcionesDeMejora.push("Arma");

        if (opcionesDeMejora.length === 0) {
            return;
        }

        let eleccion = opcionesDeMejora[Math.floor(Math.random() * opcionesDeMejora.length)];
        let textoMejora = "";

        if (eleccion === "Caballo") {
            let cartaMejorada = CatalogoCartasEspeciales.crearCaballoPro();
            if (jugador.cartaMustang) sala.agregarAlDescarte(jugador.cartaMustang);
            
            jugador.tieneMustangPro = true;
            jugador.cartaMustang = cartaMejorada;
            textoMejora = "su Caballo";
        } 
        else if (eleccion === "Mira") {
            let cartaMejorada = CatalogoCartasEspeciales.crearMonoaldeaPro();
            if (jugador.cartaMira) sala.agregarAlDescarte(jugador.cartaMira);
            
            jugador.tieneMiraPro = true;
            jugador.cartaMira = cartaMejorada;
            textoMejora = "su Monoaldea";
        } 
        else if (eleccion === "Barril") {
            let cartaMejorada = CatalogoCartasEspeciales.crearBarrilPro();
            if (jugador.cartaBarril) sala.agregarAlDescarte(jugador.cartaBarril);
            
            jugador.tieneBarrilPro = true;
            jugador.cartaBarril = cartaMejorada;
            textoMejora = "su Barril";
        } 
        else if (eleccion === "Arma") {
            let cartaArmaNueva = CatalogoCartasEspeciales.crearArma(siguienteArma.nombre, siguienteArma.alcance);
            if (jugador.cartaArma) sala.agregarAlDescarte(jugador.cartaArma); 

            jugador.cartaArma = cartaArmaNueva;
            jugador.nombreArma = siguienteArma.nombre;
            jugador.alcanceArma = siguienteArma.alcance;
            textoMejora = `su arma a ${siguienteArma.nombre}`;
        }

        sala.broadcast("notificacion_turno", `🔨 ¡Robin descartó una carta y mejoró ${textoMejora}!`);
        sala.broadcast("sfx", "robinMejora"); 
    }

    private obtenerSiguienteArma(armaActual: string): any {
        const secuencia = [
            { nombre: "Colt .45", alcance: 1 },
            { nombre: "Pistola de Shion", alcance: 2 },
            { nombre: "Revolver de Casiddy", alcance: 3 },
            { nombre: "Rifle de Ashe", alcance: 4 },
            { nombre: "Francotirador", alcance: 5 },
            //{ nombre: "Rifle de Plasma", alcance: 6 } 
        ];

        let index = secuencia.findIndex(a => a.nombre === armaActual);
        if (index !== -1 && index < secuencia.length - 1) {
            return secuencia[index + 1];
        }
        return null; 
    }
}

export class Luciergana implements IPersonaje {
    
    nombre = "Luciergana";
    habilidad = "Reflejo:\nAl sufrir daño, empieza a brillar, mientras brilla, si sufre daño no le afecta y devuelve el daño al atacante, luego se apaga, al final de su turno se apaga, tiene 1 vida menos.";
    habilidadEnCatalan = "Reflex:\nEn rebre dany, comença a brillar. Mentre brilla, el dany no l afecta i el retorna a l atacant. Després s apaga. Al final del seu torn, s apaga, i perds 1 vida.";
    vidasBase = 3;

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string, cantidad: number){
        if (victima.lucierganaPrendida){
            victima.lucierganaPrendida = false
            victima.spriteAvatarOpcional = ""
            victima.vidas += cantidad
            if (victima.vidas > victima.vidasMaximas){
                victima.vidas = victima.vidasMaximas
            }
            if (atacante){
                sala.broadcast("notificacion_turno", `🐝💡 La Luciergana le refleja ${cantidad} de daño a ${atacante.nombre}`)
                atacante.vidas -= cantidad
                let pasivaVictima = sala.gestorPersonajes.obtener(atacante.personaje);
                if (pasivaVictima && pasivaVictima.onRecibirDano) {
                    pasivaVictima.onRecibirDano(sala, atacante, victima, "LUCIERGANA", cantidad); 
                }
                
                sala.evaluarMuerte(atacante, victima);
            } else {
                sala.broadcast("notificacion_turno", `🐝💡 La luciergana absorbe ${cantidad} de daño`)
            }
        } else {
            victima.lucierganaPrendida = true
            victima.spriteAvatarOpcional = "Luciergana prendida"
        }
    }

    onPasarTurno(sala: any, jugador: any): void {
        if (jugador.lucierganaPrendida){
            jugador.lucierganaPrendida = false
            jugador.spriteAvatarOpcional = ""
        }
    }
}

export class Haley implements IPersonaje {
    nombre = "Haley";
    habilidad = "Fuera de acá, pobretón:\nTus BANG! tienen alcance infinito y no tienen límite de usos si el objetivo es el jugador (o los jugadores) con menos cartas en la mano (sin contarte a vos).";
    habilidadEnCatalan = "Fora d aquí, pobre:\nEls teus BANG! tenen abast infinit i no tenen límit d'usos si l'objectiu és el jugador (o els jugadors) amb menys cartes a la mà (sense comptar-te a tu).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];

    // Función auxiliar secreta de Haley para escanear la mesa
    private esElDeMenosCartas(sala: any, yo: any, victima: any): boolean {
        let minCartas = 999;
        
        // 1. Buscamos el número mínimo de cartas entre los vivos (excluyéndola a ella)
        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j !== yo) {
                if (j.mano.length < minCartas) {
                    minCartas = j.mano.length;
                }
            }
        });

        // 2. Si la víctima a la que intenta atacar tiene ese número mínimo, autorizamos
        return victima.mano.length === minCartas;
    }

    puedeDispararBang(sala: any, atacante: any, victima: any): boolean {
        // Si la víctima es la que menos cartas tiene, ignora la regla de "1 Bang por turno"
        return this.esElDeMenosCartas(sala, atacante, victima);
    }

    modificarDistancia(sala: any, observador: any, objetivo: any, distanciaBase: number): number {
        // Aseguramos que Haley sea la que apunta (observador) y no la víctima
        if (observador.personaje === this.nombre) {
            // Si el objetivo es el que menos cartas tiene, le ponemos distancia 0 (infinito)
            if (this.esElDeMenosCartas(sala, observador, objetivo)) {
                return 0; 
            }
        }
        
        // Si no cumple, la distancia sigue siendo la normal
        return distanciaBase;
    }
}

export class Maggey implements IPersonaje {
    nombre = "Maggey";
    habilidad = "Ay! pero que mala suerte...:\nEl resto de los jugadores tiene mas mala suerte.";
    habilidadEnCatalan = "Ai! Quina mala sort...:\nLa resta de jugadors té encara més mala sort.";
    vidasBase = 4;

    modificarSuerteGlobalBarril(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number {
        if (jugadorQueTiraLaRuleta != miJugador){
            return -1
        } else {
            return 0
        }
    }

    modificarSuerteGlobalPrision(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number {
        if (jugadorQueTiraLaRuleta != miJugador){
            return -1
        } else {
            return 0
        }
    }

    modificarSuerteGlobalDinamita(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number {
        if (jugadorQueTiraLaRuleta != miJugador){
            return -1
        } else {
            return 0
        }
    }

    modificarSuerteGlobalPapapum(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number {
        if (jugadorQueTiraLaRuleta != miJugador){
            return -1
        } else {
            return 0
        }
    }
}

// 3. EL GESTOR DE PERSONAJES
export class GestorPersonajes {
    private personajes: Record<string, IPersonaje> = {};

    constructor() {
        // this.registrar(new ColeCasiddy());
        // this.registrar(new Berry());
        // this.registrar(new Maton());
        // this.registrar(new Mandy());
        // this.registrar(new Tralalero());
        // this.registrar(new Darryl());
        // this.registrar(new JetpackCat());
        // this.registrar(new KayFaraday());
        // this.registrar(new Chester());
        // this.registrar(new Frank());
        // this.registrar(new Pam());
        // this.registrar(new Trucy());
        // this.registrar(new HongoUp());
        // this.registrar(new Hongo());
        // this.registrar(new Lesly());
        // this.registrar(new Mikotoba());
        // this.registrar(new Domino());
        // this.registrar(new Tilink());
        // this.registrar(new Flowery())
        this.registrar(new Leon())
        this.registrar(new Kazuma())
        this.registrar(new Leah())
        this.registrar(new Robin())
        this.registrar(new Luciergana())
        this.registrar(new Haley())
        this.registrar(new Maggey())
    }

    private registrar(p: IPersonaje) {
        this.personajes[p.nombre] = p;

        if (p.nombre === "Mikotoba gordo") {
            this.personajes["Mikotoba flaco"] = p;
        }
    }

    public obtener(nombre: string): IPersonaje | null {
        return this.personajes[nombre] || null;
    }

    public obtenerTodosParaRepartir(): any[] {
        // 1. Extraemos los valores, pero los pasamos por un Set para borrar duplicados
        let valoresUnicos = new Set(Object.values(this.personajes));
        
        // 2. Volvemos a convertir ese Set en un Array normal
        let lista = Array.from(valoresUnicos);
        
        // 3. Mezclamos la lista limpia
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
        return lista;
    }
}