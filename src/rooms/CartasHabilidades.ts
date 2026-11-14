import { MapSchema } from "@colyseus/schema";
import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import { IMyRoom } from "./IMyRoom.js";
import { Carta, HabilidadActiva, Jugador, OpcionPersonaje } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

// 1. EL CONTRATO ENRIQUECIDO: Ahora pasamos TODO el contexto de la mesa
export interface ICarta {

    nombre: string

    onEquiparCarta?(sala: IMyRoom, miJugador: Jugador, hueco: string, carta: Carta): void

    modificarDañoComoAtacante?(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): number

    modificarTraspasarEscudo?(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): boolean

    onGolpear?(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): void

    onDescartarCarta?(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string, carta: Carta): void

    onPasarTurno?(sala: IMyRoom, jugador: Jugador, carta: Carta): void

    modificarAlcance?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta): number

    modificarDistanciaDefensiva?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta): number

    modificarCartasEnManoAlPasarTurno?(sala: IMyRoom, jugador: Jugador, carta: Carta): number

    modificarRepartirCarta?(sala: IMyRoom, jugador: Jugador, causa: string, carta: Carta): number

    modificarSuerteLocal?(sala: IMyRoom, jugador: Jugador, motivo: string, carta: Carta): number | { cambio: number, fichas: string[] }

    onFichaEspecialSeleccionada?(sala: IMyRoom, duenoDeLaFicha: Jugador, victimaQueTiro: Jugador, fichaVisual: string, carta: Carta): void

    onIniciarTurno?(sala: IMyRoom, jugador: Jugador, carta: Carta): void

    esInmuneACocoroch?(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean

    esInmuneAPanico?(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean

    esInmuneAPrision?(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean
}

export class Canio implements ICarta {
    nombre = "Canio"

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, hueco: string, carta: Carta): void {
        if (carta.number.get("canioNivel") >= 3){
            return
        }

        let texto: string = ""

        carta.number.set("canioEquipamiento", carta.number.get("canioEquipamiento") - 1)

        if (carta.number.get("canioEquipamiento") <= 0){
            carta.number.set("canioNivel", carta.number.get("canioNivel") + 1)
            carta.number.set("canioEquipamiento", 2)
        }

        if (carta.number.get("canioNivel") < 3){
            texto += `Al equipar ${carta.number.get("canioEquipamiento")} carta: se mejora. `
        }

        texto += this.agregarTextoSegunNivel(carta)
        carta.descripcion = texto
        this.actualizarSprite(carta)
    }

    modificarDañoComoAtacante(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): number {
        if (carta.number.get("canioNivel") >= 3){
            return 1
        }
    }

    modificarTraspasarEscudo(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): boolean {
        if (carta.number.get("canioNivel") >= 2){
            return true
        }
    }

    onGolpear(sala: IMyRoom, jugador: Jugador, victima: Jugador, causa: string, carta: Carta): void {
        if (carta.number.get("canioNivel") >= 1){
            Utilidades.agregarEfecto(victima, "fuego", 1)
        }
    }

    private agregarTextoSegunNivel(carta: Carta): string {
        let texto: string = ""

        if (carta.number.get("canioNivel") >= 1){
            texto += "Al golpear: Quema 1. "
        }
        if (carta.number.get("canioNivel") >= 2){
            texto += "Traspasa escudo. "
        }
        if (carta.number.get("canioNivel") >= 3){
            texto += "Hace +1 de daño. "
        }

        return texto + `Nivel actual: ${carta.number.get("canioNivel")}/3.`
    }

    private actualizarSprite(carta: Carta): void {
        carta.string.set("spriteOpcional", "Canio nivel " + carta.number.get("canioNivel"))
    }
}

export class Yorick implements ICarta {
    nombre = "Yorick"

    onIniciarTurno(sala: IMyRoom, jugador: Jugador, carta: Carta): void {
        carta.number.set("yorickDescartes", 0);
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string, carta: Carta): void {
        if (motivo !== "VOLUNTARIO") return;

        let descartes = (carta.number.get("yorickDescartes") || 0) + 1;
        carta.number.set("yorickDescartes", descartes);

        // Primeros 2 descartes del turno: roba 1 carta (se suma al robo de Leah si la tiene)
        if (descartes <= 2) {
            sala.repartirCartas(jugador, 1, "carta");
            sala.agregarRegistro(`🃏 ${jugador.personaje} descartó una carta y Yorick le otorgó 1 carta nueva (${descartes}/2).`);
        }

        // Al 4to descarte en el mismo turno: cura 1 (en 1vs1 se convierte en escudo automáticamente)
        if (descartes === 4) {
            if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                Utilidades.aplicarCuracion(sala, jugador, 1, "YORICK", false);
                sala.agregarRegistro(`🃏 ¡${jugador.personaje} descartó 4 cartas en este turno y Yorick lo curó 1!`);
                sala.reproducirSfx("curacion");
            }
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador, carta: Carta): void {
        carta.number.set("yorickDescartes", 0);
    }
}

export class Triboulet implements ICarta {
    nombre = "Triboulet"

    modificarAlcance(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta): number {
        return 1;
    }

    modificarDistanciaDefensiva(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta): number {
        return 1;
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom, jugador: Jugador, carta: Carta): number {
        return 1;
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador, causa: string, carta: Carta): number {
        return 1;
    }

    modificarSuerteLocal(sala: IMyRoom, jugador: Jugador, motivo: string, carta: Carta): { cambio: number, fichas: string[] } {
        return { cambio: 1, fichas: ["exitoTriboulet"] };
    }

    onFichaEspecialSeleccionada(sala: IMyRoom, duenoDeLaFicha: Jugador, victimaQueTiro: Jugador, fichaVisual: string, carta: Carta): void {
        if (fichaVisual === "exitoTriboulet") {
            if (Utilidades.puedeRecibirCuracion(sala, duenoDeLaFicha)) {
                Utilidades.aplicarCuracion(sala, duenoDeLaFicha, 1, "TRIBOULET", false);
                sala.agregarRegistro(`🃏 ¡Salió la ficha de Triboulet! ${duenoDeLaFicha.personaje} se cura 1.`);
                sala.reproducirSfx("curacion");
            }
        }
    }
}

export class Perkeo implements ICarta {
    nombre = "Perkeo"

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string, carta: Carta): void {
        if (motivo !== "VOLUNTARIO") return;
        if (cartaDescartada.esConjurada) return;

        // Funcionamiento normal del primer Perkeo (sin límite por turno y sin penalización)
        let cartasOriginalesEnMano = jugador.mano.filter((c: any) => !c.esConjurada && c.id !== carta.id && c.nombre !== "Perkeo");

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

            sala.agregarRegistro(`🃏 ¡Perkeo sacrificó ${cartaAClonar.nombre} original y fabricó 2 clones!`);
            sala.reproducirSfx("tilinkPasiva");
        }
    }
}

