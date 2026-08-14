import { Carta } from "./schema/MyRoomState.js"; // Ajustá la ruta según dónde pongas este archivo

export class CatalogoCartasEspeciales {
    
    public static crearCaballoPro(): Carta {
        let clon = new Carta();
        clon.id = `caballo_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Caballo Pro";
        clon.descripcion = "Los demás te ven a distancia +2.";
        clon.descripcionEnCatalan = "Els altres et veuen a distància +2.";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "equiparMustangPro";
        clon.esConjurada = true;
        return clon;
    }

    public static crearMonoaldeaPro(): Carta {
        let clon = new Carta();
        clon.id = `monoaldea_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Monoaldea Pro";
        clon.descripcion = "Ves a los demás a distancia -2.";
        clon.descripcionEnCatalan = "Veus els altres a distància -2.";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "equiparMiraPro";
        clon.esConjurada = true;
        return clon;
    }

    public static crearBarrilPro(): Carta {
        let clon = new Carta();
        clon.id = `barril_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Barril Pro";
        clon.descripcion = "Si te disparan, tenés 25% de esquivar el tiro dos veces.";
        clon.descripcionEnCatalan = "Si et disparen, tens un 25% de probabilitats d esquivar el tret dues vegades.";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "equiparBarrilPro";
        clon.esConjurada = true;
        return clon;
    }

    public static crearArma(nombre: string, alcance: number): Carta {
        let clon = new Carta();
        clon.id = `arma_custom_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = nombre;
        clon.descripcion = `Equipa esta arma para obtener alcance: ${alcance}`;
        clon.descripcionEnCatalan = `Equipa aquesta arma per obtenir un abast de ${alcance}.`;
        clon.tipoDeUso = "equipamiento";
        
        // Las armas NO necesitan un efecto nuevo, tu EfectoEquipar actual 
        // ya sabe leer el número al final del string "equipar_arma_X"
        clon.efecto = `equipar_arma_${alcance}`; 
        
        clon.esConjurada = true;
        return clon;
    }
}