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

    public static crearTiratachuela(): Carta {
        let tira = new Carta()
        tira.id = `tiratachuela_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        tira.nombre = "Tiratachuela";
        tira.descripcion = "Dispara a todos los demás jugadores uno por uno.";
        tira.descripcionEnCatalan = "Dispara a tots els altres jugadors un per un."
        tira.tipoDeUso = "instantanea";
        tira.efecto = "tiratachuela";
        tira.esConjurada = false
        return tira
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

    public static crearTiendaDePierre(): Carta {
        const clon = new Carta();
        clon.id = `tienda_pierre_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "La tienda de Pierre";
        clon.descripcion = "Empezando por vos, todos eligen cartas exclusivas de esta tienda.";
        clon.descripcionEnCatalan = "."
        clon.tipoDeUso = "instantanea";
        clon.efecto = "tiendaPierre";  
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

    public static crearBang(): Carta {
        let clon = new Carta();
        clon.id = `bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "BANG!";
        clon.descripcion = "Quita 1 vida a un jugador a tu alcance.";
        clon.descripcionEnCatalan = "";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_1";
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

    public static crearEscopetasReaperPro(): Carta {
        let clon = new Carta();
        clon.id = `arma_reaper_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Escopetas de Reaper Pro";
        clon.descripcion = "Alcance: 2. Tus BANG! comunes infligen el doble de daño.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_2_1_0`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearPistolaDeTracerPro(): Carta {
        let clon = new Carta();
        clon.id = `pistola_de_tracer_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Pistola de Tracer Pro";
        clon.descripcion = "Alcance 2. No tenes limites de Bang!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_2`; 
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
        clon.efecto = "robarEnemigo";
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

    public static crearGranDesaparicion(): Carta {
        let clon = new Carta();
        clon.id = `gran_desaparicion_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Gran desaparicion";
        clon.descripcion = "este texto se pone dinamicamente, si lees esto es un error";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "granDesaparicion";
        clon.esConjurada = false;
        return clon
    }

    public static crearHordaDeBloons(): Carta {
        let clon = new Carta();
        clon.id = `horda_bloons_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Horda de Bloons";
        clon.descripcion = "Lanzá bloons a un jugador a tu alcance. Debe usar un BANG!, Barril o perder 1 vida.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivo"; 
        clon.efecto = "hordaBloons";
        clon.esConjurada = false;
        return clon;
    }

    public static crearPatadaKillo(): Carta {
        let clon = new Carta();
        clon.id = `patada_killo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Patada Killo";
        clon.descripcion = "2 de daño a un vecino. Se puede defender descartando Caballo o Barril, puede esquivar con ¡Fallo!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoVecino"; 
        clon.efecto = "patadaKillo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearMacetaKillo(): Carta {
        let clon = new Carta();
        clon.id = `maceta_killo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Maceta Killo";
        clon.descripcion = "1 de daño a quien quieras. Se puede evadir con BANG! o ¡Fallo!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "macetaKillo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearDomoProtector(): Carta {
        let clon = new Carta();
        clon.id = `domo_protector_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Domo protector";
        clon.descripcion = "Todos los jugadores ganan 1 de escudo.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "domoProtector";
        clon.esConjurada = false;
        return clon;
    }

    public static crearBotiquin(): Carta {
        let clon = new Carta();
        clon.id = `botiquin_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Botiquín";
        clon.descripcion = "+1 vida, te salva de morir.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "curar_1";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEscopetazo(): Carta {
        let clon = new Carta();
        clon.id = `escopetazo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Escopetazo BANG!";
        clon.descripcion = "No deberias ver esto.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_1";
        clon.esConjurada = false;
        return clon;
    }

    public static crearSecador(): Carta {
        let clon = new Carta();
        clon.id = `secador_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Secador";
        clon.descripcion = "Da 1 escudo a otro jugador.";
        clon.descripcionEnCatalan = "";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "secador";
        clon.esConjurada = false;
        return clon;
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
            { id: "hordaDeBloons", copias: 3 },
            { id: "domoProtector", copias: 1 },
            { id: "tiendaDePierre", copias: 1 },
            { id: "manzanaDorada", copias: 1},
            { id: "mechero", copias: 2},
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
            case "hordaDeBloons": return this.crearHordaDeBloons()
            case "domoProtector": return this.crearDomoProtector()
            case "tiendaDePierre": return this.crearTiendaDePierre()
            case "manzanaDorada": return this.crearManzanaDorada()
            case "mechero": return this.crearMechero()

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
        let opciones = ["dano", "curar", "robar", "descartar", "comilon", "libro"];
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
            clon.descripcion = "Agrega 2 espacios de +1 vida en la ruleta de un jugador vivo.";
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
        } else if (elegida === "libro") {
            clon.nombre = "Libro encantado";
            clon.descripcion = "Agrega 3 espacios de mejora de equipamiento en la ruleta de un jugador vivo.";
            clon.descripcionEnCatalan = ".";
            clon.efecto = "embrujar_libro_3";
            clon.tipoEmbrujo = "bueno"
        }
        return clon;
    }

    public static crearCartaPlantaAleatoria(): Carta | null {
        const numero: number = Math.floor(Math.random() * 16)
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
                return this.crearPlantaCarnivora()
            case 14:
                return this.crearNutriente()
            case 15:
                return this.crearGirasol()
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
        clon.efecto = "lanzaguisantes_arma_3";
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
        clon.efecto = "lanzaguisantes_arma_5";
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

    public static crearNutriente(): Carta {
        let clon = new Carta();
        clon.id = `nutriente_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Nutriente";
        clon.descripcion = "Mejora un equipamiento aleatorio. Las armas evolucionan y el resto se vuelve versión 'Pro'.";
        clon.descripcionEnCatalan = "Millora un equipament aleatori. Les armes evolucionen i la resta es converteix en versió 'Pro'.";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "nutriente";
        clon.esConjurada = false;
        clon.esPlanta = true;
        return clon;
    }

    public static crearGirasol(): Carta {
        let clon = new Carta();
        clon.id = `girasol_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Girasol";
        clon.descripcion = "Da 0.5 soles al inicio del turno. Cada 1 sol, te da una planta. Si tenes un Girasol, se mejora a Birasol.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "girasol";
        clon.esConjurada = false;
        clon.esPlanta = true;
        return clon;
    }

    public static crearBirasol(): Carta {
        let clon = new Carta();
        clon.id = `birasol_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Birasol";
        clon.descripcion = "Da 1 sol al inicio del turno. Cada 1 sol, te da una planta.";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = "girasol";
        clon.esConjurada = false;
        clon.esPlanta = true;
        return clon;
    }

    public static crearCartaPierreAleatoria(): Carta | null {
        const numero: number = Math.floor(Math.random() * 19)
        switch (numero){
            case 0:
                return this.crearTirachinas()
            case 1:
                return this.crearEnsalada()
            case 2:
                return this.crearEspantacocoroch()
            case 3:
                return this.crearWarpTotem()
            case 4:
                return this.crearBomba()
            case 5:
                return this.crearMegaBomba()
            case 6:
                return this.crearFestivalDelHuevo()
            case 7:
                return this.crearTormenta()
            case 8:
                return this.crearEsquirlaPrismatica()
            case 9:
                return this.crearEspirituAlegre()
            case 10:
                return this.crearEspirituEnojado()
            case 11:
                return this.crearCafe()
            case 12:
                return this.crearEspadaGalactica()
            case 13:
                return this.crearAnilloDeIridio()
            case 14:
                return this.crearAnilloDeInmunidad()
            case 15:
                return this.crearAnilloDelVampiro()
            case 16:
                return this.crearAnilloDelLadron()
            case 17:
                return this.crearAnilloDeLaSuerte()
            case 18:
                return this.crearAnilloDeYoba()
            
            default: 
                return null
        }
    }

    public static crearTirachinas(): Carta {
        let clon = new Carta();
        clon.id = `tirachinas_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Tirachinas";
        clon.descripcion = "Alcance 2. No tenes limites de Bang!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_2`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearTirachinasMaestro(): Carta {
        let clon = new Carta();
        clon.id = `tirachinas_maestro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Tirachinas maestro";
        clon.descripcion = "Alcance 3. No tenes limites de Bang!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_3`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearEnsalada(): Carta {
        let clon = new Carta();
        clon.id = `ensalada_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Ensalada";
        clon.descripcion = "+2 vidas (en 1vs1 +1 vida)";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "ensalada";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspantacocoroch(): Carta {
        let clon = new Carta();
        clon.id = `espantacocoroch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espantacocoroch";
        clon.descripcion = "Los cocoroch rivales ya no te molestan, al jugar un cocoroch roba una carta.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento"; 
        clon.efecto = "espantacocoroch";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspantacocorochPro(): Carta {
        let clon = new Carta();
        clon.id = `espantacocorochPro_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espantacocoroch Pro";
        clon.descripcion = "Los cocoroch rivales ya no te molestan, al jugar un cocoroch roba 2 cartas.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento"; 
        clon.efecto = "espantacocoroch";
        clon.esConjurada = false;
        return clon;
    }

    public static crearWarpTotem(): Carta {
        let clon = new Carta();
        clon.id = `warp_totem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Warp Totem";
        clon.descripcion = "Intercambia lugar con otro jugador, roba una carta, y cura 1.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "warpTotem";
        clon.esConjurada = false;
        return clon;
    }

    public static crearBomba(): Carta {
        let clon = new Carta();
        clon.id = `bomba_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Bomba";
        clon.descripcion = "Los jugadores a distancia 1 deben descartar su carta izquierda o perder 1 vida.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "bomba";
        clon.esConjurada = false;
        return clon;
    }

    public static crearMegaBomba(): Carta {
        let clon = new Carta();
        clon.id = `mega_bomba_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Mega Bomba";
        clon.descripcion = "Los jugadores a distancia 1 y 2 deben descartar sus 2 cartas de la izquierda o perder 1 vida.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "megaBomba";
        clon.esConjurada = false;
        return clon;
    }

    public static crearFestivalDelHuevo(): Carta {
        let clon = new Carta();
        clon.id = `festival_del_huevo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Festival del Huevo";
        clon.descripcion = "Todos roban una carta, los jugadores con mas cartas reciben un huevo aleatorio (daño, cura o robo).";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "festivalDelHuevo";
        clon.esConjurada = false;
        return clon;
    }

    public static crearCartaHuevoAleatorio(): Carta | null {
        const numero: number = Math.floor(Math.random() * 3)
        switch (numero){
            case 0:
                return this.crearHuevoBang()
            case 1:
                return this.crearHuevoSano()
            case 2:
                return this.crearHuevoSorpresa()
            
            default: 
                return null
        }
    }

    public static crearHuevoBang(): Carta {
        let clon = new Carta();
        clon.id = `huevo_bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Huevo BANG!";
        clon.descripcion = "Quita 1 vida a un jugador a tu alcance.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_1";
        clon.esConjurada = false;
        return clon;
    }

    public static crearHuevoSano(): Carta {
        let clon = new Carta();
        clon.id = `huevo_sano_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Huevo sano";
        clon.descripcion = "+1 vida, te salva de morir.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "curar_1";
        clon.esConjurada = false;
        return clon;
    }

    public static crearHuevoSorpresa(): Carta {
        let clon = new Carta();
        clon.id = `huevo_sorpresa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Huevo sorpresa";
        clon.descripcion = "Roba 1 carta.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "robar_1";
        clon.esConjurada = false;
        return clon;
    }

    public static crearTormenta(): Carta {
        let clon = new Carta();
        clon.id = `tormenta_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Tormenta";
        clon.descripcion = "Los demas jugadores deben descartar un equipamiento o recibir 1 de daño.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "tormenta";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEsquirlaPrismatica(): Carta {
        let clon = new Carta();
        clon.id = `esquirla_prismatica_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Esquirla prismatica";
        clon.descripcion = "Mejora todo tu equipamiento al maximo.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "esquirlaPrismatica";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspirituAlegre(): Carta {
        let clon = new Carta();
        clon.id = `espiritu_alegre_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espiritu alegre";
        clon.descripcion = "Suerte +2.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento"; 
        clon.efecto = "espirituAlegre";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspirituEnojado(): Carta {
        let clon = new Carta();
        clon.id = `espiritu_enojado_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espiritu enojado";
        clon.descripcion = "Elegi un jugador para que tenga suerte -2.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "espirituEnojado";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspirituAlegrePro(): Carta {
        let clon = new Carta();
        clon.id = `espiritu_alegre_pro_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espiritu alegre Pro";
        clon.descripcion = "Suerte +4.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento"; 
        clon.efecto = "espirituAlegre";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspirituEnojadoPro(): Carta {
        let clon = new Carta();
        clon.id = `espiritu_enojado_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Espiritu enojado Pro";
        clon.descripcion = "Elegi un jugador para que tenga suerte -4.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "espirituEnojado";
        clon.esConjurada = false;
        return clon;
    }

    public static crearCafe(): Carta {
        let clon = new Carta();
        clon.id = `cafe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Cafe";
        clon.descripcion = "Cura 1 y reinicia tu limite de Bang!.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "instantanea"; 
        clon.efecto = "cafe";
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspadaGalactica(): Carta {
        let clon = new Carta();
        clon.id = `arma_espada_galactica_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Espada galactica";
        clon.descripcion = "Alcance 1, daño 2, sin limites de Bang!, al final del turno se desequipa.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_1_1_0`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearEspadaGalacticaPro(): Carta {
        let clon = new Carta();
        clon.id = `arma_espada_galactica_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Espada galactica Pro";
        clon.descripcion = "Alcance 1, daño 2, sin limites de Bang!";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "equipamiento";
        clon.efecto = `equipar_arma_1_1_0`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDeIridio(): Carta {
        let clon = new Carta();
        clon.id = `anillo_de_iridio_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo de iridio";
        clon.descripcion = "En mano: ganás 3 de alcance.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDeInmunidad(): Carta {
        let clon = new Carta();
        clon.id = `anillo_de_inmunidad_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo de inmunidad";
        clon.descripcion = "En mano: reduce el daño recibido a 0, te da 2 escudos y luego se descarta.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDelVampiro(): Carta {
        let clon = new Carta();
        clon.id = `anillo_del_vampiro_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo del vampiro";
        clon.descripcion = "En mano: matar un jugador te cura 2.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDelLadron(): Carta {
        let clon = new Carta();
        clon.id = `anillo_del_ladron_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo del ladron";
        clon.descripcion = "En mano: cuando robas cartas, robas una extra.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDeLaSuerte(): Carta {
        let clon = new Carta();
        clon.id = `anillo_de_la_suerte_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo de la suerte";
        clon.descripcion = "En mano: tenés suerte +3.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearAnilloDeYoba(): Carta {
        let clon = new Carta();
        clon.id = `anillo_de_yoba_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Anillo de Yoba";
        clon.descripcion = "En mano: luego de recibir daño, tiene un 33% de obtener 1 escudo.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `null`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearZombidito(): Carta {
        let clon = new Carta();
        clon.id = `zombidito_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Zombidito";
        clon.descripcion = "Al descartar: recibis 1 de daño, si sos Zombistein, te curas 1.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `descartar_zombidito_1`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearCrisalida(): Carta {
        let clon = new Carta();
        clon.id = `crisalida_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        clon.nombre = "Crisalida"; 
        clon.descripcion = "Un jugador tiene 9/16 de salir de la crisalida o perder el turno, tanquea daño y se rompe.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "crisalida";
        clon.esConjurada = false;
        return clon;
    }

    public static crearHuevoExplosivo(): Carta {
        let clon = new Carta();
        clon.id = `huevo_explosivo_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        clon.nombre = "Huevo explosivo";
        clon.descripcion = "Al descartar: recibis 1 de daño.";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "oculto";
        clon.efecto = `descartar_huevoExplosivo_1`; 
        clon.esConjurada = false;
        return clon;
    }

    public static crearCofre(): Carta {
        let clon = new Carta();
        clon.id = `cofre_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        clon.nombre = "Cofre";
        clon.descripcion = "Roba 2 cartas del mazo.";
        clon.descripcionEnCatalan = "Roba 2 cartes de la baralla."
        clon.tipoDeUso = "instantanea";
        clon.efecto = "robar_2";
        clon.esConjurada = false
        return clon
    }

    public static crearCofreSuperMagico(): Carta {
        let clon = new Carta();
        clon.id = `cofre_super_magico_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        clon.nombre = "Cofre super magico";
        clon.descripcion = "Roba 3 cartas del mazo.";
        clon.descripcionEnCatalan = "Roba 2 cartes de la baralla."
        clon.tipoDeUso = "instantanea";
        clon.efecto = "robar_3";
        clon.esConjurada = false
        return clon
    }

    public static crearCocoroch(): Carta {
        const cat = new Carta();
        cat.id = `cocoroch_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        cat.nombre = "Cocoroch";
        cat.descripcion = "Un jugador descarta una carta de la mano o equipada.";
        cat.descripcionEnCatalan = "Un jugador descarta una carta de la mà o que tingui equipada."
        cat.tipoDeUso = "objetivoGlobal";
        cat.efecto = "forzar"; 
        cat.esConjurada = false
        return cat
    }

    public static crearMusicoterapia(): Carta {
        const poco = new Carta();
        poco.id = `musicoterapia_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        poco.nombre = "Musicoterapia";
        poco.descripcion = "+1 vida para todos.";
        poco.descripcionEnCatalan = "+1 vida per a tothom."
        poco.tipoDeUso = "instantanea";
        poco.efecto = "curarATodos";
        poco.esConjurada = false
        return poco
    }

    public static crearIndios(): Carta {
        const indios = new Carta();
        indios.id = `indios_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        indios.nombre = "¡Indios!";
        indios.descripcion = "Todos los demás jugadores descartan un BANG! o pierden 1 vida.";
        indios.descripcionEnCatalan = "Tots els altres jugadors descarten un BANG! o perden 1 punt de vida."
        indios.tipoDeUso = "instantanea"; 
        indios.efecto = "indios";  
        indios.esConjurada = false
        return indios
    }

    public static crearTiendaDeGriff(): Carta {
        const tienda = new Carta();
        tienda.id = `tienda_griff_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        tienda.nombre = "La tienda de Griff";
        tienda.descripcion = "Revela cartas, empezando por vos, cada jugador elige una.";
        tienda.descripcionEnCatalan = "Revela cartes, començant per tu; cada jugador en tria una."
        tienda.tipoDeUso = "instantanea";
        tienda.efecto = "tienda";
        tienda.esConjurada = false
        return tienda
    }

    public static crearDuelo(): Carta {
        const duelo = new Carta();
        duelo.id = `duelo_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        duelo.nombre = "Duelo";
        duelo.descripcion = "Desafía a un jugador: descartan BANG! por turnos. Quien no pueda, pierde 1 vida.";
        duelo.descripcionEnCatalan = "Desafia un jugador: descarten BANG! per torns. Qui no pugui, perd 1 vida."
        duelo.tipoDeUso = "objetivoUniversal";
        duelo.efecto = "duelo"; 
        duelo.esConjurada = false
        return duelo
    }

    public static crearCaballo(): Carta {
        const mustang = new Carta();
        mustang.id = `caballo_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        mustang.nombre = "Caballo";
        mustang.descripcion = "Los demás te ven a distancia +1.";
        mustang.descripcionEnCatalan = "Els altres et veuen a distància +1."
        mustang.tipoDeUso = "equipamiento";
        mustang.efecto = "equiparMustang";
        mustang.esConjurada = false
        return mustang
    }

    public static crearMonoAldea(): Carta {
        const mira = new Carta();
        mira.id = `monoAldea_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        mira.nombre = "Monoaldea";
        mira.descripcion = "Aumenta tu alcance en 1.";
        mira.descripcionEnCatalan = "Veus els altres a distància -1."
        mira.tipoDeUso = "equipamiento";
        mira.efecto = "equiparMira";
        mira.esConjurada = false
        return mira
    }

    public static crearBarril(): Carta {
        const barril = new Carta();
        barril.id = `barril_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        barril.nombre = "Barril";
        barril.descripcion = "Podes usar el barril para tener 4/16 de esquivar un Bang!.";
        barril.descripcionEnCatalan = "Pots fer servir el barril per tenir un 25% de probabilitat d’esquivar un tret."
        barril.tipoDeUso = "equipamiento";
        barril.efecto = "equiparBarril";
        barril.esConjurada = false
        return barril
    }

    public static crearPrision(): Carta {
        const prision = new Carta();
        prision.id = `prision_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        prision.nombre = "Prisión";
        prision.descripcion = "Un jugador tiene 6/16 de salir de la carcel o perder el turno (no afecta al Sheriff).";
        prision.descripcionEnCatalan = "Un jugador té un 37,5% de sortir de la presó o perdre el torn (no afecta el Sheriff)."
        prision.tipoDeUso = "objetivoGlobal"; 
        prision.efecto = "prision";
        prision.esConjurada = false
        return prision
    }

    public static crearDinamita(): Carta {
        const dinamita = new Carta();
        dinamita.id = `dinamita_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        dinamita.nombre = "Dinamita";
        dinamita.descripcion = "Tenes 2/16 de que explote y perder 3 vidas, si no pasa al siguiente.";
        dinamita.descripcionEnCatalan = "Tens un 12,5% que exploti i perdis 3 vides; si no, passa al següent."
        dinamita.tipoDeUso = "equipamiento";
        dinamita.efecto = "equiparDinamita";
        dinamita.esConjurada = false
        return dinamita
    }

    public static crearDinamitaPro(): Carta {
        const dinamita = new Carta();
        dinamita.id = `dinamita_pro_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        dinamita.nombre = "Dinamita Pro";
        dinamita.descripcion = "Tenes 3/16 de que explote y perder 5 vidas, si no pasa al siguiente.";
        dinamita.descripcionEnCatalan = "Tens un 12,5% que exploti i perdis 3 vides; si no, passa al següent."
        dinamita.tipoDeUso = "equipamiento";
        dinamita.efecto = "equiparDinamita";
        dinamita.esConjurada = false
        return dinamita
    }

    public static crearOrbitaBang(): Carta {
        let clon = new Carta();
        clon.id = `orbita_bang_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Orbita BANG!";
        clon.descripcion = "Quita 0 vidas a un jugador a tu alcance y le agrega 3 efecto gravitacional.";
        clon.descripcionEnCatalan = "";
        clon.tipoDeUso = "objetivo";
        clon.efecto = "dano_0";
        clon.esConjurada = false;
        return clon;
    }

    public static crearManzanaDorada(): Carta {
        let clon = new Carta();
        clon.id = `manzana_dorada_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Manzana dorada";
        clon.descripcion = "Cura 1. Si no puede curar: gana 2 escudo.";
        clon.descripcionEnCatalan = "";
        clon.tipoDeUso = "instantanea";
        clon.efecto = "manzanaDorada";
        clon.esConjurada = false;
        return clon;
    }

    public static crearMechero(): Carta {
        let clon = new Carta();
        clon.id = `mechero_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        clon.nombre = "Mechero";
        clon.descripcion = "Agrega 1 efecto fuego a un jugador (debe descartar para evitar daño).";
        clon.descripcionEnCatalan = ".";
        clon.tipoDeUso = "objetivoUniversal"; 
        clon.efecto = "mechero";
        clon.esConjurada = false;
        return clon;
    }

    public static obtenerTodasLasCartas(): Carta[] {
        let lista: Carta[] = [];

        // --- CARTAS BÁSICAS Y COMUNES ---
        lista.push(this.crearBang());
        lista.push(this.crearFallo());
        lista.push(this.crearCofre());
        lista.push(this.crearCofreSuperMagico());
        lista.push(this.crearPanico());
        lista.push(this.crearCocoroch());
        lista.push(this.crearTiratachuela());
        lista.push(this.crearIndios());
        lista.push(this.crearDuelo());
        lista.push(this.crearTiendaDeGriff());
        lista.push(this.crearMusicoterapia());
        lista.push(this.crearManzanaDorada())
        lista.push(this.crearMechero())
        
        // --- ARMAS BÁSICAS (Ejemplos representativos) ---
        lista.push(this.crearArma("Pistola de Shion", 2));
        lista.push(this.crearArma("Revolver de Casiddy", 3));
        lista.push(this.crearArma("Rifle de Ashe", 4));
        lista.push(this.crearArma("Francotirador", 5));

        // --- EQUIPAMIENTO BÁSICO ---
        lista.push(this.crearCaballo());
        lista.push(this.crearMonoAldea());
        lista.push(this.crearBarril());
        lista.push(this.crearPrision());
        lista.push(this.crearDinamita());
        lista.push(this.crearDinamitaPro());

        // --- MEJORAS "PRO" Y CONJURADAS ---
        lista.push(this.crearCaballoPro());
        lista.push(this.crearMonoaldeaPro());
        lista.push(this.crearBarrilPro());
        
        // --- CARTAS DE EXTENSIONES (Juego Base / Anderlandis / Juju / Pierre) ---
        lista.push(this.crearAnderlandis());
        lista.push(this.crearTornado());
        lista.push(this.crearTiendaDeJuju());
        lista.push(this.crearTiendaDePierre());
        lista.push(this.crearPapapum());
        lista.push(this.crearRayo());
        lista.push(this.crearSpooky());
        lista.push(this.crearSuperBang());
        lista.push(this.crearClon());
        lista.push(this.crearEscopetasReaper());
        lista.push(this.crearEscopetasReaperPro());
        lista.push(this.crearPistolaDeTracerPro());
        lista.push(this.crearMortero());
        lista.push(this.crearValerieLadrona());
        lista.push(this.crearGranDesaparicion());
        lista.push(this.crearHordaDeBloons());
        lista.push(this.crearPatadaKillo());
        lista.push(this.crearMacetaKillo());
        lista.push(this.crearDomoProtector());
        lista.push(this.crearBotiquin());
        lista.push(this.crearSecador());
        lista.push(this.crearOrbitaBang())
        // lista.push(this.crearEscopetazo()); // Ignorado por ser de error interno o test

        // --- POOL DE PLANTAS ---
        lista.push(this.crearLanzaguisantes());
        lista.push(this.crearRepetidora());
        lista.push(this.crearCalabaza());
        lista.push(this.crearSetaBang());
        lista.push(this.crearComePiedras());
        lista.push(this.crearApisonaflorBang());
        lista.push(this.crearPlantorcha());
        lista.push(this.crearNuez());
        lista.push(this.crearMiedicaBang());
        lista.push(this.crearImitadora());
        lista.push(this.crearPlantaCarnivora());
        lista.push(this.crearTrebolador());
        lista.push(this.crearPetaseta());
        lista.push(this.crearHumoseta());
        lista.push(this.crearNutriente());
        lista.push(this.crearGirasol());
        lista.push(this.crearBirasol());

        // --- POOL DE PIERRE (Stardew Valley) ---
        lista.push(this.crearTirachinas());
        lista.push(this.crearTirachinasMaestro());
        lista.push(this.crearEnsalada());
        lista.push(this.crearEspantacocoroch());
        lista.push(this.crearEspantacocorochPro());
        lista.push(this.crearWarpTotem());
        lista.push(this.crearBomba());
        lista.push(this.crearMegaBomba());
        lista.push(this.crearFestivalDelHuevo());
        lista.push(this.crearHuevoBang());
        lista.push(this.crearHuevoSano());
        lista.push(this.crearHuevoSorpresa());
        lista.push(this.crearTormenta());
        lista.push(this.crearEsquirlaPrismatica());
        lista.push(this.crearEspirituAlegre());
        lista.push(this.crearEspirituEnojado());
        lista.push(this.crearEspirituAlegrePro());
        lista.push(this.crearEspirituEnojadoPro());
        lista.push(this.crearCafe());
        lista.push(this.crearEspadaGalactica());
        lista.push(this.crearEspadaGalacticaPro());
        lista.push(this.crearAnilloDeIridio());
        lista.push(this.crearAnilloDeInmunidad());
        lista.push(this.crearAnilloDelVampiro());
        lista.push(this.crearAnilloDelLadron());
        lista.push(this.crearAnilloDeLaSuerte());
        lista.push(this.crearAnilloDeYoba());

        // --- TOKENS Y MALDICIONES (Opcional, si quieres que salgan en la wiki) ---
        lista.push(this.crearZombidito());
        lista.push(this.crearCrisalida());
        lista.push(this.crearHuevoExplosivo());

        return lista;
    }
}