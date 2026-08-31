// Personajes.ts

import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { IMyRoom } from "./IMyRoom.js";
import { Carta, HabilidadActiva, Jugador } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface IPersonaje {
    nombre: string;
    habilidad: string;
    habilidadEnCatalan: string;
    vidasBase: number;
    sfxMuerte?: [string, boolean, number?];
    sfxDefault?: string;

    onRecibirDano?(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void;

    onDescartarCarta?(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void;
    
    onPasarTurno?(sala: IMyRoom, jugador: Jugador): void;
    
    puedeDispararBang?(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean;
    
    modificarDistancia?(sala: any, observador: any, objetivo: any, distanciaBase: number): number;

    modificarSuerteRuletaNormal?(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] }

    modificarSuerteLocalPrision?(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] }

    modificarSuerteRuletaDinamita?(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] }

    modificarRepartirCarta?(sala: IMyRoom, jugador: Jugador, causa: string): number

    modificarCuraBotiquin?(sala: IMyRoom, jugador: Jugador): number

    modificarCartasEnManoAlPasarTurno?(sala: any, jugador: any): number

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, miJugador: any): void

    onRecibirCuracion?(sala: any, jugador: any): void

    onRecibirEscudo?(sala: any, jugador: any, cantidad: number, causa: string): void;

    onJugarCarta?(sala: any, jugador: any, cartaJugada: any): void;

    modificarSuerteGlobalBarril?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalPrision?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalDinamita?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalPapapum?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    onIniciarPartida?(sala: any, jugador: any): void

    onFichaEspecialSeleccionada?(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string): void;

    ejecutarHabilidadActiva?(sala: any, jugador: any, client: any, idHabilidad: string): void;

    modificarPuntosAlEmbrujar?(sala: any, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number

    onSacarEmbrujoEnRuleta?(sala: any, miJugador: Jugador, tipo: string): void
}

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nAl recibir daño, roba tantas cartas como daño haya sufrido.";
    habilidadEnCatalan: string = "Recàrrega a la recambra:\nEn rebre dany, roba tantes cartes com dany hagi patit."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteCasiddy", false];
    sfxDefault= "sfxCasiddy"

    // Fijate cómo recibimos al atacante, por si mañana querés hacer que le robe a él
    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (victima.vidas > 0) {
            sala.repartirCartas(victima, cantidad, "pasiva");
            sala.agregarRegistro(`🤠 ${victima.personaje} robó ${cantidad} carta tras recibir daño por ${causa}.`);
        }
    }
}

export class Berry implements IPersonaje {
    nombre = "Berry";
    habilidad = "Cartas curativas:\nEn su turno, cada 2 cartas que descarta, recupera 1 de vida y roba una carta.";
    habilidadEnCatalan: string = "Cartes curatives:\nEn el seu torn, per cada 2 cartes que descarta, recupera 1 vida i roba 1 carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteBerry", false];
    sfxDefault = "sfxBerry"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string) {
        if (motivo !== "VOLUNTARIO") return;
        
        jugador.descartesBerry++;
        if (jugador.descartesBerry >= 2) {
            jugador.descartesBerry = 0;
            sala.repartirCartas(jugador, 1, "pasiva");
            let texto: string = `🍓 ${jugador.personaje} roba una carta`;
            
            if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                Utilidades.aplicarCuracion(sala, jugador, 1, "PASIVA", false);
                texto += ` y recibe curación`;
            }
            texto += ` por su pasiva.`;
            sala.agregarRegistro(texto);
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        jugador.descartesBerry = 0; 
    }
}

export class Maton implements IPersonaje {
    nombre = "Maton";
    habilidad = "Seisei koi kiki:\nPuede jugar cualquier cantidad de BANG! durante su turno, empieza con 1 escudo.";
    habilidadEnCatalan: string = "Seisei koi kiki:\nPot jugar qualsevol quantitat de BANG! durant el seu torn, comença amb 1 escut."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMaton", false];
    sfxDefault= "sfxMaton"
    
    onIniciarPartida(sala: any, jugador: any): void {
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva")
    }

    puedeDispararBang(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean {
        return true; 
    }
}

export class Mandy implements IPersonaje {
    // maya bug
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -2.";
    habilidadEnCatalan: string = "Concentració:\nConsidera tots els altres jugadors a distància -2."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMandy", false];
    sfxDefault = "sfxMandy"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.modificarAlcance += 2
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl pasar el turno, si no tiene cartas en la mano, recupera 1 vida y roba 2 cartas.";
    habilidadEnCatalan: string = "Els tralaleritos diuen tralalà:\nEn passar el torn, si no té cartes a la mà, recupera 1 punt de vida i roba 2 cartes.."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTralalero", true];
    sfxDefault= "sfxTralalero"

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        if (jugador.mano.length === 0) {
            let seCuro = false;
            if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                Utilidades.aplicarCuracion(sala, jugador, 1, "PASIVA", false);
                seCuro = true;
            }

            sala.repartirCartas(jugador, 2, "pasiva");
            let extra = seCuro ? "recuperó salud/escudo y " : "";
            sala.agregarRegistro(`🎵 ${jugador.personaje} ${extra}robó 2 cartas gracias a su pasiva.`);
        }
    }
}

export class Darryl implements IPersonaje {
    // maya bug
    nombre = "Darryl";
    habilidad = "Darryl el Barryl:\nTiene el efecto de la carta Barril siempre activo, si se equipa un barril, es como si tuviera dos.";
    habilidadEnCatalan: string = "Darryl el Barryl:\nTé l'efecte de la carta Barril sempre actiu; si s'equipa un barril, és com si en tingués dos."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDarryl", false];
    sfxDefault = "sfxDarryl"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.tieneBarrilPasiva = true
    }
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores lo consideran a distancia +1.";
    habilidadEnCatalan: string = "Gat a les altures:\nEls altres jugadors el consideren a distància +1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteJetpackCat", false];
    sfxDefault= "sfxJetpackCat"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.modificarDistancia++
    }
}

export class KayFaraday implements IPersonaje {
    nombre = "Kay Faraday";
    habilidad = "La ladrona:\nCada vez que pierde una vida por un jugador, roba una carta al azar de la mano de ese jugador.";
    habilidadEnCatalan: string = "La lladre:\nCada vegada que perd una vida a causa d'un jugador, roba una carta a l'atzar de la mà d'aquest jugador."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKay", true];

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (atacante && atacante.mano.length > 0 && danoCuerpo > 0) {
            let indiceAleatorio = Math.floor(Math.random() * atacante.mano.length);
            let cartaRobada = atacante.mano.splice(indiceAleatorio, 1)[0];
            victima.mano.push(cartaRobada);
            
            sala.agregarRegistro(`🎭 ¡Kay Faraday perdió vida pero le robó una carta ${cartaRobada.nombre} a ${atacante.nombre}!`);
        }
    }
}

