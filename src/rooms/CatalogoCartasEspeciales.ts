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

    public static crearAnderlandis(): Carta {
        let clon = new Carta();
        clon.id = `anderlandis_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Anderlandis"; 
        clon.descripcion = "Elegí un jugador. Ambos recuperan 1 de vida. Falla si alguno tiene la salud al máximo (No funciona cuando quedan 2 vivos).";
        clon.descripcionEnCatalan = "Tria un jugador. Ambdós recuperen 1 de vida. Falla si algun té la salut al màxim (No funciona quan només queden 2 jugadors vius).";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "curarDuo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearTornado(): Carta {
        let clon = new Carta();
        clon.id = `tornado_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Tornado"; 
        clon.descripcion = "Elegí un jugador y desequipale todo lo que tenga equipado colocandoselo en su mano.";
        clon.descripcionEnCatalan = "Tria un jugador i desequipa-li tot el que tingui equipat, posant-ho a la seva mà.";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "desequipar";
        clon.esConjurada = false;
        return clon;
    }

    // EL MAPA (Pool de expansiones)
    public static obtenerPoolExtensiones(): Array<{ id: string, copias: number }> {
        return [
            { id: "anderlandis", copias: 2 },
            { id: "tornado", copias: 1},
        ];
    }

    // EL DISTRIBUIDOR
    public static crearCartaExtension(id: string): Carta | null {
        switch (id) {
            case "anderlandis": return this.crearAnderlandis()
            case "tornado": return this.crearTornado()

            default: return null;
        }
    }
}