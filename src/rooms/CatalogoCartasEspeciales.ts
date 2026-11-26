import { Carta } from "./schema/MyRoomState.js";

function crearCartaBase(
    prefijoId: string,
    nombre: string,
    descripcion: string,
    tipoDeUso: "instantanea" | "equipamiento" | "objetivo" | "oculto",
    efecto: string,
    esConjurada: boolean = false
): Carta {
    const carta = new Carta();
    carta.id = `${prefijoId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    carta.nombre = nombre;
    carta.descripcion = descripcion;
    carta.tipoDeUso = tipoDeUso;
    carta.efecto = efecto;
    carta.esConjurada = esConjurada;
    return carta;
}

export class CatalogoCartasEspeciales {
    // =========================================================================
    // 1. CARTAS BÁSICAS Y COMUNES
    // =========================================================================

    public static crearBang(): Carta {
        return crearCartaBase("bang", "BANG!", "Quita 1 vida a un jugador a tu alcance.", "objetivo", "dano_1");
    }

    public static crearSuperBang(): Carta {
        return crearCartaBase("superBang", "SUPER BANG!", "Quita 2 vidas a un jugador a tu alcance.", "objetivo", "dano_2");
    }

    public static crearFallo(): Carta {
        return crearCartaBase("fallo", "¡Fallo!", "Esquiva un BANG!.", "oculto", "esquivar");
    }

    public static crearBotiquin(): Carta {
        return crearCartaBase("botiquin", "Botiquín", "+1 vida, te salva de morir.", "instantanea", "curar_1");
    }

    public static crearSpooky(): Carta {
        return crearCartaBase(
            "spooky",
            "Spooky",
            "Te otorga +1 de vida extra que supera tu máximo. Dura 1 ronda completa.",
            "instantanea",
            "equiparEscudo"
        );
    }

    public static crearCofre(): Carta {
        return crearCartaBase("cofre", "Cofre", "Roba 2 cartas del mazo.", "instantanea", "robar_2");
    }

    public static crearCofreSuperMagico(): Carta {
        return crearCartaBase("cofre_super_magico", "Cofre super magico", "Roba 3 cartas del mazo.", "instantanea", "robar_3");
    }

    public static crearPanico(): Carta {
        return crearCartaBase(
            "panico",
            "¡Pánico!",
            "Roba una carta de la mano o equipada a un jugador vecino.",
            "objetivo",
            "robarEnemigo"
        );
    }

    public static crearCocoroch(): Carta {
        return crearCartaBase(
            "cocoroch",
            "Cocoroch",
            "Un jugador descarta una carta de la mano o equipada.",
            "objetivo",
            "forzar"
        );
    }

    public static crearMusicoterapia(): Carta {
        return crearCartaBase("musicoterapia", "Musicoterapia", "+1 vida para todos.", "instantanea", "curarATodos");
    }

    public static crearTiratachuela(): Carta {
        return crearCartaBase(
            "tiratachuela",
            "Tiratachuela",
            "Dispara a todos los demás jugadores uno por uno.",
            "instantanea",
            "tiratachuela"
        );
    }

    public static crearIndios(): Carta {
        return crearCartaBase(
            "indios",
            "¡Indios!",
            "Todos los demás jugadores descartan un BANG! o pierden 1 vida.",
            "instantanea",
            "indios"
        );
    }

    public static crearTiendaDeGriff(): Carta {
        return crearCartaBase(
            "tienda_griff",
            "La tienda de Griff",
            "Revela cartas, empezando por vos, cada jugador elige una.",
            "instantanea",
            "tienda"
        );
    }

    public static crearDuelo(): Carta {
        return crearCartaBase(
            "duelo",
            "Duelo",
            "Desafía a un jugador: descartan BANG! por turnos. Quien no pueda, pierde 1 vida.",
            "objetivo",
            "duelo"
        );
    }

    // =========================================================================
    // 2. EQUIPAMIENTOS, ARMAS Y VERSIONES PRO
    // =========================================================================

    public static crearArma(nombre: string, alcance: number, esConjurada: boolean = false): Carta {
        return crearCartaBase(
            "arma",
            nombre,
            `Equipa esta arma para obtener alcance: ${alcance}`,
            "equipamiento",
            `equipar_arma_${alcance}`,
            esConjurada
        );
    }

    public static crearPistolaDeTracer(): Carta {
        return crearCartaBase(
            "pistola_de_tracer",
            "Pistola de Tracer",
            "Equipa esta arma para no tener limites de uso de BANG!.",
            "equipamiento",
            "equipar_arma_1"
        );
    }

    public static crearPistolaDeTracerPro(): Carta {
        return crearCartaBase(
            "pistola_de_tracer_pro",
            "Pistola de Tracer Pro",
            "Alcance 2. No tenes limites de Bang!.",
            "equipamiento",
            "equipar_arma_2"
        );
    }

    public static crearEscopetasReaper(): Carta {
        return crearCartaBase(
            "arma_reaper",
            "Escopetas de Reaper",
            "Alcance: 1. Tus BANG! comunes infligen el doble de daño.",
            "equipamiento",
            "equipar_arma_1_1_0"
        );
    }

    public static crearEscopetasReaperPro(): Carta {
        return crearCartaBase(
            "arma_reaper_pro",
            "Escopetas de Reaper Pro",
            "Alcance: 2. Tus BANG! comunes infligen el doble de daño.",
            "equipamiento",
            "equipar_arma_2_1_0"
        );
    }

    public static crearMortero(): Carta {
        return crearCartaBase(
            "arma_mortero",
            "Mortero",
            "Alcance Infinito. No puede disparar a jugadores a distancia 1 o menor.",
            "equipamiento",
            "equipar_arma_999_0_2"
        );
    }

    public static crearCaballo(): Carta {
        return crearCartaBase("caballo", "Caballo", "Los demás te ven a distancia +1.", "equipamiento", "equiparMustang");
    }

    public static crearCaballoPro(): Carta {
        return crearCartaBase("caballo_pro", "Caballo Pro", "Los demás te ven a distancia +2.", "equipamiento", "equiparMustangPro", true);
    }

    public static crearMonoAldea(): Carta {
        return crearCartaBase("monoAldea", "Monoaldea", "Aumenta tu alcance en 1.", "equipamiento", "equiparMira");
    }

    public static crearMonoaldeaPro(): Carta {
        return crearCartaBase("monoaldea_pro", "Monoaldea Pro", "Ves a los demás a distancia -2.", "equipamiento", "equiparMiraPro", true);
    }

    public static crearBarril(): Carta {
        return crearCartaBase("barril", "Barril", "Podes usar el barril para tener 4/16 de esquivar un Bang!.", "equipamiento", "equiparBarril");
    }

    public static crearBarrilPro(): Carta {
        return crearCartaBase(
            "barril_pro",
            "Barril Pro",
            "Si te disparan, tenés 25% de esquivar el tiro dos veces.",
            "equipamiento",
            "equiparBarrilPro",
            true
        );
    }

    public static crearPrision(): Carta {
        return crearCartaBase(
            "prision",
            "Prisión",
            "Un jugador tiene 6/16 de salir de la carcel o perder el turno (no afecta al Sheriff).",
            "objetivo",
            "prision"
        );
    }

    public static crearDinamita(): Carta {
        return crearCartaBase(
            "dinamita",
            "Dinamita",
            "Tenes 2/16 de que explote y perder 3 vidas, si no pasa al siguiente.",
            "equipamiento",
            "equiparDinamita"
        );
    }

    public static crearDinamitaPro(): Carta {
        return crearCartaBase(
            "dinamita_pro",
            "Dinamita Pro",
            "Tenes 3/16 de que explote y perder 5 vidas, si no pasa al siguiente.",
            "equipamiento",
            "equiparDinamita"
        );
    }

    // =========================================================================
    // 3. EXTENSIONES Y CARTAS DE PERSONAJES
    // =========================================================================

    public static crearAnderlandis(): Carta {
        return crearCartaBase("anderlandis", "Anderlandis", "Elegí un jugador y ambos recuperan 1 de vida.", "objetivo", "curarDuo");
    }

    public static crearTornado(): Carta {
        return crearCartaBase("tornado", "Tornado", "Elimina un equipamiento aleatorio de un jugador.", "objetivo", "desequipar_1");
    }

    public static crearTiendaDeJuju(): Carta {
        return crearCartaBase("tienda_juju", "La tienda de Juju", "Los demas jugadores eligen cartas malditas.", "instantanea", "tiendaJuju");
    }

    public static crearTiendaDePierre(): Carta {
        return crearCartaBase(
            "tienda_pierre",
            "La tienda de Pierre",
            "Empezando por vos, todos eligen cartas exclusivas de esta tienda.",
            "instantanea",
            "tiendaPierre"
        );
    }

    public static crearPapapum(): Carta {
        const clon = crearCartaBase(
            "papapum",
            "Papapum",
            "Pasá la papapum golpeando con BANG!. Daño 2. Si no explota, su probabilidad aumenta.",
            "equipamiento",
            "equiparPapapum"
        );
        clon.esPlanta = true;
        clon.number.set("probabilidadPapa", 1);
        return clon;
    }

    public static crearRayo(): Carta {
        return crearCartaBase(
            "rayo",
            "Rayo",
            "Golpea a los jugadores con mas salud. No se puede esquivar. Te incluye.",
            "instantanea",
            "rayo"
        );
    }

    public static crearClon(): Carta {
        return crearCartaBase("clon_card", "Clon", "Clona una carta no clonada de tu mano aleatoria.", "instantanea", "clonarMano");
    }

    public static crearValerieLadrona(): Carta {
        return crearCartaBase("valerie_ladrona", "Valerie ladrona", "Roba la carta de la izquierda de un jugador.", "objetivo", "valerieLadrona");
    }

    public static crearGranDesaparicion(): Carta {
        return crearCartaBase(
            "gran_desaparicion",
            "Gran desaparicion",
            "Desaparece todo el equipamiento del jugador vinculado.",
            "instantanea",
            "granDesaparicion"
        );
    }

    public static crearHordaDeBloons(): Carta {
        return crearCartaBase(
            "horda_bloons",
            "Horda de Bloons",
            "Lanzá bloons a un jugador a tu alcance. Debe usar un BANG!, Barril o perder 1 vida.",
            "objetivo",
            "hordaBloons"
        );
    }

    public static crearPatadaKillo(): Carta {
        return crearCartaBase(
            "patada_killo",
            "Patada Killo",
            "2 de daño a un vecino. Se puede defender descartando Caballo o Barril, puede esquivar con ¡Fallo!.",
            "objetivo",
            "patadaKillo"
        );
    }

    public static crearMacetaKillo(): Carta {
        return crearCartaBase(
            "maceta_killo",
            "Maceta Killo",
            "1 de daño a quien quieras. Se puede evadir con BANG! o ¡Fallo!.",
            "objetivo",
            "macetaKillo"
        );
    }

    public static crearDomoProtector(): Carta {
        return crearCartaBase("domo_protector", "Domo protector", "Todos los jugadores ganan 1 de escudo.", "instantanea", "domoProtector");
    }

    public static crearEscopetazo(dano: number = 1): Carta {
        const clon = crearCartaBase(
            "escopetazo",
            "Escopetazo BANG!",
            `Hace ${dano} de daño a un jugador a tu alcance.`,
            "objetivo",
            `dano_${dano}`
        );
        clon.number.set("danoEscopetazo", dano);
        return clon;
    }

    public static crearSecador(): Carta {
        return crearCartaBase("secador", "Secador", "Da 1 escudo a otro jugador.", "objetivo", "secador");
    }

    public static crearOrbitaBang(): Carta {
        return crearCartaBase(
            "orbita_bang",
            "Orbita BANG!",
            "Quita 0 vidas a un jugador a tu alcance y le agrega 3 efecto gravitacional.",
            "objetivo",
            "dano_0"
        );
    }

    public static crearKaruma(): Carta {
        return crearCartaBase(
            "karuma",
            "Karuma",
            "Funciona como un BANG! pero inflige 2 de daño a sus vecinos.",
            "objetivo",
            "dano_2"
        );
    }

    public static crearDominoAleatorio(): Carta {
        const numero = Math.floor(Math.random() * 3);
        if (numero === 0) {
            return crearCartaBase("domino", "Domino", "?????", "instantanea", "curar_1", true);
        }
        if (numero === 1) {
            return crearCartaBase("domino", "Domino", "?????", "instantanea", "robar_1", true);
        }
        return crearCartaBase("domino", "Domino", "?????", "equipamiento", "equipar_arma_4", true);
    }

    public static crearManzanaDorada(): Carta {
        return crearCartaBase(
            "manzana_dorada",
            "Manzana dorada",
            "Cura 1. Si no puede curar: gana 2 escudo.",
            "instantanea",
            "manzanaDorada"
        );
    }

    public static crearMechero(): Carta {
        return crearCartaBase(
            "mechero",
            "Mechero",
            "Agrega 1 efecto fuego a un jugador (debe descartar para evitar daño).",
            "objetivo",
            "mechero"
        );
    }

    public static crearAlmaBalatro(): Carta {
        return crearCartaBase("alma_balatro", "Alma", "Conjura uno de los 5 comodines legendarios.", "instantanea", "almaBalatro");
    }

    public static crearCofreLegendario(): Carta {
        return crearCartaBase(
            "cofre_legendario",
            "Cofre legendario",
            "Conjura una carta aleatoria de todo el juego.",
            "instantanea",
            "cofreLegendario"
        );
    }

    public static crearZombidito(): Carta {
        return crearCartaBase(
            "zombidito",
            "Zombidito",
            "Al descartar: recibis 1 de daño, si sos Zombistein, te curas 1.",
            "oculto",
            "descartar_zombidito_1"
        );
    }

    public static crearCrisalida(): Carta {
        return crearCartaBase(
            "crisalida",
            "Crisalida",
            "Un jugador tiene 9/16 de salir de la crisalida o perder el turno, tanquea daño y se rompe.",
            "objetivo",
            "crisalida"
        );
    }

    public static crearHuevoExplosivo(): Carta {
        return crearCartaBase("huevo_explosivo", "Huevo explosivo", "Al descartar: recibis 1 de daño.", "oculto", "descartar_huevoExplosivo_1");
    }

    // =========================================================================
    // 4. FANTASMAS Y MALDICIONES
    // =========================================================================

    public static crearGolpeFantasmal(): Carta {
        const clon = crearCartaBase(
            "golpe_fantasmal",
            "Golpe fantasmal",
            "Agrega 2 espacios de daño en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_dano_2"
        );
        clon.tipoEmbrujo = "malo";
        return clon;
    }

    public static crearMilagro(): Carta {
        const clon = crearCartaBase(
            "milagro",
            "Milagro",
            "Agrega 2 espacios de +1 vida en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_curar_2"
        );
        clon.tipoEmbrujo = "bueno";
        return clon;
    }

    public static crearRegaloDivino(): Carta {
        const clon = crearCartaBase(
            "regalo_divino",
            "Regalo divino",
            "Agrega 4 espacios de robo en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_robar_4"
        );
        clon.tipoEmbrujo = "bueno";
        return clon;
    }

    public static crearCocorochFantasma(): Carta {
        const clon = crearCartaBase(
            "cocoroch_fantasma",
            "Cocoroch fantasma",
            "Agrega 4 espacios de descarte en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_descartar_4"
        );
        clon.tipoEmbrujo = "malo";
        return clon;
    }

    public static crearFantasmaComilon(): Carta {
        const clon = crearCartaBase(
            "fantasma_comilon",
            "Fantasma comilon",
            "Agrega 3 espacios de eliminacion de equipamiento en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_comilon_3"
        );
        clon.tipoEmbrujo = "malo";
        return clon;
    }

    public static crearLibroEncantado(): Carta {
        const clon = crearCartaBase(
            "libro_encantado",
            "Libro encantado",
            "Agrega 3 espacios de mejora de equipamiento en la ruleta de un jugador vivo.",
            "objetivo",
            "embrujar_libro_3"
        );
        clon.tipoEmbrujo = "bueno";
        return clon;
    }

    public static crearHongoVenenoso(): Carta {
        return crearCartaBase("hongo_venenoso", "Hongo Venenoso", "Al descartarla recibis 1 de daño.", "oculto", "descartar_venenoso_1");
    }

    public static crearReductor(): Carta {
        return crearCartaBase(
            "reductor",
            "Reductor",
            "Al descartarla si tu vida no está al maximo, tu vida máxima baja en 1.",
            "oculto",
            "descartar_reductor_1"
        );
    }

    public static crearSlimeComilon(): Carta {
        return crearCartaBase(
            "slime_comilon",
            "Slime Comilón",
            "Al descartarla elimina un equipamiento aleatorio tuyo.",
            "oculto",
            "descartar_comilon_1"
        );
    }

    public static crearCartaMaldita(): Carta {
        return crearCartaBase(
            "carta_maldita",
            "Carta Maldita",
            "Al descartarla descarta otra carta aleatoria de tu mano.",
            "oculto",
            "descartar_maldita_1"
        );
    }

    public static crearCartaFantasmaAleatoria(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearGolpeFantasmal(),
            () => this.crearMilagro(),
            () => this.crearRegaloDivino(),
            () => this.crearCocorochFantasma(),
            () => this.crearFantasmaComilon(),
            () => this.crearLibroEncantado()
        ];
        const carta = opciones[Math.floor(Math.random() * opciones.length)]();
        carta.esConjurada = true;
        return carta;
    }

    public static crearCartaMalditaAleatoria(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearHongoVenenoso(),
            () => this.crearReductor(),
            () => this.crearSlimeComilon(),
            () => this.crearCartaMaldita()
        ];
        const carta = opciones[Math.floor(Math.random() * opciones.length)]();
        carta.esConjurada = true;
        return carta;
    }

    // =========================================================================
    // 5. POOL DE PLANTAS (DAVE EL LOCO)
    // =========================================================================

    public static crearLanzaguisantes(): Carta {
        const clon = crearCartaBase(
            "lanzaguisantes",
            "Lanzaguisantes",
            "Equipa esta arma para obtener alcance 3 o mejorar a alcance 5 tu lanzaguisantes.",
            "equipamiento",
            "lanzaguisantes_arma_3"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearRepetidora(): Carta {
        const clon = crearCartaBase("repetidora", "Repetidora", "Equipa esta arma para obtener alcance 5.", "equipamiento", "lanzaguisantes_arma_5");
        clon.esPlanta = true;
        return clon;
    }

    public static crearCalabaza(): Carta {
        const clon = crearCartaBase("calabaza", "Calabaza", "Te protege del siguiente golpe.", "equipamiento", "calabaza");
        clon.esPlanta = true;
        return clon;
    }

    public static crearSetaBang(): Carta {
        const clon = crearCartaBase("seta_bang", "Seta BANG!", "Quita 1 vida a un vecino.", "objetivo", "dano_1");
        clon.esPlanta = true;
        return clon;
    }

    public static crearComePiedras(): Carta {
        const clon = crearCartaBase("come_piedras", "Come piedras", "Elimina un equipamiento aleatorio de un jugador.", "objetivo", "desequipar_1");
        clon.esPlanta = true;
        return clon;
    }

    public static crearApisonaflorBang(): Carta {
        const clon = crearCartaBase("apisonaflor_bang", "Apisonaflor BANG!", "Quita 2 vidas a un vecino.", "objetivo", "dano_2");
        clon.esPlanta = true;
        return clon;
    }

    public static crearPlantorcha(): Carta {
        const clon = crearCartaBase(
            "plantorcha",
            "Plantorcha",
            "Si tenes un lanzaguisantes o repetidora equipado, tus BANG! hacen +1 de daño.",
            "equipamiento",
            "plantorcha"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearNuez(): Carta {
        const clon = crearCartaBase("nuez", "Nuez", "+1 Vida.", "instantanea", "curar_1");
        clon.esPlanta = true;
        return clon;
    }

    public static crearMiedicaBang(): Carta {
        const clon = crearCartaBase("miedica_bang", "Miedica BANG!", "Quita 1 vida a un jugador a tu alcance.", "objetivo", "dano_1");
        clon.esPlanta = true;
        return clon;
    }

    public static crearImitadora(): Carta {
        const clon = crearCartaBase("imitadora", "Imitadora", "Copia una planta aleatoria de tu mano.", "instantanea", "imitadora");
        clon.esPlanta = true;
        return clon;
    }

    public static crearPlantaCarnivora(): Carta {
        const clon = crearCartaBase(
            "planta_carnivora",
            "Planta carnivora",
            "Elimina 2 equipamientos aleatorios de un vecino.",
            "objetivo",
            "desequipar_2"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearTrebolador(): Carta {
        const clon = crearCartaBase("trebolador", "Trebolador", "Descarta una carta aleatoria de un jugador.", "objetivo", "trebolador");
        clon.esPlanta = true;
        return clon;
    }

    public static crearPetaseta(): Carta {
        const clon = crearCartaBase(
            "petaseta",
            "Petaseta",
            "A TODOS (te incluye) le destruye todo equipamiento y luego les hace 1 de daño inesquivable.",
            "instantanea",
            "petaseta"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearHumoseta(): Carta {
        const clon = crearCartaBase("humoseta", "Humoseta", "Tus ataques ignoran escudo.", "equipamiento", "humoseta");
        clon.esPlanta = true;
        return clon;
    }

    public static crearNutriente(): Carta {
        const clon = crearCartaBase(
            "nutriente",
            "Nutriente",
            "Mejora un equipamiento aleatorio. Las armas evolucionan y el resto se vuelve versión 'Pro'.",
            "instantanea",
            "nutriente"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearGirasol(): Carta {
        const clon = crearCartaBase(
            "girasol",
            "Girasol",
            "Da 0.5 soles al inicio del turno. Cada 1 sol, te da una planta. Si tenes un Girasol, se mejora a Birasol.",
            "equipamiento",
            "girasol"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearBirasol(): Carta {
        const clon = crearCartaBase(
            "birasol",
            "Birasol",
            "Da 1 sol al inicio del turno. Cada 1 sol, te da una planta.",
            "equipamiento",
            "girasol"
        );
        clon.esPlanta = true;
        return clon;
    }

    public static crearCartaPlantaAleatoria(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearPapapum(),
            () => this.crearLanzaguisantes(),
            () => this.crearCalabaza(),
            () => this.crearSetaBang(),
            () => this.crearComePiedras(),
            () => this.crearApisonaflorBang(),
            () => this.crearPlantorcha(),
            () => this.crearNuez(),
            () => this.crearMiedicaBang(),
            () => this.crearImitadora(),
            () => this.crearHumoseta(),
            () => this.crearTrebolador(),
            () => this.crearPetaseta(),
            () => this.crearPlantaCarnivora(),
            () => this.crearNutriente(),
            () => this.crearGirasol()
        ];
        return opciones[Math.floor(Math.random() * opciones.length)]();
    }

    // =========================================================================
    // 6. POOL DE PIERRE (STARDEW VALLEY)
    // =========================================================================

    public static crearTirachinas(): Carta {
        return crearCartaBase("tirachinas", "Tirachinas", "Alcance 2. No tenes limites de Bang!.", "equipamiento", "equipar_arma_2");
    }

    public static crearTirachinasMaestro(): Carta {
        return crearCartaBase("tirachinas_maestro", "Tirachinas maestro", "Alcance 3. No tenes limites de Bang!.", "equipamiento", "equipar_arma_3");
    }

    public static crearEnsalada(): Carta {
        return crearCartaBase("ensalada", "Ensalada", "+2 vidas (en 1vs1 +1 vida).", "instantanea", "ensalada");
    }

    public static crearEspantacocoroch(): Carta {
        return crearCartaBase(
            "espantacocoroch",
            "Espantacocoroch",
            "Los cocoroch rivales ya no te molestan, al jugar un cocoroch roba una carta.",
            "equipamiento",
            "espantacocoroch"
        );
    }

    public static crearEspantacocorochPro(): Carta {
        return crearCartaBase(
            "espantacocorochPro",
            "Espantacocoroch Pro",
            "Los cocoroch rivales ya no te molestan, al jugar un cocoroch roba 2 cartas.",
            "equipamiento",
            "espantacocoroch"
        );
    }

    public static crearWarpTotem(): Carta {
        return crearCartaBase(
            "warp_totem",
            "Warp Totem",
            "Intercambia lugar con otro jugador, roba una carta, y cura 1.",
            "objetivo",
            "warpTotem"
        );
    }

    public static crearBomba(): Carta {
        return crearCartaBase(
            "bomba",
            "Bomba",
            "Los jugadores a distancia 1 deben descartar su carta izquierda o perder 1 vida.",
            "instantanea",
            "bomba"
        );
    }

    public static crearMegaBomba(): Carta {
        return crearCartaBase(
            "mega_bomba",
            "Mega Bomba",
            "Los jugadores a distancia 1 y 2 deben descartar sus 2 cartas de la izquierda o perder 1 vida.",
            "instantanea",
            "megaBomba"
        );
    }

    public static crearFestivalDelHuevo(): Carta {
        return crearCartaBase(
            "festival_del_huevo",
            "Festival del Huevo",
            "Todos roban una carta, los jugadores con mas cartas reciben un huevo aleatorio (daño, cura o robo).",
            "instantanea",
            "festivalDelHuevo"
        );
    }

    public static crearHuevoBang(): Carta {
        return crearCartaBase("huevo_bang", "Huevo BANG!", "Quita 1 vida a un jugador a tu alcance.", "objetivo", "dano_1");
    }

    public static crearHuevoSano(): Carta {
        return crearCartaBase("huevo_sano", "Huevo sano", "+1 vida, te salva de morir.", "instantanea", "curar_1");
    }

    public static crearHuevoSorpresa(): Carta {
        return crearCartaBase("huevo_sorpresa", "Huevo sorpresa", "Roba 1 carta.", "instantanea", "robar_1");
    }

    public static crearCartaHuevoAleatorio(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearHuevoBang(),
            () => this.crearHuevoSano(),
            () => this.crearHuevoSorpresa()
        ];
        return opciones[Math.floor(Math.random() * opciones.length)]();
    }

    public static crearTormenta(): Carta {
        return crearCartaBase(
            "tormenta",
            "Tormenta",
            "Los demas jugadores deben descartar un equipamiento o recibir 1 de daño.",
            "instantanea",
            "tormenta"
        );
    }

    public static crearEsquirlaPrismatica(): Carta {
        return crearCartaBase(
            "esquirla_prismatica",
            "Esquirla prismatica",
            "Mejora todo tu equipamiento al maximo.",
            "instantanea",
            "esquirlaPrismatica"
        );
    }

    public static crearEspirituAlegre(): Carta {
        return crearCartaBase("espiritu_alegre", "Espiritu alegre", "Suerte +2.", "equipamiento", "espirituAlegre");
    }

    public static crearEspirituEnojado(): Carta {
        return crearCartaBase("espiritu_enojado", "Espiritu enojado", "Elegi un jugador para que tenga suerte -2.", "objetivo", "espirituEnojado");
    }

    public static crearEspirituAlegrePro(): Carta {
        return crearCartaBase("espiritu_alegre_pro", "Espiritu alegre Pro", "Suerte +4.", "equipamiento", "espirituAlegre");
    }

    public static crearEspirituEnojadoPro(): Carta {
        return crearCartaBase("espiritu_enojado_pro", "Espiritu enojado Pro", "Elegi un jugador para que tenga suerte -4.", "objetivo", "espirituEnojado");
    }

    public static crearCafe(): Carta {
        return crearCartaBase("cafe", "Cafe", "Cura 1 y reinicia tu limite de Bang!.", "instantanea", "cafe");
    }

    public static crearEspadaGalactica(): Carta {
        return crearCartaBase(
            "arma_espada_galactica",
            "Espada galactica",
            "Alcance 1, daño 2, sin limites de Bang!, al final del turno se desequipa.",
            "equipamiento",
            "equipar_arma_1_1_0"
        );
    }

    public static crearEspadaGalacticaPro(): Carta {
        return crearCartaBase(
            "arma_espada_galactica_pro",
            "Espada galactica Pro",
            "Alcance 1, daño 2, sin limites de Bang!.",
            "equipamiento",
            "equipar_arma_1_1_0"
        );
    }

    public static crearAnilloDeIridio(): Carta {
        return crearCartaBase("anillo_de_iridio", "Anillo de iridio", "En mano: ganás 3 de alcance.", "oculto", "oculto");
    }

    public static crearAnilloDeInmunidad(): Carta {
        return crearCartaBase(
            "anillo_de_inmunidad",
            "Anillo de inmunidad",
            "En mano: reduce el daño recibido a 0, te da 2 escudos y luego se descarta.",
            "oculto",
            "oculto"
        );
    }

    public static crearAnilloDelVampiro(): Carta {
        return crearCartaBase("anillo_del_vampiro", "Anillo del vampiro", "En mano: matar un jugador te cura 2.", "oculto", "oculto");
    }

    public static crearAnilloDelLadron(): Carta {
        return crearCartaBase("anillo_del_ladron", "Anillo del ladron", "En mano: cuando robas cartas, robas una extra.", "oculto", "oculto");
    }

    public static crearAnilloDeLaSuerte(): Carta {
        return crearCartaBase("anillo_de_la_suerte", "Anillo de la suerte", "En mano: tenés suerte +3.", "oculto", "oculto");
    }

    public static crearAnilloDeYoba(): Carta {
        return crearCartaBase(
            "anillo_de_yoba",
            "Anillo de Yoba",
            "En mano: luego de recibir daño, tiene un 33% de obtener 1 escudo.",
            "oculto",
            "oculto"
        );
    }

    public static crearCartaPierreAleatoria(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearTirachinas(),
            () => this.crearEnsalada(),
            () => this.crearEspantacocoroch(),
            () => this.crearWarpTotem(),
            () => this.crearBomba(),
            () => this.crearMegaBomba(),
            () => this.crearFestivalDelHuevo(),
            () => this.crearTormenta(),
            () => this.crearEsquirlaPrismatica(),
            () => this.crearEspirituAlegre(),
            () => this.crearEspirituEnojado(),
            () => this.crearCafe(),
            () => this.crearEspadaGalactica(),
            () => this.crearAnilloDeIridio(),
            () => this.crearAnilloDeInmunidad(),
            () => this.crearAnilloDelVampiro(),
            () => this.crearAnilloDelLadron(),
            () => this.crearAnilloDeLaSuerte(),
            () => this.crearAnilloDeYoba()
        ];
        return opciones[Math.floor(Math.random() * opciones.length)]();
    }

    // =========================================================================
    // 7. COMODINES LEGENDARIOS (BALATRO)
    // =========================================================================

    public static crearCanio(): Carta {
        const clon = crearCartaBase("canio", "Canio", "", "oculto", "oculto");
        clon.number.set("canioEquipamiento", 2);
        clon.number.set("canioNivel", 0);
        clon.descripcion = "En mano: al equipar 2 carta: se mejora. Nivel actual: 0/3.";
        return clon;
    }

    public static crearYorick(): Carta {
        const clon = crearCartaBase(
            "yorick",
            "Yorick",
            "En mano: Al descartar: robas 1 (2 por turno). Al descartar 4 cartas en un mismo turno: te cura 1.",
            "oculto",
            "oculto"
        );
        clon.number.set("yorickDescartes", 0);
        return clon;
    }

    public static crearTriboulet(): Carta {
        return crearCartaBase(
            "triboulet",
            "Triboulet",
            "En mano: +1 alcance, +1 distancia defensiva, +1 almacenamiento, +1 al robar cartas y +1 suerte con ficha Triboulet (cura 1).",
            "oculto",
            "oculto"
        );
    }

    public static crearPerkeo(): Carta {
        return crearCartaBase(
            "perkeo",
            "Perkeo",
            "En mano: Al descartar una carta original, sacrifica otra carta original de tu mano y crea 2 clones de ella.",
            "oculto",
            "oculto"
        );
    }

    public static crearChicot(): Carta {
        return crearCartaBase(
            "chicot",
            "Chicot",
            "En mano: evita Cocoroch, Prisión y Pánico. Otorga +3 de suerte con fichas Chicot (roba 2).",
            "oculto",
            "oculto"
        );
    }

    public static crearCartaBalatroAleatoria(): Carta {
        const opciones: Array<() => Carta> = [
            () => this.crearCanio(),
            () => this.crearYorick(),
            () => this.crearTriboulet(),
            () => this.crearPerkeo(),
            () => this.crearChicot()
        ];
        return opciones[Math.floor(Math.random() * opciones.length)]();
    }

    // =========================================================================
    // 8. POOL DE EXTENSIONES Y WIKI
    // =========================================================================

    public static obtenerPoolExtensiones(): Array<{ id: string; copias: number }> {
        return [
            { id: "anderlandis", copias: 2 },
            { id: "tornado", copias: 1 },
            { id: "tiendaDeJuju", copias: 1 },
            { id: "papapum", copias: 1 },
            { id: "rayo", copias: 1 },
            { id: "superBang", copias: 1 },
            { id: "clon", copias: 2 },
            { id: "escopetasReaper", copias: 1 },
            { id: "hordaDeBloons", copias: 3 },
            { id: "domoProtector", copias: 1 },
            { id: "tiendaDePierre", copias: 1 },
            { id: "manzanaDorada", copias: 1 },
            { id: "mechero", copias: 2 },
            { id: "cofreLegendario", copias: 1 },
            { id: "mortero", copias: 1 },
        ];
    }

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
            case "hordaDeBloons": return this.crearHordaDeBloons();
            case "domoProtector": return this.crearDomoProtector();
            case "tiendaDePierre": return this.crearTiendaDePierre();
            case "manzanaDorada": return this.crearManzanaDorada();
            case "mechero": return this.crearMechero();
            case "cofreLegendario": return this.crearCofreLegendario();
            default: return null;
        }
    }

    public static obtenerTodasLasCartas(): Carta[] {
        return [
            this.crearCofreLegendario(),
            this.crearAlmaBalatro(),
            this.crearCanio(),
            this.crearYorick(),
            this.crearTriboulet(),
            this.crearPerkeo(),
            this.crearChicot(),

            // Básicas y comunes
            this.crearBang(),
            this.crearFallo(),
            this.crearBotiquin(),
            this.crearCofre(),
            this.crearCofreSuperMagico(),
            this.crearPanico(),
            this.crearCocoroch(),
            this.crearTiratachuela(),
            this.crearIndios(),
            this.crearDuelo(),
            this.crearTiendaDeGriff(),
            this.crearMusicoterapia(),
            this.crearManzanaDorada(),
            this.crearMechero(),

            // Armas y equipamiento básico
            this.crearArma("Pistola de Shion", 2),
            this.crearArma("Revolver de Casiddy", 3),
            this.crearArma("Rifle de Ashe", 4),
            this.crearArma("Francotirador", 5),
            this.crearPistolaDeTracer(),
            this.crearPistolaDeTracerPro(),
            this.crearMortero(),
            this.crearCaballo(),
            this.crearCaballoPro(),
            this.crearMonoAldea(),
            this.crearMonoaldeaPro(),
            this.crearBarril(),
            this.crearBarrilPro(),
            this.crearPrision(),
            this.crearDinamita(),
            this.crearDinamitaPro(),

            // Extensiones y especiales
            this.crearAnderlandis(),
            this.crearTornado(),
            this.crearTiendaDeJuju(),
            this.crearTiendaDePierre(),
            this.crearPapapum(),
            this.crearRayo(),
            this.crearSpooky(),
            this.crearSuperBang(),
            this.crearClon(),
            this.crearEscopetasReaper(),
            this.crearEscopetasReaperPro(),
            this.crearValerieLadrona(),
            this.crearGranDesaparicion(),
            this.crearHordaDeBloons(),
            this.crearPatadaKillo(),
            this.crearMacetaKillo(),
            this.crearDomoProtector(),
            this.crearSecador(),
            this.crearOrbitaBang(),
            this.crearKaruma(),

            // Plantas
            this.crearLanzaguisantes(),
            this.crearRepetidora(),
            this.crearCalabaza(),
            this.crearSetaBang(),
            this.crearComePiedras(),
            this.crearApisonaflorBang(),
            this.crearPlantorcha(),
            this.crearNuez(),
            this.crearMiedicaBang(),
            this.crearImitadora(),
            this.crearPlantaCarnivora(),
            this.crearTrebolador(),
            this.crearPetaseta(),
            this.crearHumoseta(),
            this.crearNutriente(),
            this.crearGirasol(),
            this.crearBirasol(),

            // Pierre
            this.crearTirachinas(),
            this.crearTirachinasMaestro(),
            this.crearEnsalada(),
            this.crearEspantacocoroch(),
            this.crearEspantacocorochPro(),
            this.crearWarpTotem(),
            this.crearBomba(),
            this.crearMegaBomba(),
            this.crearFestivalDelHuevo(),
            this.crearHuevoBang(),
            this.crearHuevoSano(),
            this.crearHuevoSorpresa(),
            this.crearTormenta(),
            this.crearEsquirlaPrismatica(),
            this.crearEspirituAlegre(),
            this.crearEspirituEnojado(),
            this.crearEspirituAlegrePro(),
            this.crearEspirituEnojadoPro(),
            this.crearCafe(),
            this.crearEspadaGalactica(),
            this.crearEspadaGalacticaPro(),
            this.crearAnilloDeIridio(),
            this.crearAnilloDeInmunidad(),
            this.crearAnilloDelVampiro(),
            this.crearAnilloDelLadron(),
            this.crearAnilloDeLaSuerte(),
            this.crearAnilloDeYoba(),

            // Maldiciones, fantasmas y crisálida
            this.crearZombidito(),
            this.crearCrisalida(),
            this.crearHuevoExplosivo(),
            this.crearGolpeFantasmal(),
            this.crearMilagro(),
            this.crearRegaloDivino(),
            this.crearCocorochFantasma(),
            this.crearFantasmaComilon(),
            this.crearLibroEncantado(),
            this.crearHongoVenenoso(),
            this.crearReductor(),
            this.crearSlimeComilon(),
            this.crearCartaMaldita()
        ];
    }
}