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
        clon.descripcion = "Elegí un jugador y ambos recuperan 1 de vida (No funciona cuando quedan 2 vivos).";
        clon.descripcionEnCatalan = "Tria un jugador, ambdós recuperen 1 de vida (No funciona quan només queden 2 jugadors vius).";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "curarDuo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearTornado(): Carta {
        let clon = new Carta();
        clon.id = `tornado_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Tornado"; 
        clon.descripcion = "Desequipa todo lo que tenga equipado un jugador.";
        clon.descripcionEnCatalan = "Desequipa tot el que tingui equipat un jugador.";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "desequipar";
        clon.esConjurada = false;
        return clon;
    }

    public static crearTiendaDeJuju(): Carta {
        const clon = new Carta();
        clon.id = `tienda_juju_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "La tienda de Juju";
        clon.descripcion = "Los demas jugadores eligen cartas malditas.";
        clon.descripcionEnCatalan = "Els altres jugadors trien cartes maleïdes."
        clon.tipoDeUso = "instantanea";
        clon.efecto = "tiendaJuju";  
        clon.esConjurada = false;
        return clon;
    }


    // EL MAPA (Pool de expansiones)
    public static obtenerPoolExtensiones(): Array<{ id: string, copias: number }> {
        return [
            { id: "anderlandis", copias: 2 },
            { id: "tornado", copias: 1},
            { id: "tiendaDeJuju", copias: 1}
        ];
    }

    // EL DISTRIBUIDOR
    public static crearCartaExtension(id: string): Carta | null {
        switch (id) {
            case "anderlandis": return this.crearAnderlandis()
            case "tornado": return this.crearTornado()
            case "tiendaDeJuju": return this.crearTiendaDeJuju()

            default: return null;
        }
    }

    public static crearCartaMalditaAleatoria(): Carta {
        let opciones = ["venenoso", "reductor", "comilon", "maldita"];
        let elegida = opciones[Math.floor(Math.random() * opciones.length)];
        
        let clon = new Carta();
        // Generamos IDs únicos para que no choquen en la interfaz
        clon.id = `maldicion_${elegida}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.esConjurada = true; 
        clon.tipoDeUso = "oculto"; 
        
        if (elegida === "venenoso") {
            clon.nombre = "Hongo Venenoso";
            clon.descripcion = "Al descartarla pierdes 1 vida.";
            clon.descripcionEnCatalan = "En descartar-la perds 1 vida.";
            clon.efecto = "descartar_venenoso_1";
        } else if (elegida === "reductor") {
            clon.nombre = "Reductor";
            clon.descripcion = "Al descartarla tu vida máxima baja en 1.";
            clon.descripcionEnCatalan = "En descartar-la la teva vida màxima baixa en 1.";
            clon.efecto = "descartar_reductor_1";
        } else if (elegida === "comilon") {
            clon.nombre = "Slime Comilón";
            clon.descripcion = "Al descartarla elimina un equipamiento aleatorio tuyo.";
            clon.descripcionEnCatalan = "En descartar-la elimina un equipament aleatori teu.";
            clon.efecto = "descartar_comilon_1";
        } else if (elegida === "maldita") {
            clon.nombre = "Carta Maldita";
            clon.descripcion = "Al descartarla descarta otra carta aleatoria de tu mano.";
            clon.descripcionEnCatalan = "En descartar-la et descarta una altra carta aleatòria de la teva mà.";
            clon.efecto = "descartar_maldita_1";
        }
        
        return clon;
    }
}