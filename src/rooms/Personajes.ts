// Personajes.ts

import { MapSchema } from "@colyseus/schema";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { IMyRoom } from "./IMyRoom.js";
import { Carta, HabilidadActiva, Jugador, OpcionPersonaje } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface IPersonaje {
    nombre: string;
    habilidad: string;
    habilidadEnCatalan: string;
    vidasBase: number;
    sfxMuerte?: [string, boolean, number?];
    sfxDefault?: string;
    spriteFueraDeJuego?: boolean
    esNpcInvocable?: boolean;

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

    modificarCartasEnManoAlPasarTurno?(sala: IMyRoom, jugador: Jugador): number

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, miJugador: any): void

    onRecibirCuracion?(sala: IMyRoom, jugador: Jugador): void

    onRecibirEscudo?(sala: IMyRoom, jugador: Jugador, cantidad: number, causa: string): void;

    onJugarCarta?(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void;

    modificarSuerteGlobalBarril?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalPrision?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalDinamita?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    modificarSuerteGlobalPapapum?(sala: any, jugadorQueTiraLaRuleta: any, miJugador: any): number | { cambio: number, fichas: string[] }

    onIniciarPartida?(sala: IMyRoom, jugador: Jugador): void

    onFichaEspecialSeleccionada?(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string): void;

    ejecutarHabilidadActiva?(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void;

    modificarPuntosAlEmbrujar?(sala: any, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number

    onSacarEmbrujoEnRuleta?(sala: any, miJugador: Jugador, tipo: string): void

    onIniciarTurno?(sala: IMyRoom, miJugador: Jugador): void

    onGolpear?(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void

    onJugarCartaGlobal?(sala: IMyRoom, miJugador: Jugador, jugadorQueJuega: Jugador, cartaJugada: Carta): void;

    onEquiparCarta?(sala: IMyRoom, miJugador: Jugador, carta: Carta, hueco: string): void

    onMorir?(sala: IMyRoom, miJugador: Jugador): void

    modificarCuracion?(sala: IMyRoom, miJugador: Jugador): number
}

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nAl perder vida: roba 2 cartas.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteCasiddy", false];
    sfxDefault= "sfxCasiddy"

    // Fijate cómo recibimos al atacante, por si mañana querés hacer que le robe a él
    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (victima.estaVivo && danoCuerpo > 0) {
            sala.repartirCartas(victima, 2, "pasiva");
            sala.agregarRegistro(`🤠 ${victima.personaje} robó 2 cartas por su pasiva.`);
            sala.reproducirSfx("habilidadColeCasiddy")
        }
    }
}

export class Berry implements IPersonaje {
    nombre = "Berry";
    habilidad = "Cartas curativas:\nCada 2 cartas que descarta de forma voluntaria, se cura 1 y roba una carta.";
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
                sala.reproducirSfx("curacion")
            }
            texto += ` por su pasiva.`;
            sala.agregarRegistro(texto);
            const numero: number = Math.floor(Math.random() * 2);
            const sfx: string = "habilidadBerry" + numero
            sala.reproducirSfx(sfx)
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
    
    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva")
    }

    puedeDispararBang(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean {
        return true; 
    }
}

export class Mandy implements IPersonaje {
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -5.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMandy", false];
    sfxDefault = "sfxMandy"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.modificarAlcance += 5
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl final del turno: si no tiene cartas en la mano, cura 1 y roba 3 cartas.";
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

            sala.repartirCartas(jugador, 3, "pasiva");
            let extra = seCuro ? "recuperó salud/escudo y " : "";
            sala.agregarRegistro(`🎵 ${jugador.personaje} ${extra}robó 3 cartas gracias a su pasiva.`);
        }
    }
}

export class Darryl implements IPersonaje {
    nombre = "Darryl";
    habilidad = "Darryl el Barryl:\nTiene el efecto de la carta Barril siempre activo, si se equipa un barril, es como si tuviera dos.";
    habilidadEnCatalan: string = "Darryl el Barryl:\nTé l'efecte de la carta Barril sempre actiu; si s'equipa un barril, és com si en tingués dos."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDarryl", false];
    sfxDefault = "sfxDarryl"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.tieneBarrilPasiva = true
    }
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores te consideran a distancia +1.\nCuando descarta: aumenta en 1 tu distancia hasta el inicio del turno.";
    habilidadEnCatalan: string = "Gat a les altures:\nEls altres jugadors el consideren a distància +1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteJetpackCat", false];
    sfxDefault= "sfxJetpackCat"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("jetpackCat", 1)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        miJugador.number.set("jetpackCat", 1)
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void {
        if (jugador.estaVivo){
            jugador.number.set("jetpackCat", jugador.number.get("jetpackCat") + 1)
            sala.reproducirSfx("sfxJetpackCat")
        }
    }
}

export class KayFaraday implements IPersonaje {
    nombre = "Kay Faraday";
    habilidad = "La ladrona:\nAl perder vida por otro jugador: le quita una carta al azar de la mano de ese jugador\nPenalizacion 1.";
    habilidadEnCatalan: string = "La lladre:\nCada vegada que perd una vida a causa d'un jugador, roba una carta a l'atzar de la mà d'aquest jugador."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKay", true];
    sfxDefault: string = "sfxKay"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (atacante && atacante.mano.length > 0 && danoCuerpo > 0) {
            let indiceAleatorio = Math.floor(Math.random() * atacante.mano.length);
            let cartaRobada = atacante.mano.splice(indiceAleatorio, 1)[0];
            victima.mano.push(cartaRobada);
            
            sala.agregarRegistro(`🎭 ¡Kay Faraday perdió vida pero le robó una carta ${cartaRobada.nombre} a ${atacante.nombre}!`);
            sala.reproducirSfx("habilidadKayFaraday")
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
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
    habilidad = "Esponja:\nTiene +4 de vida pero no puede usar Fallo.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFrank", true];
    sfxDefault= "sfxFrank"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.vidas += 4
        jugador.vidasMaximas += 4
        jugador.boolean.set("frankFallo", true)
    }
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas roba una extra.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTrucy", false];
    sfxDefault: string = "sfxTrucy"

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        return 1
    }
}

export class Pam implements IPersonaje {
    nombre = "Pam";
    habilidad = "Beso materno:\nAl recibir curacion: se cura 1 extra.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePam", false];
    sfxDefault = "sfxPam"

    modificarCuracion(sala: IMyRoom, miJugador: Jugador): number {
        return 1
    }
}

export class Luigi implements IPersonaje {
    nombre = "Luigi";
    habilidad = "Hongo curativo:\nCuando otro jugador muere: se cura 2, y si hay un Mario vivo en la partida, aumenta su vida maxima en 1.";
    habilidadEnCatalan: string = "Fong curatiu:\nQuan un altre personatge mor, es cura 2 punts de vida, i si hi ha un Mario viu a la partida, augmenta la seva vida màxima en 1."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", true];
    sfxDefault= "sfxLuigi"

    onMuereOtroPersonaje(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.agregarRegistro(`🍄 ${jugador.personaje} no puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`);
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
            sala.agregarRegistro(`🍄 ${jugador.personaje} recibió curación por su pasiva.` + textoExtra);
            sala.reproducirSfx("sfxLuigiHabilidad")
        }
    }
}