export class Chicot implements ICarta {
    nombre = "Chicot"

    modificarSuerteLocal(sala: IMyRoom, jugador: Jugador, motivo: string, carta: Carta): { cambio: number, fichas: string[] } {
        return { cambio: 3, fichas: ["exitoChicot", "exitoChicot", "exitoChicot"] };
    }

    onFichaEspecialSeleccionada(sala: IMyRoom, duenoDeLaFicha: Jugador, victimaQueTiro: Jugador, fichaVisual: string, carta: Carta): void {
        if (fichaVisual === "exitoChicot") {
            sala.repartirCartas(duenoDeLaFicha, 2, "carta");
            sala.agregarRegistro(`🃏 ¡Salió la ficha de Chicot! ${duenoDeLaFicha.personaje} roba 2 cartas.`);
        }
    }

    esInmuneACocoroch(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean {
        return true
    }

    esInmuneAPanico(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean {
        return true
    }

    esInmuneAPrision(sala: IMyRoom, jugador: Jugador, carta: Carta): boolean {
        return true
    }
}




// Extrae automáticamente el tipo de retorno (boolean, number o void) de cualquier método de ICarta
type RetornoMetodo<K extends keyof ICarta> = 
    NonNullable<ICarta[K]> extends (...args: any[]) => infer R ? R : void;

export class GestorCartas {
    private cartas: Record<string, ICarta> = {};

    constructor() {
        this.registrar(new Canio());
        this.registrar(new Yorick());
        this.registrar(new Triboulet());
        this.registrar(new Perkeo());
        this.registrar(new Chicot());
    }

    private registrar(c: ICarta) {
        this.cartas[c.nombre] = c;
    }

    public obtener(nombre: string): ICarta | null {
        return this.cartas[nombre] || null;
    }

    /**
     * Recorre todas las cartas del jugador (mano y equipamiento) y ejecuta el método indicado si existe.
     * - Si el método devuelve boolean: retorna true si al menos una carta devolvió true.
     * - Si el método devuelve number: retorna la suma de todos los valores devueltos.
     */
    public ejecutar<K extends keyof ICarta>(
        jugador: Jugador,
        nombreFuncion: K,
        ...args: any[]
    ): RetornoMetodo<K> {
        // Juntamos las cartas de la mano y del equipamiento (eliminá una de las dos líneas si solo querés revisar una)
        const todasLasCartas: Carta[] = [
            ...(jugador.mano ? Array.from(jugador.mano) : []),
            ...(jugador.equipamiento ? Array.from(jugador.equipamiento.values()) : [])
        ];

        let sumaNumeros = 0;
        let algunTrue = false;
        let fichasAcumuladas: string[] = [];
        let tipoResultado: "number" | "boolean" | "object" | "void" = "void";

        for (const carta of todasLasCartas) {
            const claseCarta = this.obtener(carta.nombre);
            const fn = claseCarta?.[nombreFuncion];

            if (typeof fn === "function") {
                // Usamos .apply(claseCarta, args) para no perder el contexto "this" dentro de la clase de la carta
                const resultado = (fn as Function).apply(claseCarta, [...args, carta]);

                if (typeof resultado === "boolean") {
                    tipoResultado = "boolean";
                    if (resultado) {
                        algunTrue = true;
                    }
                } else if (typeof resultado === "number") {
                    if (tipoResultado !== "object") tipoResultado = "number";
                    sumaNumeros += resultado;
                } else if (resultado && typeof resultado === "object") {
                    tipoResultado = "object";
                    if (resultado.cambio !== undefined) sumaNumeros += resultado.cambio;
                    if (resultado.fichas && Array.isArray(resultado.fichas)) {
                        fichasAcumuladas.push(...resultado.fichas);
                    }
                }
            }
        }

        if (tipoResultado === "boolean") return algunTrue as RetornoMetodo<K>;
        if (tipoResultado === "object") return { cambio: sumaNumeros, fichas: fichasAcumuladas } as RetornoMetodo<K>;
        if (tipoResultado === "number") return sumaNumeros as RetornoMetodo<K>;
        
        // Si ninguna carta ejecutó nada, devolvemos 0 (sirve como 0 en sumas y como false en un if)
        return 0 as RetornoMetodo<K>;
    }
}