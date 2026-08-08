// Personajes.ts

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface IPersonaje {
    nombre: string;
    habilidad: string;
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

    modificarRepartirCarta?(): number

    modificarCuraBotiquin?(): number

    modificarCartasEnManoAlPasarTurno?(): number

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugadorConPasiva: any): void

    onRecibirCuracion?(jugador: any): void
}

// 2. LAS CLASES DE PERSONAJES

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nCada vez que pierde 1 vida, roba inmediatamente 1 carta.";
    vidasBase = 4;

    // Fijate cómo recibimos al atacante, por si mañana querés hacer que le robe a él
    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
        if (victima.vidas > 0) {
            sala.repartirCartas(victima, 1);
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
    vidasBase = 4;

    puedeDispararBang(_sala: any, _atacante: any, _victima: any): boolean {
        return true; 
    }
}

export class Mandy implements IPersonaje {
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -1.";
    vidasBase = 4;

    modificarDistancia(_sala: any, _observador: any, _objetivo: any, distanciaBase: number): number {
        return Math.max(0, distanciaBase - 1);
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl pasar el turno, si no tiene cartas en la mano, recupera 1 vida.";
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
    vidasBase = 4;
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores lo consideran a distancia +1.";
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
    vidasBase = 4;

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
        // Solo roba si el atacante es un jugador real (no la dinamita) y si tiene cartas
        if (atacante && atacante.mano.length > 0) {
            let indiceAleatorio = Math.floor(Math.random() * atacante.mano.length);
            let cartaRobada = atacante.mano.splice(indiceAleatorio, 1)[0];
            victima.mano.push(cartaRobada);
            
            sala.broadcast("notificacion_turno", `🎭 ¡Kay Faraday perdió vida pero le robó una carta a ${atacante.nombre}!`);
        }
    }
}

export class Chester implements IPersonaje {
    nombre = "Chester";
    habilidad = "Ruleta trucada:\nTiene mucha mas suerte cuando usa la ruleta.";
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
    vidasBase = 5;
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas, roba una extra, pero para pasar el turno, sus cartas en mano deben ser su salud - 1.";
    vidasBase = 4;

    modificarRepartirCarta(): number {
        return 1
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1
    }
}

export class Pam implements IPersonaje {
    nombre = "Pam";
    habilidad = "Beso materno:\nCuando usa un botiquin se cura 2 en vez de 1.";
    vidasBase = 4;

    modificarCuraBotiquin(): number {
        return 1
    }
}

export class HongoUp implements IPersonaje {
    nombre = "Hongo 1Up";
    habilidad = "Descomposicion:\nCuando otro personaje muere, aumenta su salud maxima en 1 y se cura 2 de vida.";
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
    vidasBase = 4;

    onMuereOtroPersonaje?(sala: any, victimaMuerta: any, jugador: any): void {
        const cartas: number = 3
        sala.repartirCartas(jugador, cartas);
        sala.broadcast("notificacion_turno", `🍄 Hongo robó ${cartas} cartas por su pasiva.`);
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba gordo";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO, estando GORDO roba una carta extra cada que roba, pero la carta Fallo no sirve, estando FLACO, los botiquines curan 2 y al recibir daño roba una carta.";
    vidasBase = 4;

    onRecibirCuracion(jugador: any): void {
        console.log("Recibió curacion, actualizo el nombre...")
        this.actualizarNombre(jugador)
    }

    modificarRepartirCarta(): number {
        if (this.nombre == "Mikotoba gordo"){
            console.log("Repartir siendo gordo")
            return 1
        } else {
            console.log("Repartir siendo flaco")
            return 0
        }
    }

    modificarCuraBotiquin(): number {
        if (this.nombre == "Mikotoba gordo"){
            console.log("Cura botiquin siendo gordo")
            return 0
        } else {
            console.log("Cura botiquin siendo flaco")
            return 1
        }
    }

    onRecibirDano(sala: any, victima: any, atacante: any, causa: string) {
        console.log("Mikotoba recibe daño, causa:", causa, "llamo a la funcion...")
        this.actualizarNombre(victima)
        if (this.nombre == "Mikotoba gordo"){
            console.log("Recibe daño siendo gordo")
            return
        } else {
            if (victima.vidas > 0) {
                console.log("Recibe daño siendo flaco")
                sala.repartirCartas(victima, 1);
                sala.broadcast("notificacion_turno", `Mikotoba robó 1 carta tras recibir daño por ${causa}.`);
            }
        }
    }

    private actualizarNombre(jugador: any): void {
        console.log("El personaje mikotoba tiene vidas:", jugador.vidas)
        if (jugador.vidas >= 3){
            this.nombre = "Mikotoba gordo"
        } else {
            this.nombre = "Mikotoba flaco"
        }
        console.log("Personaje actualizado a:", this.nombre)
        jugador.personaje = this.nombre
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
        this.registrar(new Trucy());
        this.registrar(new HongoUp());
        this.registrar(new Hongo());
        this.registrar(new Mikotoba());
    }

    private registrar(p: IPersonaje) {
        this.personajes[p.nombre] = p;
    }

    public obtener(nombre: string): IPersonaje | null {
        return this.personajes[nombre] || null;
    }

    public obtenerTodosParaRepartir(): any[] {
        let lista = Object.values(this.personajes);
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
        return lista;
    }
}