export class Chester implements IPersonaje {
    nombre = "Chester";
    habilidad = "Ruleta trucada:\nTiene mucha mas suerte cuando usa la ruleta.";
    habilidadEnCatalan: string = "Ruleta trucada:\nTé molta més sort quan utilitza la ruleta."
    vidasBase = 4;
    sfxMuerte: [string, boolean, number] = ["muerteChester", false, 0.25];
    sfxDefault= "sfxChester"

    modificarSuerteRuletaNormal(sala: IMyRoom, jugador: Jugador): number {
        return 4
    }

    modificarSuerteRuletaDinamita(sala: IMyRoom, jugador: Jugador): number {
        return 1
    }
}

export class Frank implements IPersonaje {
    nombre = "Frank";
    habilidad = "Esponja:\nTiene +1 de vida.";
    habilidadEnCatalan: string = "Esponja:\nTé +1 de vida."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFrank", true];
    sfxDefault= "sfxFrank"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.vidas++
        jugador.vidasMaximas++
    }
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas, roba una extra, pero para pasar el turno, sus cartas en mano deben ser su salud - 1.";
    habilidadEnCatalan: string = "Baralla de cartes:\nCada vegada que roba cartes, en roba una d'extra, però per passar el torn, les cartes que té a la mà han de ser la seva vida - 1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTrucy", false];

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        return 1
    }

    modificarCartasEnManoAlPasarTurno(sala: any, jugador: any): number {
        return -1
    }
}

export class Pam implements IPersonaje {
    nombre = "Pam";
    habilidad = "Beso materno:\nCuando usa un botiquin se cura 1 extra y agrega un escudo y si sobrepasa su salud maxima lo transforma en escudo temporal.";
    habilidadEnCatalan: string = "Beso matern:\nQuan utilitza una farmaciola, es cura 1 punt extra i obté un escut. Si supera la seva salut màxima, l excés es transforma en escut temporal."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePam", false];
    sfxDefault = "sfxPam"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.boolean.set("botiquinExcedenteAEscudo", true)
    }

    modificarCuraBotiquin(sala: IMyRoom, jugador: Jugador): number {
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "PASIVA")
        return 1
    }
}

export class Luigi implements IPersonaje {
    nombre = "Luigi";
    habilidad = "Hongo curativo:\nCuando otro personaje muere, se cura 2 de vida, y si hay un Mario vivo en la partida, aumenta su vida maxima en 1.";
    habilidadEnCatalan: string = "Fong curatiu:\nQuan un altre personatge mor, es cura 2 punts de vida, i si hi ha un Mario viu a la partida, augmenta la seva vida màxima en 1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", true];
    sfxDefault= "sfxLuigi"

    onMuereOtroPersonaje(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.broadcast("notificacion_turno", `🍄 ${jugador.personaje} no puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`);
            return;
        }

        let estaMario: boolean = false;
        let textoExtra: string = "";

        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.personaje == "Mario") estaMario = true;
        });

        if (estaMario){
            jugador.vidasMaximas++;
            textoExtra = ` Como Mario está vivo, ${jugador.personaje} aumenta su vida máxima a ${jugador.vidasMaximas}.`;
        }

        let seCuro = false;
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 2, "PASIVA", false);
            seCuro = true;
        }

        if (seCuro || estaMario){
            sala.broadcast("notificacion_turno", `🍄 ${jugador.personaje} recibió curación por su pasiva.` + textoExtra);
        }
    }
}

