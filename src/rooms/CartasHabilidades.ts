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




// Extrae automáticamente el tipo de retorno (boolean, number o void) de cualquier método de ICarta
type RetornoMetodo<K extends keyof ICarta> = 
    NonNullable<ICarta[K]> extends (...args: any[]) => infer R ? R : void;

export class GestorCartas {
    private cartas: Record<string, ICarta> = {};

    constructor() {
        this.registrar(new Canio());
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
        let tipoResultado: "number" | "boolean" | "void" = "void";

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
                    tipoResultado = "number";
                    sumaNumeros += resultado;
                }
            }
        }

        if (tipoResultado === "boolean") return algunTrue as RetornoMetodo<K>;
        if (tipoResultado === "number") return sumaNumeros as RetornoMetodo<K>;
        
        // Si ninguna carta ejecutó nada, devolvemos 0 (sirve como 0 en sumas y como false en un if)
        return 0 as RetornoMetodo<K>;
    }
}