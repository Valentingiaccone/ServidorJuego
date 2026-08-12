// Personajes.ts

import { Carta } from "./schema/MyRoomState.js";

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface IPersonaje {
    nombre: string;
    habilidad: string;
    habilidadEnCatalan: string;
    vidasBase: number;
    
    // Hooks con esteroides (Ganchos a eventos del juego)
    // causa puede ser: "BANG", "INDIOS", "TIRATACHUELA"
    onRecibirDano?(sala: any, victima: any, atacante: any, causa: string): void;
    // motivo puede ser: "VOLUNTARIO", "COCOROCH", "EXCESO_CARTAS"
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
}

// 2. LAS CLASES DE PERSONAJES

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nCada vez que pierde 1 vida, roba inmediatamente 1 carta.";
    habilidadEnCatalan: string = "Recàrrega a la recambra:\nCada vegada que perd 1 vida, roba immediatament 1 carta."
    vidasBase = 4;

    // Fijate cómo recibimos al atacante, por si mañana querés hacer que le robe a él
    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
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
    habilidad = "Cartas curativas:\nEn su turno, cada 2 cartas que descarta, recupera 1 de vida.";
    habilidadEnCatalan: string = "Cartes curatives:\nDurant el seu torn, per cada 2 cartes que descarta, recupera 1 punt de vida."
    vidasBase = 4;

    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string) {
        // Solo cuenta si lo hace en su turno voluntariamente (no si le tiran un Cocoroch)
        if (motivo !== "VOLUNTARIO") return;

        if (!jugador.contadorDescartes) jugador.contadorDescartes = 0;
        
        jugador.contadorDescartes++;
        if (jugador.contadorDescartes >= 2) {
            jugador.contadorDescartes = 0;
            if (jugador.vidas < jugador.vidasMaximas) {
                jugador.vidas++;
                sala.broadcast("notificacion_turno", `🍓 Berry recuperó 1 vida por su pasiva.`);
            }
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

    puedeDispararBang(_sala: any, _atacante: any, _victima: any): boolean {
        return true; 
    }
}

export class Mandy implements IPersonaje {
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -1.";
    habilidadEnCatalan: string = "Concentració:\nConsidera tots els altres jugadors a distància -1."
    vidasBase = 4;

    modificarDistancia(_sala: any, _observador: any, _objetivo: any, distanciaBase: number): number {
        return Math.max(0, distanciaBase - 1);
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl pasar el turno, si no tiene cartas en la mano, recupera 1 vida.";
    habilidadEnCatalan: string = "Els tralaleritos diuen tralalà:\nEn passar el torn, si no té cartes a la mà, recupera 1 punt de vida."
    vidasBase = 4;

    onPasarTurno(sala: any, jugador: any) {
        if (jugador.mano.length === 0 && jugador.vidas < jugador.vidasMaximas) {
            jugador.vidas++;
            sala.broadcast("notificacion_turno", `🎵 Tralalero recuperó 1 vida gracias a su pasiva.`);
        }
    }
}

export class Darryl implements IPersonaje {
    nombre = "Darryl";
    habilidad = "Darryl el Barryl:\nTiene el efecto de la carta Barril siempre activo, si se equipa un barril, es como si tuviera dos.";
    habilidadEnCatalan: string = "Darryl el Barryl:\nTé l'efecte de la carta Barril sempre actiu; si s'equipa un barril, és com si en tingués dos."
    vidasBase = 4;
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores lo consideran a distancia +1.";
    habilidadEnCatalan: string = "Gat a les altures:\nEls altres jugadors el consideren a distància +1."
    vidasBase = 4;

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

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
        // Solo roba si el atacante es un jugador real (no la dinamita) y si tiene cartas
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
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas, roba una extra, pero para pasar el turno, sus cartas en mano deben ser su salud - 1.";
    habilidadEnCatalan: string = "Baralla de cartes:\nCada vegada que roba cartes, en roba una d'extra, però per passar el torn, les cartes que té a la mà han de ser la seva vida - 1."
    vidasBase = 4;

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

    modificarCuraBotiquin(): number {
        return 1
    }
}

export class HongoUp implements IPersonaje {
    nombre = "Hongo 1Up";
    habilidad = "Descomposicion:\nCuando otro personaje muere, aumenta su salud maxima en 1 y se cura 2 de vida.";
    habilidadEnCatalan: string = "Descomposició:\nQuan un altre personatge mor, augmenta la seva salut màxima en 1 i es cura 2 punts de vida."
    vidasBase = 4;

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        let curacion: number = 0
        jugador.vidasMaximas++
        if (jugador.vidas < jugador.vidasMaximas){
            jugador.vidas++
            curacion++
        }
        if (jugador.vidas < jugador.vidasMaximas){
            jugador.vidas++
            curacion++
        }
        sala.broadcast("notificacion_turno", `🍄 Hongo 1Up se curó ${curacion} y aumentó su salud maxima a ${jugador.vidasMaximas}.`);
    }
}

export class Hongo implements IPersonaje {
    nombre = "Hongo";
    habilidad = "NEEDAMUSHROOM:\nCuando otro personaje muere, roba 3 cartas.";
    habilidadEnCatalan: string = "NEEDAMUSHROOM:\nQuan un altre personatge mor, roba 3 cartes."
    vidasBase = 4;

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        const cartas: number = 3
        sala.repartirCartas(jugador, cartas, "pasiva");
        sala.broadcast("notificacion_turno", `🍄 Hongo robó ${cartas} cartas por su pasiva.`);
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba gordo";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO, estando GORDO, cuando es su turno roba 3 en vez de 2, pero la carta Fallo no sirve, estando FLACO, los botiquines curan 2 y al recibir daño roba una carta.";
    habilidadEnCatalan: string = "Canvi de massa:\nSi té 3 o més vides, es torna GROS; si no, es torna PRIM. Estant GROS, quan és el seu torn roba 3 cartes en comptes de 2, però la carta Fallo no serveix. Estant PRIM, els botiquins curen 2 i, quan rep dany, roba una carta."
    vidasBase = 4;

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

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
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
}

export class Domino implements IPersonaje {
    nombre = "Domino";
    habilidad = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan.";
    habilidadEnCatalan: string = "Dominub:\nAl recibir daño gana un dominó aleatorio con un efecto desconocido (puede curar, robar una carta, o equiparse como arma de 3 alcance), ademas mientras está vivo, el resto vé las descripciones (menos esta) en catalan."
    vidasBase = 4;

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string): void {
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
    habilidad = "Clones de tilinks falsos:\nAl descartar una carta no clonada, se clona una carta no clonada de tu mano de forma aleatoria, pero para pasar el turno debe tener su salud -1 cartas en mano.";
    habilidadEnCatalan: string = "Clons de tilinks falsos:\nEn descartar una carta no clonada, es clona una carta no clonada de la teva mà de manera aleatòria. Però, per poder passar el torn, has de tenir Salut - 1 cartes a la mà."
    vidasBase = 4;

    onDescartarCarta(sala: any, jugador: any, _cartaDescartada: any, motivo: string) {
        // Solo cuenta si lo hace en su turno voluntariamente (no si le tiran un Cocoroch)
        if (motivo !== "VOLUNTARIO") return;
        
        // 1. Verificamos que la carta descartada sea original
        if (!_cartaDescartada.esConjurada) {
            
            // 2. Filtramos la mano para quedarnos solo con las cartas que NO son clones
            let cartasOriginalesEnMano = jugador.mano.filter((c: any) => !c.esConjurada);
            
            // 3. Si tiene al menos una carta original para clonar...
            if (cartasOriginalesEnMano.length > 0) {
                
                // Elegimos una al azar
                let indiceAleatorio = Math.floor(Math.random() * cartasOriginalesEnMano.length);
                let cartaAClonar = cartasOriginalesEnMano[indiceAleatorio];
                
                // 4. Creamos el clon como un objeto completamente nuevo
                let clon = new Carta();
                
                // Generamos un ID único usando la fecha y un random para evitar choques en Colyseus
                clon.id = `clon_${cartaAClonar.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                
                clon.nombre = cartaAClonar.nombre;
                clon.descripcion = cartaAClonar.descripcion;
                clon.descripcionEnCatalan = cartaAClonar.descripcionEnCatalan;
                clon.tipoDeUso = cartaAClonar.tipoDeUso;
                clon.efecto = cartaAClonar.efecto;
                
                // ¡Lo marcamos como clonado! Así no puede desencadenar otro clon ni ir al descarte real
                clon.esConjurada = true; 
                
                // 5. Se la metemos en la mano y avisamos a la mesa
                jugador.mano.push(clon);
                
                sala.broadcast("notificacion_turno", `🪞 ¡Tilink descartó una carta original y su pasiva clonó una carta de su mano!`);
            }
        }
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1
    }
}

// 3. EL GESTOR DE PERSONAJES
export class GestorPersonajes {
    private personajes: Record<string, IPersonaje> = {};

    constructor() {
        this.registrar(new ColeCasiddy());
        this.registrar(new Berry());
        this.registrar(new Maton());
        this.registrar(new Mandy());
        this.registrar(new Tralalero());
        this.registrar(new Darryl());
        this.registrar(new JetpackCat());
        this.registrar(new KayFaraday());
        this.registrar(new Chester());
        this.registrar(new Frank());
        this.registrar(new Pam());
        this.registrar(new Trucy());
        this.registrar(new HongoUp());
        this.registrar(new Hongo());
        this.registrar(new Lesly());
        this.registrar(new Mikotoba());
        this.registrar(new Domino());
        this.registrar(new Tilink());
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