export class Mario implements IPersonaje {
    nombre = "Mario";
    habilidad = "NEEDAMUSHROOM:\nCuando otro personaje muere, roba 2 cartas, y si hay un Luigi vivo en la partida, roba una extra.";
    habilidadEnCatalan: string = "NEEDAMUSHROOM:\nQuan un altre personatge mor, roba 2 cartes, i si hi ha un Luigi viu a la partida, roba una carta addicional.."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", false];
    sfxDefault= "sfxMario"

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.broadcast("notificacion_turno", `🍄 ${jugador.personaje} no puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
            return
        }

        let estaLuigi: boolean = false
        let textoExtra: string = ""
        let cartas: number = 2

        sala.state.jugadores.forEach((j: any) => {
            if (j.estaVivo && j.personaje == "Luigi") {
                estaLuigi = true
            }
        })

        if (estaLuigi){
            cartas++
            textoExtra = ` Ademas como Luigi está vivo, ${jugador.personaje} roba una carta extra.`
        }

        sala.repartirCartas(jugador, cartas, "pasiva");
        sala.broadcast("notificacion_turno", `🍄 ${jugador.personaje} robó ${cartas} cartas por su pasiva.` + textoExtra);
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO, estando GORDO, cuando es su turno roba 3 en vez de 2, pero la carta Fallo no sirve, estando FLACO, los botiquines curan 2 y al recibir daño roba una carta.";
    habilidadEnCatalan: string = "Canvi de massa:\nSi té 3 o més vides, es torna GROS; si no, es torna PRIM. Estant GROS, quan és el seu torn roba 3 cartes en comptes de 2, però la carta Fallo no serveix. Estant PRIM, els botiquins curen 2 i, quan rep dany, roba una carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMikotoba", true];
    sfxDefault = "mikotobaDeGordoAFlaco"

    onIniciarPartida(sala: any, jugador: any): void {
        this.actualizarNombre(jugador, sala)
    }

    onRecibirCuracion(sala: any, jugador: any): void {
        this.actualizarNombre(jugador, null)
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (causa !== "turno"){
            return 0
        }

        if (jugador.mikotobaEstaGordo){
            return 1
        } else {
            return 0
        }
    }

    modificarCuraBotiquin(sala: IMyRoom, jugador: Jugador): number {
        if (jugador.mikotobaEstaGordo){
            return 0
        } else {
            return 1
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        this.actualizarNombre(victima, sala)
        if (victima.mikotobaEstaGordo){
            return
        } else {
            if (victima.vidas > 0) {
                sala.repartirCartas(victima, 1, "pasiva");
                sala.agregarRegistro(`${victima.personaje} robó 1 carta tras recibir daño por ${causa}.`);
            }
        }
    }

    private actualizarNombre(jugador: any, sala: any): void {
        if (jugador.vidas >= 3){
            jugador.mikotobaEstaGordo = true
            jugador.spriteAvatarOpcional = ""
        } else {
            if (jugador.mikotobaEstaGordo){
                jugador.mikotobaEstaGordo = false
                jugador.spriteAvatarOpcional = "Mikotoba flaco"
                sala.broadcast("sfx", "mikotobaDeGordoAFlaco")
            } else {
                jugador.mikotobaEstaGordo = false
                jugador.spriteAvatarOpcional = "Mikotoba flaco"
            }
        }

        jugador.puedeUsarFallo = !jugador.mikotobaEstaGordo
    }
}

export class Lesly implements IPersonaje {
    // maya bug
    nombre = "Lesly";
    habilidad = "SAPA:\nComo una buena sapa lesly puede sapear la carta de mas a la izquierda de la mano de cada rival en todo momento, puede descartar la carta no conjurada de mas de su izquierda para conjurar una carta Valerie Ladrona (roba la carta de la izquierda) (2 por turno).";
    habilidadEnCatalan: string = "SAPA:\nCom una bona sapa Lesly, pot espiar en tot moment la carta situada més a l’esquerra de la mà de cada rival. Pot descartar la carta no conjurada que té més a l’esquerra per conjurar una carta Valerie Ladrona (roba la carta de l’esquerra) (2 per torn)."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLesly", false];
    sfxDefault = "sfxLesly"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.leslySapa = true
        jugador.number.set("leslyUsosHabilidad", 0)
        let boton = new HabilidadActiva();
        boton.id = "lesly_panico";
        boton.textoBoton = "Crear panico";
        boton.tooltip = "Creas un panico";
        boton.spriteBoton = "botonLesly"
        jugador.habilidadesActivas.push(boton);
    }

    ejecutarHabilidadActiva(sala: any, jugador: any, client: any, idHabilidad: string): void {
        if (jugador.estaVivo && idHabilidad == "lesly_panico"){
            if (jugador.number.get("leslyUsosHabilidad") >= 2){
                client.send("alerta_personal", "Ya usaste 2 veces la habilidad este turno.")
                return
            }

            let indiceCartaOriginal = jugador.mano.findIndex((c: any) => !c.esConjurada);

            if (indiceCartaOriginal !== -1) {
                let cartaEliminada = jugador.mano.splice(indiceCartaOriginal, 1)[0];
                
                sala.descartarCarta(cartaEliminada, jugador, "PASIVA");

                let carta: Carta = CatalogoCartasEspeciales.crearValerieLadrona()
                carta.esConjurada = true

                jugador.mano.push(carta)

                const usos: number = jugador.number.get("leslyUsosHabilidad")

                jugador.number.set("leslyUsosHabilidad", usos + 1)

                sala.agregarRegistro(`🐸 ${jugador.personaje} acaba de conjurar un Panico (${usos + 1}/2)`)
            } else {
                client.send("alerta_personal", "No tenés ninguna carta para poder crear un panico.")
            }
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("leslyUsosHabilidad", 0)
    }
}

export class Domino implements IPersonaje {
    // maya bug (catalan)
    nombre = "Domino";
    habilidad = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan.";
    habilidadEnCatalan: string = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDominub", false];
    sfxDefault = "sfxNitromeme"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
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
    habilidad = "Clones de tilinks falsos:\nAl descartar una carta no clonada, una carta original de tu mano se descarta y te otorga 2 clones de la misma (Máx. 2 por turno). Para pasar el turno debe tener su salud -1 cartas en mano.";
    habilidadEnCatalan: string = "Clons de tilinks falsos:\nEn descartar una carta no clonada, es descarta una carta original de la teva mà i t atorga 2 clons de la mateixa (màx. 2 per torn). Per passar el torn, ha de tenir la seva salut -1 cartes a la mà.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTilink", false];
    sfxDefault= "sfxTilink"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string) {
        // Solo cuenta si lo hace en su turno voluntariamente (no si le tiran un Cocoroch)
        if (motivo !== "VOLUNTARIO") return;
        
        // 1. Inicializamos el contador del turno si no existe
        if (!jugador.clonesCreadosEsteTurno) {
            jugador.clonesCreadosEsteTurno = 0;
        }

        // 2. Freno de seguridad: Límite de 2 por turno
        if (jugador.clonesCreadosEsteTurno >= 2) {
            return;
        }
        
        // 3. Verificamos que la carta descartada inicialmente sea original
        if (!cartaDescartada.esConjurada) {
            
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
                    sala.agregarAlDescarte(cartaAClonar, jugador, null); 
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
                sala.agregarRegistro(`🪞 ¡${jugador.personaje} sacrificó ${cartaAClonar.nombre} original y fabricó 2 clones! (${jugador.clonesCreadosEsteTurno}/2)`);
                sala.reproducirSfx("tilinkPasiva")
            }
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        jugador.clonesCreadosEsteTurno = 0;
    }

    modificarCartasEnManoAlPasarTurno(sala: any, jugador: any): number {
        return -1;
    }
}

export class Flowery implements IPersonaje {
    nombre = "Flowery";
    habilidad = "Tu padre es mi mejor amigo:\nPor cada carta jugada crece aleatoriamente entre 0.25 y 0.30 metros. Al descartar decrece entre 0.20 y 0.25 metros. Al llegar a 3.00, inflige 1 de daño a todos de forma inesquivable, los mete a la cárcel (menos al Sheriff), y luego roba 3 cartas del mazo.";
    habilidadEnCatalan = "El teu pare és el meu millor amic:\nPer cada carta jugada creix aleatòriament entre 0,25 i 0,30 metres. En descartar decreix entre 0,20 i 0,25 metres. En arribar a 3,00, infligeix 1 de dany a tots de forma inesquivable, els posa a la presó (excepte al Sheriff), i després roba 3 cartes de la baralla.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFlowery", true];
    sfxDefault = "sfxFlowery"

    onJugarCarta(sala: any, jugador: any, cartaJugada: any) {
        if (!jugador.estaVivo){
            return
        }
        // Genera un número aleatorio entre 28 y 33, luego lo divide por 100
        let crecimiento = (Math.floor(Math.random() * 6) + 28) / 100;
        jugador.alturaFlowery += crecimiento;
        
        this.evaluarCrecimiento(sala, jugador);
    }

    onDescartarCarta(sala: any, jugador: any, cartaDescartada: any, motivo: string) {
        if (jugador.alturaFlowery > 0){
            sala.broadcast("sfx", "floweryDecrece");
        }
        
        // Genera un número aleatorio entre 17 y 22, luego lo divide por 100
        let decrecimiento = (Math.floor(Math.random() * 6) + 17) / 100;
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
                    Utilidades.procesarDano(sala, v, jugador, 1, "FLOWERY");

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
            
            sala.broadcast("notificacion_turno", `🌻 ${jugador.personaje} infligió daño a todos, enredó a los rivales en Prisión y robó 3 cartas del mazo.`);

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
    habilidadEnCatalan: string = "Noooo leooooon:\nOculta la seva salut, el nombre de cartes i l equipament als altres."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLeon", true];
    sfxDefault = "sfxLeon"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.ocultarEstadisticas = true
    }
}

export class Kazuma implements IPersonaje {
    nombre = "Kazuma";
    habilidad = "Renacer del Héroe:\nSi no es Sheriff, al morir revive en 2 o 3 rondas con 1 vida y 3 cartas. Si es Sheriff, al recibir daño tiene 50% de crear la espada Karuma (2 de daño a distancia 1).";
    habilidadEnCatalan = "Renaixement de l'Heroi:\nSi no és Sheriff, en morir reviu al cap de 2 o 3 rondes amb 1 vida i 3 cartes. Si és Sheriff, en rebre dany té un 50% de crear l espasa Karuma (2 de dany a distància 1).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["kazumaMuere", true];
    sfxDefault = "sfxKazuma"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (victima.rol === "Sheriff" && victima.vidas > 0) {
            // 50% de probabilidad
            if (Math.random() < 0.5) {
                const kamura = new Carta();
                kamura.id = `karuma_${Date.now()}_${Math.floor(Math.random() * 100)}`;
                kamura.nombre = "Karuma";
                kamura.descripcion = "Funciona como un BANG! pero inflige 2 de daño a sus vecinos.";
                kamura.descripcionEnCatalan = "Funciona com un BANG! però infligeix 2 de dany als seus veïns.";
                kamura.tipoDeUso = "objetivoVecino";
                kamura.efecto = "dano_2";
                kamura.esConjurada = true;
                
                victima.mano.push(kamura);
                sala.agregarRegistro(`🗡️ ¡${victima.personaje} ha conjurado su espada Karuma!`);
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
    sfxDefault = "sfxStardew"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string) {
        if (motivo !== "VOLUNTARIO") return;

        if (!jugador.usosArtesanaEsteTurno) {
            jugador.usosArtesanaEsteTurno = 0;
        }
        
        if (jugador.usosArtesanaEsteTurno < 2) {
            jugador.usosArtesanaEsteTurno++;
            
            sala.repartirCartas(jugador, 1, "pasiva");
            sala.agregarRegistro(`🛠️ ${jugador.personaje} descartó una carta y su pasiva de Artesana le otorgó 1 carta nueva (${jugador.usosArtesanaEsteTurno}/2).`);
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        jugador.usosArtesanaEsteTurno = 0; 
    }
}

export class Robin implements IPersonaje {
    nombre = "Robin";
    habilidad = "Carpintera:\nLuego de su primer descarte, cada descarte en su turno mejora un equipamiento aleatorio. Las armas evolucionan y el resto se vuelve versión 'Pro'.";
    habilidadEnCatalan = "Fustera:\nDesprés del primer descart, cada descart en el seu torn millora un equipament aleatori. Les armes evolucionen i la resta es converteix en una versió 'Pro'.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;

        jugador.robinDescartes++;

        if (jugador.robinDescartes <= 1) {
            return;
        }

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
            if (jugador.cartaMustang) sala.agregarAlDescarte(jugador.cartaMustang, jugador, null);
            
            jugador.tieneMustangPro = true;
            jugador.cartaMustang = cartaMejorada;
            textoMejora = "su Caballo";
        } 
        else if (eleccion === "Mira") {
            let cartaMejorada = CatalogoCartasEspeciales.crearMonoaldeaPro();
            if (jugador.cartaMira) sala.agregarAlDescarte(jugador.cartaMira, jugador, null);
            
            jugador.tieneMiraPro = true;
            jugador.cartaMira = cartaMejorada;
            textoMejora = "su Monoaldea";
        } 
        else if (eleccion === "Barril") {
            let cartaMejorada = CatalogoCartasEspeciales.crearBarrilPro();
            if (jugador.cartaBarril) sala.agregarAlDescarte(jugador.cartaBarril, jugador, null);
            
            jugador.tieneBarrilPro = true;
            jugador.cartaBarril = cartaMejorada;
            textoMejora = "su Barril";
        } 
        else if (eleccion === "Arma") {
            let cartaArmaNueva = CatalogoCartasEspeciales.crearArma(siguienteArma.nombre, siguienteArma.alcance);
            if (jugador.cartaArma) sala.agregarAlDescarte(jugador.cartaArma, jugador, null); 

            jugador.cartaArma = cartaArmaNueva;
            jugador.nombreArma = siguienteArma.nombre;
            jugador.alcanceArma = siguienteArma.alcance;
            textoMejora = `su arma a ${siguienteArma.nombre}`;
        }

        sala.agregarRegistro(`🔨 ¡${jugador.personaje} descartó una carta y mejoró ${textoMejora}!`);
        sala.reproducirSfx("robinMejora"); 
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.robinDescartes = 0;
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
    habilidad = "Reflejo:\nAl perder vida, empieza a brillar, mientras brilla, si atacan su salud no le afecta y devuelve el daño al atacante, luego se apaga, al final de su turno se apaga, tiene 1 vida menos.";
    habilidadEnCatalan = "Reflex:\nEn perdre vida, comença a brillar. Mentre brilla, si l ataquen, la seva salut no es veu afectada i retorna el dany a l atacant. Després s apaga. Al final del seu torn s apaga i té 1 vida menys.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLuciernaga", true];
    sfxDefault= "sfxLuciernaga"

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.vidas--
        jugador.vidasMaximas--
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number){
        if (danoCuerpo <= 0){
            return
        }

        if (victima.lucierganaPrendida){
            victima.lucierganaPrendida = false
            victima.spriteAvatarOpcional = ""
            victima.vidas += danoCuerpo
            if (victima.vidas > victima.vidasMaximas){
                victima.vidas = victima.vidasMaximas
            }
            if (atacante && atacante !== victima){
                sala.agregarRegistro(`🐝💡 La ${victima.personaje} le refleja ${cantidad} de daño a ${atacante.nombre}`)
                Utilidades.procesarDano(sala, atacante, victima, danoCuerpo, "LUCIERGANA");
            } else {
                sala.agregarRegistro(`🐝💡 La ${victima.personaje} absorbe ${cantidad} de daño`)
            }
        } else {
            victima.lucierganaPrendida = true
            victima.spriteAvatarOpcional = "Luciergana prendida"
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
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
    sfxDefault = "sfxStardew"

    private esElDeMenosCartas(sala: IMyRoom, yo: Jugador, victima: Jugador): boolean {
        let minCartas = 999;
        
        sala.getJugadores().forEach((j: any) => {
            if (j.estaVivo && j !== yo) {
                if (j.mano.length < minCartas) {
                    minCartas = j.mano.length;
                }
            }
        });

        return victima.mano.length === minCartas;
    }

    puedeDispararBang(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean {
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
    habilidad = "Ay! pero que mala suerte...:\nEl resto de los jugadores tiene mas mala suerte y les agrega en su ruleta un punto para robar una carta.";
    habilidadEnCatalan = "Ai! Quina mala sort...:\nLa resta de jugadors té encara més mala sort i els afegeix a la seva ruleta un punt per robar una carta..";
    vidasBase = 4;

    private aplicarMalaSuerte(jugadorQueTira: any, miJugador: any) {
        if (jugadorQueTira.nombre !== miJugador.nombre && jugadorQueTira.personaje !== miJugador.personaje) {
            return { cambio: -1, fichas: ["falloMaggey"] }; 
        }
        return 0; 
    }

    modificarSuerteGlobalBarril(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalPrision(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalDinamita(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalPapapum(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }

    onFichaEspecialSeleccionada(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string) {
        if (fichaVisual === "falloMaggey") {
            sala.repartirCartas(duenoDeLaFicha, 1, "pasiva");
            sala.broadcast("notificacion_turno", `🍀 ¡La desgracia ajena alimenta a ${duenoDeLaFicha.personaje}! Roba 1 carta.`);
        }
    }
}

export class Mortis implements IPersonaje {
    nombre = "Mortis";
    habilidad = "Criatura de la noche:\nAl recibir daño o cuando muere otro jugador, conjura 2 cartas fantasmales aleatorias.";
    habilidadEnCatalan = "Criatura de la nit:\nEn rebre dany o quan mor un altre jugador, conjura 2 cartes fantasmals aleatòries.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMortis", true];
    sfxDefault = "sfxMortis"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.vidas > 0){
            for (let i = 0; i < 2; i++){
            let cartaFantasma = CatalogoCartasEspeciales.crearCartaFantasmaAleatoria()
            if (cartaFantasma) {
                victima.mano.push(cartaFantasma)
            }
        }

            sala.agregarRegistro(`🪏 ${victima.personaje} conjura 2 cartas fantasmales por su pasiva.`)
        }
    }

    onMuereOtroPersonaje(sala: any, victimaMuerta: any, miJugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.broadcast("notificacion_turno", `🪏 No puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
            return
        }

