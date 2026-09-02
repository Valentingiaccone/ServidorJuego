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
        clon.descripcion = "Elegí un jugador y ambos recuperan 1 de vida.";
        clon.descripcionEnCatalan = "Tria un jugador, ambdós recuperen 1 de vida.";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "curarDuo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearTornado(): Carta {
        let clon = new Carta();
        clon.id = `tornado_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Tornado"; 
        clon.descripcion = "Elimina un equipamiento aleatorio de un jugador.";
        clon.descripcionEnCatalan = "Elimina un equipament aleatori d un jugador.";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "desequipar_1";
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

    public static crearPapapum(): Carta {
        let clon = new Carta();
        clon.id = `papapum_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Papapum";
        clon.descripcion = "Pasá la papapum golpeando con BANG!. Daño 2. Si no explota, su probabilidad aumenta.";
        clon.descripcionEnCatalan = "Passa la Papapum colpejant-la amb BANG!. Fa 2 de dany. Si no explota, la seva probabilitat augmenta.";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "equiparPapapum";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearRayo(): Carta {
        let clon = new Carta();
        clon.id = `rayo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Rayo";
        clon.descripcion = "Golpea a los jugadores con mas salud. No se puede esquivar. Te incluye.";
        clon.descripcionEnCatalan = "Colpeja els jugadors amb més salut. No es pot esquivar. T hi inclou.";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "rayo";
        clon.esConjurada = false;
        return clon;
    }
    
    public static crearSpooky(): Carta {
        let clon = new Carta();
        clon.id = `spooky_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Spooky";
        clon.descripcion = "Te otorga +1 de vida extra que supera tu máximo. Dura 1 ronda completa.";
        clon.descripcionEnCatalan = "T'atorga +1 de vida extra que supera el teu màxim. Dura 1 ronda completa.";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "equiparEscudo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearSuperBang(): Carta {
        let clon = new Carta();
        clon.id = `superBang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "SUPER BANG!";
        clon.descripcion = "Quita 2 vidas a un jugador a tu alcance.";
        clon.descripcionEnCatalan = "Treu 2 vidas a un jugador al teu abast.";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_2";
        clon.esConjurada = false;
        return clon;
    }

    public static crearClon(): Carta {
        let clon = new Carta();
        clon.id = `clon_card_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Clon";
        clon.descripcion = "Clona una carta no clonada de tu mano aleatoria.";
        clon.descripcionEnCatalan = "Clona una carta no clonada aleatòria de la teva mà.";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "clonarMano";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEscopetasReaper(): Carta {
        let clon = new Carta();
        clon.id = `arma_reaper_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Escopetas de Reaper";
        clon.descripcion = "Alcance: 1. Tus BANG! comunes infligen el doble de daño.";
        clon.descripcionEnCatalan = "Abast: 1. Els teus BANG! comuns infligeixen el doble de dany.";
        clon.tipoDeUso = "equipamiento";
        // Formato: equipar_alcance_danoExtra_alcanceMinimo
        clon.efecto = `equipar_arma_1_1_0`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearMortero(): Carta {
        let clon = new Carta();
        clon.id = `arma_mortero_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Mortero";
        clon.descripcion = "Alcance Infinito. No puede disparar a vecinos bajo ninguna circunstancia";
        clon.descripcionEnCatalan = "Abast Infinit. No pot disparar veïns sota cap circumstància";
        clon.tipoDeUso = "equipamiento";
        // Formato: equipar_alcance_danoExtra_alcanceMinimo
        clon.efecto = `equipar_arma_999_0_2`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearFallo(): Carta {
        let clon = new Carta();
        clon.id = `fallo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "¡Fallo!";
        clon.descripcion = "Esquiva un BANG!.";
        clon.descripcionEnCatalan = "Esquiva un BANG!.";
        clon.tipoDeUso = "oculto";
        clon.efecto = "esquivar";
        clon.esConjurada = false;
        return clon;
    }

    public static crearPanico(): Carta {
        let clon = new Carta();
        clon.id = `panico_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "¡Pánico!";
        clon.descripcion = "Roba una carta de la mano o equipada a un jugador vecino.";
        clon.descripcionEnCatalan = "Roba una carta de la mà o equipada d un jugador veïns.";
        clon.tipoDeUso = "objetivoVecino";
        clon.efecto = "robar_enemigo";
        clon.esConjurada = false;
        return clon
    }

    public static crearValerieLadrona(): Carta {
        let clon = new Carta();
        clon.id = `valerie_ladrona_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Valerie ladrona";
        clon.descripcion = "Roba la carta de la izquierda de un jugador.";
        clon.descripcionEnCatalan = "Roba la carta de l esquerra d un jugador.";
        clon.tipoDeUso = "objetivoUniversal";
        clon.efecto = "valerieLadrona";
        clon.esConjurada = false;
        return clon
    }

    // EL MAPA (Pool de expansiones)
    public static obtenerPoolExtensiones(): Array<{ id: string, copias: number }> {
        return [
            { id: "anderlandis", copias: 2 },
            { id: "tornado", copias: 1},
            { id: "tiendaDeJuju", copias: 1},
            { id: "papapum", copias: 1},
            { id: "rayo", copias: 1},
            { id: "superBang", copias: 1},
            { id: "clon", copias: 2 },
            { id: "escopetasReaper", copias: 1 },
           // { id: "mortero", copias: 1 },
        ];
    }

    // EL DISTRIBUIDOR
    public static crearCartaExtension(id: string): Carta | null {
        switch (id) {
            case "anderlandis": return this.crearAnderlandis();
            case "tornado": return this.crearTornado();
            case "tiendaDeJuju": return this.crearTiendaDeJuju();
            case "papapum": return this.crearPapapum();
            case "rayo": return this.crearRayo();
            case "superBang": return this.crearSuperBang();
            case "clon": return this.crearClon();
            case "escopetasReaper": return this.crearEscopetasReaper();
            case "mortero": return this.crearMortero();

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
            clon.descripcion = "Al descartarla perdés 1 vida.";
            clon.descripcionEnCatalan = "En descartar-la perds 1 vida.";
            clon.efecto = "descartar_venenoso_1";
        } else if (elegida === "reductor") {
            clon.nombre = "Reductor";
            clon.descripcion = "Al descartarla si tu vida no está al maximo, tu vida máxima baja en 1.";
            clon.descripcionEnCatalan = "En descartar-la, si la teva vida no està al màxim, la teva vida màxima baixa en 1.";
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

    public static crearCartaFantasmaAleatoria(): Carta {
        let opciones = ["dano", "curar", "robar", "descartar", "comilon"];
        let elegida = opciones[Math.floor(Math.random() * opciones.length)];
        
        let clon = new Carta();
        clon.id = `fantasma_${elegida}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.esConjurada = true; 
        clon.tipoDeUso = "objetivoUniversal"; 
        
        if (elegida === "dano") {
            clon.nombre = "Golpe fantasmal";
            clon.descripcion = "Agrega 2 espacios de daño en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = "Afegeix 2 espais de dany a la ruleta d'un jugador viu.";
            clon.efecto = "embrujar_dano_2";
            clon.tipoEmbrujo = "malo"
        } else if (elegida === "curar") {
            clon.nombre = "Milagro";
            clon.descripcion = "Agrega 2 espacios de curación en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = "Afegeix 2 espais de curació a la ruleta d'un jugador viu.";
            clon.efecto = "embrujar_curar_2";
            clon.tipoEmbrujo = "bueno"
        } else if (elegida === "robar") {
            clon.nombre = "Regalo divino";
            clon.descripcion = "Agrega 4 espacios de robo en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = "Afegeix 4 espais de robatori a la ruleta d'un jugador viu.";
            clon.efecto = "embrujar_robar_4";
            clon.tipoEmbrujo = "bueno"
        } else if (elegida === "descartar") {
            clon.nombre = "Cocoroch fantasma";
            clon.descripcion = "Agrega 4 espacios de descarte en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = "Afegeix 4 espais de descart a la ruleta d'un jugador viu.";
            clon.efecto = "embrujar_descartar_4";
            clon.tipoEmbrujo = "malo"
        } else if (elegida === "comilon") {
            clon.nombre = "Fantasma comilon";
            clon.descripcion = "Agrega 3 espacios de eliminacion de equipamiento en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = "Afegeix 3 espais d eliminació d equipament a la ruleta d un jugador viu.";
            clon.efecto = "embrujar_comilon_3";
            clon.tipoEmbrujo = "malo"
        }
        return clon;
    }

    public static crearCartaPlantaAleatoria(): Carta | null {
        const numero: number = Math.floor(Math.random() * 13)
        switch (numero){
            case 0:
                return this.crearPapapum()
            case 1:
                return this.crearLanzaguisantes()
            case 2:
                return this.crearCalabaza()
            case 3:
                return this.crearSetaBang()
            case 4:
                return this.crearComePiedras()
            case 5:
                return this.crearApisonaflorBang()
            case 6:
                return this.crearPlantorcha()
            case 7:
                return this.crearNuez()
            case 8:
                return this.crearMiedicaBang()
            case 9:
                return this.crearImitadora()
            case 10:
                return this.crearHumoseta()
            case 11:
                return this.crearTrebolador()
            case 12:
                return this.crearPetaseta()
            case 13:
                // funciona mal
                return this.crearPlantaCarnivora()
            default: 
                return null
        }
    }

    public static crearLanzaguisantes(): Carta {
        let clon = new Carta();
        clon.id = `lanzaguisantes_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Lanzaguisantes";
        clon.descripcion = "Equipa esta arma para obtener alcance 3 o mejorar a alcance 5 tu lanzaguisantes.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "lanzaguisantes";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }

    public static crearRepetidora(): Carta {
        let clon = new Carta();
        clon.id = `repetidora_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Repetidora";
        clon.descripcion = "Equipa esta arma para obtener alcance 5.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "lanzaguisantes";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }

    public static crearCalabaza(): Carta {
        let clon = new Carta();
        clon.id = `calabaza_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Calabaza";
        clon.descripcion = "Te protege del siguiente golpe.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "calabaza";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }

    public static crearSetaBang(): Carta {
        let clon = new Carta();
        clon.id = `seta_bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Seta BANG!";
        clon.descripcion = "Quita 1 vida a un vecino.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoVecino";
        clon.efecto = "dano_1";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearComePiedras(): Carta {
        let clon = new Carta();
        clon.id = `come_piedras_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Come piedras"; 
        clon.descripcion = "Elimina un equipamiento aleatorio de un jugador.";
        clon.descripcionEnCatalan = "Elimina un equipament aleatori d un jugador.";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "desequipar_1";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearApisonaflorBang(): Carta {
        let clon = new Carta();
        clon.id = `apisonaflor_bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Apisonaflor BANG!";
        clon.descripcion = "Quita 2 vidas a un vecino.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoVecino";
        clon.efecto = "dano_2";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearPlantorcha(): Carta {
        let clon = new Carta();
        clon.id = `plantorcha_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Plantorcha";
        clon.descripcion = "Si tenes un lanzaguisantes o repetidora equipado, tus BANG! hacen +1 de daño.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "plantorcha";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }

    public static crearNuez(): Carta {
        let clon = new Carta();
        clon.id = `nuez_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Nuez";
        clon.descripcion = "+1 Vida.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "curar_1";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }

    public static crearMiedicaBang(): Carta {
        let clon = new Carta();
        clon.id = `miedica_bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Miedica BANG!";
        clon.descripcion = "Quita 1 vida a un jugador a tu alcance.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_1";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearImitadora(): Carta {
        let clon = new Carta();
        clon.id = `imitadora_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Imitadora";
        clon.descripcion = "Copia una planta aleatoria de tu mano.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "imitadora";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearPlantaCarnivora(): Carta {
        let clon = new Carta();
        clon.id = `planta_carnivora_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Planta carnivora"; 
        clon.descripcion = "Elimina 2 equipamientos aleatorios de un vecino.";
        clon.descripcionEnCatalan = "Elimina un equipament aleatori d un jugador.";
        clon.tipoDeUso = "objetivoVecino"; 
        clon.efecto = "desequipar_2";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearTrebolador(): Carta {
        let clon = new Carta();
        clon.id = `trebolador_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Trebolador";
        clon.descripcion = "Descarta una carta aleatoria de un jugador.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal";
        clon.efecto = "trebolador";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearPetaseta(): Carta {
        let clon = new Carta();
        clon.id = `petaseta_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Petaseta";
        clon.descripcion = "A TODOS (te incluye) le destruye todo equipamiento y luego les hace 1 de daño inesquivable.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "petaseta";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon;
    }

    public static crearHumoseta(): Carta {
        let clon = new Carta();
        clon.id = `humoseta_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Humoseta";
        clon.descripcion = "Tus ataques ignoran escudo.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "humoseta";
        clon.esConjurada = false;
        clon.esPlanta = true
        return clon
    }
}