export class Mario implements IPersonaje {
    nombre = "Mario";
    habilidad = "NEEDAMUSHROOM:\nCuando otro jugador muere, roba 2 cartas, y si hay un Luigi vivo en la partida, roba una extra.";
    habilidadEnCatalan: string = "NEEDAMUSHROOM:\nQuan un altre personatge mor, roba 2 cartes, i si hi ha un Luigi viu a la partida, roba una carta addicional.."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", false];
    sfxDefault= "sfxMario"

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.agregarRegistro(`🍄 ${jugador.personaje} no puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
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
        sala.agregarRegistro(`🍄 ${jugador.personaje} robó ${cartas} cartas por su pasiva.` + textoExtra);
        sala.reproducirSfx("sfxMarioHabilidad")
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO.";
    habilidadEnCatalan: string = "Canvi de massa:\nSi té 3 o més vides, es torna GROS; si no, es torna PRIM. Estant GROS, quan és el seu torn roba 3 cartes en comptes de 2, però la carta Fallo no serveix. Estant PRIM, els botiquins curen 2 i, quan rep dany, roba una carta."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMikotoba", true];
    sfxDefault = "mikotobaDeGordoAFlaco"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("mikotobaEstaGordo", true)
        this.actualizarNombre(jugador, sala)
    }

    onRecibirCuracion(sala: IMyRoom, jugador: Jugador): void {
        this.actualizarNombre(jugador, null)
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (causa !== "turno"){
            return 0
        }

        if (jugador.boolean.get("mikotobaEstaGordo")){
            return 1
        } else {
            return 0
        }
    }

    modificarCuraBotiquin(sala: IMyRoom, jugador: Jugador): number {
        if (jugador.boolean.get("mikotobaEstaGordo")){
            return 0
        } else {
            return 1
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        this.actualizarNombre(victima, sala)
        if (victima.boolean.get("mikotobaEstaGordo")){
            return
        } else {
            if (victima.estaVivo) {
                sala.repartirCartas(victima, 1, "pasiva");
                sala.agregarRegistro(`${victima.personaje} robó 1 carta tras recibir daño por ${causa}.`);
            }
        }
    }

    private actualizarNombre(jugador: Jugador, sala: IMyRoom): void {
        if (jugador.vidas >= 3){
            jugador.boolean.set("mikotobaEstaGordo", true)
            jugador.spriteAvatarOpcional = ""
        } else {
            if (jugador.boolean.get("mikotobaEstaGordo")){
                jugador.boolean.set("mikotobaEstaGordo", false)
                jugador.spriteAvatarOpcional = "Mikotoba flaco"
                sala.reproducirSfx("mikotobaDeGordoAFlaco")
            } else {
                jugador.boolean.set("mikotobaEstaGordo", false)
                jugador.spriteAvatarOpcional = "Mikotoba flaco"
            }
        }

        jugador.puedeUsarFallo = !jugador.boolean.get("mikotobaEstaGordo")
    }
}

export class Lesly implements IPersonaje {
    nombre = "Lesly";
    habilidad = "SAPA:\nComo una buena sapa, lesly puede sapear en todo momento.\nHabilidad (1 por turno): descarta la carta original de mas a la izquierda y conjura una carta Valerie Ladrona.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLesly", false];
    sfxDefault = "sfxLesly"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("leslySapa", true)
        jugador.number.set("leslyUsosHabilidad", 0)
        let boton = new HabilidadActiva();
        boton.id = "lesly_panico";
        boton.textoBoton = "Crear panico";
        boton.tooltip = "Creas un panico";
        boton.spriteBoton = "botonLesly"
        jugador.habilidadesActivas.push(boton);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (jugador.estaVivo && idHabilidad == "lesly_panico"){
            if (jugador.number.get("leslyUsosHabilidad") >= 1){
                client.send("alerta_personal", "Ya usaste la habilidad este turno.")
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

                sala.agregarRegistro(`🐸 ${jugador.personaje} acaba de conjurar una Valerie ladrona (${usos + 1}/1)`)
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
    nombre = "Domino";
    habilidad = "Dominub:\nAl recibir daño: conjura un domino.";
    habilidadEnCatalan: string = "."
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
            dominoArma.efecto = `equipar_arma_${4}`;
            dominoArma.esConjurada = true
            victima.mano.push(dominoArma)
        }
        
    }
}

export class Tilink implements IPersonaje {
    nombre = "Tilink";
    habilidad = "Clones de tilinks falsos:\nAl descartar una carta original (2 por turno): una carta original al azar de tu mano se descarta y te otorga 2 clones de la misma.\nPenalizacion 1.";
    habilidadEnCatalan: string = "Clons de tilinks falsos:\nEn descartar una carta no clonada, es descarta una carta original de la teva mà i t atorga 2 clons de la mateixa (màx. 2 per torn). Per passar el torn, ha de tenir la seva salut -1 cartes a la mà.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTilink", false];
    sfxDefault= "sfxTilink"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string) {
        if (motivo !== "VOLUNTARIO") return;
        
        if (!jugador.clonesCreadosEsteTurno) {
            jugador.clonesCreadosEsteTurno = 0;
        }

        if (jugador.clonesCreadosEsteTurno >= 2) {
            return;
        }
        
        if (!cartaDescartada.esConjurada) {
            
            let cartasOriginalesEnMano = jugador.mano.filter((c: any) => !c.esConjurada);
            
            if (cartasOriginalesEnMano.length > 0) {
                
                let indiceAleatorio = Math.floor(Math.random() * cartasOriginalesEnMano.length);
                let cartaAClonar = cartasOriginalesEnMano[indiceAleatorio];
                
                let indiceEnMano = jugador.mano.findIndex((c: any) => c.id === cartaAClonar.id);
                if (indiceEnMano !== -1) {
                    jugador.mano.splice(indiceEnMano, 1);
                    sala.agregarAlDescarte(cartaAClonar, jugador, null); 
                }
                
                for (let i = 0; i < 2; i++) {
                    let clon = Utilidades.clonarCarta(cartaAClonar, "clon");
                    
                    clon.esConjurada = true; 
                    
                    jugador.mano.push(clon);
                }
                
                jugador.clonesCreadosEsteTurno++;
                
                sala.agregarRegistro(`🪞 ¡${jugador.personaje} sacrificó ${cartaAClonar.nombre} original y fabricó 2 clones! (${jugador.clonesCreadosEsteTurno}/2)`);
                sala.reproducirSfx("tilinkPasiva");
            }
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador) {
        jugador.clonesCreadosEsteTurno = 0;
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1;
    }
}

export class Flowery implements IPersonaje {
    nombre = "Flowery";
    habilidad = "Tu padre es mi mejor amigo:\nAl jugar carta: crece aleatoriamente entre 0.26 y 0.31 metros.\nCuando descarta: decrece entre 0.20 y 0.25 metros.\nAl llegar a 3.00 metros: inflige 1 de daño a todos de forma inesquivable, los mete a la cárcel (menos al Sheriff), y luego roba 3 cartas del mazo.";
    habilidadEnCatalan = "El teu pare és el meu millor amic:\nPer cada carta jugada creix aleatòriament entre 0,25 i 0,30 metres. En descartar decreix entre 0,20 i 0,25 metres. En arribar a 3,00, infligeix 1 de dany a tots de forma inesquivable, els posa a la presó (excepte al Sheriff), i després roba 3 cartes de la baralla.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFlowery", true];
    sfxDefault = "sfxFlowery"
    spriteFueraDeJuego: boolean = true

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en iniciar partida flowery")
            return
        }

        jugador.number.set("alturaFlowery", 0)
        jugador.boolean.set("spriteFueraDeJuego", true)
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta) {
        if (!jugador.estaVivo){
            return
        }
        // Genera un número aleatorio entre 26 y 31, luego lo divide por 100
        let crecimiento = (Math.floor(Math.random() * 6) + 26) / 100;
        jugador.number.set("alturaFlowery", jugador.number.get("alturaFlowery") + crecimiento)
        
        this.evaluarCrecimiento(sala, jugador);
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: any, motivo: string) {
        if (jugador.number.get("alturaFlowery") > 0){
            sala.reproducirSfx("floweryDecrece");
        }
        
        // Genera un número aleatorio entre 17 y 22, luego lo divide por 100
        let decrecimiento = (Math.floor(Math.random() * 6) + 17) / 100;
        jugador.number.set("alturaFlowery", jugador.number.get("alturaFlowery") - decrecimiento)
        
        if (jugador.number.get("alturaFlowery") < 0) {
            jugador.number.set("alturaFlowery", 0)
        }
    }

    private evaluarCrecimiento(sala: IMyRoom, jugador: Jugador) {
        if (jugador.number.get("alturaFlowery") >= 3) { // 3
            sala.agregarRegistro(`🌻 ¡FLOWERY HACE SU ATAQUE ESPECIAL!`);

            sala.getJugadores().forEach((v: any, sessionId: string) => {
                if (v.estaVivo && v !== jugador) {
                    Utilidades.procesarDano(sala, v, jugador, 1, "FLOWERY");

                    // YA NO ROBA CARTAS DEL RIVAL (Eliminado)

                    if (v.estaVivo && v.rol !== "Sheriff" && !v.equipamiento.has("prision")) {
                        const prision = new Carta();
                        
                        // EL PARCHE ANTICRASHEO: Agregamos el sessionId al final para garantizar unicidad absoluta
                        prision.id = `prision_flowery_${Date.now()}_${Math.floor(Math.random() * 100000)}_${sessionId}`;
                        
                        prision.nombre = "Prisión";
                        prision.descripcion = "Equipala a otro jugador (menos al Sheriff). Tiene 25% de salir de la carcel o perder el turno.";
                        prision.descripcionEnCatalan = "Equipa-la a un altre jugador (excepte el Sheriff). Té un 25 % de probabilitats de sortir de la presó o de perdre el torn.";
                        prision.tipoDeUso = "objetivoGlobal"; 
                        prision.efecto = "prision";
                        prision.esConjurada = true;

                        // --- NUEVO SISTEMA DE EQUIPAMIENTO ---
                        Utilidades.equiparCarta(sala, v, prision, "prision");
                    }
                }
            });

            // YA NO SE CURA NI AUMENTA SALUD MÁXIMA (Eliminado)

            // AHORA ROBA 3 CARTAS DEL MAZO
            sala.repartirCartas(jugador, 3, "pasiva");
            
            sala.agregarRegistro(`🌻 ${jugador.personaje} infligió daño a todos, enredó a los rivales en Prisión y robó 3 cartas del mazo.`);

            const numero: number = Math.floor(Math.random() * 2);
            const sfx: string = "floweryHabilidad" + numero;
            sala.reproducirSfx( sfx);

            jugador.number.set("alturaFlowery", 0)
        } else {
            // jugó una carta pero aun no llegó al final
            sala.reproducirSfx("floweryCrece");
        }
    }
}

export class Leon implements IPersonaje {
    nombre = "Leon";
    habilidad = "Noooo leooooon:\nOculta todos sus visuales a los demas.\nAl final del turno: si hay menos de 2 npc leon_oculto: crea hasta 2 npc leon_oculto en sentido antihorario, luego intercambia o no de lugar con ellos de forma aleatoria.";
    habilidadEnCatalan: string = "Noooo leooooon:\nOculta la seva salut, el nombre de cartes i l equipament als altres."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLeon", true];
    sfxDefault = "sfxLeon"

    listaNpcLeon: Jugador[] = []

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("leonOcultar", true)
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        const miId: string = Utilidades.obtenerSessionIdDeJugador(sala, jugador)
        let cantidad: number = 2

        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j.esNpc && j.idDueno == miId && j.personaje == "Leon_oculto"){
                cantidad--
            }
        })

        for (let i = 0; i < cantidad; i++){
            let npc: Jugador = Utilidades.invocarNpcEnMesa(sala, jugador, "Leon_oculto", 4, 2, "antihorario")
            this.leonGuardarNpc(npc)
        }

        const numero: number = Math.floor(Math.random() * 4)
        if (numero == 0 && this.listaNpcLeon.length > 0){
            const j: Jugador = this.listaNpcLeon[0]
            if (j){
                Utilidades.intercambiarPosicionesFisicas(sala, jugador, j)
            }
        } else if (numero == 1 && this.listaNpcLeon.length > 1){
            const j: Jugador = this.listaNpcLeon[1]
            if (j){
                Utilidades.intercambiarPosicionesFisicas(sala, jugador, j)
            }
        }
    }

    leonGuardarNpc(npc: Jugador): void {
        this.leonLimpiarLista()
        this.listaNpcLeon.push(npc)
    }

    leonLimpiarLista(): void {
        this.listaNpcLeon = this.listaNpcLeon.filter(
            (elemento: Jugador) => elemento.estaVivo
        )
    }
}

export class Leon_oculto implements IPersonaje {
    nombre = "Leon_oculto";
    habilidad = "Noooo leooooon:\nOculta todos sus visuales a los demas.\nAl final del turno: si hay menos de 2 npc leon_oculto: crea hasta 2 npc leon_oculto en sentido antihorario, luego intercambia o no de lugar con ellos de forma aleatoria.";
    habilidadEnCatalan: string = "Noooo leooooon:\nOculta la seva salut, el nombre de cartes i l equipament als altres."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLeon", true];
    sfxDefault = "sfxLeon"
    esNpcInvocable: boolean = true

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("leonOcultar", true)
        jugador.boolean.set("leon_oculto", true)
        Utilidades.bajarVidaMaxima(jugador, 3)
    }
}

export class Kazuma implements IPersonaje {
    nombre = "Kazuma";
    habilidad = "Renacer del Héroe:\nSi no es Sheriff: al morir revive en 2 o 3 rondas con 1 vida y 3 cartas.\nSi es Sheriff, al recibir daño: conjura con un 50% una espada Karuma.";
    habilidadEnCatalan = "Renaixement de l'Heroi:\nSi no és Sheriff, en morir reviu al cap de 2 o 3 rondes amb 1 vida i 3 cartes. Si és Sheriff, en rebre dany té un 50% de crear l espasa Karuma (2 de dany a distància 1).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["kazumaMuere", true];
    sfxDefault = "sfxKazuma"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number) {
        if (victima.rol === "Sheriff" && victima.estaVivo) {
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
                sala.reproducirSfx("sfxKazumaSheriffHabilidad")
            }
        }
    }
}

export class Leah implements IPersonaje {
    nombre = "Leah";
    habilidad = "Artesana:\nCuando descarta (2 por turno): roba 1.";
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
    habilidad = "Carpintera:\nCuando descarta de forma voluntaria: si no es su primer descarte mejora de forma aleatoria.\nAl final del turno: si en su turno no jugó carta: mejora de forma aleatoria.";
    habilidadEnCatalan = "Fustera:\nDesprés del primer descart, cada descart en el seu torn millora un equipament aleatori. Les armes evolucionen i la resta es converteix en una versió 'Pro'.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("robinJuegaCarta", false)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        miJugador.boolean.set("robinJuegaCarta", false)
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        jugador.boolean.set("robinJuegaCarta", true)
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;

        jugador.robinDescartes++;

        if (jugador.robinDescartes <= 1) {
            return;
        }

        this.mejorar(sala, jugador, "descartó una carta")
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.robinDescartes = 0;
        if (jugador.boolean.get("robinJuegaCarta") == false){
            this.mejorar(sala, jugador, "no jugó ninguna carta")
        }
    }

    mejorar(sala: IMyRoom, miJugador: Jugador, causa: "descartó una carta" | "no jugó ninguna carta"): void {
        let textoMejora = Utilidades.mejorarEquipamientoAleatorio(sala, miJugador);

        if (textoMejora !== "") {
            sala.agregarRegistro(`🔨 ¡${miJugador.personaje} ${causa} y mejoró ${textoMejora}!`);
            sala.reproducirSfx("robinMejora"); 
        }
    }
}

export class Luciergana implements IPersonaje {
    
    nombre = "Luciergana";
    habilidad = "Reflejo:\nAl perder vida: empieza a brillar.\nAl final del turno: se apaga.\nTiene 1 vida menos.";
    habilidadEnCatalan = "Reflex:\nEn perdre vida, comença a brillar. Mentre brilla, si l ataquen, la seva salut no es veu afectada i retorna el dany a l atacant. Després s apaga. Al final del seu torn s apaga i té 1 vida menys.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLuciernaga", true];
    sfxDefault= "sfxLuciernaga"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.bajarVidaMaxima(jugador, 1)
        jugador.boolean.set("lucierganaPrendida", false)
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number){
        if (danoCuerpo <= 0){
            return
        }

        if (victima.boolean.get("lucierganaPrendida")){
            victima.boolean.set("lucierganaPrendida", false)
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
            victima.boolean.set("lucierganaPrendida", true)
            victima.spriteAvatarOpcional = "Luciergana prendida"
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.boolean.get("lucierganaPrendida")){
            jugador.boolean.set("lucierganaPrendida", false)
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
    habilidad = "Ay! pero que mala suerte...:\nEl resto de los jugadores tienen suerte -1 y agrega 3 fichas tipo Fallo en sus ruletas que le dan una carta a Maggey.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAceAttorney", false];
    sfxDefault: string = "sfxMaggey"

    private aplicarMalaSuerte(jugadorQueTira: any, miJugador: any) {
        if (jugadorQueTira.nombre !== miJugador.nombre && jugadorQueTira.personaje !== miJugador.personaje) {
            return { cambio: -1, fichas: ["falloMaggey","falloMaggey","falloMaggey"] }; 
        }
        return 0; 
    }

    modificarSuerteGlobalBarril(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalPrision(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalDinamita(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }
    modificarSuerteGlobalPapapum(sala: any, jugadorQueTira: any, miJugador: any) { return this.aplicarMalaSuerte(jugadorQueTira, miJugador); }

    onFichaEspecialSeleccionada(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string) {
        if (fichaVisual === "falloMaggey") {
            sala.repartirCartas(duenoDeLaFicha, 2, "pasiva");
            sala.agregarRegistro(`🍀 ¡La desgracia ajena alimenta a ${duenoDeLaFicha.personaje}! Roba 1 carta.`);
        }
    }
}

export class Mortis implements IPersonaje {
    nombre = "Mortis";
    habilidad = "Criatura de la noche:\nAl recibir daño o cuando muere otro jugador: conjura aleatoriamente 2 carta fantasma.\nAl golpear: conjura aleatoriamente 1 carta fantasma.";
    habilidadEnCatalan = "Criatura de la nit:\nEn rebre dany o quan mor un altre jugador, conjura 2 cartes fantasmals aleatòries.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMortisMuerte", true];
    sfxDefault = "sfxMortis"

    crearCartaFantasma(sala: IMyRoom, miJugador: Jugador, cantidad: number){
        for (let i = 0; i < cantidad; i++){
            let cartaFantasma = CatalogoCartasEspeciales.crearCartaFantasmaAleatoria()
            if (cartaFantasma) {
                miJugador.mano.push(cartaFantasma)
            }
        }

        if (cantidad == 1){
            sala.agregarRegistro(`🪏 ${miJugador.personaje} conjura ${cantidad} carta fantasmal por su pasiva.`)
        } else {
            sala.agregarRegistro(`🪏 ${miJugador.personaje} conjura ${cantidad} cartas fantasmales por su pasiva.`)
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.estaVivo){
            this.crearCartaFantasma(sala, victima, 2)
        }
    }

    onMuereOtroPersonaje(sala: any, victimaMuerta: any, miJugador: any): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte){
            sala.agregarRegistro(`🪏 No puede usar su pasiva porque ${victimaMuerta.personaje} ya murió anteriormente.`)
            return
        }

        if (miJugador.estaVivo){
            this.crearCartaFantasma(sala, miJugador, 2)
        }
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (miJugador.estaVivo){
            this.crearCartaFantasma(sala, miJugador, 1)
        }
    }
}

export class Maya implements IPersonaje {
    nombre = "Maya";
    habilidad = "Canalizacion:\nMientras esté viva, usa las habilidades de los muertos.\nPenalizacion 1.\n(seguramente no funcione con Haley).";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMayaMuerte", true];
    sfxDefault: string = "sfxMaya"

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
        miJugador.boolean.set("spriteFueraDeJuego", false)
    }
    // =================================================================


    // --- HOOKS DE BOTONES ---

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
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

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: any, motivo: string): void {
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

        if (victimaMuerta.beneficiarseDeSuMuerte){
            let pasiva: any = sala.gestorPersonajes.obtener(victimaMuerta.personaje)
            if (pasiva && pasiva.onIniciarPartida){
                pasiva.onIniciarPartida(sala, miJugador)
            }
        }
    }

    onRecibirCuracion(sala: IMyRoom, jugador: Jugador): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onRecibirCuracion) pasiva.onRecibirCuracion(sala, jugador);
        });
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onJugarCarta) pasiva.onJugarCarta(sala, jugador, cartaJugada);
        });
    }

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onIniciarPartida) pasiva.onIniciarPartida(sala, jugador);
        });
    }

    onFichaEspecialSeleccionada(sala: any, duenoDeLaFicha: any, victimaQueTiro: any, fichaVisual: string): void {
        this.ejecutarCanalizacion(sala, duenoDeLaFicha, (pasiva) => {
            if (pasiva.onFichaEspecialSeleccionada) pasiva.onFichaEspecialSeleccionada(sala, duenoDeLaFicha, victimaQueTiro, fichaVisual);
        });
    }

    onRecibirEscudo(sala: IMyRoom, jugador: Jugador, cantidad: number, causa: string): void {
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.onRecibirEscudo) pasiva.onRecibirEscudo(sala, jugador, cantidad, causa)
        })
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onIniciarTurno) pasiva.onIniciarTurno(sala, miJugador)
        })
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onGolpear) pasiva.onGolpear(sala, miJugador, jugadorGolpeado, causa);
        });
    }

    onJugarCartaGlobal(sala: IMyRoom, miJugador: Jugador, jugadorQueJuega: Jugador, cartaJugada: Carta): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onJugarCartaGlobal) pasiva.onJugarCartaGlobal(sala, miJugador, jugadorQueJuega, cartaJugada);
        });
    }

    onSacarEmbrujoEnRuleta(sala: any, miJugador: Jugador, tipo: string): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onSacarEmbrujoEnRuleta) pasiva.onSacarEmbrujoEnRuleta(sala, miJugador, tipo);
        });
    }

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, carta: Carta, hueco: string): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onEquiparCarta) pasiva.onEquiparCarta(sala, miJugador, carta, hueco);
        });
    }

    onMorir(sala: IMyRoom, miJugador: Jugador): void {
        this.ejecutarCanalizacion(sala, miJugador, (pasiva) => {
            if (pasiva.onMorir) pasiva.onMorir(sala, miJugador);
        });
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

    modificarCuracion(sala: IMyRoom, jugador: Jugador): number {
        let modificacion: number = 0;
        this.ejecutarCanalizacion(sala, jugador, (pasiva) => {
            if (pasiva.modificarCuracion) modificacion += pasiva.modificarCuracion(sala, jugador);
        });
        return modificacion;
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
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
    habilidad = "Coleccion:\nAlmacenamiento 5.";
    habilidadEnCatalan = "Emmagatzematge:\nPot emmagatzemar 5 cartes addicionals a la seva mà.";
    vidasBase = 4;

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return 5
    }

}

export class RaymundoEscudos implements IPersonaje {
    nombre = "Raymundo Escudos";
    habilidad = "Mejor Abogado:\nTu cura se transforma en escudo.\nTu escudo no se va con el tiempo.\nCada 2 escudo: gana un almacenamiento.";
    habilidadEnCatalan = "Millor Advocat:\nNo pots recuperar la teva salut base. Tota curació que rebis es converteix en un Escut Permanent.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteRaymundo", true]; 
    sfxDefault = "sfxRaymundo"; 

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.transformarCuraEnEscudo = true
    }

    onRecibirEscudo(sala: IMyRoom, jugador: Jugador, cantidad: number, causa: string) {
        if (jugador.turnosEscudos) {
            for (let i = 0; i < jugador.turnosEscudos.length; i++) {
                jugador.turnosEscudos[i] = Infinity;
            }
        }

        if (causa === "CURACION") {
            sala.agregarRegistro(`⚖️ ¡${jugador.personaje} transformó la curación en un Escudo Infinito!`);
        } else {
            sala.agregarRegistro(`⚖️ ¡${jugador.personaje} transformó su Escudo temporal en un Escudo Infinito!`);
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return Math.floor(jugador.vidasEscudo / 2)
    }
}

export class Cubo implements IPersonaje {
    nombre = "Cubo";
    habilidad = "Geometry dash:\nAl jugar carta: cambias a un modo aleatorio entre Cubo, Nave, Ball, Ufo, Wave, Robot, Araña o Swing copter.";
    habilidadEnCatalan = "Geometry dash:\nQuan jugues una carta, canvies a un mode aleatori. CUB: col·loca en un punt de tipus ÈXIT de les ruletes una moneda; si surt, roba 2 cartes. NAU: augmenta en 1 la distància a la qual el veuen. BALL: descartar una carta durant el teu torn et permet robar-ne una altra (un cop per torn). OVNI: et salva de la mort (1 ús). ONA: fer servir FALLADA conjura una altra FALLADA i no canvia el teu mode. ROBOT: en rebre dany, si té 3 cartes o menys, roba una carta. ARANYA: redueix la probabilitat que els altres surtin de la presó i augmenta la teva. HELICÒPTER SWING: si tens 4 cartes o més a la mà, et protegeix del teu següent cop durant una ronda.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCuboMuerte", false]; 
    sfxDefault = "sfxCubo";

    private cambiarDeModo(sala: IMyRoom, jugador: Jugador){
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
            if (jugador.boolean.get("swingCopterPuedeProteger")){
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

        sala.agregarRegistro(`⏹️ ${jugador.personaje} cambió al modo ${nuevoModo}`)
    }

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.geometryDashModo = "Cubo"
        jugador.boolean.set("swingCopterPuedeProteger", true) // pensé en algo situacional a que si maya obtiene su poder, juega una carta fallo, cambia a swing copter, con esta linea la estaria protegiendo
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador || !jugador.estaVivo){
            return
        }

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
        } else if (victima.estaVivo && victima.geometryDashModo == "Robot" && victima.mano.length <= 3){
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
            sala.agregarRegistro(`⏹️ ${victimaQueTiro.personaje} agarra la moneda asi que ${duenoDeLaFicha.personaje} roba 2 cartas.`);
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
    habilidad = "Falsificación de evidencia:\nBoton la bala: te quita 1 vida y roba 2 cartas.";
    habilidadEnCatalan = "Falsificació d'evidència:\nPots perdre 1 de vida per robar 2 cartes.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAceAttorney", false];
    sfxDefault: string = "sfxVonKarma"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador) {
        let boton = new HabilidadActiva();
        boton.id = "vonKarma_falsificar";
        boton.textoBoton = "Falsificar Evidencia";
        boton.tooltip = "Pierde 1 HP, roba 3 cartas";
        boton.spriteBoton = "botonVonKarma"
        jugador.habilidadesActivas.push(boton);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string) {
        if (idHabilidad === "vonKarma_falsificar") {
            
            if (jugador.vidas <= 1) {
                client.send("alerta_personal", "Necesitás más de 1 vida para falsificar evidencia, o morirías en el intento.");
                return;
            }
            
            sala.agregarRegistro(`⚖️ ¡${jugador.personaje} falsificó evidencia! Pierde 1 vida y roba 2 cartas.`);
            
            Utilidades.procesarDano(sala, jugador, jugador, 1, "FALSIFICACION", true);

            if (jugador.estaVivo) {
                sala.repartirCartas(jugador, 2, "pasiva");
            }

            sala.reproducirSfx("sfxVonKarmaBoton")
        }
    }
}

export class Mercy implements IPersonaje {
    nombre = "Mercy";
    habilidad = "Los heroes nunca mueren:\nBoton intercambio: podes intercambiar entre que tus Bang! hagan daño o curen.\nLos demas no saben si el Bang! hará daño o curará.\nCurar con un Bang! a otro jugador te cura 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador) {
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
            if (jugador.estaVivo){
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
    habilidad = "Destruccion:\nSi durante su turno no juega ni descarta cartas: se carga y gana 1 escudo.\nJugar o descartar cartas lo descarga excepto disparar Bangs!\nAlmacenamiento 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxChispitasMuerte", false];
    sfxDefault = "sfxChispitas";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("chispitasBandera", true)
        jugador.boolean.set("chispitasCargado", false)
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return 1
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        miJugador.boolean.set("chispitasBandera", true)
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
            sala.reproducirSfx("sfxChispitas")
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "CHISPITAS");
            sala.agregarRegistro(`⚡ ¡${jugador.personaje} se carga para preparar un ataque letal y gana un escudo!`)
        }

        jugador.boolean.set("chispitasBandera", true)
    }
}

export class Dahlia implements IPersonaje {
    nombre = "Dahlia e Iris";
    habilidad = "Hermanas gemelas:\nSi no es SHERIFF es Dahlia: Al embrujar: coloca un +150% de puntos.\nSi es SHERIFF es Iris: no le afectan los embrujos negativos y potencia los positivos.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxDahliaMuerte", false];
    sfxDefault = "sfxDahlia";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.rol == "Sheriff"){
            jugador.boolean.set("dahliaSheriff", true)
            jugador.spriteAvatarOpcional = "Dahlia Sheriff"
        }
    }

    modificarPuntosAlEmbrujar(sala: any, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number {
        if (miJugador.boolean.get("dahliaSheriff")){
            return 0
        } else {
            return puntos * 1.5
        }
    }

    onSacarEmbrujoEnRuleta(sala: any, miJugador: Jugador, tipo: string): void {
        if (miJugador.boolean.get("dahliaSheriff")){
            if (tipo == "robar"){
                sala.repartirCartas(miJugador, 1, "pasiva")
                sala.agregarRegistro(`🔮 ${miJugador.personaje} roba una carta extra por su pasiva.`)
            } else if (tipo == "curar"){
                Utilidades.aplicarCuracion(sala, miJugador, 1, "embrujo", true)
                sala.agregarRegistro(`🔮 ${miJugador.personaje} se curá 1 de vida extra por su pasiva.`)
            } else if (tipo == "libro"){
                let textoMejora: string = Utilidades.mejorarEquipamientoAleatorio(sala, miJugador)
                if (textoMejora != "") {
                    sala.agregarRegistro(`🔮 ${miJugador.personaje} mejora ${textoMejora} por su pasiva.`);
                } else {
                    sala.agregarRegistro(`🔮 ${miJugador.personaje} trata de mejorar un equipamiento por su pasiva pero no tiene nada que se pueda mejorar.`);
                }
            }
        }
    }
}

export class Meg implements IPersonaje {
    nombre = "Meg";
    habilidad = "Megamaquina:\nTiene 3 vidas.\nTiene 3 modos: MECA, CHIQUITA y CONSTRUCTORA.\nEmpieza la partida en el modo MECA.";
    habilidadEnCatalan = "Robot:\nTé 3 vides. Comença en mode ROBOT. En morir, sobreviu amb 1 vida i 1 escut, i passa al mode XIQUETA. En aquest mode, roba una carta extra durant el seu torn i utilitzar un Fall et dona un altre Fall. En passar el torn, passa al mode CONSTRUCTORA. En aquest mode, a l’inici del torn torna al mode ROBOT.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMegMuerte", false];
    sfxDefault = "sfxMeg";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.bajarVidaMaxima(jugador, 1)
        jugador.string.set("modoMeg", "ROBOT")
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.vidas <= 0 && victima.string.get("modoMeg") == "ROBOT"){
            victima.vidas = 1
            Utilidades.agregarEscudos(sala, victima, 1, 1, "PASIVA")
            victima.string.set("modoMeg", "CHIQUITA")
            victima.spriteAvatarOpcional = "Meg chiquita"
            sala.reproducirSfx("sfxMegChiquita")
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador.estaVivo){
            return
        }
        if (jugador.string.get("modoMeg") == "CHIQUITA" && cartaJugada.nombre == "¡Fallo!"){
            let carta = CatalogoCartasEspeciales.crearFallo()
            carta.esConjurada = true
            jugador.mano.push(carta)
        }
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (jugador.string.get("modoMeg") == "CHIQUITA" && causa == "turno"){
            return 1
        }

        return 0
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo){
            return
        }
        if (jugador.string.get("modoMeg") == "CHIQUITA"){
            jugador.string.set("modoMeg", "CONSTRUCTORA")
            jugador.spriteAvatarOpcional = "Meg constructora"
        }
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador.estaVivo){
            return
        }
        if (miJugador.string.get("modoMeg") == "CONSTRUCTORA"){
            miJugador.string.set("modoMeg", "ROBOT")
            miJugador.spriteAvatarOpcional = ""
            sala.reproducirSfx("sfxMegMeca")
        }
    }
}

export class Perro implements IPersonaje {
    nombre = "Perro";
    habilidad = "La casa del perro:\nAl golpear: le coloca un perro con hueso en una carta aleatoria del otro jugador.\nAl recibir daño: le coloca un perro con hueso en 2 cartas aleatorias del otro jugador.";
    habilidadEnCatalan = "NADIE VA A LEER ESTO PORQUE EL CATALAN YA NO EXISTE EN ESTE JUEGO.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxPerroMuerte", true];
    sfxDefault = "sfxPerro"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (atacante && atacante.mano.length > 0) {
            let p: number = 0
            for (let i = 0; i < 2; i++){
                let cartasLibres = atacante.mano.filter((c: any) => c.idDuenoDelPerro === "");

                if (cartasLibres.length > 0) {
                    let indiceAleatorio = Math.floor(Math.random() * cartasLibres.length);
                    let cartaAleatoria = cartasLibres[indiceAleatorio];

                    let idDeLaVictima = "";
                    sala.getJugadores().forEach((j, sessionId) => {
                        if (j === victima) idDeLaVictima = sessionId;
                    });

                    cartaAleatoria.idDuenoDelPerro = idDeLaVictima;
                    p++
                }
            }

            sala.agregarRegistro(`🐶 ¡${victima.personaje} le colocó ${p} perro con hueso a ${atacante.personaje}!`)
        }
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (jugadorGolpeado && jugadorGolpeado.mano.length > 0) {
            let cartasLibres = jugadorGolpeado.mano.filter((c: any) => c.idDuenoDelPerro === "");

            if (cartasLibres.length > 0) {
                let indiceAleatorio = Math.floor(Math.random() * cartasLibres.length);
                let cartaAleatoria = cartasLibres[indiceAleatorio];

                cartaAleatoria.idDuenoDelPerro = Utilidades.obtenerSessionIdDeJugador(sala, miJugador);
                sala.agregarRegistro(`🐶 ¡${miJugador.personaje} le colocó un perro con hueso a ${jugadorGolpeado.personaje}!`)
            }
        }
    }
}

export class DaveElLoco implements IPersonaje {
    nombre = "Dave el loco";
    habilidad = "Plantas:\nAl inicio de la partida: comenzas con un girasol.\nCuando roba: roba 1 menos pero a cambio te da una planta entre 16 posibles.";
    habilidadEnCatalan = "NADIE VA A LEER ESTO PORQUE EL CATALAN YA NO EXISTE EN ESTE JUEGO.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCrazyDaveMuerte", false];
    sfxDefault = "sfxCrazyDave1";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        let girasol: Carta = CatalogoCartasEspeciales.crearGirasol()
        girasol.esConjurada = true
        if (girasol){
            Utilidades.equiparCarta(sala, jugador, girasol, "girasol")
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador.estaVivo){
            return
        }
        const numero: number = Math.floor(Math.random() * 12) + 1
        const sfx: string = "sfxCrazyDave" + numero
        sala.reproducirSfx( sfx)
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (!jugador){
            console.error("El jugador no existe al robar cartas con dave el loco")
            return 0
        }

        const carta: Carta = CatalogoCartasEspeciales.crearCartaPlantaAleatoria()
        if (carta){
            carta.esConjurada = true
            jugador.mano.push(carta)
        } else {
            console.error("ERROR: dave el loco al crear una planta dio null")
        }

        return -1
    }
}

export class Junkrat implements IPersonaje {
    nombre = "Junkrat";
    habilidad = "Demolicion:\nAl inicio del turno: roba tantas cartas como salud tenga y luego recibe 1 de daño asi mismo, despues de eso roba las 2 de su turno\nPenalizacion 1.";
    habilidadEnCatalan = "NADIE VA A LEER ESTO PORQUE EL CATALAN YA NO EXISTE EN ESTE JUEGO.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador){
            console.error("ERROR: miJugador no existe en junkrat onIniciarTurno")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en junkrat onIniciarTurno")
            return
        }
        if (!miJugador.estaVivo){
            return
        }

        if (miJugador.vidas >= 0){
            sala.repartirCartas(miJugador, miJugador.vidas, "pasiva")
            Utilidades.procesarDano(sala, miJugador, miJugador, 1, "pasiva", false)
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
    }
}

export class Max implements IPersonaje {
    nombre = "Max";
    habilidad = "Max energy:\nCada 3 cartas que juegues roba una carta.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault: string = "sfxMax"
    sfxMuerte: [string, boolean, number?] = ["sfxMaxMuerte", false]

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en max iniciar partida")
            return
        }

        jugador.number.set("maxJugadas", 0)
    }

    onJugarCarta(sala: IMyRoom, jugador: any, cartaJugada: Carta): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en max on jugar carta")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en max on jugar carta")
            return
        }
        if (!jugador.estaVivo){
            return
        }
        
        const maxJugadas: number = jugador.number.get("maxJugadas")
        jugador.number.set("maxJugadas", maxJugadas + 1)

        if (jugador.number.get("maxJugadas") >= 3){
            jugador.number.set("maxJugadas", 0)
            sala.repartirCartas(jugador, 1, "pasiva")
            sala.agregarRegistro(`⚡ ${jugador.personaje} roba una carta extra por su pasiva.`)
            sala.reproducirSfx("sfxMaxHabilidad")
        }
    }
}

export class Tracer implements IPersonaje {
    nombre = "Tracer";
    habilidad = "Lo intentaremos otra vez:\nTiene 2 vidas menos.\nAl inicio de la partida y boton: guarda tu estado.\nAl morir: vuelve a su ultimo estado guardado (1 vez si es Sheriff, si no 2 veces).";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTracer", false];
    sfxDefault = "sfxTracer";

    private vidaGuardada: number = 0
    private vidaMaximaGuardada: number = 0
    private escudosGuardado: number = 0
    private listaCartasGuardadas: Carta[] = []
    private listaEquipamientoGuardado = new MapSchema<Carta>()
    private listaEfectoGuardado = new MapSchema<number>();

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("tracerVecesMuerta", 0);

        let boton = new HabilidadActiva();
        boton.id = "tracer_guardarEstado";
        boton.textoBoton = "Guardar estado";
        boton.tooltip = "Guarda tu estado";
        boton.spriteBoton = "botonTracer";
        jugador.habilidadesActivas.push(boton);

        Utilidades.bajarVidaMaxima(jugador, 2)

        this.tracerGuardarEstado(sala, jugador)
    }

    tracerRetrocederEnElTiempo(sala: IMyRoom, jugador: Jugador, limite: number): void {
        jugador.vidasMaximas = this.vidaMaximaGuardada
        jugador.vidas = this.vidaGuardada
        jugador.turnosEscudos = []
        Utilidades.agregarEscudos(sala, jugador, this.escudosGuardado, 1, "pasiva")
        
        for (let i = 0; i < jugador.mano.length; i++){
            let carta: Carta = jugador.mano[i]
            if (carta){
                sala.agregarAlDescarte(carta, jugador, null)
            }
        }

        jugador.mano.splice(0, jugador.mano.length)
        
        for (let i = 0; i < this.listaCartasGuardadas.length; i++){
            let carta: Carta = this.listaCartasGuardadas[i]
            if (carta){
                jugador.mano.push(carta)
            }
        }

        Utilidades.destruirTodosLosEquipamientos(sala, jugador)

        for (const [clave, carta] of this.listaEquipamientoGuardado) {
            if (carta){
                Utilidades.equiparCarta(sala, jugador, carta, clave)
            }
        }

        Utilidades.eliminarTodosLosEfectos(sala, jugador)

        for (const [clave, cantidad] of this.listaEfectoGuardado) {
            Utilidades.agregarEfecto(jugador, clave, cantidad)
        }

        sala.agregarRegistro(`⏪ ¡TRACER MURIÓ PERO RETROCEDIÓ EN EL TIEMPO! (${jugador.number.get("tracerVecesMuerta")}/${limite})`);
        sala.reproducirSfx("sfxTracerHabilidad");
    }

    tracerGuardarEstado(sala: IMyRoom, jugador: Jugador): void {
        this.listaCartasGuardadas = []
        this.listaEquipamientoGuardado.clear()

        this.vidaGuardada = jugador.vidas
        this.vidaMaximaGuardada = jugador.vidasMaximas
        this.escudosGuardado = jugador.vidasEscudo

        for (let i = 0; i < jugador.mano.length; i++){
            let carta: Carta = jugador.mano[i]
            if (carta){
                let clon: Carta = Utilidades.clonarCarta(carta)
                if (clon){
                    this.listaCartasGuardadas.push(clon)
                }
            }
        }

        for (const [clave, carta] of jugador.equipamiento) {
            if (carta){
                let clon: Carta = Utilidades.clonarCarta(carta)
                if (clon){
                    this.listaEquipamientoGuardado.set(clave, clon)
                }
            }
        }

        for (const [clave, cantidad] of jugador.efecto) {
            this.listaEfectoGuardado.set(clave, cantidad)
        }

        sala.agregarRegistro(`⏱️ ¡Tracer ha marcado un punto de retorno temporal!`);
    }

    ejecutarHabilidadActiva(sala: any, jugador: Jugador, client: any, idHabilidad: string): void {
        if (jugador.estaVivo && idHabilidad == "tracer_guardarEstado"){
            this.tracerGuardarEstado(sala, jugador)
        }
    }

    onRecibirDano(sala: any, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima || !sala) return;

        let limite: number = 2
        if (victima.rol == "Sheriff"){
            limite = 1
        }

        if (victima.vidas <= 0 && victima.number.get("tracerVecesMuerta") < limite) {
            
            victima.number.set("tracerVecesMuerta", victima.number.get("tracerVecesMuerta") + 1);
            
            this.tracerRetrocederEnElTiempo(sala, victima, limite)
        }
    }
}

export class Pedro implements IPersonaje {
    nombre = "Pedro";
    habilidad = "Alimentame:\nAl golpear: le descarta un equipamiento aleatorio y pedro crece.\nAl recibir daño: pedro decrece.\nCada nivel de crecimiento le da 1 de alcance.\nEl nivel de crecimiento 1, 3 y 5 le da almacenamiento +1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    spriteFueraDeJuego: boolean = true
    sfxMuerte: [string, boolean] = ["muertePedro", true];
    sfxDefault = "sfxPedro"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("pedroCrecimiento", 0)
        jugador.boolean.set("mostrarPedro", true)
        jugador.boolean.set("spriteFueraDeJuego", true)
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (!miJugador){
            console.error("ERROR: miJugador es null en pedro onGolpear")
            return
        }
        if (!jugadorGolpeado){
            console.error("ERROR: jugadorGolpeado es null en pedro onGolpear")
            return
        }
        if (!sala){
            console.error("ERROR: sala es null en pedro onGolpear")
            return
        }

        const descarte: any = Utilidades.descartarEquipamientoAleatorio(sala, jugadorGolpeado, null)
        if (descarte != null){
            if (miJugador.number.get("pedroCrecimiento") < 5){
                miJugador.number.set("pedroCrecimiento", miJugador.number.get("pedroCrecimiento") + 1)
                sala.agregarRegistro(`🌿 ${miJugador.personaje} crece ${miJugador.number.get("pedroCrecimiento")}/5`)
                sala.reproducirSfx("sfxPedroCreciendo")
            }
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        if (!jugador){
            console.error("ERROR: jugador no existe en pedro modificarCartasEnManoAlPasarTurno")
            return 0
        }
        if (!sala){
            console.error("ERROR: sala no existe en pedro modificarCartasEnManoAlPasarTurno")
            return 0
        }

        const crecimiento: number = jugador.number.get("pedroCrecimiento")
        if (crecimiento == 1 || crecimiento == 2){
            return 1
        } else if (crecimiento == 3 || crecimiento == 4){
            return 2
        } else if (crecimiento >= 5){
            return 3
        }

        return 0
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima){
            console.error("ERROR: victima no existe en pedro onRecibirDano")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en pedro onRecibirDano")
            return
        }

        if (victima.estaVivo){
            if (victima.number.get("pedroCrecimiento") > 0){
                const numero: number = Math.floor(Math.random() * 100) + 1
                if (numero <= 40){
                    victima.number.set("pedroCrecimiento", victima.number.get("pedroCrecimiento") - 1)
                    sala.agregarRegistro(`🌿 ${victima.personaje} decrece ${victima.number.get("pedroCrecimiento")}/5`)
                    sala.reproducirSfx("sfxPedroEncogiendose")
                }
            }
        }
    }
}

export class Amelia implements IPersonaje {
    nombre = "Amelia";
    habilidad = "Amelia la asombrosa:\nAl final del turno: gana un escudo (no sirve en 1vs1).\nCada 5 cartas que juega: gana un escudo.\nAl perder 2 vidas por otro jugador: conjura una Gran desaparicion.\nPenalizacion 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmelia", false];
    sfxDefault = "sfxAmelia"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en onInicarPartida en Amelia")
            return
        }

        jugador.number.set("ameliaJugadas", 0)
        jugador.number.set("ameliaVidasPerdias", 0)
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en onPasarTurno en Amelia")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en onPasarTurno en Amelia")
            return
        }

        if (!jugador.estaVivo){
            return
        }

        let totalVivos = 0;
        sala.getJugadores().forEach((j: any) => {
            if (j && j.estaVivo) totalVivos++;
        });

        if (totalVivos > 2){
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva")
            sala.agregarRegistro(`🎩 ${jugador.personaje} obtuvo un escudo por pasar su turno.`)
            const numero: number = Math.floor(Math.random() * 2);
            const sfx: string = "ameliaHabilidadAgregarEscudo" + numero
            sala.reproducirSfx(sfx)
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en onJugarCarta en Amelia")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en onJugarCarta en Amelia")
            return
        }

        if (!jugador.estaVivo){
            return
        }

        jugador.number.set("ameliaJugadas", jugador.number.get("ameliaJugadas") + 1)

        if (jugador.number.get("ameliaJugadas") >= 5){
            jugador.number.set("ameliaJugadas", 0)

            Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva")
            sala.agregarRegistro(`🎩 ${jugador.personaje} obtuvo un escudo por jugar 5 cartas`)
            const numero: number = Math.floor(Math.random() * 2);
            const sfx: string = "ameliaHabilidadAgregarEscudo" + numero
            sala.reproducirSfx(sfx)
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima){
            console.error("ERROR: victima no existe en onRecibirDano en Amelia")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en onRecibirDano en Amelia")
            return
        }
        if (!atacante){
            console.error("ERROR: atacante no existe en onRecibirDano en Amelia")
            return
        }
        if (!atacante.estaVivo){
            return
        }
        if (atacante == victima){
            return
        }

        if (!victima.estaVivo){
            return
        }

        if (danoCuerpo > 0){
            victima.number.set("ameliaVidasPerdias", victima.number.get("ameliaVidasPerdias") + danoCuerpo)
            if (victima.number.get("ameliaVidasPerdias") >= 2){
                victima.number.set("ameliaVidasPerdias", 0)

                let carta: Carta = CatalogoCartasEspeciales.crearGranDesaparicion()
                if (carta){
                    carta.idGranDesaparicion = Utilidades.obtenerSessionIdDeJugador(sala, atacante)
                    carta.esConjurada = true
                    if (carta.idGranDesaparicion != ""){
                        carta.descripcion = `Desaparece todo el equipamiento de ${atacante.personaje}`
                        victima.mano.push(carta)
                        sala.agregarRegistro(`🎩 ${victima.personaje} conjuró una Gran desaparicion vinculada a ${atacante.personaje}.`)
                        
                        const numero: number = Math.floor(Math.random() * 2);
                        const sfx: string = "ameliaConjuraGranDesaparicion" + numero
                        sala.reproducirSfx(sfx)
                    }
                }
            }
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
    }
}

export class Microbios implements IPersonaje {
    nombre = "Microbios";
    habilidad = "Microbios traviesos:\nAl jugar una carta: se mueve a antihorario.\nConjura una carta aleatoria que tenga en la mano del jugador que sobrepasa (2 veces, se recarga al inicio del turno).\nPenalizacion 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault = "sfxMicrobios"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en microbio onIniciarPartida")
            return
        }

        jugador.number.set("microbio", 0)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador){
            console.error("ERROR: miJugador no existe en microbio onIniciarTurno")
            return
        }

        miJugador.number.set("microbio", 0)
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador){
            console.error("ERROR: jugador no existe en microbio onJugarCarta")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en microbio onJugarCarta")
            return
        }

        if (!jugador.estaVivo){
            return
        }

        let jugadorSobrepasado = Utilidades.moverPosicionFisica(sala, jugador, "antihorario")

        jugador.number.set("microbio", jugador.number.get("microbio") + 1)

        let cartasOriginales: Carta[] = [];
        if (jugadorSobrepasado && jugadorSobrepasado.mano) {
            cartasOriginales = jugadorSobrepasado.mano.filter((c: any) => !c.esConjurada);
        }

        if (jugadorSobrepasado && cartasOriginales.length > 0 && jugadorSobrepasado.estaVivo && jugador.number.get("microbio") <= 2) {
            let indiceAleatorio = Math.floor(Math.random() * cartasOriginales.length);
            
            let cartaOriginal = cartasOriginales[indiceAleatorio];
            
            let clon = Utilidades.clonarCarta(cartaOriginal, "microbio");
            
            jugador.mano.push(clon);
            
            sala.agregarRegistro(`🦠 ¡${jugador.personaje} se movió a antihorario y copió un ${clon.nombre} de ${jugadorSobrepasado.personaje} (${jugador.number.get("microbio")}/2)!`);
            sala.reproducirSfx("microbioMovimiento");
        } else {
            sala.agregarRegistro(`🦠 ¡${jugador.personaje} se movió a antihorario!`);
            sala.reproducirSfx("microbioMovimiento");
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
    }
}

export class PerroNinja implements IPersonaje {
    nombre = "Perro Ninja";
    habilidad = "Corte preciso:\nAl perder vida: descarta tu Bang! de la izquierda tantas veces pueda para evitar el daño.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePerroNinja", false];
    sfxDefault = "sfxPerroNinja"

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima){
            console.error("ERROR: victima es null en onRecibirDano de Perro Ninja")
            return
        }
        if (!sala){
            console.error("ERROR: sala es null en onRecibirDano de Perro Ninja")
            return
        }
        if (!victima.estaVivo){
            return
        }

        if (danoCuerpo > 0) {
            for (let i = 0; i < danoCuerpo; i++) {
                let indiceBang = victima.mano.findIndex((c: any) => c.nombre === "BANG!");
                
                if (indiceBang !== -1) {
                    let cartaDescartada = victima.mano.splice(indiceBang, 1)[0];
                    sala.descartarCarta(cartaDescartada, victima, "PASIVA");
                    
                    victima.vidas++
                    sala.agregarRegistro(`🥷🐾 ¡${victima.personaje} descartó un BANG! para defenderse 1 de daño!`);
                    sala.reproducirSfx("perroNinjaDescarteBang");
                } else {
                    break; 
                }
            }
        }
    }
}

export class Monito implements IPersonaje {
    nombre = "Monito";
    habilidad = "Pandereta:\nCuando otro jugador juegue una copia de una de las cartas que tenes en tu mano (excepto BANG!): roba una carta (3 usos, se recarga al final del turno).\nPenalizacion 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMonito", false];
    sfxDefault = "sfxMonito"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onIniciarPartida de monito")
            return
        }

        jugador.number.set("monito", 0)
    }

    onJugarCartaGlobal(sala: IMyRoom, miJugador: Jugador, jugadorQueJuega: Jugador, cartaJugada: Carta): void {
        if (!miJugador){
            console.error("ERROR: miJugador no existe en onJugarCartaGlobal de Monito")
            return
        }
        if (!jugadorQueJuega){
            console.error("ERROR: jugadorQueJuega no existe en onJugarCartaGlobal de Monito")
            return
        }
        if (!sala){
            console.error("ERROR: sala no existe en onJugarCartaGlobal de Monito")
            return
        }
        if (!cartaJugada){
            console.error("ERROR: cartaJugada no existe en onJugarCartaGlobal de Monito")
            return
        }

        if (cartaJugada.nombre == "BANG!"){
            return
        }

        if (miJugador.estaVivo && miJugador != jugadorQueJuega){
            let tieneCopia = miJugador.mano.some((c: Carta) => c.nombre === cartaJugada.nombre);

            if (tieneCopia) {
                if (miJugador.number.get("monito") < 3){
                    miJugador.number.set("monito", miJugador.number.get("monito") + 1)
                    sala.repartirCartas(miJugador, 1, "pasiva");
                
                    sala.agregarRegistro(`🐒 ¡${miJugador.personaje} copió a ${jugadorQueJuega.personaje}! Como tiene un ${cartaJugada.nombre} en mano, roba 1 carta. (${miJugador.number.get("monito")}/3)`);
                    
                    sala.reproducirSfx("sfxMonito");
                }
            }
        }
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onPasarTurno de monito")
            return
        }

        jugador.number.set("monito", 0)
    }
}

export class KarateKillo implements IPersonaje {
    nombre = "Karate Killo";
    habilidad = "Oh yeah:\nSi juega 3 cartas antes del final del turno: entra en modo FLOW.\nBoton 1: descarta un Bang! y conjura una patada (1 por turno).\nBoton 2: descarta un Bang! y conjura una maceta.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKillo", false];
    sfxDefault = "sfxKillo"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onIniciarPartida en karate killo")
            return
        }

        let boton = new HabilidadActiva();
        boton.id = "killo_patada";
        boton.textoBoton = "Patada";
        boton.tooltip = "Descarta bang, gana patada";
        boton.spriteBoton = "botonKilloPatada";
        jugador.habilidadesActivas.push(boton);

        jugador.number.set("killoRecargaPatada", 0)

        let boton2 = new HabilidadActiva();
        boton2.id = "killo_maceta";
        boton2.textoBoton = "Maceta";
        boton2.tooltip = "Descarta bang, gana maceta";
        boton2.spriteBoton = "botonKilloMaceta";
        jugador.habilidadesActivas.push(boton2);

        jugador.number.set("karateKilloCombo", 0)
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onPasarTurno en karate killo")
            return
        }

        if (jugador.number.get("karateKilloCombo") < 3){
            jugador.number.set("karateKilloCombo", 0)
        }        
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onJugarCarta en karate killo")
            return
        }
        if (!jugador.estaVivo){
            return
        }

        if (jugador.number.get("karateKilloCombo") < 3){
            jugador.number.set("karateKilloCombo", jugador.number.get("karateKilloCombo") + 1)
            if (jugador.number.get("karateKilloCombo") >= 3){
                sala.reproducirSfx("killoEntraFlow")
                jugador.spriteAvatarOpcional = "Karate Killo flow"
            }
        }
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima){
            console.error("ERROR: victima es null en onRecibirDaño en karate killo")
            return
        }
        if (!victima.estaVivo){
            return
        }

        if (danoCuerpo > 0){
            if (victima.number.get("karateKilloCombo") >= 3){
                victima.number.set("karateKilloCombo", 0)
                sala.reproducirSfx("killoPierdeFlow")
                victima.spriteAvatarOpcional = ""
            }
        }
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador){
            console.error("ERROR: miJugador es null en onInicarTurno en karate killo")
            return
        }
        if (!miJugador.estaVivo){
            return
        }
        
        miJugador.number.set("killoRecargaPatada", miJugador.number.get("killoRecargaPatada") - 1)
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador){
            console.error("ERROR: jugador es null en ejecutarHabilidadActiva de Killo");
            return;
        }
        if (!sala){
            console.error("ERROR: sala es null en ejecutarHabilidadActiva de Killo");
            return;
        }

        if (jugador.number.get("karateKilloCombo") < 3){
            client.send("alerta_personal", "Necesitás estar en modo flow para usar las habilidades.")
            return
        }

        if (jugador.estaVivo && idHabilidad === "killo_patada") {

            if (jugador.number.get("killoRecargaPatada") > 0){
                client.send("alerta_personal", `Esta habilidad se está recargando, faltan ${jugador.number.get("killoRecargaPatada")} rondas.`)
                return
            }
            
            let indiceBang = jugador.mano.findIndex((c: any) => c.nombre === "BANG!");

            if (indiceBang === -1) {
                client.send("alerta_personal", "Necesitás tener al menos un BANG! en la mano para preparar la Patada Killo.");
                return;
            }

            let cartaDescartada = jugador.mano.splice(indiceBang, 1)[0];
            sala.descartarCarta(cartaDescartada, jugador, "HABILIDAD"); 

            let nuevaCarta = CatalogoCartasEspeciales.crearPatadaKillo();
            nuevaCarta.esConjurada = true; 
            jugador.mano.push(nuevaCarta);
            
            sala.agregarRegistro(`🥋 ¡${jugador.personaje} sacrificó un BANG! para preparar una Patada Killo!`);
            jugador.number.set("killoRecargaPatada", 1)
        } 
        else if (jugador.estaVivo && idHabilidad === "killo_maceta") {
            
            let indiceBang = jugador.mano.findIndex((c: any) => c.nombre === "BANG!");

            if (indiceBang === -1) {
                client.send("alerta_personal", "Necesitás tener al menos un BANG! en la mano para preparar la Maceta Killo.");
                return;
            }

            let cartaDescartada = jugador.mano.splice(indiceBang, 1)[0];
            sala.descartarCarta(cartaDescartada, jugador, "HABILIDAD"); 

            let nuevaCarta = CatalogoCartasEspeciales.crearMacetaKillo();
            nuevaCarta.esConjurada = true; 
            jugador.mano.push(nuevaCarta);
            
            sala.agregarRegistro(`🪴 ¡${jugador.personaje} sacrificó un BANG! para preparar una Maceta Killo!`);
        }
    }
}

export class Tripulante implements IPersonaje {
    nombre = "Tripulante";
    habilidad = "Tripulante ejemplar:\nAl final del turno: se pone a hacer una de 4 tareas que quieras: CABLES, ARCHIVOS, PESCADOS, ESCUDOS.\nPerder vida te cancela una tarea.\nRepetir tu ultima tarea cambia automaticamente a la siguiente.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault: string = "sfxTripulante"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onIniciarPartida en Tripulante")
            return
        }

        jugador.string.set("tripulanteModo", "cables")
        jugador.string.set("tripulanteUltimaTarea", "")
        jugador.boolean.set("tripulanteHaciendoTarea", false)

        let boton = new HabilidadActiva();
        boton.id = "tripulante";
        boton.textoBoton = "Cambiar tarea";
        boton.tooltip = "Cambia tu tarea";
        boton.spriteBoton = "botonTripulanteCables";
        jugador.habilidadesActivas.push(boton);
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onPasarTurno en Tripulante")
            return
        }
        if (!sala){
            console.error("ERROR: sala es null en onPasarTurno en Tripulante")
            return
        }
        

        if (jugador.string.get("tripulanteModo") == jugador.string.get("tripulanteUltimaTarea")){
            let boton: HabilidadActiva = jugador.habilidadesActivas.find((hab: any) => hab.id === "tripulante");
            this.cambiarALaSiguienteTarea(jugador, boton, jugador.string.get("tripulanteModo"))
            sala.agregarRegistro(`ඞා ${jugador.personaje} repitió tarea y cambia de ${jugador.string.get("tripulanteUltimaTarea").toUpperCase()} a ${jugador.string.get("tripulanteModo").toUpperCase()}.`)
        }

        const modoActual: string = jugador.string.get("tripulanteModo")

        if (modoActual){
            jugador.spriteAvatarOpcional = "Tripulante " + modoActual
        }

        jugador.boolean.set("tripulanteHaciendoTarea", true)
        jugador.string.set("tripulanteUltimaTarea", modoActual)

        sala.agregarRegistro(`ඞා ${jugador.personaje} empezó a hacer la tarea ${modoActual.toUpperCase()}.`)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador){
            console.error("ERROR: miJugador es null en onIniciarTurno en Tripulante")
            return
        }
        if (!sala){
            console.error("ERROR: sala es null en onIniciarTurno en Tripulante")
            return
        }

        if (!miJugador.boolean.get("tripulanteHaciendoTarea")){
            return
        }

        const modoActual: string = miJugador.string.get("tripulanteModo")

        if (modoActual == "cables"){
            let textoMejora = Utilidades.mejorarEquipamientoAleatorio(sala, miJugador);

            if (textoMejora !== "") {
                sala.reproducirSfx("robinMejora");
                sala.agregarRegistro(`ඞා ${miJugador.personaje} mejoró ${textoMejora}`)
            } else {
                sala.agregarRegistro(`ඞා ${miJugador.personaje} no pudo mejorar nada.`)
            }
        } else if (modoActual == "archivos"){
            sala.repartirCartas(miJugador, 2, "pasiva")
            sala.agregarRegistro(`ඞා ${miJugador.personaje} robó 2 cartas.`)
        } else if (modoActual == "pescados"){
            if (Utilidades.puedeRecibirCuracion(sala, miJugador)){
                Utilidades.aplicarCuracion(sala, miJugador, 1, "pasiva", false)
                sala.agregarRegistro(`ඞා ${miJugador.personaje} se cura.`)
            } else {
                sala.agregarRegistro(`ඞා ${miJugador.personaje} no se pudo curar.`)
            }
        } else {
            Utilidades.agregarEscudos(sala, miJugador, 2, 1, "pasiva")
            sala.agregarRegistro(`ඞා ${miJugador.personaje} obtuvo 2 escudos.`)
        }

        miJugador.boolean.set("tripulanteHaciendoTarea", false)
        miJugador.spriteAvatarOpcional = ""
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima){
            console.error("ERROR: victima es null en onPasarTurno en Tripulante")
            return
        }
        if (!sala){
            console.error("ERROR: sala es null en onPasarTurno en Tripulante")
            return
        }

        if (danoCuerpo > 0 && victima.boolean.get("tripulanteHaciendoTarea")){
            victima.boolean.set("tripulanteHaciendoTarea", false)
            victima.spriteAvatarOpcional = ""
            sala.agregarRegistro(`ඞා ${victima.personaje} dejó de hacer la tarea.`)
        }
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador){
            console.error("ERROR: jugador es null en ejecutarHabilidadActiva en Tripulante")
            return
        }

        let boton: HabilidadActiva = jugador.habilidadesActivas.find((hab: any) => hab.id === "tripulante");

        const modoActual: string = jugador.string.get("tripulanteModo")

        this.cambiarALaSiguienteTarea(jugador, boton, modoActual)        
    }

    private cambiarALaSiguienteTarea(miJugador: Jugador, boton: HabilidadActiva, modoActual: string): void {
        if (modoActual){
            if (modoActual == "cables"){
                miJugador.string.set("tripulanteModo", "archivos")
                boton.spriteBoton = "botonTripulanteArchivos"
            } else if (modoActual == "archivos"){
                miJugador.string.set("tripulanteModo", "pescados")
                boton.spriteBoton = "botonTripulantePescados"
            } else if (modoActual == "pescados"){
                miJugador.string.set("tripulanteModo", "escudos")
                boton.spriteBoton = "botonTripulanteEscudos"
            } else {
                miJugador.string.set("tripulanteModo", "cables")
                boton.spriteBoton = "botonTripulanteCables"
            }
        }
    }
}

export class Shelly implements IPersonaje {
    nombre = "Shelly";
    habilidad = "Escopetazo:\nBoton (1 por turno): descarta hasta 3 Bangs! y conjura un Escopetazo Bang!\nAl final del turno: si no usó su boton, conjura un Bang!.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault: string = "sfxShelly"
    sfxMuerte: [string, boolean, number?] = ["sfxShellyMuerte", false]

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador){
            console.error("ERROR: jugador es null en onIniciarPartida de Shelly")
            return
        }

        let boton = new HabilidadActiva();
        boton.id = "shellyEscopeta";
        boton.textoBoton = "Carga una escopeta";
        boton.tooltip = "Carga escopeta descartando Bang!";
        boton.spriteBoton = "botonShellyEscopeta";
        jugador.habilidadesActivas.push(boton);
        
        jugador.number.set("shellyRecarga", 0)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        miJugador.number.set("shellyRecarga", miJugador.number.get("shellyRecarga") - 1)
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador){
            console.error("ERROR: jugador es null en ejecutarHabilidadActiva en shelly");
            return;
        }
        if (!sala){
            console.error("ERROR: sala es null en ejecutarHabilidadActiva en shelly");
            return;
        }

        if (jugador.estaVivo && idHabilidad === "shellyEscopeta") {

            if (jugador.number.get("shellyRecarga") > 0){
                client.send("alerta_personal", `Esta habilidad se está recargando, faltan ${jugador.number.get("shellyRecarga")} rondas.`);
                return;
            }
            
            let cantidadBangs = jugador.mano.filter((c: any) => c.nombre === "BANG!").length;

            if (cantidadBangs < 1) {
                client.send("alerta_personal", "Necesitás tener al menos un BANG! en tu mano para usar esta habilidad.");
                return;
            }

            let descartados = 0;
            for (let i = jugador.mano.length - 1; i >= 0; i--) {
                if (jugador.mano[i].nombre === "BANG!" && descartados < 3) {
                    let cartaExtraida = jugador.mano.splice(i, 1)[0];
                    sala.descartarCarta(cartaExtraida, jugador, "HABILIDAD");
                    descartados++;
                }
            }

            if (descartados > 0){
                let carta: Carta = CatalogoCartasEspeciales.crearEscopetazo(); 
                if (carta){
                    carta.descripcion = `Hace ${descartados} de daño a un jugador a tu alcance.`;
                    carta.efecto = `dano_${descartados}`;
                    carta.esConjurada = true;
                    jugador.mano.push(carta);
                    jugador.number.set("shellyRecarga", 1);

                    sala.agregarRegistro(`🔫 ¡${jugador.personaje} cargó su Escopetazo descartando ${descartados} BANG!`);
                    sala.reproducirSfx("sfxShellyBoton")
                }
            }
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.number.get("shellyRecarga") <= 0){
            const carta: Carta = CatalogoCartasEspeciales.crearBang()
            if (carta){
                carta.esConjurada = true
                jugador.mano.push(carta)

                sala.reproducirSfx("habilidadShelly")
                sala.agregarRegistro(`🔫 ${jugador.personaje} conjura un Bang! por su pasiva.`)
            }
        }
    }
}

export class Byron implements IPersonaje {
    nombre = "Byron";
    habilidad = "Tratamiento completo:\nBoton (1 por turno): descarta dos Bangs! y conjura un Botiquin.\nAl golpear: agrega 1 de efecto Malestar.";
    habilidadEnCatalan = "..";
    vidasBase = 4;

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        let botonTransmutar = new HabilidadActiva();
        botonTransmutar.id = "byron_botiquin";
        botonTransmutar.textoBoton = "Transmutar";
        botonTransmutar.tooltip = "Transforma tu BANG! de más a la izquierda en un Botiquín.";
        botonTransmutar.spriteBoton = "botonByron";
        jugador.habilidadesActivas.push(botonTransmutar);

        jugador.boolean.set("byronUsado", false);
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("byronUsado", false);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador) {
            console.error("ERROR: jugador es null en ejecutarHabilidadActiva de Byron");
            return;
        }
        if (!sala) {
            console.error("ERROR: sala es null en ejecutarHabilidadActiva de Byron");
            return;
        }

        if (jugador.estaVivo && idHabilidad === "byron_botiquin") {

            if (jugador.boolean.get("byronUsado") === true) {
                client.send("alerta_personal", "Ya usaste tu habilidad en este turno.");
                return;
            }

            let indicesBang: number[] = [];

            for (let i = 0; i < jugador.mano.length; i++) {
                if (jugador.mano[i].nombre === "BANG!") {
                    indicesBang.push(i);

                    if (indicesBang.length === 2) {
                        break;
                    }
                }
            }

            if (indicesBang.length < 2) {
                client.send("alerta_personal", "Necesitás tener al menos 2 BANG! en la mano.");
                return;
            }

            for (let i = 0; i < 2; i++) {
                let cartaExtraida = jugador.mano.splice(indicesBang[0], 1)[0];
                sala.descartarCarta(cartaExtraida, jugador, "HABILIDAD");
                indicesBang.shift();
                indicesBang = indicesBang.map(indice => indice - 1);
            }

            let nuevoBotiquin = CatalogoCartasEspeciales.crearBotiquin();

            if (nuevoBotiquin) {
                nuevoBotiquin.esConjurada = true;
                jugador.mano.push(nuevoBotiquin);

                jugador.boolean.set("byronUsado", true);

                sala.agregarRegistro(`🧪 ¡${jugador.personaje} convirtió 2 BANG! en un Botiquín!`);
            }
        }
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (jugadorGolpeado.efecto.has("malestar")){
            jugadorGolpeado.efecto.set("malestar", jugadorGolpeado.efecto.get("malestar") + 1)
        } else {
            jugadorGolpeado.efecto.set("malestar", 1)
        }
    }
}

export class GeiruToneido implements IPersonaje {
    nombre = "Geiru Toneido";
    habilidad = "Payasa:\nAl inicio del turno: conjura una Horda de Bloons.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteGeiru", false];
    sfxDefault = "sfxGeiru";

    onIniciarTurno(sala: any, miJugador: any): void {
        let carta: Carta = CatalogoCartasEspeciales.crearHordaDeBloons()
        if (carta){
            carta.esConjurada = true
            miJugador.mano.push(carta)
            sala.agregarRegistro(`🎈 ¡${miJugador.personaje} conjuró una Horda de Bloons!`);
            sala.reproducirSfx("geiruBoton"); 
        }
    }
}

export class Pierre implements IPersonaje {
    nombre = "Pierre";
    habilidad = "Tienda de calidad:\nCuando roba: tiene un % de robar 1 menos pero a cambio te da una carta de su tienda.\nAl inicio de la partida: coloca el % en 50.\nSi obtiene una carta de su tienda, el % baja en 10, si no sube en 20.";
    habilidadEnCatalan = "NADIE VA A LEER ESTO PORQUE EL CATALAN YA NO EXISTE EN ESTE JUEGO.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew"

    subirPierre: number = 20
    bajarPierre: number = 10

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("pierre", 50)
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (!jugador){
            console.error("El jugador no existe al robar cartas con pierre")
            return 0
        }

        const numero: number = Math.floor(Math.random() * 100) + 1

        if (numero <= jugador.number.get("pierre")){
            jugador.number.set("pierre", jugador.number.get("pierre") - this.bajarPierre)
            this.limitesPierre(jugador)
            const carta: Carta = CatalogoCartasEspeciales.crearCartaPierreAleatoria()
            if (carta){
                carta.esConjurada = true
                jugador.mano.push(carta)
            } else {
                console.error("ERROR: pierre al crear carta dio null")
            }

            sala.agregarRegistro(`🛒 ¡${jugador.personaje} obtuvo una carta de la tienda de Pierre!`)

            return -1

        } else {
            jugador.number.set("pierre", jugador.number.get("pierre") + this.subirPierre)
            this.limitesPierre(jugador)

            return 0
        }
    }

    limitesPierre(jugador: Jugador): void {
        if (jugador.number.get("pierre") < 0){
            jugador.number.set("pierre", 0)
        } else if (jugador.number.get("pierre") > 100){
            jugador.number.set("pierre", 100)
        }
    }
}

export class Wendy implements IPersonaje {
    nombre = "Wendy";
    habilidad = "Protectora:\nAl perder vida: ataca el escudo de los rivales siguientes para protegerse, si no puede, gana un escudo.\nBoton (1 por turno): descarta el Bang! de la izquierda y conjura un Secador.\nTiene -1 vida.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteWendy", false];
    sfxDefault = "sfxWendy";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.bajarVidaMaxima(jugador, 1)

        let boton = new HabilidadActiva();
        boton.id = "wendy_secador";
        boton.textoBoton = "Crear Secador";
        boton.tooltip = "Descarta tu BANG! de la izquierda y conjura un Secador.";
        boton.spriteBoton = "botonWendy";
        jugador.habilidadesActivas.push(boton);

        jugador.boolean.set("wendyUsada", false);
    }

    onIniciarTurno(sala: any, miJugador: any): void {
        miJugador.boolean.set("wendyUsada", false);
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima || !sala) return;

        if (danoCuerpo > 0) {
            let idWendy = Utilidades.obtenerSessionIdDeJugador(sala, victima);
            
            // Obtenemos a los jugadores vivos en orden de ronda
            let vivos: string[] = [];
            if (sala.getSillasFisicas() && sala.getSillasFisicas().length > 0) {
                sala.getSillasFisicas().forEach((id: string) => {
                    let j = sala.getJugadores().get(id);
                    if (j && j.estaVivo) vivos.push(id);
                });
            }

            let wendyIdx = vivos.indexOf(idWendy);
            let danoNoAbsorbido = danoCuerpo;

            // Por cada punto de daño que recibió en el cuerpo
            for (let i = 0; i < danoCuerpo; i++) {
                let escudoRobado = false;

                // Buscamos hacia adelante en la mesa
                for (let step = 1; step < vivos.length; step++) {
                    let checkIdx = (wendyIdx + step) % vivos.length;
                    let targetId = vivos[checkIdx];
                    let targetJugador = sala.getJugadores().get(targetId);
                    
                    if (targetJugador && targetJugador.vidasEscudo > 0) {
                        escudoRobado = true;
                        
                        // Le hacemos 1 de daño (lo que le romperá 1 escudo)
                        Utilidades.procesarDano(sala, targetJugador, victima, 1, "SECADOR", false);
                        
                        // Wendy se cura ese daño bruta y mágicamente
                        victima.vidas++; 
                        if (victima.vidas > victima.vidasMaximas) {
                            victima.vidas = victima.vidasMaximas;
                        }

                        danoNoAbsorbido--;
                        sala.agregarRegistro(`𖣘 ¡${victima.personaje} se protegió con el escudo de ${targetJugador.personaje}!`);
                        
                        break;
                    }
                }

                // Si recorrimos toda la mesa y no hubo escudos, cortamos la búsqueda
                if (!escudoRobado) {
                    break;
                }
            }

            // Si al final de todo el robo, todavía le quedó daño por absorber
            if (danoNoAbsorbido > 0) {
                Utilidades.agregarEscudos(sala, victima, 1, 1, "PASIVA");
                sala.agregarRegistro(`𖣘 ¡Al no encontrar escudos, ${victima.personaje} generó 1 escudo!`);
            }
        }
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador || !sala) return;

        if (jugador.estaVivo && idHabilidad === "wendy_secador") {
            
            if (jugador.boolean.get("wendyUsada") === true) {
                client.send("alerta_personal", "Ya usaste tu habilidad en este turno.");
                return;
            }

            let indiceBang = jugador.mano.findIndex((c: any) => c.nombre === "BANG!");

            if (indiceBang === -1) {
                client.send("alerta_personal", "Necesitás tener al menos un BANG! en la mano.");
                return;
            }

            let cartaExtraida = jugador.mano.splice(indiceBang, 1)[0];
            sala.descartarCarta(cartaExtraida, jugador, "HABILIDAD");

            let nuevaCarta = CatalogoCartasEspeciales.crearSecador()
            nuevaCarta.esConjurada = true

            jugador.mano.push(nuevaCarta);
            jugador.boolean.set("wendyUsada", true);

            sala.agregarRegistro(`𖣘 ¡${jugador.personaje} sacrificó su BANG! y conjuró un Secador!`);
            sala.reproducirSfx("sfxBotonWendy")
        }
    }
}

export class Abigail implements IPersonaje {
    nombre = "Abigail";
    habilidad = "Repugnante:\nComo una buena asquerosa, repulsiva, fea y molesta, al golpear a otro jugador le agrega un efecto tocxic.\nBoton: pierde 1 vida y todos los demas obtienen 1 efecto tocxic.\nAl recibir daño: le agrega un efecto tocxic.";
    habilidadEnCatalan = "..";
    vidasBase = 4;

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        let botonAbigail = new HabilidadActiva();
        botonAbigail.id = "abigail_tocxic";
        botonAbigail.textoBoton = "Ouija";
        botonAbigail.tooltip = "Pierde 1 vida, 1 tocxic al resto.";
        botonAbigail.spriteBoton = "botonAbigail";
        jugador.habilidadesActivas.push(botonAbigail);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (!jugador) {
            console.error("ERROR: jugador es null en ejecutarHabilidadActiva de Byron");
            return;
        }
        if (!sala) {
            console.error("ERROR: sala es null en ejecutarHabilidadActiva de Byron");
            return;
        }

        if (jugador.estaVivo && idHabilidad === "abigail_tocxic") {
            

            if (jugador.vidas == 1) {
                client.send("alerta_personal", "No podes usar la habilidad con 1 de vida.");
                return;
            }

            sala.getJugadores().forEach((j: Jugador) => {
                if (j.estaVivo && j != jugador){
                    Utilidades.agregarEfecto(j, "tocxic", 1)
                }
            });

            Utilidades.procesarDano(sala, jugador, jugador, 1, "boton", true)

            sala.agregarRegistro(`☣️ ¡${jugador.personaje} pierde 1 vida para agregarle a todos los demas un efecto tocxi!`)
        }
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (miJugador == jugadorGolpeado || !miJugador.estaVivo || !jugadorGolpeado.estaVivo){
            return
        }

        Utilidades.agregarEfecto(jugadorGolpeado, "tocxic", 1)
        sala.agregarRegistro(`☣️ ${miJugador.personaje} le agrega un efecto tocxic a ${jugadorGolpeado.personaje}.`)
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima == atacante || !victima.estaVivo || !atacante.estaVivo){
            return
        }

        Utilidades.agregarEfecto(atacante, "tocxic", 1)
        sala.agregarRegistro(`☣️ ${victima.personaje} le agrega un efecto tocxic a ${atacante.personaje}.`)
    }
}

export class Zombistein implements IPersonaje {
    nombre = "Zombistein";
    habilidad = "GARGANTUAR:\nCuando tiene 2 vidas o menos: cambia al modo Zombistein enojado.\nLa primera vez que tiene 2 vidas o menos: lanza un zombidito a todos los demas jugadores.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteZombistein", false];
    sfxDefault = "sfxZombistein";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("esZombistein", true)
        jugador.boolean.set("zombiditoCargado", true)
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        this.actualizarSprite(victima)
        if (victima.boolean.get("zombiditoCargado") && victima.vidas <= 2){
            victima.boolean.set("zombiditoCargado", false)

            sala.getJugadores().forEach((j: any) => {
            if (j.estaVivo && (j != victima)){
                let z: Carta = CatalogoCartasEspeciales.crearZombidito()
                if (z){
                    z.esConjurada = true
                    j.mano.push(z)
                }
            }

            sala.reproducirSfx("zombiditoLanzado")
        });
        }
    }

    onRecibirCuracion(sala: IMyRoom, jugador: Jugador): void {
        this.actualizarSprite(jugador)
    }

    actualizarSprite(jugador: Jugador){
        if (jugador.vidas <= 2){
            jugador.spriteAvatarOpcional = "Zombistein enojado"
        } else {
            jugador.spriteAvatarOpcional = ""
        }
    }
}

export class Charlie implements IPersonaje {
    nombre = "Charlie";
    habilidad = "Digestion:\nCuando roba: conjura una crisalida con un % de exito.\nAl inicio de la partida: coloca el % en 50.\nSi obtiene la crisalida, el % baja en 10, si no sube en 20.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCharlieMuerte", false];
    sfxDefault = "sfxCharlie";

    subirCharlie: number = 20
    bajarCharlie: number = 10

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("charlie", 50)
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (!jugador){
            console.error("El jugador no existe al robar cartas con charlie")
            return 0
        }

        const numero: number = Math.floor(Math.random() * 100) + 1

        if (numero <= jugador.number.get("charlie")){
            jugador.number.set("charlie", jugador.number.get("charlie") - this.bajarCharlie)
            this.limitesCharlie(jugador)
            const carta: Carta = CatalogoCartasEspeciales.crearCrisalida()
            if (carta){

                carta.esConjurada = true
                jugador.mano.push(carta)

                const n: number = Math.floor(Math.random() * 4)
                const sfx: string = "sfxCharlieConjura" + n
                sala.reproducirSfx(sfx)

            } else {
                console.error("ERROR: charlie al crear carta dio null")
            }

            sala.agregarRegistro(`🐚 ¡${jugador.personaje} obtuvo una crisalida!`)
        } else {
            jugador.number.set("charlie", jugador.number.get("charlie") + this.subirCharlie)
            this.limitesCharlie(jugador)
        }

        return 0
    }

    limitesCharlie(jugador: Jugador): void {
        if (jugador.number.get("charlie") < 0){
            jugador.number.set("charlie", 0)
        } else if (jugador.number.get("charlie") > 100){
            jugador.number.set("charlie", 100)
        }
    }
}

export class ElP implements IPersonaje {
    nombre = "ElP";
    habilidad = "Robotilin:\nAl perder vida: gana un jugo.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxElpMuerto", false];
    sfxDefault = "sfxElp";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("jugo", 0)
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.estaVivo && danoCuerpo > 0 && victima.number.get("jugo") < 3){
            victima.number.set("jugo", victima.number.get("jugo") + 1)
            sala.agregarRegistro(`🤖 ${victima.personaje} ganó un jugo.`)
            this.actualizarSprite(victima)
            if (victima.number.get("jugo") >= 3){
                sala.reproducirSfx("sfxElpLleno")
            }
        }
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (miJugador.estaVivo && miJugador.number.get("jugo") >= 3){
            if (Utilidades.puedeRecibirCuracion(sala, miJugador)){
                Utilidades.aplicarCuracion(sala, miJugador, 1, "pasiva", false)
                sala.reproducirSfx("curacion")
                sala.agregarRegistro(`🤖 ¡${miJugador.personaje} se curó 1 por tener 3 jugos!`)
                miJugador.number.set("jugo", 0)
                this.actualizarSprite(miJugador)
            } else {
                sala.agregarRegistro(`🤖 ${miJugador.personaje} está listo para curarse pero algo se lo impide.`)
            }
        }
    }

    actualizarSprite(miJugador: Jugador): void {
        const r: number = miJugador.number.get("jugo")
        if (r == 1){
            miJugador.spriteAvatarOpcional = "ElP 1"
        } else if (r == 2){
            miJugador.spriteAvatarOpcional = "ElP 2"
        } else if (r == 3){
            miJugador.spriteAvatarOpcional = "ElP 3"
        } else {
            miJugador.spriteAvatarOpcional = ""
        }
    }
}

export class Tirachinas implements IPersonaje {
    nombre = "Tirachinas";
    habilidad = "Angry birds:\nAl inicio del turno: cambia de pajaro.\nLas probabilidades de cambiar a otro pajaro diferente son: red: 20%, chuck: 20%, blue: 23%, matilda: 5%, terrence: 3%, bomb: 6%, hal: 13%, bubbles: 10%.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["angryBirdsMuerto", false];
    sfxDefault = "sfxAngryBirds";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.string.set("angryBird", "red")
        this.actualizarSprite(jugador)
    }

    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (causa == "BANG" && miJugador.estaVivo){

            if (jugadorGolpeado.estaVivo && miJugador.string.get("angryBird") == "matilda"){
                let carta: Carta = CatalogoCartasEspeciales.crearHuevoExplosivo()
                if (carta){
                    carta.esConjurada = true
                    jugadorGolpeado.mano.push(carta)
                    sala.agregarRegistro(`🥚 ${miJugador.personaje} le coloca un Huevo explosivo a ${jugadorGolpeado.personaje}.`)
                }
            } else if (jugadorGolpeado.estaVivo && miJugador.string.get("angryBird") == "bomb"){
                let cantidadADescartar = Math.min(2, jugadorGolpeado.mano.length);
    
                if (cantidadADescartar > 0) {
                    let cartasDescartadas = jugadorGolpeado.mano.splice(0, cantidadADescartar);
                    
                    cartasDescartadas.forEach((carta: any) => {
                        sala.descartarCarta(carta, jugadorGolpeado, "pasiva");
                    });

                    sala.agregarRegistro(`💥 ¡${miJugador.personaje} obligó a ${jugadorGolpeado.personaje} a descartar ${cantidadADescartar} carta(s)!`);
                }
            } else if (miJugador.string.get("angryBird") == "hal"){
                sala.repartirCartas(miJugador, 1, "pasiva")
                sala.agregarRegistro(`𓅫 ${miJugador.personaje} robó una carta por su pasiva.`)
            } else if (miJugador.string.get("angryBird") == "bubbles"){
                Utilidades.agregarEscudos(sala, miJugador, 1, 1, "pasiva")
                sala.agregarRegistro(`𓅫 ${miJugador.personaje} obtuvo un escudo por su pasiva.`)
            }
        }
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        this.cambiarPajaro(miJugador)
        sala.agregarRegistro(`𓅫 ${miJugador.personaje} cambió al pajaro ${miJugador.string.get("angryBird")}.`)
    }

    cambiarPajaro(jugador: Jugador): void {
        const pajaroActual = jugador.string.get("angryBird");

        const pajaros = [
            { nombre: "red", probabilidad: 20 },
            { nombre: "chuck", probabilidad: 20 },
            { nombre: "blue", probabilidad: 23 },
            { nombre: "matilda", probabilidad: 5 },
            { nombre: "terrence", probabilidad: 3 },
            { nombre: "bomb", probabilidad: 6 },
            { nombre: "hal", probabilidad: 13 },
            { nombre: "bubbles", probabilidad: 10 }
        ];

        // Excluir el pájaro que ya tiene asignado.
        const opciones = pajaros.filter(
            pajaro => pajaro.nombre !== pajaroActual
        );

        // Sumar las probabilidades disponibles.
        const probabilidadTotal = opciones.reduce(
            (total, pajaro) => total + pajaro.probabilidad,
            0
        );

        // Generar un número aleatorio dentro del total.
        let aleatorio = Math.random() * probabilidadTotal;

        for (const pajaro of opciones) {
            aleatorio -= pajaro.probabilidad;

            if (aleatorio < 0) {
                jugador.string.set("angryBird", pajaro.nombre);
                this.actualizarSprite(jugador)
                return;
            }
        }
    }

    actualizarSprite(jugador: Jugador): void {
        jugador.spriteAvatarOpcional = "Tirachinas " + jugador.string.get("angryBird")
    }
}

export class Nita implements IPersonaje {
    nombre = "Nita";
    habilidad = "Hermano oso:\nCada 2 vidas que pierde: invoca a un NPC Bruce en su sentido antihorario.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault: string = "sfxNita"
    sfxMuerte: [string, boolean, number?] = ["sfxNitaMuerte", false]

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador) return;
        jugador.number.set("nitaVidasPerdidas", 0);
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (!victima || !sala || !victima.estaVivo) return;

        // Si querés que Nita NO invoque a Bruce en el golpe que la mata, descomentá la siguiente línea:
        // if (victima.vidas <= 0) return;

        if (danoCuerpo > 0) {
            let acumulado = (victima.number.get("nitaVidasPerdidas") || 0) + danoCuerpo;

            // Usamos while por si recibe 4 de daño de golpe (ej. Dinamita/Escopetazo)
            while (acumulado >= 2) {
                acumulado -= 2;
                Utilidades.invocarNpcEnMesa(sala, victima, "Bruce", 2, 0, "antihorario");
                sala.reproducirSfx("sfxNitaBruce")
            }

            victima.number.set("nitaVidasPerdidas", acumulado);
        }
    }
}

export class Bruce implements IPersonaje {
    nombre = "Bruce";
    habilidad = "NPC:\nNo roba cartas en su fase de robo.\nAl inicio de su turno: conjura un BANG!.\nAl jugar una carta: se mueve en sentido antihorario.";
    habilidadEnCatalan = ".";
    vidasBase = 2;
    esNpcInvocable = true;
    sfxDefault: string = "sfxBruce"

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string): number {
        if (causa === "turno") {
            return -2;
        }
        return 0;
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador || !miJugador.estaVivo) return;

        let bang = CatalogoCartasEspeciales.crearBang();
        if (bang) {
            bang.esConjurada = true;
            miJugador.mano.push(bang);
            sala.agregarRegistro(`🐻 ¡${miJugador.personaje} conjuró un BANG! al iniciar su turno!`);
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador || !jugador.estaVivo) return;

        Utilidades.moverPosicionFisica(sala, jugador, "antihorario");
        sala.agregarRegistro(`🐻 ¡${jugador.personaje} jugó una carta y se movió en sentido antihorario!`);
    }
}

export class Larry implements IPersonaje {
    nombre = "Larry";
    habilidad = "Gemelos justicieros:\nTiene 3 vidas.\nAl inicio de la partida: obtiene 1 escudo e invoca al NPC Lawrie en su sentido antihorario.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxLarryMuerte", false];
    sfxDefault = "sfxLarry";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador || !sala) return;
        Utilidades.bajarVidaMaxima(jugador, 1)

        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
        Utilidades.invocarNpcEnMesa(sala, jugador, "Lawrie", 3, 3, "horario");
    }
}

export class Lawrie implements IPersonaje {
    nombre = "Lawrie";
    habilidad = "NPC:\nPuede recibir curacion.";
    habilidadEnCatalan = ".";
    vidasBase = 3;
    esNpcInvocable = true;
    sfxDefault = "sfxLawrie";

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("lawrieCura", true)
    }
}

export class Bubble implements IPersonaje {
    nombre = "Bubble";
    habilidad = "Muchas burbujas:\nTiene 1 vida.\nAl empezar: gana 2 escudo e invoca a 4 NPC Bubble.\nAl inicio del turno, al recibir daño y cada 3 cartas jugadas: crea un NPC Bubble antihorario.\nAl final del turno: gana un escudo.\nAlmacenamiento 2.";
    habilidadEnCatalan = ".";
    vidasBase = 4;

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador || !sala) return;
        Utilidades.bajarVidaMaxima(jugador, 3)

        Utilidades.agregarEscudos(sala, jugador, 2, 1, "pasiva");
        for (let i = 0; i < 2; i++){
            this.crearNpcBubble(sala, jugador, "horario")
            this.crearNpcBubble(sala, jugador, "antihorario")
        }

        jugador.number.set("bubbleJugadas", 0)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        this.crearNpcBubble(sala, miJugador, "antihorario")
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva")
    }

    onRecibirDano(sala: IMyRoom, victima: Jugador, atacante: Jugador, causa: string, cantidad: number, danoCuerpo: number, danoEscudo: number): void {
        if (victima.estaVivo){
            this.crearNpcBubble(sala, victima, "antihorario")
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (jugador.estaVivo){
            jugador.number.set("bubbleJugadas", jugador.number.get("bubbleJugadas") + 1)
            if (jugador.number.get("bubbleJugadas") >= 3){
                jugador.number.set("bubbleJugadas", 0)
                this.crearNpcBubble(sala, jugador, "antihorario")
            }
        }
    }

    crearNpcBubble(sala: IMyRoom, miJugador: Jugador, sentido: "horario" | "antihorario"){
        Utilidades.invocarNpcEnMesa(sala, miJugador, "Bubble_npc", 1, 1, sentido);
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return 2
    }
}

export class Bubble_npc implements IPersonaje {
    nombre = "Bubble_npc";
    habilidad = "NPC:\nAlmacenamiento 1.";
    habilidadEnCatalan = ".";
    vidasBase = 1;
    esNpcInvocable = true;

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return 1
    }
}

export class Phoenix implements IPersonaje {
    nombre = "Phoenix";
    habilidad = "Asistentes:\nAl inicio de la partida: tus otras 2 opciones de eleccion se convierten en npc, empiezan con 3 cartas iniciales.\nPenalizacion 1.";
    habilidadEnCatalan = ".";
    vidasBase = 4;
    sfxDefault: string = "sfxPhoenix"
    sfxMuerte: [string, boolean, number?] = ["sfxPhoenixMuerte", true]

    onIniciarPartida(sala: any, jugador: Jugador): void {
        if (!jugador || !sala) return;

        const inicio = jugador.reroll ? 3 : 0;

        const elecciones = jugador.opcionesPersonaje
            ?.slice(inicio, inicio + 3)
            .map(opcion => opcion?.nombre ?? null);

        if (!elecciones || elecciones.length < 3 || elecciones.some(nombre => nombre == null)) {
            return;
        }

        if (!elecciones.includes("Phoenix")) {
            return;
        }

        const [asistente1, asistente2] = elecciones.filter(nombre => nombre !== "Phoenix");

        Utilidades.invocarNpcEnMesa(sala, jugador, asistente1, 4, 3, "antihorario");
        Utilidades.invocarNpcEnMesa(sala, jugador, asistente2, 4, 3, "horario");
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador): number {
        return -1
    }
}

export class Clint implements IPersonaje {
    nombre = "Clint";
    habilidad = "Forja:\nAl equipar: roba una carta.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew"

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, carta: Carta, hueco: string): void {
        sala.repartirCartas(miJugador, 1, "pasiva")
        sala.agregarRegistro(`🔨 ¡${miJugador.personaje} robó una carta por su pasiva!`)
    }
}

export class Kertley implements IPersonaje {
    nombre = "Kertley";
    habilidad = "Mejor fiscal:\nSus ataques ignoran el escudo.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxDefault: string = "sfxKertley"
    sfxMuerte: [string, boolean, number?] = ["sfxKertleyMuerte", true]

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("kertley", true)
    }
}

export class Susato implements IPersonaje {
    nombre = "Susato";
    habilidad = "Interesada:\nCuando roba: se le da a elegir entre +1 cartas a robar y Susato elije las que mas le interese, la carta no elejida va al descarte.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxMuerte: [string, boolean, number?] = ["sfxSusatoMuerte", false]
    sfxDefault: string = "sfxSusato"

    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("susato", true)
    }
}

export class Colt implements IPersonaje {
    nombre = "Colt";
    habilidad = "Pistolero equipado:\nAl equipar un arma: conjura un Bang!.\nAl equipar barril, dinamita, papapum, prision o monoaldea: conjura un Fallo!.";
    habilidadEnCatalan: string = "."
    vidasBase = 4;
    sfxDefault: string = "sfxColt"
    sfxMuerte: [string, boolean, number?] = ["sfxColtMuerte", false]

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, carta: Carta, hueco: string): void {
        if (hueco == "arma"){
            let carta: Carta = CatalogoCartasEspeciales.crearBang()
            if (carta){
                carta.esConjurada = true
                miJugador.mano.push(carta)
                sala.agregarRegistro(`🔫 ¡${miJugador.personaje} conjuró un Bang! por su pasiva.`)
                sala.reproducirSfx("sfxColtHabilidad")
            }
        } else if (hueco == "prision" || hueco == "dinamita" || hueco == "papa" || hueco == "barril" || hueco == "mira"){
            let carta: Carta = CatalogoCartasEspeciales.crearFallo()
            if (carta){
                carta.esConjurada = true
                miJugador.mano.push(carta)
                sala.agregarRegistro(`🔫 ¡${miJugador.personaje} conjuró un Fallo! por su pasiva.`)
                sala.reproducirSfx("sfxColtHabilidad")
            }
        }
    }
}

export class Cosmo implements IPersonaje {
    nombre = "Cosmo";
    vidasBase = 4;
    habilidad = "Campo magnetico:\nBoton (1 por turno): descarta tus 2 cartas BANG! de más a la izquierda para conjurar una Orbita BANG!, hace 0 de daño y al golpear agrega 3 efecto gravitacional.";
    habilidadEnCatalan = ".";
    sfxDefault: string = "sfxCosmo"
    sfxMuerte: [string, boolean, number?] = ["sfxCosmoMuerte", false]
    
    // Le damos la habilidad activa al iniciar
    onIniciarPartida(sala: IMyRoom, jugador: Jugador): void {
        let hab = new HabilidadActiva();
        hab.id = "cosmo_orbita";
        hab.textoBoton = "Órbita BANG!";
        hab.tooltip = "Descarta 2 BANG! de tu mano para conjurar una Órbita BANG!.";
        hab.spriteBoton = "botonCosmo"
        jugador.habilidadesActivas.push(hab);

        jugador.boolean.set("cosmo_usado", false);
    }

    // Reseteamos el uso al arrancar su turno
    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("cosmo_usado", false);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: any, idHabilidad: string): void {
        if (idHabilidad === "cosmo_orbita") {
            
            // 1. Verificamos que no la haya usado este turno
            if (jugador.boolean.get("cosmo_usado")) {
                client.send("alerta_personal", "Ya usaste esta habilidad en este turno.");
                return;
            }

            // 2. Buscamos los 2 BANG! más a la izquierda (índices más bajos)
            let indicesBang: number[] = [];
            for (let i = 0; i < jugador.mano.length; i++) {
                if (jugador.mano[i].nombre === "BANG!") {
                    indicesBang.push(i);
                    // Apenas encontramos 2, cortamos la búsqueda
                    if (indicesBang.length === 2) break;
                }
            }

            // 3. Verificamos que le alcance
            if (indicesBang.length < 2) {
                client.send("alerta_personal", "Necesitás al menos 2 cartas BANG! para usar esta habilidad.");
                return;
            }

            // 4. Descartamos (IMPORTANTE: iterar al revés para no romper los índices al hacer splice)
            for (let i = indicesBang.length - 1; i >= 0; i--) {
                let indice = indicesBang[i];
                let cartaDescartada = jugador.mano.splice(indice, 1)[0];
                sala.descartarCarta(cartaDescartada, jugador, "pasiva");
            }

            // 5. Conjuramos la carta (Ajustá el nombre del método según cómo lo llamaste en el Catalogo)
            let orbita = CatalogoCartasEspeciales.crearOrbitaBang(); 
            orbita.esConjurada = true;
            jugador.mano.push(orbita);

            // 6. Marcamos como usada y avisamos
            jugador.boolean.set("cosmo_usado", true);
            sala.agregarRegistro(`🪐 ${jugador.nombre} sacrificó 2 BANG! para conjurar una Orbita BANG!.`);
        }
    }
}

export class Amber implements IPersonaje {
    nombre = "Amber";
    vidasBase = 4;
    habilidad = "Estoy caliente:\nAl golpear: agrega 1 efecto fuego al jugador golpeado.";
    habilidadEnCatalan = ".";
    sfxDefault: string = "sfxAmber"
    sfxMuerte: [string, boolean, number?] = ["sfxAmberMuerte", false]
    
    onGolpear(sala: IMyRoom, miJugador: Jugador, jugadorGolpeado: Jugador, causa: string): void {
        if (jugadorGolpeado.estaVivo){
            Utilidades.agregarEfecto(jugadorGolpeado, "fuego", 1)
            sala.agregarRegistro(`🔥 ¡${miJugador.personaje} incendia a ${jugadorGolpeado.personaje} por su pasiva!`)
            sala.reproducirSfx("sfxFuego")
        }
    }
}

export class FlorAmarilla implements IPersonaje {
    nombre = "Flor amarilla";
    vidasBase = 4;
    habilidad = "Has fallat:\nEn jugar un Fallo: conjura una carta Fallo.";
    habilidadEnCatalan = ".";
    
    onJugarCarta(sala: IMyRoom, jugador: any, cartaJugada: Carta): void {
        if (jugador.estaVivo && cartaJugada.nombre == "¡Fallo!"){
            let carta: Carta = CatalogoCartasEspeciales.crearFallo()
            if (carta){
                carta.esConjurada = true
                jugador.mano.push(carta)
                sala.agregarRegistro(`🤠🌻 ${jugador.personaje} ha conjurat un Fallo per la seva passiva.`)
            }
        }
    }
}

export class Volpina implements IPersonaje {
    nombre = "Volpina";
    vidasBase = 4;
    habilidad = "Camuflaje:\nAl inicio de la partida: se camufla como el personaje de tu opcion de mas a la izquierda.\nBoton (1 vez a partir de tu tercer al iniciar el turno): se descamufla, conjura 2 Bangs!, gana +2 alcance y no tiene limites de Bangs! por este turno.";
    habilidadEnCatalan = ".";
    
    onIniciarPartida(sala: any, jugador: Jugador): void {
        if (!jugador || !sala) return;

        const inicio = jugador.reroll ? 3 : 0;

        let camuflaje: OpcionPersonaje = jugador.opcionesPersonaje[inicio]
        if (camuflaje.nombre == this.nombre){
            camuflaje = jugador.opcionesPersonaje[inicio + 1]
        }

        jugador.personaje = camuflaje.nombre
        jugador.habilidad = camuflaje.habilidad

        let boton = new HabilidadActiva();
        boton.id = "boton_volpina";
        boton.textoBoton = "Revelarse";
        boton.tooltip = "Te revela";
        boton.spriteBoton = "botonVolpina"
        jugador.habilidadesActivas.push(boton);

        jugador.number.set("volpinaHabilidad", 3)
        jugador.boolean.set("volpinaActiva", false)
    }

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        miJugador.number.set("volpinaHabilidad", miJugador.number.get("volpinaHabilidad") - 1)
    }

    ejecutarHabilidadActiva(sala: any, jugador: Jugador, client: any, idHabilidad: string): void {
        if (jugador.estaVivo && idHabilidad == "boton_volpina"){
            if (jugador.number.get("volpinaHabilidad") > 0){
                client.send("alerta_personal", `Esta habilidad se está recargando, faltan ${jugador.number.get("volpinaHabilidad")} rondas.`)
                return
            }

            this.colocarDatosVolpinaReal(jugador)
            for (let i = 0; i < 2; i++){
                let bang: Carta = CatalogoCartasEspeciales.crearBang()
                if (bang){
                    bang.esConjurada = true
                    jugador.mano.push(bang)
                }
            }
            jugador.boolean.set("volpinaActiva", true)
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("volpinaActiva", false)
    }

    onMorir(sala: IMyRoom, miJugador: Jugador): void {
        if (miJugador.beneficiarseDeSuMuerte){
            this.colocarDatosVolpinaReal(miJugador)
        }
    }

    colocarDatosVolpinaReal(miJugador: Jugador): void {
        miJugador.personaje = "Volpina"
        miJugador.habilidad = "Camuflaje:\nAl inicio de la partida: se camufla como el personaje de tu opcion de mas a la izquierda.\nBoton (1 vez a partir de tu tercer al iniciar el turno): se descamufla, conjura 2 Bangs!, gana +2 alcance y no tiene limites de Bangs! por este turno."
    }
}


// 3. EL GESTOR DE PERSONAJES
export class GestorPersonajes {
    private personajes: Record<string, IPersonaje> = {};

    constructor() {
        this.registrar(new ColeCasiddy())
        this.registrar(new Berry())
        this.registrar(new Maton())
        this.registrar(new Mandy())
        this.registrar(new Tralalero())
        this.registrar(new Darryl())
        this.registrar(new JetpackCat())
        this.registrar(new KayFaraday())
        this.registrar(new Chester())
        this.registrar(new Frank())
        this.registrar(new Pam())
        this.registrar(new Trucy())
        this.registrar(new Luigi())
        this.registrar(new Mario())
        this.registrar(new Lesly())
        this.registrar(new Mikotoba())
        this.registrar(new Domino())
        this.registrar(new Tilink())
        this.registrar(new Flowery())
        this.registrar(new Leon())
        this.registrar(new Kazuma())
        this.registrar(new Leah())
        this.registrar(new Robin())
        this.registrar(new Luciergana())
        this.registrar(new Haley())
        this.registrar(new Maggey())
        this.registrar(new Mortis())
        this.registrar(new Maya())
        this.registrar(new Geraldo())
        this.registrar(new RaymundoEscudos())
        this.registrar(new Cubo())
        this.registrar(new VonKarma())
        this.registrar(new Mercy())
        this.registrar(new Chispitas())
        this.registrar(new Dahlia())
        this.registrar(new Meg())
        this.registrar(new Perro())
        this.registrar(new DaveElLoco())
        this.registrar(new Junkrat())
        this.registrar(new Max())
        this.registrar(new Pedro())
        this.registrar(new Amelia())
        this.registrar(new Microbios())
        this.registrar(new PerroNinja())
        this.registrar(new Monito())
        this.registrar(new KarateKillo())
        this.registrar(new Tripulante())
        this.registrar(new Shelly())
        this.registrar(new Byron())
        this.registrar(new GeiruToneido())
        this.registrar(new Wendy())
        this.registrar(new Pierre())
        this.registrar(new Zombistein())
        this.registrar(new Abigail())
        this.registrar(new Charlie())
        this.registrar(new ElP())
        this.registrar(new Tirachinas())
        this.registrar(new Nita());
        this.registrar(new Larry());
        this.registrar(new Bubble())
        this.registrar(new Phoenix())
        this.registrar(new Clint())
        this.registrar(new Kertley())
        this.registrar(new Susato())
        this.registrar(new Colt())
        this.registrar(new Cosmo())
        this.registrar(new Amber())
        this.registrar(new FlorAmarilla())
        //this.registrar(new Volpina())
        this.registrar(new Tracer())






        // NPC:

        this.registrar(new Lawrie());
        this.registrar(new Bruce());
        this.registrar(new Bubble_npc())
        this.registrar(new Leon_oculto())





        
    }

    private registrar(p: IPersonaje) {
        this.personajes[p.nombre] = p;
    }

    public obtener(nombre: string): IPersonaje | null {
        return this.personajes[nombre] || null;
    }

    public obtenerTodosParaRepartir(): any[] {
        // 1. Extraemos los valores sin duplicados y excluimos a los NPCs invocables
        let valoresUnicos = new Set(
            Object.values(this.personajes).filter(p => !p.esNpcInvocable)
        );
        
        // 2. Volvemos a convertir ese Set en un Array normal
        let lista = Array.from(valoresUnicos);
        
        // 3. Mezclamos la lista limpia
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
        return lista;
    }

    public obtenerTodosLosNpc(): any[] {
        // 1. Extraemos los valores sin duplicados y excluimos a los NPCs invocables
        let valoresUnicos = new Set(
            Object.values(this.personajes).filter(p => p.esNpcInvocable)
        );
        
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