        for (let i = 0; i < 2; i++){
            let cartaFantasma = CatalogoCartasEspeciales.crearCartaFantasmaAleatoria()
            if (cartaFantasma) {
                miJugador.mano.push(cartaFantasma)
            }
        }

        sala.broadcast("notificacion_turno", `🪏 ${miJugador.personaje} conjura dos cartas fantasmales por su pasiva.`)
    }
}

export class Maya implements IPersonaje {
    nombre = "Maya";
    habilidad = "Canalizacion:\nMientras esté viva, usa las habilidades de los muertos. Para pasar el turno debe tener su salud -1 cartas en mano. (seguramente no funcione con domino, flowery, Haley).";
    habilidadEnCatalan = "Canalització:\nMentre estigui viva, utilitza les habilitats dels morts. Per passar el torn, ha de tenir la seva salut -1 cartes a la mà. (seguramente no funcione con domino, flowery, Haley).";
    vidasBase = 4;

    // =================================================================
    // EL MOTOR CENTRAL: Acá ocurre toda la lógica repetitiva
    // =================================================================
    private ejecutarCanalizacion(sala: any, miJugador: any, callback: (pasiva: any) => void) {
        // 2. ¡EL FRENO MAESTRO! Si no existe o está muerta, cortamos la función entera acá mismo.
        if (!miJugador || !miJugador.estaVivo) return;

        // 3. Recorremos a los muertos y les robamos la pasiva
        sala.state.jugadores.forEach((j: any) => {
            if (!j.estaVivo) {
                let pasiva = sala.gestorPersonajes.obtener(j.personaje);
                if (pasiva) {
                    callback(pasiva); // Ejecutamos la línea específica de cada poder
                }
            }
        });

        // 4. Limpiamos el sprite una sola vez al terminar
        miJugador.spriteAvatarOpcional = "";
    }
    // =================================================================


    // --- HOOKS DE BOTONES ---

    ejecutarHabilidadActiva(sala: any, jugador: any, client: any, idHabilidad: string): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.ejecutarHabilidadActiva) {
                pasiva.ejecutarHabilidadActiva(sala, jugador, client, idHabilidad);
            }
        });
    }


    // --- HOOKS DE ACCIÓN ---

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        this.ejecutarCanalizacion(sala, victima, (pasiva) => {
            if (pasiva.onRecibirDano) pasiva.onRecibirDano(sala, victima, atacante, causa, cantidad, danoCuerpo, danoEscudo);
        });
    }

    onDescartarCarta(sala: any, jugador: any, cartaDescartada: any, motivo: string): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onDescartarCarta) pasiva.onDescartarCarta(sala, jugador, cartaDescartada, motivo);
        });
    }
    
    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onPasarTurno) pasiva.onPasarTurno(sala, jugador);
        });
    }
    
    puedeDispararBang(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean {
        let puede: boolean = false;
        this.ejecutarCanalizacion(sala, atacante, (pasiva) => {
            if (pasiva.puedeDispararBang && pasiva.puedeDispararBang(sala, atacante, victima)) puede = true;
        });
        return puede;
    }
    
    modificarDistancia(sala: any, observador: any, objetivo: any, distanciaBase: number): number {
        let distancia: number = 0;
        this.ejecutarCanalizacion(sala, observador, (pasiva) => {
            if (pasiva.modificarDistancia) distancia += pasiva.modificarDistancia(sala, observador, objetivo, distanciaBase);
        });
        return distancia;
    }

    onMuereOtroPersonaje(sala: any, victimaMuerta: any, miJugador: any): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onMuereOtroPersonaje) pasiva.onMuereOtroPersonaje(sala, victimaMuerta, miJugador);
        });

        let pasiva: any = sala.gestorPersonajes.obtener(victimaMuerta.personaje)
        if (pasiva && pasiva.onIniciarPartida){
            pasiva.onIniciarPartida(sala, miJugador)
        }
    }

    onRecibirCuracion(sala: any, jugador: any): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onRecibirCuracion) pasiva.onRecibirCuracion(sala, jugador);
        });
    }

    onJugarCarta(sala: any, jugador: any, cartaJugada: any): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onJugarCarta) pasiva.onJugarCarta(sala, jugador, cartaJugada);
        });
    }

    onIniciarPartida(sala: any, jugador: any): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onIniciarPartida) pasiva.onIniciarPartida(sala, jugador);
        });
    }

    onFichaEspecialSeleccionada(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string): void {
        this.ejecutarCanalizacion(sala, duenoDeLaFicha, (pasiva) => {
            if (pasiva.onFichaEspecialSeleccionada) pasiva.onFichaEspecialSeleccionada(sala, duenoDeLaFicha, victimaQueTiro, fichaVisual);
        });
    }

    onRecibirEscudo(sala: any, jugador: any, cantidad: number, causa: string): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onRecibirEscudo) pasiva.onRecibirEscudo(sala, jugador, cantidad, causa)
        })
    }


    // --- HOOKS DE NÚMEROS Y VARIABLES ---

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        let modificacion: number = 0;
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarRepartirCarta) modificacion += pasiva.modificarRepartirCarta(sala, jugador, causa);
        });
        return modificacion;
    }

    modificarCuraBotiquin(sala: IMyRoom, jugador: Jugador): number {
        let modificacion: number = 0;
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarCuraBotiquin) modificacion += pasiva.modificarCuraBotiquin(sala, jugador);
        });
        return modificacion;
    }

    modificarCartasEnManoAlPasarTurno(sala: any, jugador: any): number {
        let modificacion: number = 0;
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarCartasEnManoAlPasarTurno) modificacion += pasiva.modificarCartasEnManoAlPasarTurno(sala, jugador);
        });
        return modificacion - 1; // El -1 original de Maya se aplica al final
    }

    modificarPuntosAlEmbrujar(sala: any, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number {
        let modificacion: number = 0
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.modificarPuntosAlEmbrujar) modificacion += pasiva.modificarPuntosAlEmbrujar(sala, miJugador, victima, embrujo, puntos)
        })

        return modificacion
    }


    // --- HOOKS COMPLEJOS DE RULETA (Objetos/Tuplas) ---

    modificarSuerteRuletaNormal(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarSuerteRuletaNormal) {
                let resultado = pasiva.modificarSuerteRuletaNormal(sala, jugador);
                if (typeof resultado === "number") {
                    totalCambio += resultado;
                } else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteLocalPrision(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarSuerteLocalPrision) {
                let resultado = pasiva.modificarSuerteLocalPrision(sala, jugador);
                if (typeof resultado === "number") {
                    totalCambio += resultado;
                } else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteRuletaDinamita(sala: IMyRoom, jugador: Jugador): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarSuerteRuletaDinamita) {
                let resultado = pasiva.modificarSuerteRuletaDinamita(sala);
                if (typeof resultado === "number") {
                    totalCambio += resultado;
                } else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteGlobalBarril(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugadorQueTiraLaRuleta, (pasiva) => {
            if (pasiva.modificarSuerteGlobalBarril) {
                let resultado = pasiva.modificarSuerteGlobalBarril(sala, jugadorQueTiraLaRuleta, miJugador);
                if (typeof resultado === "number") totalCambio += resultado;
                else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteGlobalPrision(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugadorQueTiraLaRuleta, (pasiva) => {
            if (pasiva.modificarSuerteGlobalPrision) {
                let resultado = pasiva.modificarSuerteGlobalPrision(sala, jugadorQueTiraLaRuleta, miJugador);
                if (typeof resultado === "number") totalCambio += resultado;
                else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteGlobalDinamita(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugadorQueTiraLaRuleta, (pasiva) => {
            if (pasiva.modificarSuerteGlobalDinamita) {
                let resultado = pasiva.modificarSuerteGlobalDinamita(sala, jugadorQueTiraLaRuleta, miJugador);
                if (typeof resultado === "number") totalCambio += resultado;
                else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }

    modificarSuerteGlobalPapapum(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] } {
        let totalCambio: number = 0;
        let totalFichas: string[] = [];

        this.ejecutarCanalizacion(sala, jugadorQueTiraLaRuleta, (pasiva) => {
            if (pasiva.modificarSuerteGlobalPapapum) {
                let resultado = pasiva.modificarSuerteGlobalPapapum(sala, jugadorQueTiraLaRuleta, miJugador);
                if (typeof resultado === "number") totalCambio += resultado;
                else if (resultado && typeof resultado === "object") {
                    if (resultado.cambio !== undefined) totalCambio += resultado.cambio;
                    if (resultado.fichas) totalFichas.push(...resultado.fichas);
                }
            }
        });

        if (totalFichas.length > 0) return { cambio: totalCambio, fichas: totalFichas };
        return totalCambio;
    }
}

export class Geraldo implements IPersonaje {
    nombre = "Geraldo";
    habilidad = "Almacenamiento:\nPuede almacenar 5 cartas extras en su mano.";
    habilidadEnCatalan = "Emmagatzematge:\nPot emmagatzemar 5 cartes addicionals a la seva mà.";
    vidasBase = 4;

    modificarCartasEnManoAlPasarTurno(sala: any, jugador: any): number {
        return 5
    }

}

export class RaymundoEscudos implements IPersonaje {
    nombre = "Raymundo Escudos";
    habilidad = "Mejor Abogado:\nNo puedes recuperar tu salud base. Toda curación que recibas se convierte en un Escudo Permanente.";
    habilidadEnCatalan = "Millor Advocat:\nNo pots recuperar la teva salut base. Tota curació que rebis es converteix en un Escut Permanent.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteRaymundo", true]; 
    sfxDefault = "sfxRaymundo"; 

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.transformarCuraEnEscudo = true
    }

    onRecibirEscudo(sala: any, jugador: any, cantidad: number, causa: string) {
        if (jugador.turnosEscudos) {
            for (let i = 0; i < jugador.turnosEscudos.length; i++) {
                jugador.turnosEscudos[i] = Infinity;
            }
        }

        if (causa === "CURACION") {
            sala.broadcast("notificacion_turno", `⚖️ ¡${jugador.personaje} transformó la curación en un Escudo Infinito!`);
        } else {
            sala.broadcast("notificacion_turno", `⚖️ ¡${jugador.personaje} transformó su Escudo temporal en un Escudo Infinito!`);
        }
    }
}

export class Cubo implements IPersonaje {
    nombre = "Cubo";
    habilidad = "Geometry dash:\nCuando jugás una carta, cambias a un modo aleatorio, CUBO: coloca en un punto de tipo EXITO en las ruletas , una moneda, si sale roba 2 cartas, NAVE: aumenta su distancia a la que lo ven en 1, BALL: descartar una carta en tu turno te da otra (una vez por turno), UFO: te salva de la muerte (1 uso), WAVE: usar Fallo conjura otro Fallo y no cambia tu modo, ROBOT: al recibir daño, si tiene 3 cartas o menos, roba una carta, ARAÑA: baja la probabilidad de los demas de salir de prision, y aumenta para vos, SWING COPTER: si tenes 4 cartas o mas en tu mano, te protege de tu siguiente golpe por una ronda.";
    habilidadEnCatalan = "Geometry dash:\nQuan jugues una carta, canvies a un mode aleatori. CUB: col·loca en un punt de tipus ÈXIT de les ruletes una moneda; si surt, roba 2 cartes. NAU: augmenta en 1 la distància a la qual el veuen. BALL: descartar una carta durant el teu torn et permet robar-ne una altra (un cop per torn). OVNI: et salva de la mort (1 ús). ONA: fer servir FALLADA conjura una altra FALLADA i no canvia el teu mode. ROBOT: en rebre dany, si té 3 cartes o menys, roba una carta. ARANYA: redueix la probabilitat que els altres surtin de la presó i augmenta la teva. HELICÒPTER SWING: si tens 4 cartes o més a la mà, et protegeix del teu següent cop durant una ronda.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteCubo", false]; 
    sfxDefault = "sfxCubo";

    private cambiarDeModo(sala: any, jugador: any){
        const modoAnterior: string = jugador.geometryDashModo
        const array = ["Cubo", "Nave", "Ball", "Ufo", "Wave", "Robot", "Swing copter", "Araña"]
        const variable: string = jugador.geometryDashModo
        const index = array.indexOf(variable)
        if (index !== -1) {
            array.splice(index, 1)
        }

        const nuevoModo = array[Math.floor(Math.random() * array.length)]
        jugador.geometryDashModo = nuevoModo
        if (nuevoModo == "Ufo"){
            if (jugador.usosUfo < 1){
                jugador.spriteAvatarOpcional = nuevoModo
            } else {
                jugador.spriteAvatarOpcional = "Ufo roto"
            }
        } else if (nuevoModo == "Swing copter"){
            if (jugador.swingCopterPuedeProteger){
                jugador.spriteAvatarOpcional = "Swing copter escudo"
            } else {
                jugador.spriteAvatarOpcional = "Swing copter"
            }
        } else {
            jugador.spriteAvatarOpcional = nuevoModo
        }

        if (modoAnterior == "Nave" && nuevoModo != "Nave"){
            jugador.modificarDistancia--
        }
        if (modoAnterior != "Nave" && nuevoModo == "Nave"){
            jugador.modificarDistancia++
        }

        sala.broadcast("notificacion_turno", `⏹️ ${jugador.personaje} cambió al modo ${nuevoModo}`)
    }

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.geometryDashModo = "Cubo"
        jugador.boolean.set("swingCopterPuedeProteger", true) // pensé en algo situacional a que si maya obtiene su poder, juega una carta fallo, cambia a swing copter, con esta linea la estaria protegiendo
    }

    onJugarCarta(sala: any, jugador: any, cartaJugada: any): void {
        if (jugador.geometryDashModo == "Wave" && cartaJugada.nombre == "¡Fallo!"){
            let carta = CatalogoCartasEspeciales.crearFallo()
            carta.esConjurada = true
            jugador.mano.push(carta)
        } else {
            this.cambiarDeModo(sala, jugador)
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.vidas <= 0 && victima.geometryDashModo == "Ufo" && victima.usosUfo < 1){
            victima.usosUfo++
            victima.vidas += danoCuerpo
            if (victima.vidas > victima.vidasMaximas){
                victima.vidas = victima.vidasMaximas
            }
            victima.spriteAvatarOpcional = "Ufo roto"

            sala.agregarRegistro(`⏹️ El Ufo salva de la muerte a ${victima.personaje} (${victima.usosUfo}/1)`)
        } else if (victima.geometryDashModo == "Swing copter" && victima.boolean.get("swingCopterPuedeProteger") && victima.mano.length >= 4){
            victima.boolean.set("swingCopterPuedeProteger", false)
            victima.vidas += danoCuerpo
            if (victima.vidas > victima.vidasMaximas){
                victima.vidas = victima.vidasMaximas
            }
            victima.spriteAvatarOpcional = "Swing copter"
            sala.agregarRegistro(`⏹️ El Swing copter lo protege del golpe`)
        } else if (victima.vidas > 0 && victima.geometryDashModo == "Robot" && victima.mano.length <= 3){
            sala.repartirCartas(victima, 1, "pasiva")
            sala.agregarRegistro(`⏹️ ${victima.personaje} roba una carta por su modo Robot`)
        }
    }

    modificarSuerteLocalPrision(sala: IMyRoom, jugador: Jugador): number | { cambio: number; fichas: string[]; } {
        if (jugador.geometryDashModo == "Araña"){
            return 6
        }
    }

    private aplicarMoneda(jugadorQueTira: any, miJugador: any) {
        return { cambio: 0, fichas: ["exitoCubo"] }; 
    }

    modificarSuerteGlobalBarril(sala: any, jugadorQueTira: any, miJugador: any) { 
        if (miJugador.geometryDashModo != "Cubo"){
            return 0
        }
        return this.aplicarMoneda(jugadorQueTira, miJugador); 
    }

    modificarSuerteGlobalPrision(sala: any, jugadorQueTira: any, miJugador: any) { 
        if (miJugador !== jugadorQueTira && miJugador.geometryDashModo == "Araña"){
            return -4
        }
        if (miJugador.geometryDashModo != "Cubo"){
            return 0
        }
        return this.aplicarMoneda(jugadorQueTira, miJugador); 
    }

    modificarSuerteGlobalDinamita(sala: any, jugadorQueTira: any, miJugador: any) { 
        if (miJugador.geometryDashModo != "Cubo"){
            return 0
        }
        return this.aplicarMoneda(jugadorQueTira, miJugador); 
    }

    modificarSuerteGlobalPapapum(sala: any, jugadorQueTira: any, miJugador: any) { 
        if (miJugador.geometryDashModo != "Cubo"){
            return 0
        }
        return this.aplicarMoneda(jugadorQueTira, miJugador); 
    }

    onFichaEspecialSeleccionada(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string) {
        if (fichaVisual === "exitoCubo") {
            sala.repartirCartas(duenoDeLaFicha, 2, "pasiva");
            sala.broadcast("notificacion_turno", `⏹️ ${victimaQueTiro.personaje} agarra la moneda asi que ${duenoDeLaFicha.personaje} roba 2 cartas.`);
        }
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string) {
        if (motivo !== "VOLUNTARIO" || jugador.geometryDashModo != "Ball") return;
        
        if (jugador.usosBallEsteTurno < 1) {
            jugador.usosBallEsteTurno++;
            
            sala.repartirCartas(jugador, 1, "pasiva");
            sala.agregarRegistro(`⏹️ ${jugador.personaje} descartó una carta y su pasiva le otorgó 1 carta nueva (${jugador.usosBallEsteTurno}/1).`);
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        jugador.usosBallEsteTurno = 0; 
        jugador.boolean.set("swingCopterPuedeProteger", true)
        if (jugador.geometryDashModo == "Swing copter"){
            jugador.spriteAvatarOpcional = "Swing copter escudo"
        }
    }
}

export class VonKarma implements IPersonaje {
    nombre = "Von Karma";
    habilidad = "Falsificación de evidencia:\nPodés perder 1 de vida para robar 2 cartas.";
    habilidadEnCatalan = "Falsificació d'evidència:\nPots perdre 1 de vida per robar 2 cartes.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarPartida(sala: any, jugador: any) {
        let boton = new HabilidadActiva();
        boton.id = "vonKarma_falsificar";
        boton.textoBoton = "Falsificar Evidencia";
        boton.tooltip = "Pierde 1 HP, roba 3 cartas";
        boton.spriteBoton = "botonVonKarma"
        jugador.habilidadesActivas.push(boton);
    }

    ejecutarHabilidadActiva(sala: any, jugador: any, client: any, idHabilidad: string) {
        if (idHabilidad === "vonKarma_falsificar") {
            
            if (jugador.vidas <= 1) {
                client.send("alerta_personal", "Necesitás más de 1 vida para falsificar evidencia, o morirías en el intento.");
                return;
            }
            
            sala.broadcast("notificacion_turno", `⚖️ ¡${jugador.nombre} falsificó evidencia! Pierde 1 vida y roba 2 cartas.`);
            
            Utilidades.procesarDano(sala, jugador, jugador, 1, "FALSIFICACION", true);

            if (jugador.estaVivo) {
                sala.repartirCartas(jugador, 2, "pasiva");
            }
        }
    }
}

export class Mercy implements IPersonaje {
    nombre = "Mercy";
    habilidad = "Los heroes nunca mueren:\nDurante tu turno, podes intercambiar entre que tus Bang! hagan daño o curen, los demas no saben si el Bang! hará daño o curará.";
    habilidadEnCatalan = "Els herois mai moren:\nDurant el teu torn, pots escollir si els teus Bang! fan mal o curen, els altres no saben si el Bang! farà mal o curarà.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarPartida(sala: any, jugador: any) {
        let boton = new HabilidadActiva();
        boton.id = "mercy_intercambio";
        boton.textoBoton = "Intercambiar modo";
        boton.tooltip = "Intercambia entre modo cura y modo daño";
        boton.spriteBoton = "botonMercyDaño"
        jugador.habilidadesActivas.push(boton);

        jugador.boolean.set("mercyActivada", false)
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string) {
        if (idHabilidad === "mercy_intercambio") {
            if (jugador.vidas > 0){
                const bandera: boolean = jugador.boolean.get("mercyActivada")
                jugador.boolean.set("mercyActivada", !bandera)

                let botonMercy = jugador.habilidadesActivas.find((hab: any) => hab.id === "mercy_intercambio");

                if (botonMercy) {
                    if (jugador.boolean.get("mercyActivada")) {
                        botonMercy.spriteBoton = "botonMercyCuracion";
                    } else {
                        botonMercy.spriteBoton = "botonMercyDaño";
                    }
                }
                
                let modoActual = jugador.boolean.get("mercyActivada") ? "CURACIÓN" : "DAÑO";
                client.send("alerta_personal", `Ahora estás en modo: ${modoActual}`);
            }
        }
    }
}

export class Chispitas implements IPersonaje {
    nombre = "Chispitas";
    habilidad = "Destruccion:\nSi durante su turno no juega ni descarta cartas, se carga y gana 1 escudo, cuando está cargado, su Bang! tiene daño infinito, jugar o descartar cartas lo descarga, puede almacenar 1 carta extra a su vida.";
    habilidadEnCatalan = "Destrucció:\nSi durant el seu torn no juga ni descarta cap carta, es carrega i guanya 1 escut. Quan està carregat, el seu Bang! fa dany infinit, jugar o descartar cartes el descarrega, pot emmagatzemar 1 carta extra a la seva vida.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarPartida(sala: any, jugador: any): void {
        jugador.boolean.set("chispitasBandera", true)
        jugador.boolean.set("chispitasCargado", false)
    }

    modificarCartasEnManoAlPasarTurno(sala: any, jugador: any): number {
        return 1
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (jugador.boolean.get("chispitasCargado") && cartaJugada.nombre.includes("BANG")){
            return
        }
        jugador.boolean.set("chispitasBandera", false)
        jugador.boolean.set("chispitasCargado", false)
        jugador.spriteAvatarOpcional = ""

        if (jugador.boolean.get("chispitasCargado")){
            sala.agregarRegistro(`⚡ ${jugador.personaje} se descarga ya que jugó una carta`)
        }
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void {
        jugador.boolean.set("chispitasBandera", false)
        jugador.boolean.set("chispitasCargado", false)
        jugador.spriteAvatarOpcional = ""

        if (jugador.boolean.get("chispitasCargado")){
            sala.agregarRegistro(`⚡ ${jugador.personaje} se descarga ya que descartó una carta`)
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.boolean.get("chispitasBandera")){
            // se carga
            jugador.spriteAvatarOpcional = "Chispitas cargado"
            jugador.boolean.set("chispitasCargado", true)
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "CHISPITAS");
            sala.agregarRegistro(`⚡ ¡${jugador.personaje} se carga para preparar un ataque letal y gana un escudo!`)
        }

        jugador.boolean.set("chispitasBandera", true)
    }
}

export class Dahlia implements IPersonaje {
    nombre = "Dahlia e Iris";
    habilidad = "Hermanas gemelas:\nSi no es SHERIFF es Dahlia, al morir, sus embrujos colocan un 150% mas de puntos, pero si es SHERIFF es Iris, no le afectan los embrujos negativos y potencia los positivos.";
    habilidadEnCatalan = "Germanes bessones:\nSi no és XÈRIF, és Dahlia: en morir, els seus encanteris atorguen un 150% més de punts. Però si és XÈRIF, és Iris: no l’afecten els encanteris negatius i potencia els positius.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.rol == "Sheriff"){
            jugador.boolean.set("dahliaSheriff", true)
            jugador.spriteAvatarOpcional = "Dahlia Sheriff"
        }
    }

    modificarPuntosAlEmbrujar(sala: any, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number {
        return puntos * 1.5
    }

    onSacarEmbrujoEnRuleta(sala: any, miJugador: Jugador, tipo: string): void {
        if (miJugador.boolean.get("dahliaSheriff")){
            if (tipo == "robar"){
                sala.repartirCartas(miJugador, 1, "pasiva")
                sala.agregarRegistro(`🔮 ${miJugador.personaje} roba una carta extra por su pasiva.`)
            } else if (tipo == "curar"){
                Utilidades.aplicarCuracion(sala, miJugador, 1, "embrujo", true)
                sala.agregarRegistro(`🔮 ${miJugador.personaje} se curá 1 de vida extra por su pasiva.`)
            }
        }
    }
}


// 3. EL GESTOR DE PERSONAJES
export class GestorPersonajes {
    private personajes: Record<string, IPersonaje> = {};

    constructor() {
        // this.registrar(new ColeCasiddy())
        // this.registrar(new Berry())
        // this.registrar(new Maton())
        // this.registrar(new Mandy())
        // this.registrar(new Tralalero())
        // this.registrar(new Darryl())
        // this.registrar(new JetpackCat())
        // this.registrar(new KayFaraday())
        // this.registrar(new Chester())
        // this.registrar(new Frank())
        // this.registrar(new Pam())
        // this.registrar(new Trucy())
        // this.registrar(new Luigi())
        // this.registrar(new Mario())
        this.registrar(new Lesly())
        this.registrar(new Mikotoba())
        //this.registrar(new Domino())
        // this.registrar(new Tilink())
        // this.registrar(new Flowery())
        // this.registrar(new Leon())
        // this.registrar(new Kazuma())
        // this.registrar(new Leah())
        // this.registrar(new Robin())
        // this.registrar(new Luciergana())
        // this.registrar(new Haley())
        // this.registrar(new Maggey())
        this.registrar(new Mortis())
        // this.registrar(new Maya())
        // this.registrar(new Geraldo())
        // this.registrar(new RaymundoEscudos())
        // this.registrar(new Cubo())
        // this.registrar(new VonKarma())
        // this.registrar(new Mercy())
        // this.registrar(new Chispitas())
        this.registrar(new Dahlia())
    }

    private registrar(p: IPersonaje) {
        this.personajes[p.nombre] = p;
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