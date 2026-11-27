import { CatalogoCartasEspeciales } from "./CatalogoCartasEspeciales.js";
import type {
    ClienteJuego,
    ContextoDano,
    IContextoRuleta,
    IMyRoom,
    TipoInmunidad
} from "./IMyRoom.js";
import { Carta, HabilidadActiva, Jugador } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

export interface IPersonaje {
    nombre: string;
    nombreMostrar?: string;
    habilidad: string;
    vidasBase: number;
    sfxMuerte?: [string, boolean, number?];
    sfxDefault?: string;
    spriteFueraDeJuego?: boolean;
    esNpcInvocable?: boolean;
    mantenerSpritePropio?: boolean;

    obtenerPersonajesDelegados?(sala: IMyRoom, jugador: Jugador): string[];

    onAsignar?(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void;
    onRemover?(sala: IMyRoom, jugador: Jugador): void;
    onIniciarTurno?(sala: IMyRoom, miJugador: Jugador): void;
    onPasarTurno?(sala: IMyRoom, jugador: Jugador): void;
    onJugarCarta?(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void;
    onJugarCartaGlobal?(sala: IMyRoom, miJugador: Jugador, jugadorQueJuega: Jugador, cartaJugada: Carta): void;
    onDescartarCarta?(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void;
    onEquiparCarta?(sala: IMyRoom, miJugador: Jugador, carta: Carta, hueco: string): void;
    onRecibirCuracion?(sala: IMyRoom, jugador: Jugador): void;
    onRecibirEscudo?(sala: IMyRoom, jugador: Jugador, cantidad: number, causa: string): void;
    onInterceptarDanoEntrante?(sala: IMyRoom, ctx: ContextoDano): void;
    onInterceptarDanoSaliente?(sala: IMyRoom, ctx: ContextoDano): void;
    onRecibirDano?(sala: IMyRoom, ctx: ContextoDano): void;
    onGolpear?(sala: IMyRoom, ctx: ContextoDano): void;
    onMuereOtroPersonaje?(sala: IMyRoom, victimaMuerta: Jugador, asesino: Jugador | null, miJugador: Jugador): void;
    onMuereNpc?(sala: IMyRoom, jugador: Jugador, npcMuerto: Jugador): void;
    onInvocarNpc?(sala: IMyRoom, dueno: Jugador, npcInvocado: Jugador): void;
    onMorir?(sala: IMyRoom, miJugador: Jugador): void;
    onSacarEmbrujoEnRuleta?(sala: IMyRoom, miJugador: Jugador, tipo: string): void;
    ejecutarHabilidadActiva?(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void;

    puedeDispararBang?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta | null): boolean;
    modificarAlcanceAtacante?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta | null): number;
    modificarDistanciaDefensiva?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta | null): number;
    modificarDanoAtacante?(sala: IMyRoom, ctx: ContextoDano): number;
    modificarTraspasarEscudo?(sala: IMyRoom, ctx: ContextoDano): boolean;
    modificarFallosRequeridos?(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta | null): number;
    modificarRepartirCarta?(sala: IMyRoom, jugador: Jugador, causa: string): number;
    modificarCuraBotiquin?(sala: IMyRoom, jugador: Jugador): number;
    modificarCuracion?(sala: IMyRoom, miJugador: Jugador): number;
    modificarCartasEnManoAlPasarTurno?(sala: IMyRoom, jugador: Jugador): number;
    modificarPuntosAlEmbrujar?(sala: IMyRoom, miJugador: Jugador, victima: Jugador, embrujo: string, puntos: number): number;
    modificarRuletaLocal?(sala: IMyRoom, ctx: IContextoRuleta): void;
    modificarRuletaGlobal?(sala: IMyRoom, miJugador: Jugador, ctx: IContextoRuleta): void;
    esInmuneA?(sala: IMyRoom, jugador: Jugador, tipo: TipoInmunidad): boolean;

    onPostHookVisual?(jugador: Jugador): void
}

interface SnapshotTracer {
    vidas: number;
    vidasMaximas: number;
    escudos: number;
    mano: Carta[];
    equipamiento: Array<[string, Carta]>;
    efectos: Array<[string, number]>;
}

// =============================================================================
// PERSONAJES JUGABLES
// =============================================================================

export class ColeCasiddy implements IPersonaje {
    nombre = "Cole Casiddy";
    habilidad = "Recarga en la recámara:\nAl perder vida: roba 2 cartas.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteCasiddy", false];
    sfxDefault = "sfxCasiddy";

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.victima.estaVivo && ctx.danoCuerpo > 0) {
            sala.repartirCartas(ctx.victima, 2, "pasiva");
            sala.agregarRegistro(`🤠 ${Utilidades.obtenerNombreVisual(ctx.victima)} robó 2 cartas por su pasiva.`);
            sala.reproducirSfx("habilidadColeCasiddy");
        }
    }
}

export class Berry implements IPersonaje {
    nombre = "Berry";
    habilidad = "Cartas curativas:\nCada 2 cartas que descarta de forma voluntaria, se cura 1 y roba una carta.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteBerry", false];
    sfxDefault = "sfxBerry";

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, _carta: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;

        const descartes = (jugador.number.get("descartesBerry") ?? 0) + 1;
        if (descartes >= 2) {
            jugador.number.set("descartesBerry", 0);
            sala.repartirCartas(jugador, 1, "pasiva");
            let texto = `🍓 ${Utilidades.obtenerNombreVisual(jugador)} roba una carta`;

            if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                Utilidades.aplicarCuracion(sala, jugador, 1, "PASIVA", false);
                texto += " y recibe curación";
                sala.reproducirSfx("curacion");
            }
            sala.agregarRegistro(`${texto} por su pasiva.`);
            sala.reproducirSfx("habilidadBerry" + Math.floor(Math.random() * 2));
        } else {
            jugador.number.set("descartesBerry", descartes);
        }
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("descartesBerry", 0);
    }
}

export class Maton implements IPersonaje {
    nombre = "Maton";
    habilidad = "Seisei koi kiki:\nPuede jugar cualquier cantidad de BANG! durante su turno, empieza con 1 escudo.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMaton", false];
    sfxDefault = "sfxMaton";

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
        }
    }

    puedeDispararBang(): boolean {
        return true;
    }
}

export class Mandy implements IPersonaje {
    nombre = "Mandy";
    habilidad = "Concentración:\nConsidera a todos los demás jugadores a distancia -5.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMandy", false];
    sfxDefault = "sfxMandy";

    modificarAlcanceAtacante(): number {
        return 5;
    }
}

export class Tralalero implements IPersonaje {
    nombre = "Tralalero";
    habilidad = "Los tralaleritos dicen tralalá:\nAl final del turno: si no tiene cartas en la mano, cura 1 y roba 3 cartas.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTralalero", true];
    sfxDefault = "sfxTralalero";

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.mano.length !== 0) return;

        let seCuro = false;
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 1, "PASIVA", false);
            seCuro = true;
        }
        sala.repartirCartas(jugador, 3, "pasiva");
        const extra = seCuro ? "recuperó salud/escudo y " : "";
        sala.agregarRegistro(`🎵 ${Utilidades.obtenerNombreVisual(jugador)} ${extra}robó 3 cartas gracias a su pasiva.`);
    }
}

export class Darryl implements IPersonaje {
    nombre = "Darryl";
    habilidad = "Darryl el Barryl:\nTiene el efecto de la carta Barril siempre activo, si se equipa un barril, es como si tuviera dos.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDarryl", false];
    sfxDefault = "sfxDarryl";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.tieneBarrilPasiva = true;
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.tieneBarrilPasiva = false;
    }
}

export class JetpackCat implements IPersonaje {
    nombre = "Jetpack Cat";
    habilidad = "Gato en las alturas:\nLos demás jugadores te consideran a distancia +1.\nCuando descarta: aumenta en 1 tu distancia hasta el inicio del turno.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteJetpackCat", false];
    sfxDefault = "sfxJetpackCat";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("jetpackCat", 1);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.delete("jetpackCat");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("jetpackCat", 1);
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        jugador.number.set("jetpackCat", (jugador.number.get("jetpackCat") ?? 1) + 1);
        sala.reproducirSfx("sfxJetpackCat");
    }

    modificarDistanciaDefensiva(_sala: IMyRoom, _atacante: Jugador, victima: Jugador): number {
        return victima.number.get("jetpackCat") ?? 1;
    }
}

export class KayFaraday implements IPersonaje {
    nombre = "Kay Faraday";
    habilidad = "La ladrona:\nAl perder vida por otro jugador: le quita una carta al azar de la mano de ese jugador\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKay", true];
    sfxDefault = "sfxKay";

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.atacante && ctx.atacante !== ctx.victima && ctx.atacante.mano.length > 0 && ctx.danoCuerpo > 0) {
            const idx = Math.floor(Math.random() * ctx.atacante.mano.length);
            const cartaRobada = ctx.atacante.mano.splice(idx, 1)[0];
            if (cartaRobada) {
                ctx.victima.mano.push(cartaRobada);
                sala.agregarRegistro(
                    `🎭 ¡${Utilidades.obtenerNombreVisual(ctx.victima)} perdió vida pero le robó ${cartaRobada.nombre} a ${ctx.atacante.nombre}!`
                );
                sala.reproducirSfx("habilidadKayFaraday");
            }
        }
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Chester implements IPersonaje {
    nombre = "Chester";
    habilidad = "Ruleta trucada:\nTiene mucha mas suerte cuando usa la ruleta.";
    vidasBase = 4;
    sfxMuerte: [string, boolean, number] = ["muerteChester", false, 0.25];
    sfxDefault = "sfxChester";

    modificarRuletaLocal(_sala: IMyRoom, ctx: IContextoRuleta): void {
        if (ctx.motivo === "Dinamita" || ctx.motivo === "MiniDinamita" || ctx.motivo === "Papa") {
            ctx.bonusSuerte += 1;
        } else {
            ctx.bonusSuerte += 5;
        }
    }
}

export class Frank implements IPersonaje {
    nombre = "Frank";
    habilidad = "Esponja:\nTiene +4 de vida pero no puede usar Fallo.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFrank", true];
    sfxDefault = "sfxFrank";

    onAsignar(_sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            jugador.vidas += 4;
            jugador.vidasMaximas += 4;
        }
        jugador.boolean.set("frankFallo", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("frankFallo");
    }
}

export class Trucy implements IPersonaje {
    nombre = "Trucy";
    habilidad = "Baraja de cartas:\nCada vez que roba cartas roba una extra.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTrucy", false];
    sfxDefault = "sfxTrucy";

    modificarRepartirCarta(): number {
        return 1;
    }
}

export class Pam implements IPersonaje {
    nombre = "Pam";
    habilidad = "Beso materno:\nAl recibir curacion: se cura 1 extra.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePam", false];
    sfxDefault = "sfxPam";

    modificarCuracion(): number {
        return 1;
    }
}

export class Luigi implements IPersonaje {
    nombre = "Luigi";
    habilidad = "Hongo curativo:\nCuando otro jugador muere: se cura 2, y si hay un Mario vivo en la partida, aumenta su vida maxima en 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", true];
    sfxDefault = "sfxLuigi";

    onMuereOtroPersonaje(sala: IMyRoom, victimaMuerta: Jugador, _asesino: Jugador | null, jugador: Jugador): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte) {
            sala.agregarRegistro(
                `🍄 ${Utilidades.obtenerNombreVisual(jugador)} no puede usar su pasiva porque ${Utilidades.obtenerNombreVisual(victimaMuerta)} ya murió anteriormente.`
            );
            return;
        }

        let estaMario = false;
        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j.personaje === "Mario") estaMario = true;
        });

        let textoExtra = "";
        if (estaMario) {
            jugador.vidasMaximas++;
            textoExtra = ` Como Mario está vivo, ${Utilidades.obtenerNombreVisual(jugador)} aumenta su vida máxima a ${jugador.vidasMaximas}.`;
        }

        let seCuro = false;
        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 2, "PASIVA", false);
            seCuro = true;
        }

        if (seCuro || estaMario) {
            sala.agregarRegistro(`🍄 ${Utilidades.obtenerNombreVisual(jugador)} recibió curación por su pasiva.${textoExtra}`);
            sala.reproducirSfx("sfxLuigiHabilidad");
        }
    }
}

export class Mario implements IPersonaje {
    nombre = "Mario";
    habilidad = "NEEDAMUSHROOM:\nCuando otro jugador muere: roba 3 cartas, y si hay un Luigi vivo en la partida, roba una extra.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteSuperMario", false];
    sfxDefault = "sfxMario";

    onMuereOtroPersonaje(sala: IMyRoom, victimaMuerta: Jugador, _asesino: Jugador | null, jugador: Jugador): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte) {
            sala.agregarRegistro(
                `🍄 ${Utilidades.obtenerNombreVisual(jugador)} no puede usar su pasiva porque ${Utilidades.obtenerNombreVisual(victimaMuerta)} ya murió anteriormente.`
            );
            return;
        }

        let estaLuigi = false;
        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j.personaje === "Luigi") estaLuigi = true;
        });

        const cartas = estaLuigi ? 4 : 3;
        const textoExtra = estaLuigi
            ? ` Además como Luigi está vivo, ${Utilidades.obtenerNombreVisual(jugador)} roba una carta extra.`
            : "";

        sala.repartirCartas(jugador, cartas, "pasiva");
        sala.agregarRegistro(`🍄 ${Utilidades.obtenerNombreVisual(jugador)} robó ${cartas} cartas por su pasiva.${textoExtra}`);
        sala.reproducirSfx("sfxMarioHabilidad");
    }
}

export class Mikotoba implements IPersonaje {
    nombre = "Mikotoba";
    habilidad = "Cambio de masa:\nSi tiene 3 o mas vidas, se vuelve GORDO, si no se vuelve FLACO.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMikotoba", true];
    sfxDefault = "mikotobaDeGordoAFlaco";

    onAsignar(sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("mikotobaEstaGordo", true);
        this.actualizarMasa(jugador, sala);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("mikotobaEstaGordo");
        jugador.puedeUsarFallo = true;
    }

    onRecibirCuracion(sala: IMyRoom, jugador: Jugador): void {
        this.actualizarMasa(jugador, sala);
    }

    modificarRepartirCarta(_sala: IMyRoom, jugador: Jugador, causa: string): number {
        return causa === "turno" && jugador.boolean.get("mikotobaEstaGordo") ? 1 : 0;
    }

    modificarCuraBotiquin(_sala: IMyRoom, jugador: Jugador): number {
        return jugador.boolean.get("mikotobaEstaGordo") ? 0 : 1;
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        this.actualizarMasa(ctx.victima, sala);
        if (!ctx.victima.boolean.get("mikotobaEstaGordo") && ctx.victima.estaVivo) {
            sala.repartirCartas(ctx.victima, 1, "pasiva");
            sala.agregarRegistro(`${Utilidades.obtenerNombreVisual(ctx.victima)} robó 1 carta tras recibir daño por ${ctx.causa}.`);
        }
    }

    private actualizarMasa(jugador: Jugador, sala: IMyRoom): void {
        if (jugador.vidas >= 3) {
            jugador.boolean.set("mikotobaEstaGordo", true);
            jugador.spriteAvatarOpcional = "";
        } else {
            const estabaGordo = jugador.boolean.get("mikotobaEstaGordo") === true;
            jugador.boolean.set("mikotobaEstaGordo", false);
            jugador.spriteAvatarOpcional = "Mikotoba flaco";
            if (estabaGordo) {
                sala.reproducirSfx("mikotobaDeGordoAFlaco");
            }
        }
        jugador.puedeUsarFallo = !jugador.boolean.get("mikotobaEstaGordo");
    }
}

export class Lesly implements IPersonaje {
    nombre = "Lesly";
    habilidad = "SAPA:\nComo una buena sapa, lesly puede sapear en todo momento.\nHabilidad (1 por turno): descarta la carta original de mas a la izquierda y conjura una carta Valerie Ladrona.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLesly", false];
    sfxDefault = "sfxLesly";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("leslySapa", true);
        jugador.number.set("leslyUsosHabilidad", 0);

        const boton = new HabilidadActiva();
        boton.id = "lesly_panico";
        boton.textoBoton = "Crear panico";
        boton.tooltip = "Creas un panico";
        boton.spriteBoton = "botonLesly";
        jugador.habilidadesActivas.push(boton);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("leslySapa");
        Utilidades.removerBotonActivo(jugador, "lesly_panico");
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "lesly_panico") return;

        const usos = jugador.number.get("leslyUsosHabilidad") ?? 0;
        if (usos >= 1) {
            client.send("alerta_personal", "Ya usaste la habilidad este turno.");
            return;
        }

        const idx = jugador.mano.findIndex((c: Carta) => !c.esConjurada);
        if (idx === -1) {
            client.send("alerta_personal", "No tenés ninguna carta original para crear una Valerie ladrona.");
            return;
        }

        const eliminada = jugador.mano.splice(idx, 1)[0];
        if (eliminada) sala.descartarCarta(eliminada, jugador, "PASIVA");

        const carta = CatalogoCartasEspeciales.crearValerieLadrona();
        carta.esConjurada = true;
        jugador.mano.push(carta);

        jugador.number.set("leslyUsosHabilidad", usos + 1);
        sala.agregarRegistro(`🐸 ${Utilidades.obtenerNombreVisual(jugador)} conjuró una Valerie ladrona (${usos + 1}/1).`);
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("leslyUsosHabilidad", 0);
    }
}

export class Domino implements IPersonaje {
    nombre = "Domino";
    habilidad = "Dominub:\nAl recibir daño: conjura un domino.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteDominub", false];
    sfxDefault = "sfxNitromeme";

    onRecibirDano(_sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo) return;
        ctx.victima.mano.push(CatalogoCartasEspeciales.crearDominoAleatorio());
    }
}

export class Tilink implements IPersonaje {
    nombre = "Tilink";
    habilidad = "Clones de tilinks falsos:\nAl descartar una carta original (2 por turno): una carta original al azar de tu mano se descarta y te otorga 2 clones de la misma.\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTilink", false];
    sfxDefault = "sfxTilink";

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, cartaDescartada: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO" || cartaDescartada.esConjurada) return;

        const creados = jugador.number.get("tilinkClones") ?? 0;
        if (creados >= 2) return;

        const originales = jugador.mano.filter((c: Carta) => !c.esConjurada);
        if (originales.length === 0) return;

        const elegida = originales[Math.floor(Math.random() * originales.length)];
        Utilidades.eliminarCartaDeLaMano(jugador, elegida);
        sala.agregarAlDescarte(elegida);

        for (let i = 0; i < 2; i++) {
            jugador.mano.push(Utilidades.clonarCarta(elegida, "clon", true));
        }

        jugador.number.set("tilinkClones", creados + 1);
        sala.agregarRegistro(
            `🪞 ¡${Utilidades.obtenerNombreVisual(jugador)} sacrificó ${elegida.nombre} original y fabricó 2 clones! (${creados + 1}/2)`
        );
        sala.reproducirSfx("tilinkPasiva");
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("tilinkClones", 0);
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Flowery implements IPersonaje {
    nombre = "Flowery";
    habilidad = "Tu padre es mi mejor amigo:\nAl jugar carta: crece aleatoriamente entre 0.26 y 0.31 metros.\nCuando descarta: decrece entre 0.20 y 0.25 metros.\nAl llegar a 3.00 metros: inflige 1 de daño a todos de forma inesquivable, los mete a la cárcel (menos al Sheriff), y luego roba 3 cartas del mazo.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteFlowery", true];
    sfxDefault = "sfxFlowery";
    spriteFueraDeJuego = true;

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("alturaFlowery", 0);
        jugador.boolean.set("spriteFueraDeJuego", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.delete("alturaFlowery");
        jugador.boolean.delete("spriteFueraDeJuego");
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const crecimiento = (Math.floor(Math.random() * 6) + 26) / 100;
        const nuevaAltura = (jugador.number.get("alturaFlowery") ?? 0) + crecimiento;
        jugador.number.set("alturaFlowery", nuevaAltura);

        if (nuevaAltura >= 3) {
            sala.agregarRegistro(`🌻 ¡FLOWERY HACE SU ATAQUE ESPECIAL!`);
            sala.getJugadores().forEach((v: Jugador) => {
                if (v.estaVivo && v !== jugador) {
                    sala.sistemaCombate.procesarDano(v, jugador, 1, "FLOWERY");
                    if (
                        v.estaVivo &&
                        v.rol !== "Sheriff" &&
                        !v.equipamiento.has("prision") &&
                        !sala.motorEventos.alguno(v, "esInmuneA", v, "prision")
                    ) {
                        const prision = CatalogoCartasEspeciales.crearPrision();
                        prision.esConjurada = true;
                        Utilidades.equiparCarta(sala, v, prision, "prision");
                    }
                }
            });

            sala.repartirCartas(jugador, 3, "pasiva");
            sala.agregarRegistro(
                `🌻 ${Utilidades.obtenerNombreVisual(jugador)} infligió daño a todos, enredó a los rivales en Prisión y robó 3 cartas.`
            );
            sala.reproducirSfx("floweryHabilidad" + Math.floor(Math.random() * 2));
            jugador.number.set("alturaFlowery", 0);
        } else {
            sala.reproducirSfx("floweryCrece");
        }
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador): void {
        const altura = jugador.number.get("alturaFlowery") ?? 0;
        if (altura > 0) sala.reproducirSfx("floweryDecrece");
        const decrecimiento = (Math.floor(Math.random() * 6) + 17) / 100;
        jugador.number.set("alturaFlowery", Math.max(0, altura - decrecimiento));
    }
}

export class Leon implements IPersonaje {
    nombre = "Leon";
    habilidad = "Noooo leooooon:\nOculta todos sus visuales a los demas.\nAl final del turno: si hay menos de 2 npc leon_oculto: crea hasta 2 npc leon_oculto en sentido antihorario, luego intercambia o no de lugar con ellos de forma aleatoria.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLeon", true];
    sfxDefault = "sfxLeon";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("leonOcultar", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("leonOcultar");
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        const miId = Utilidades.obtenerSessionIdDeJugador(sala, jugador);
        const clonesPropios: Jugador[] = [];

        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j.esNpc && j.idDueno === miId && j.personaje === "Leon_oculto") {
                clonesPropios.push(j);
            }
        });

        const faltantes = Math.max(0, 2 - clonesPropios.length);
        for (let i = 0; i < faltantes; i++) {
            const npc = Utilidades.invocarNpcEnMesa(sala, jugador, "Leon_oculto", 4, 2, "antihorario", jugador.nombre);
            if (npc) clonesPropios.push(npc);
        }

        const numero = Math.floor(Math.random() * 4);
        if (numero < clonesPropios.length) {
            Utilidades.intercambiarPosicionesFisicas(sala, jugador, clonesPropios[numero]);
        }
    }
}

export class Kazuma implements IPersonaje {
    nombre = "Kazuma";
    habilidad = "Renacer del Héroe:\nSi no es Sheriff: al morir revive en 2 o 3 rondas con 1 vida y 3 cartas.\nSi es Sheriff, al recibir daño: tira una ruleta (8/16) para conjurar una espada Karuma.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["kazumaMuere", true];
    sfxDefault = "sfxKazuma";

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.victima.rol !== "Sheriff" || !ctx.victima.estaVivo) return;

        const idVictima = Utilidades.obtenerSessionIdDeJugador(sala, ctx.victima);
        if (!idVictima) return;

        sala.sistemaRuleta.solicitar({
            idJugador: idVictima,
            motivo: "Kazuma",
            titulo: "¡Ruleta de Kazuma!\nSi sale verde, conjurás la espada Karuma:",
            probabilidadBase: 8,
            textoExito: "¡KARUMA!",
            textoFallo: "NADA",
            onResultado: (exito: boolean) => {
                if (exito && ctx.victima.estaVivo) {
                    const karuma = CatalogoCartasEspeciales.crearKaruma();
                    karuma.esConjurada = true;
                    ctx.victima.mano.push(karuma);
                    sala.agregarRegistro(`🗡️ ¡${Utilidades.obtenerNombreVisual(ctx.victima)} ha conjurado su espada Karuma!`);
                    sala.reproducirSfx("sfxKazumaSheriffHabilidad");
                }
            }
        });
    }
}

export class Leah implements IPersonaje {
    nombre = "Leah";
    habilidad = "Artesana:\nCuando descarta (2 por turno): roba 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, _carta: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;
        const usos = jugador.number.get("leahUsos") ?? 0;
        if (usos >= 2) return;

        jugador.number.set("leahUsos", usos + 1);
        sala.repartirCartas(jugador, 1, "pasiva");
        sala.agregarRegistro(
            `🛠️ ${Utilidades.obtenerNombreVisual(jugador)} descartó una carta y su pasiva de Artesana le otorgó 1 carta nueva (${usos + 1}/2).`
        );
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("leahUsos", 0);
    }
}

export class Robin implements IPersonaje {
    nombre = "Robin";
    habilidad = "Carpintera:\nCuando descarta de forma voluntaria: si no es su primer descarte mejora de forma aleatoria.\nAl final del turno: si en su turno no jugó carta: mejora de forma aleatoria.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("robinJuegaCarta", false);
        jugador.number.set("robinDescartes", 0);
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("robinJuegaCarta", false);
    }

    onJugarCarta(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("robinJuegaCarta", true);
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, _carta: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO") return;
        const descartes = (jugador.number.get("robinDescartes") ?? 0) + 1;
        jugador.number.set("robinDescartes", descartes);
        if (descartes > 1) {
            this.mejorar(sala, jugador, "descartó una carta");
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("robinDescartes", 0);
        if (jugador.boolean.get("robinJuegaCarta") === false) {
            this.mejorar(sala, jugador, "no jugó ninguna carta");
        }
    }

    private mejorar(sala: IMyRoom, jugador: Jugador, causa: string): void {
        const textoMejora = Utilidades.mejorarEquipamientoAleatorio(sala, jugador);
        if (textoMejora !== "") {
            sala.agregarRegistro(`🔨 ¡${Utilidades.obtenerNombreVisual(jugador)} ${causa} y mejoró ${textoMejora}!`);
            sala.reproducirSfx("robinMejora");
        }
    }
}

export class Luciergana implements IPersonaje {
    nombre = "Luciergana";
    habilidad = "Reflejo:\nAl perder vida: empieza a brillar.\nAl final del turno: se apaga.\nTiene 1 vida menos.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteLuciernaga", true];
    sfxDefault = "sfxLuciernaga";

    onAsignar(_sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            Utilidades.bajarVidaMaxima(jugador, 1);
        }
        jugador.boolean.set("lucierganaPrendida", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("lucierganaPrendida");
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.danoCuerpo <= 0) return;

        if (ctx.victima.boolean.get("lucierganaPrendida")) {
            ctx.victima.boolean.set("lucierganaPrendida", false);
            ctx.victima.spriteAvatarOpcional = "";
            ctx.victima.vidas = Math.min(ctx.victima.vidasMaximas, ctx.victima.vidas + ctx.danoCuerpo);

            if (ctx.atacante && ctx.atacante !== ctx.victima) {
                sala.agregarRegistro(
                    `🐝💡 ${Utilidades.obtenerNombreVisual(ctx.victima)} le refleja ${ctx.danoCuerpo} de daño a ${ctx.atacante.nombre}.`
                );
                sala.sistemaCombate.procesarDano(ctx.atacante, ctx.victima, ctx.danoCuerpo, "LUCIERGANA");
            } else {
                sala.agregarRegistro(`🐝💡 ${Utilidades.obtenerNombreVisual(ctx.victima)} absorbe ${ctx.danoCuerpo} de daño.`);
            }
        } else {
            ctx.victima.boolean.set("lucierganaPrendida", true);
            ctx.victima.spriteAvatarOpcional = "Luciergana prendida";
        }
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        if (jugador.boolean.get("lucierganaPrendida")) {
            jugador.boolean.set("lucierganaPrendida", false);
            jugador.spriteAvatarOpcional = "";
        }
    }
}

export class Haley implements IPersonaje {
    nombre = "Haley";
    habilidad = "Fuera de acá, pobretón:\nTus BANG! tienen alcance infinito y no tienen límite de usos si el objetivo es el jugador (o los jugadores) con menos cartas en la mano (sin contarte a vos).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    private esElDeMenosCartas(sala: IMyRoom, yo: Jugador, victima: Jugador): boolean {
        let minCartas = Infinity;
        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j !== yo && j.mano.length < minCartas) {
                minCartas = j.mano.length;
            }
        });
        return victima.mano.length === minCartas;
    }

    puedeDispararBang(sala: IMyRoom, atacante: Jugador, victima: Jugador): boolean {
        return this.esElDeMenosCartas(sala, atacante, victima);
    }

    modificarAlcanceAtacante(sala: IMyRoom, atacante: Jugador, victima: Jugador, carta: Carta | null): number {
        if (carta && carta.efecto.startsWith("dano") && this.esElDeMenosCartas(sala, atacante, victima)) {
            return 999;
        }
        return 0;
    }
}

export class Maggey implements IPersonaje {
    nombre = "Maggey";
    habilidad = "Ay! pero que mala suerte...:\nEl resto de los jugadores tienen suerte -1 y agrega 3 fichas tipo Fallo en sus ruletas que le dan 2 cartas a Maggey.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAceAttorney", false];
    sfxDefault = "sfxMaggey";

    modificarRuletaGlobal(sala: IMyRoom, miJugador: Jugador, ctx: IContextoRuleta): void {
        if (ctx.victima === miJugador) return;

        const miId = Utilidades.obtenerSessionIdDeJugador(sala, miJugador);
        ctx.bonusSuerte -= 1;
        ctx.agregarFicha(
            {
                tipo: "fallo",
                visual: "falloMaggey",
                ownerId: miId,
                onActivar: (s, dueno) => {
                    s.repartirCartas(dueno, 2, "pasiva");
                    s.agregarRegistro(`🍀 ¡La desgracia ajena alimenta a ${Utilidades.obtenerNombreVisual(dueno)}! Roba 2 cartas.`);
                }
            },
            3
        );
    }
}

export class Mortis implements IPersonaje {
    nombre = "Mortis";
    habilidad = "Criatura de la noche:\nAl recibir daño o cuando muere otro jugador: conjura aleatoriamente 2 carta fantasma.\nAl golpear: conjura aleatoriamente 1 carta fantasma.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMortisMuerte", true];
    sfxDefault = "sfxMortis";

    private conjurarFantasmas(sala: IMyRoom, jugador: Jugador, cantidad: number): void {
        for (let i = 0; i < cantidad; i++) {
            jugador.mano.push(CatalogoCartasEspeciales.crearCartaFantasmaAleatoria());
        }
        const plural = cantidad === 1 ? "carta fantasmal" : "cartas fantasmales";
        sala.agregarRegistro(`🪏 ${Utilidades.obtenerNombreVisual(jugador)} conjura ${cantidad} ${plural} por su pasiva.`);
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.victima.estaVivo) this.conjurarFantasmas(sala, ctx.victima, 2);
    }

    onMuereOtroPersonaje(sala: IMyRoom, victimaMuerta: Jugador, _asesino: Jugador | null, miJugador: Jugador): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte) {
            sala.agregarRegistro(
                `🪏 No puede usar su pasiva porque ${Utilidades.obtenerNombreVisual(victimaMuerta)} ya murió anteriormente.`
            );
            return;
        }
        if (miJugador.estaVivo) this.conjurarFantasmas(sala, miJugador, 2);
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.atacante && ctx.atacante.estaVivo) this.conjurarFantasmas(sala, ctx.atacante, 1);
    }
}

export class Geraldo implements IPersonaje {
    nombre = "Geraldo";
    habilidad = "Coleccion:\nAlmacenamiento 5.";
    vidasBase = 4;

    modificarCartasEnManoAlPasarTurno(): number {
        return 5;
    }
}

export class RaymundoEscudos implements IPersonaje {
    nombre = "Raymundo Escudos";
    habilidad = "Mejor Abogado:\nTu cura se transforma en escudo.\nTu escudo no se va con el tiempo.\nCada 2 escudo: gana un almacenamiento.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteRaymundo", true];
    sfxDefault = "sfxRaymundo";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.transformarCuraEnEscudo = true;
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.transformarCuraEnEscudo = false;
    }

    onRecibirEscudo(sala: IMyRoom, jugador: Jugador, _cantidad: number, causa: string): void {
        for (let i = 0; i < jugador.turnosEscudos.length; i++) {
            jugador.turnosEscudos[i] = Infinity;
        }
        const origen = causa === "CURACION" ? "la curación" : "su Escudo temporal";
        sala.agregarRegistro(`⚖️ ¡${Utilidades.obtenerNombreVisual(jugador)} transformó ${origen} en un Escudo Infinito!`);
    }

    modificarCartasEnManoAlPasarTurno(_sala: IMyRoom, jugador: Jugador): number {
        return Math.floor(jugador.vidasEscudo / 2);
    }
}

export class Cubo implements IPersonaje {
    nombre = "Cubo";
    habilidad = "Geometry dash:\nAl jugar carta: cambias a un modo aleatorio entre Cubo, Nave, Ball, Ufo, Wave, Robot, Araña o Swing copter.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCuboMuerte", false];
    sfxDefault = "sfxCubo";

    private cambiarDeModo(sala: IMyRoom, jugador: Jugador): void {
        const modos = ["Cubo", "Nave", "Ball", "Ufo", "Wave", "Robot", "Swing copter", "Araña"];
        const disponibles = modos.filter((m) => m !== jugador.geometryDashModo);
        const nuevoModo = disponibles[Math.floor(Math.random() * disponibles.length)];
        jugador.geometryDashModo = nuevoModo;

        if (nuevoModo === "Ufo") {
            jugador.spriteAvatarOpcional = (jugador.number.get("cuboUsosUfo") ?? 0) < 1 ? "Ufo" : "Ufo roto";
        } else if (nuevoModo === "Swing copter") {
            jugador.spriteAvatarOpcional = jugador.boolean.get("swingCopterPuedeProteger")
                ? "Swing copter escudo"
                : "Swing copter";
        } else {
            jugador.spriteAvatarOpcional = nuevoModo;
        }

        sala.agregarRegistro(`⏹️ ${Utilidades.obtenerNombreVisual(jugador)} cambió al modo ${nuevoModo}.`);
    }

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.geometryDashModo = "Cubo";
        jugador.boolean.set("swingCopterPuedeProteger", true);
        jugador.number.set("cuboUsosBall", 0);
        jugador.number.set("cuboUsosUfo", 0);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.geometryDashModo = "";
        jugador.boolean.delete("swingCopterPuedeProteger");
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador.estaVivo) return;
        if (jugador.geometryDashModo === "Wave" && cartaJugada.nombre === "¡Fallo!") {
            const carta = CatalogoCartasEspeciales.crearFallo();
            carta.esConjurada = true;
            jugador.mano.push(carta);
        } else {
            this.cambiarDeModo(sala, jugador);
        }
    }

    modificarDistanciaDefensiva(_sala: IMyRoom, _atacante: Jugador, victima: Jugador): number {
        return victima.geometryDashModo === "Nave" ? 1 : 0;
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        const v = ctx.victima;
        const usosUfo = v.number.get("cuboUsosUfo") ?? 0;

        if (v.vidas <= 0 && v.geometryDashModo === "Ufo" && usosUfo < 1) {
            v.number.set("cuboUsosUfo", usosUfo + 1);
            v.vidas = Math.min(v.vidasMaximas, v.vidas + ctx.danoCuerpo);
            v.spriteAvatarOpcional = "Ufo roto";
            sala.agregarRegistro(`⏹️ El Ufo salva de la muerte a ${Utilidades.obtenerNombreVisual(v)} (1/1).`);
        } else if (v.geometryDashModo === "Swing copter" && v.boolean.get("swingCopterPuedeProteger") && v.mano.length >= 4) {
            v.boolean.set("swingCopterPuedeProteger", false);
            v.vidas = Math.min(v.vidasMaximas, v.vidas + ctx.danoCuerpo);
            v.spriteAvatarOpcional = "Swing copter";
            sala.agregarRegistro(`⏹️ El Swing copter protege a ${Utilidades.obtenerNombreVisual(v)} del golpe.`);
        } else if (v.estaVivo && v.geometryDashModo === "Robot" && v.mano.length <= 3) {
            sala.repartirCartas(v, 1, "pasiva");
            sala.agregarRegistro(`⏹️ ${Utilidades.obtenerNombreVisual(v)} roba una carta por su modo Robot.`);
        }
    }

    modificarRuletaLocal(_sala: IMyRoom, ctx: IContextoRuleta): void {
        if ((ctx.motivo === "Prision" || ctx.motivo === "Crisalida") && ctx.victima.geometryDashModo === "Araña") {
            ctx.bonusSuerte += 6;
        }
    }

    modificarRuletaGlobal(sala: IMyRoom, miJugador: Jugador, ctx: IContextoRuleta): void {
        if (
            (ctx.motivo === "Prision" || ctx.motivo === "Crisalida") &&
            miJugador !== ctx.victima &&
            miJugador.geometryDashModo === "Araña"
        ) {
            ctx.bonusSuerte -= 4;
        }
        if (miJugador.geometryDashModo === "Cubo") {
            const miId = Utilidades.obtenerSessionIdDeJugador(sala, miJugador);
            ctx.agregarFicha({
                tipo: "exito",
                visual: "exitoCubo",
                ownerId: miId,
                onActivar: (s, dueno, victima) => {
                    s.repartirCartas(dueno, 2, "pasiva");
                    s.agregarRegistro(
                        `⏹️ ${Utilidades.obtenerNombreVisual(victima)} agarra la moneda así que ${Utilidades.obtenerNombreVisual(dueno)} roba 2 cartas.`
                    );
                }
            });
        }
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador, _carta: Carta, motivo: string): void {
        if (motivo !== "VOLUNTARIO" || jugador.geometryDashModo !== "Ball") return;
        const usos = jugador.number.get("cuboUsosBall") ?? 0;
        if (usos < 1) {
            jugador.number.set("cuboUsosBall", usos + 1);
            sala.repartirCartas(jugador, 1, "pasiva");
            sala.agregarRegistro(`⏹️ ${Utilidades.obtenerNombreVisual(jugador)} descartó una carta y robó 1 (1/1).`);
        }
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("cuboUsosBall", 0);
        jugador.boolean.set("swingCopterPuedeProteger", true);
        if (jugador.geometryDashModo === "Swing copter") {
            jugador.spriteAvatarOpcional = "Swing copter escudo";
        }
    }
}

export class VonKarma implements IPersonaje {
    nombre = "Von Karma";
    habilidad = "Falsificación de evidencia:\nBoton la bala: te quita 1 vida y roba 2 cartas.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAceAttorney", false];
    sfxDefault = "sfxVonKarma";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "vonKarma_falsificar";
        boton.textoBoton = "Falsificar Evidencia";
        boton.tooltip = "Pierde 1 HP, roba 2 cartas";
        boton.spriteBoton = "botonVonKarma";
        jugador.habilidadesActivas.push(boton);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "vonKarma_falsificar");
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (idHabilidad !== "vonKarma_falsificar" || !jugador.estaVivo) return;

        if (jugador.vidas <= 1) {
            client.send("alerta_personal", "Necesitás más de 1 vida para falsificar evidencia, o morirías en el intento.");
            return;
        }

        sala.agregarRegistro(`⚖️ ¡${Utilidades.obtenerNombreVisual(jugador)} falsificó evidencia! Pierde 1 vida y roba 2 cartas.`);
        sala.sistemaCombate.procesarDano(jugador, jugador, 1, "FALSIFICACION", { ignoraEscudo: true });

        if (jugador.estaVivo) {
            sala.repartirCartas(jugador, 2, "pasiva");
        }
        sala.reproducirSfx("sfxVonKarmaBoton");
    }
}

export class Mercy implements IPersonaje {
    nombre = "Mercy";
    habilidad = "Los heroes nunca mueren:\nBoton intercambio: podes intercambiar entre que tus Bang! hagan daño o curen.\nLos demas no saben si el Bang! hará daño o curará.\nCurar con un Bang! a otro jugador te cura 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "mercy_intercambio";
        boton.textoBoton = "Intercambiar modo";
        boton.tooltip = "Intercambia entre modo cura y modo daño";
        boton.spriteBoton = "botonMercyDaño";
        jugador.habilidadesActivas.push(boton);
        jugador.boolean.set("mercyActivada", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("mercyActivada");
        Utilidades.removerBotonActivo(jugador, "mercy_intercambio");
    }

    ejecutarHabilidadActiva(_sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (idHabilidad !== "mercy_intercambio" || !jugador.estaVivo) return;

        const nuevoEstado = !jugador.boolean.get("mercyActivada");
        jugador.boolean.set("mercyActivada", nuevoEstado);

        const boton = jugador.habilidadesActivas.find((h) => h.id === "mercy_intercambio");
        if (boton) {
            boton.spriteBoton = nuevoEstado ? "botonMercyCuracion" : "botonMercyDaño";
        }
        client.send("alerta_personal", `Ahora estás en modo: ${nuevoEstado ? "CURACIÓN" : "DAÑO"}`);
    }

    onInterceptarDanoSaliente(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.cancelado || !ctx.atacante) return;
        if (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!") return;
        if (!ctx.atacante.boolean.get("mercyActivada")) return;

        ctx.cancelado = true;
        Utilidades.aplicarCuracion(sala, ctx.victima, ctx.cantidad, ctx.causa, false);
        Utilidades.aplicarCuracion(sala, ctx.atacante, 1, ctx.causa, false);
    }
}

export class Chispitas implements IPersonaje {
    nombre = "Chispitas";
    habilidad = "Destruccion:\nSi durante su turno no juega ni descarta cartas: se carga y gana 1 escudo.\nJugar o descartar cartas lo descarga excepto disparar Bangs!\nAlmacenamiento 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxChispitasMuerte", false];
    sfxDefault = "sfxChispitas";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("chispitasBandera", true);
        jugador.boolean.set("chispitasCargado", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("chispitasBandera");
        jugador.boolean.delete("chispitasCargado");
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return 1;
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("chispitasBandera", true);
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        const estabaCargado = jugador.boolean.get("chispitasCargado") === true;
        if (estabaCargado && cartaJugada.nombre.includes("BANG")) return;

        jugador.boolean.set("chispitasBandera", false);
        jugador.boolean.set("chispitasCargado", false);
        jugador.spriteAvatarOpcional = "";

        if (estabaCargado) {
            sala.agregarRegistro(`⚡ ${Utilidades.obtenerNombreVisual(jugador)} se descarga ya que jugó una carta.`);
        }
    }

    onDescartarCarta(sala: IMyRoom, jugador: Jugador): void {
        const estabaCargado = jugador.boolean.get("chispitasCargado") === true;
        jugador.boolean.set("chispitasBandera", false);
        jugador.boolean.set("chispitasCargado", false);
        jugador.spriteAvatarOpcional = "";

        if (estabaCargado) {
            sala.agregarRegistro(`⚡ ${Utilidades.obtenerNombreVisual(jugador)} se descarga ya que descartó una carta.`);
        }
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.boolean.get("chispitasBandera")) {
            jugador.spriteAvatarOpcional = "Chispitas cargado";
            jugador.boolean.set("chispitasCargado", true);
            sala.reproducirSfx("sfxChispitas");
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "CHISPITAS");
            sala.agregarRegistro(
                `⚡ ¡${Utilidades.obtenerNombreVisual(jugador)} se carga para preparar un ataque letal y gana un escudo!`
            );
        }
        jugador.boolean.set("chispitasBandera", true);
    }

    modificarDanoAtacante(sala: IMyRoom, ctx: ContextoDano): number {
        if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return 0;
        if (ctx.atacante.boolean.get("chispitasCargado")) {
            ctx.atacante.boolean.set("chispitasCargado", false);
            ctx.atacante.spriteAvatarOpcional = "";
            sala.reproducirSfx("sfxChispitasBang");
            return 999;
        }
        return 0;
    }
}

export class Dahlia implements IPersonaje {
    nombre = "Dahlia e Iris";
    habilidad = "Hermanas gemelas:\nSi no es SHERIFF es Dahlia: Al embrujar: coloca un +150% de puntos.\nSi es SHERIFF es Iris: no le afectan los embrujos negativos y potencia los positivos.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxDahliaMuerte", false];
    sfxDefault = "sfxDahlia";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        if (jugador.rol === "Sheriff") {
            jugador.boolean.set("dahliaSheriff", true);
            jugador.spriteAvatarOpcional = "Dahlia Sheriff";
        }
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("dahliaSheriff");
    }

    esInmuneA(_sala: IMyRoom, jugador: Jugador, tipo: TipoInmunidad): boolean {
        return tipo === "embrujo_malo" && jugador.boolean.get("dahliaSheriff") === true;
    }

    modificarPuntosAlEmbrujar(_sala: IMyRoom, miJugador: Jugador, _v: Jugador, _e: string, puntos: number): number {
        return miJugador.boolean.get("dahliaSheriff") ? 0 : puntos * 1.5;
    }

    onSacarEmbrujoEnRuleta(sala: IMyRoom, miJugador: Jugador, tipo: string): void {
        if (!miJugador.boolean.get("dahliaSheriff")) return;
        const nombre = Utilidades.obtenerNombreVisual(miJugador);

        if (tipo === "robar") {
            sala.repartirCartas(miJugador, 1, "pasiva");
            sala.agregarRegistro(`🔮 ${nombre} roba una carta extra por su pasiva.`);
        } else if (tipo === "curar") {
            Utilidades.aplicarCuracion(sala, miJugador, 1, "embrujo", true);
            sala.agregarRegistro(`🔮 ${nombre} se cura 1 de vida extra por su pasiva.`);
        } else if (tipo === "libro") {
            const mejora = Utilidades.mejorarEquipamientoAleatorio(sala, miJugador);
            if (mejora !== "") sala.agregarRegistro(`🔮 ${nombre} mejora ${mejora} por su pasiva.`);
            else sala.agregarRegistro(`🔮 ${nombre} intenta mejorar un equipamiento pero no tiene nada mejorable.`);
        }
    }
}

export class Meg implements IPersonaje {
    nombre = "Meg";
    habilidad = "Megamaquina:\nTiene 3 vidas.\nTiene 3 modos: MECA, CHIQUITA y CONSTRUCTORA.\nEmpieza la partida en el modo MECA.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMegMuerte", false];
    sfxDefault = "sfxMeg";

    onAsignar(_sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) Utilidades.bajarVidaMaxima(jugador, 1);
        jugador.string.set("modoMeg", "ROBOT");
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.string.delete("modoMeg");
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.victima.vidas <= 0 && ctx.victima.string.get("modoMeg") === "ROBOT") {
            ctx.victima.vidas = 1;
            Utilidades.agregarEscudos(sala, ctx.victima, 1, 1, "PASIVA");
            ctx.victima.string.set("modoMeg", "CHIQUITA");
            ctx.victima.spriteAvatarOpcional = "Meg chiquita";
            sala.reproducirSfx("sfxMegChiquita");
        }
    }

    onJugarCarta(_sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador.estaVivo) return;
        if (jugador.string.get("modoMeg") === "CHIQUITA" && cartaJugada.nombre === "¡Fallo!") {
            const carta = CatalogoCartasEspeciales.crearFallo();
            carta.esConjurada = true;
            jugador.mano.push(carta);
        }
    }

    modificarRepartirCarta(_sala: IMyRoom, jugador: Jugador, causa: string): number {
        return jugador.string.get("modoMeg") === "CHIQUITA" && causa === "turno" ? 1 : 0;
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        if (jugador.estaVivo && jugador.string.get("modoMeg") === "CHIQUITA") {
            jugador.string.set("modoMeg", "CONSTRUCTORA");
            jugador.spriteAvatarOpcional = "Meg constructora";
        }
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (jugador.estaVivo && jugador.string.get("modoMeg") === "CONSTRUCTORA") {
            jugador.string.set("modoMeg", "ROBOT");
            jugador.spriteAvatarOpcional = "";
            sala.reproducirSfx("sfxMegMeca");
        }
    }
}

export class Perro implements IPersonaje {
    nombre = "Perro";
    habilidad = "La casa del perro:\nAl golpear: le coloca un perro con hueso en una carta aleatoria del otro jugador.\nAl recibir daño: le coloca un perro con hueso en 2 cartas aleatorias del otro jugador.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxPerroMuerte", true];
    sfxDefault = "sfxPerro";

    private colocarPerros(sala: IMyRoom, dueno: Jugador, objetivo: Jugador, cantidad: number): void {
        if (!objetivo || objetivo.mano.length === 0) return;
        const idDueno = Utilidades.obtenerSessionIdDeJugador(sala, dueno);
        let colocados = 0;

        for (let i = 0; i < cantidad; i++) {
            const libres = objetivo.mano.filter((c: Carta) => c.idDuenoDelPerro === "");
            if (libres.length === 0) break;
            const elegida = libres[Math.floor(Math.random() * libres.length)];
            elegida.idDuenoDelPerro = idDueno;
            colocados++;
        }

        if (colocados > 0) {
            sala.agregarRegistro(
                `🐶 ¡${Utilidades.obtenerNombreVisual(dueno)} le colocó ${colocados} perro(s) con hueso a ${Utilidades.obtenerNombreVisual(objetivo)}!`
            );
        }
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.atacante && ctx.atacante !== ctx.victima) {
            this.colocarPerros(sala, ctx.victima, ctx.atacante, 2);
        }
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.atacante && ctx.atacante !== ctx.victima) {
            this.colocarPerros(sala, ctx.atacante, ctx.victima, 1);
        }
    }
}

export class DaveElLoco implements IPersonaje {
    nombre = "Dave el loco";
    habilidad = "Plantas:\nAl inicio de la partida: comenzas con un girasol.\nCuando roba: roba 1 menos pero a cambio te da una planta entre 16 posibles.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCrazyDaveMuerte", false];
    sfxDefault = "sfxCrazyDave1";

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            const girasol = CatalogoCartasEspeciales.crearGirasol();
            girasol.esConjurada = true;
            Utilidades.equiparCarta(sala, jugador, girasol, "girasol");
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        sala.reproducirSfx("sfxCrazyDave" + (Math.floor(Math.random() * 12) + 1));
    }

    modificarRepartirCarta(_sala: IMyRoom, jugador: Jugador): number {
        const planta = CatalogoCartasEspeciales.crearCartaPlantaAleatoria();
        planta.esConjurada = true;
        jugador.mano.push(planta);
        return -1;
    }
}

export class Junkrat implements IPersonaje {
    nombre = "Junkrat";
    habilidad = "Demolicion:\nAl inicio del turno: roba tantas cartas como salud tenga y luego recibe 1 de daño asi mismo, despues de eso roba las 2 de su turno\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmongus", false];
    sfxDefault = "sfxMensaje";

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        if (!miJugador.estaVivo || miJugador.vidas <= 0) return;
        sala.repartirCartas(miJugador, miJugador.vidas, "pasiva");
        sala.sistemaCombate.procesarDano(miJugador, miJugador, 1, "pasiva");
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Max implements IPersonaje {
    nombre = "Max";
    habilidad = "Max energy:\nCada 3 cartas que juegues roba una carta.";
    vidasBase = 4;
    sfxDefault = "sfxMax";
    sfxMuerte: [string, boolean] = ["sfxMaxMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("maxJugadas", 0);
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const jugadas = (jugador.number.get("maxJugadas") ?? 0) + 1;
        if (jugadas >= 3) {
            jugador.number.set("maxJugadas", 0);
            sala.repartirCartas(jugador, 1, "pasiva");
            sala.agregarRegistro(`⚡ ${Utilidades.obtenerNombreVisual(jugador)} roba una carta extra por su pasiva.`);
            sala.reproducirSfx("sfxMaxHabilidad");
        } else {
            jugador.number.set("maxJugadas", jugadas);
        }
    }
}

export class Tracer implements IPersonaje {
    nombre = "Tracer";
    habilidad = "Lo intentaremos otra vez:\nTiene 2 vidas menos.\nAl inicio de la partida y boton: guarda tu estado.\nAl morir: vuelve a su ultimo estado guardado (1 vez si es Sheriff, si no 2 veces).";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteTracer", false];
    sfxDefault = "sfxTracer";

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        jugador.number.set("tracerVecesMuerta", 0);

        const boton = new HabilidadActiva();
        boton.id = "tracer_guardarEstado";
        boton.textoBoton = "Guardar estado";
        boton.tooltip = "Guarda tu estado";
        boton.spriteBoton = "botonTracer";
        jugador.habilidadesActivas.push(boton);

        if (!esImitacion) {
            Utilidades.bajarVidaMaxima(jugador, 2);
        }
        this.guardarEstado(sala, jugador);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "tracer_guardarEstado");
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, _client: ClienteJuego, idHabilidad: string): void {
        if (jugador.estaVivo && idHabilidad === "tracer_guardarEstado") {
            this.guardarEstado(sala, jugador);
        }
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        const limite = ctx.victima.rol === "Sheriff" ? 1 : 2;
        const veces = ctx.victima.number.get("tracerVecesMuerta") ?? 0;

        if (ctx.victima.vidas <= 0 && veces < limite) {
            ctx.victima.number.set("tracerVecesMuerta", veces + 1);
            this.retrocederEnElTiempo(sala, ctx.victima, limite);
        }
    }

    private guardarEstado(sala: IMyRoom, jugador: Jugador): void {
        const id = Utilidades.obtenerSessionIdDeJugador(sala, jugador);
        if (!id) return;

        const snapshot: SnapshotTracer = {
            vidas: jugador.vidas,
            vidasMaximas: jugador.vidasMaximas,
            escudos: jugador.vidasEscudo,
            mano: Array.from(jugador.mano).map((c) => Utilidades.clonarCarta(c, "tracer", true)),
            equipamiento: Array.from(jugador.equipamiento.entries()).map(([k, c]) => [
                k,
                Utilidades.clonarCarta(c, "tracer", true)
            ]),
            efectos: Array.from(jugador.efecto.entries())
        };

        sala.obtenerEstadoPrivado(id)["snapshotTracer"] = snapshot;
        sala.agregarRegistro(`⏱️ ¡${Utilidades.obtenerNombreVisual(jugador)} ha marcado un punto de retorno temporal!`);
    }

    private retrocederEnElTiempo(sala: IMyRoom, jugador: Jugador, limite: number): void {
        const id = Utilidades.obtenerSessionIdDeJugador(sala, jugador);
        const snapshot = sala.obtenerEstadoPrivado(id)["snapshotTracer"] as SnapshotTracer | undefined;
        if (!snapshot) return;

        jugador.vidasMaximas = snapshot.vidasMaximas;
        jugador.vidas = snapshot.vidas;
        jugador.turnosEscudos = [];
        jugador.vidasEscudo = 0;
        if (snapshot.escudos > 0) {
            Utilidades.agregarEscudos(sala, jugador, snapshot.escudos, 1, "pasiva");
        }

        for (const carta of jugador.mano) {
            sala.agregarAlDescarte(carta);
        }
        jugador.mano.clear();

        // Clonamos nuevamente desde el snapshot para permitir una 2da resurrección sin reutilizar nodos viejos
        for (const cartaGuardada of snapshot.mano) {
            jugador.mano.push(Utilidades.clonarCarta(cartaGuardada, "tracer_res", true));
        }

        Utilidades.destruirTodosLosEquipamientos(sala, jugador);
        for (const [clave, cartaEq] of snapshot.equipamiento) {
            Utilidades.equiparCarta(sala, jugador, Utilidades.clonarCarta(cartaEq, "tracer_eq", true), clave);
        }

        Utilidades.eliminarTodosLosEfectos(jugador);
        for (const [clave, cantidad] of snapshot.efectos) {
            Utilidades.agregarEfecto(jugador, clave, cantidad);
        }

        sala.agregarRegistro(
            `⏪ ¡${Utilidades.obtenerNombreVisual(jugador).toUpperCase()} MURIÓ PERO RETROCEDIÓ EN EL TIEMPO! (${jugador.number.get("tracerVecesMuerta")}/${limite})`
        );
        sala.reproducirSfx("sfxTracerHabilidad");
    }
}

export class Pedro implements IPersonaje {
    nombre = "Pedro";
    habilidad = "Alimentame:\nAl golpear: le descarta un equipamiento aleatorio y pedro crece.\nAl recibir daño: tira una ruleta (10/16) para no decrecer.\nCada nivel de crecimiento le da 1 de alcance.\nEl nivel de crecimiento 1, 3 y 5 le da almacenamiento +1.";
    vidasBase = 4;
    spriteFueraDeJuego = true;
    sfxMuerte: [string, boolean] = ["muertePedro", true];
    sfxDefault = "sfxPedro";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("pedroCrecimiento", 0);
        jugador.boolean.set("mostrarPedro", true);
        jugador.boolean.set("spriteFueraDeJuego", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.delete("pedroCrecimiento");
        jugador.boolean.delete("mostrarPedro");
        jugador.boolean.delete("spriteFueraDeJuego");
    }

    modificarAlcanceAtacante(_sala: IMyRoom, atacante: Jugador): number {
        return atacante.number.get("pedroCrecimiento") ?? 0;
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante) return;
        const descartada = Utilidades.descartarEquipamientoAleatorio(sala, ctx.victima);
        if (!descartada) return;

        const actual = ctx.atacante.number.get("pedroCrecimiento") ?? 0;
        if (actual < 5) {
            ctx.atacante.number.set("pedroCrecimiento", actual + 1);
            sala.agregarRegistro(`🌿 ${Utilidades.obtenerNombreVisual(ctx.atacante)} crece ${actual + 1}/5.`);
            sala.reproducirSfx("sfxPedroCreciendo");
        }
    }

    modificarCartasEnManoAlPasarTurno(_sala: IMyRoom, jugador: Jugador): number {
        const crecimiento = jugador.number.get("pedroCrecimiento") ?? 0;
        if (crecimiento >= 5) return 3;
        if (crecimiento >= 3) return 2;
        if (crecimiento >= 1) return 1;
        return 0;
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        const actual = ctx.victima.number.get("pedroCrecimiento") ?? 0;
        if (!ctx.victima.estaVivo || actual <= 0) return;

        const idVictima = Utilidades.obtenerSessionIdDeJugador(sala, ctx.victima);
        if (!idVictima) return;

        sala.sistemaRuleta.solicitar({
            idJugador: idVictima,
            motivo: "Pedro",
            titulo: "¡Ruleta de Pedro!\nSi sale rojo, Pedro decrece:",
            probabilidadBase: 10,
            textoExito: "¡SE MANTIENE!",
            textoFallo: "¡DECRECE!",
            onResultado: (exito: boolean) => {
                if (!exito && ctx.victima.estaVivo) {
                    const nivel = ctx.victima.number.get("pedroCrecimiento") ?? 0;
                    if (nivel > 0) {
                        ctx.victima.number.set("pedroCrecimiento", nivel - 1);
                        sala.agregarRegistro(`🌿 ${Utilidades.obtenerNombreVisual(ctx.victima)} decrece ${nivel - 1}/5.`);
                        sala.reproducirSfx("oscuro-pedro");
                    }
                }
            }
        });
    }
}

export class Amelia implements IPersonaje {
    nombre = "Amelia";
    habilidad = "Amelia la asombrosa:\nAl final del turno: gana un escudo (no sirve en 1vs1).\nCada 5 cartas que juega: gana un escudo.\nAl perder 2 vidas por otro jugador: conjura una Gran desaparicion.\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteAmelia", false];
    sfxDefault = "sfxAmelia";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("ameliaJugadas", 0);
        jugador.number.set("ameliaVidasPerdias", 0);
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo || sala.getTotalJugadoresVivos() <= 2) return;
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
        sala.agregarRegistro(`🎩 ${Utilidades.obtenerNombreVisual(jugador)} obtuvo un escudo por pasar su turno.`);
        sala.reproducirSfx("ameliaHabilidadAgregarEscudo" + Math.floor(Math.random() * 2));
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const jugadas = (jugador.number.get("ameliaJugadas") ?? 0) + 1;
        if (jugadas >= 5) {
            jugador.number.set("ameliaJugadas", 0);
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
            sala.agregarRegistro(`🎩 ${Utilidades.obtenerNombreVisual(jugador)} obtuvo un escudo por jugar 5 cartas.`);
            sala.reproducirSfx("ameliaHabilidadAgregarEscudo" + Math.floor(Math.random() * 2));
        } else {
            jugador.number.set("ameliaJugadas", jugadas);
        }
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo || !ctx.atacante || !ctx.atacante.estaVivo || ctx.atacante === ctx.victima) return;
        if (ctx.danoCuerpo <= 0) return;

        const acumuladas = (ctx.victima.number.get("ameliaVidasPerdias") ?? 0) + ctx.danoCuerpo;
        if (acumuladas >= 2) {
            ctx.victima.number.set("ameliaVidasPerdias", 0);
            const idAtacante = Utilidades.obtenerSessionIdDeJugador(sala, ctx.atacante);
            if (!idAtacante) return;

            const carta = CatalogoCartasEspeciales.crearGranDesaparicion();
            carta.idGranDesaparicion = idAtacante;
            carta.esConjurada = true;
            carta.descripcion = `Desaparece todo el equipamiento de ${Utilidades.obtenerNombreVisual(ctx.atacante)}`;
            ctx.victima.mano.push(carta);

            sala.agregarRegistro(
                `🎩 ${Utilidades.obtenerNombreVisual(ctx.victima)} conjuró una Gran desaparición vinculada a ${Utilidades.obtenerNombreVisual(ctx.atacante)}.`
            );
            sala.reproducirSfx("ameliaConjuraGranDesaparicion" + Math.floor(Math.random() * 2));
        } else {
            ctx.victima.number.set("ameliaVidasPerdias", acumuladas);
        }
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Microbios implements IPersonaje {
    nombre = "Microbios";
    habilidad = "Microbios traviesos:\nAl jugar una carta: se mueve a antihorario.\nConjura una carta aleatoria que tenga en la mano del jugador que sobrepasa (2 veces, se recarga al inicio del turno).\nPenalizacion 1.";
    vidasBase = 4;
    sfxDefault = "sfxMicrobios";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("microbio", 0);
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("microbio", 0);
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;

        const sobrepasado = Utilidades.moverPosicionFisica(sala, jugador, "antihorario");
        const usos = (jugador.number.get("microbio") ?? 0) + 1;
        jugador.number.set("microbio", usos);

        const originales = sobrepasado?.estaVivo
            ? sobrepasado.mano.filter((c: Carta) => !c.esConjurada)
            : [];

        if (sobrepasado && originales.length > 0 && usos <= 2) {
            const original = originales[Math.floor(Math.random() * originales.length)];
            const clon = Utilidades.clonarCarta(original, "microbio", true);
            jugador.mano.push(clon);
            sala.agregarRegistro(
                `🦠 ¡${Utilidades.obtenerNombreVisual(jugador)} se movió a antihorario y copió ${clon.nombre} de ${Utilidades.obtenerNombreVisual(sobrepasado)} (${usos}/2)!`
            );
        } else {
            sala.agregarRegistro(`🦠 ¡${Utilidades.obtenerNombreVisual(jugador)} se movió a antihorario!`);
        }
        sala.reproducirSfx("microbioMovimiento");
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class PerroNinja implements IPersonaje {
    nombre = "Perro Ninja";
    habilidad = "Corte preciso:\nAl perder vida: descarta tu Bang! de la izquierda tantas veces pueda para evitar el daño.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muertePerroNinja", false];
    sfxDefault = "sfxPerroNinja";

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo || ctx.danoCuerpo <= 0) return;

        for (let i = 0; i < ctx.danoCuerpo; i++) {
            const idxBang = ctx.victima.mano.findIndex((c: Carta) => c.nombre === "BANG!");
            if (idxBang === -1) break;

            const descartada = ctx.victima.mano.splice(idxBang, 1)[0];
            if (descartada) sala.descartarCarta(descartada, ctx.victima, "PASIVA");
            ctx.victima.vidas++;
            sala.agregarRegistro(`🥷🐾 ¡${Utilidades.obtenerNombreVisual(ctx.victima)} descartó un BANG! para defenderse 1 de daño!`);
            sala.reproducirSfx("perroNinjaDescarteBang");
        }
    }
}

export class Monito implements IPersonaje {
    nombre = "Monito";
    habilidad = "Pandereta:\nCuando otro jugador juegue una copia de una de las cartas que tenes en tu mano (excepto BANG!): roba una carta (3 usos, se recarga al final del turno).\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteMonito", false];
    sfxDefault = "sfxMonito";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("monito", 0);
    }

    onJugarCartaGlobal(sala: IMyRoom, miJugador: Jugador, jugadorQueJuega: Jugador, cartaJugada: Carta): void {
        if (!miJugador.estaVivo || miJugador === jugadorQueJuega || cartaJugada.nombre === "BANG!") return;

        const tieneCopia = miJugador.mano.some((c: Carta) => c.nombre === cartaJugada.nombre);
        const usos = miJugador.number.get("monito") ?? 0;

        if (tieneCopia && usos < 3) {
            miJugador.number.set("monito", usos + 1);
            sala.repartirCartas(miJugador, 1, "pasiva");
            sala.agregarRegistro(
                `🐒 ¡${Utilidades.obtenerNombreVisual(miJugador)} copió a ${Utilidades.obtenerNombreVisual(jugadorQueJuega)}! Como tiene ${cartaJugada.nombre}, roba 1 carta (${usos + 1}/3).`
            );
            sala.reproducirSfx("sfxMonito");
        }
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("monito", 0);
    }
}

export class KarateKillo implements IPersonaje {
    nombre = "Karate Killo";
    habilidad = "Oh yeah:\nSi juega 3 cartas antes del final del turno: entra en modo FLOW.\nBoton 1: descarta un Bang! y conjura una patada (1 por turno).\nBoton 2: descarta un Bang! y conjura una maceta.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteKillo", false];
    sfxDefault = "sfxKillo";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const b1 = new HabilidadActiva();
        b1.id = "killo_patada";
        b1.textoBoton = "Patada";
        b1.tooltip = "Descarta bang, gana patada";
        b1.spriteBoton = "botonKilloPatada";
        jugador.habilidadesActivas.push(b1);

        const b2 = new HabilidadActiva();
        b2.id = "killo_maceta";
        b2.textoBoton = "Maceta";
        b2.tooltip = "Descarta bang, gana maceta";
        b2.spriteBoton = "botonKilloMaceta";
        jugador.habilidadesActivas.push(b2);

        jugador.number.set("killoRecargaPatada", 0);
        jugador.number.set("karateKilloCombo", 0);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "killo_patada");
        Utilidades.removerBotonActivo(jugador, "killo_maceta");
        jugador.number.delete("karateKilloCombo");
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        if ((jugador.number.get("karateKilloCombo") ?? 0) < 3) {
            jugador.number.set("karateKilloCombo", 0);
        }
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const combo = jugador.number.get("karateKilloCombo") ?? 0;
        if (combo < 3) {
            jugador.number.set("karateKilloCombo", combo + 1);
            if (combo + 1 >= 3) {
                sala.reproducirSfx("killoEntraFlow");
                jugador.spriteAvatarOpcional = "Karate Killo flow";
            }
        }
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo || ctx.danoCuerpo <= 0) return;
        if ((ctx.victima.number.get("karateKilloCombo") ?? 0) >= 3) {
            ctx.victima.number.set("karateKilloCombo", 0);
            sala.reproducirSfx("killoPierdeFlow");
            ctx.victima.spriteAvatarOpcional = "";
        }
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        const recarga = jugador.number.get("killoRecargaPatada") ?? 0;
        if (recarga > 0) jugador.number.set("killoRecargaPatada", recarga - 1);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo) return;
        if (idHabilidad !== "killo_patada" && idHabilidad !== "killo_maceta") return;

        if ((jugador.number.get("karateKilloCombo") ?? 0) < 3) {
            client.send("alerta_personal", "Necesitás estar en modo flow para usar las habilidades.");
            return;
        }

        if (idHabilidad === "killo_patada" && (jugador.number.get("killoRecargaPatada") ?? 0) > 0) {
            client.send("alerta_personal", `Esta habilidad se está recargando, faltan ${jugador.number.get("killoRecargaPatada")} rondas.`);
            return;
        }

        const idxBang = jugador.mano.findIndex((c: Carta) => c.nombre === "BANG!");
        if (idxBang === -1) {
            client.send("alerta_personal", "Necesitás tener al menos un BANG! en la mano.");
            return;
        }

        const descartada = jugador.mano.splice(idxBang, 1)[0];
        if (descartada) sala.descartarCarta(descartada, jugador, "HABILIDAD");

        if (idHabilidad === "killo_patada") {
            const nueva = CatalogoCartasEspeciales.crearPatadaKillo();
            nueva.esConjurada = true;
            jugador.mano.push(nueva);
            jugador.number.set("killoRecargaPatada", 1);
            sala.agregarRegistro(`🥋 ¡${Utilidades.obtenerNombreVisual(jugador)} sacrificó un BANG! para preparar una Patada Killo!`);
        } else {
            const nueva = CatalogoCartasEspeciales.crearMacetaKillo();
            nueva.esConjurada = true;
            jugador.mano.push(nueva);
            sala.agregarRegistro(`🪴 ¡${Utilidades.obtenerNombreVisual(jugador)} sacrificó un BANG! para preparar una Maceta Killo!`);
        }
    }
}

export class Tripulante implements IPersonaje {
    nombre = "Tripulante";
    habilidad = "Tripulante ejemplar:\nAl final del turno: se pone a hacer una de 4 tareas que quieras: CABLES, ARCHIVOS, PESCADOS, ESCUDOS.\nPerder vida te cancela una tarea.\nRepetir tu ultima tarea cambia automaticamente a la siguiente.";
    vidasBase = 4;
    sfxDefault = "sfxTripulante";

    private readonly ordenTareas = ["cables", "archivos", "pescados", "escudos"] as const;

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.string.set("tripulanteModo", "cables");
        jugador.string.set("tripulanteUltimaTarea", "");
        jugador.boolean.set("tripulanteHaciendoTarea", false);

        const boton = new HabilidadActiva();
        boton.id = "tripulante";
        boton.textoBoton = "Cambiar tarea";
        boton.tooltip = "Cambia tu tarea";
        boton.spriteBoton = "botonTripulanteCables";
        jugador.habilidadesActivas.push(boton);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("tripulanteHaciendoTarea");
        Utilidades.removerBotonActivo(jugador, "tripulante");
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        const modo = jugador.string.get("tripulanteModo") ?? "cables";
        const ultima = jugador.string.get("tripulanteUltimaTarea") ?? "";

        if (modo === ultima) {
            const boton = jugador.habilidadesActivas.find((h) => h.id === "tripulante");
            this.cambiarSiguienteTarea(jugador, boton);
            const nuevoModo = jugador.string.get("tripulanteModo") ?? "cables";
            sala.agregarRegistro(
                `ඞා ${Utilidades.obtenerNombreVisual(jugador)} repitió tarea y cambia de ${ultima.toUpperCase()} a ${nuevoModo.toUpperCase()}.`
            );
        }

        const modoActual = jugador.string.get("tripulanteModo") ?? "cables";
        jugador.spriteAvatarOpcional = "Tripulante " + modoActual;
        jugador.boolean.set("tripulanteHaciendoTarea", true);
        jugador.string.set("tripulanteUltimaTarea", modoActual);

        sala.agregarRegistro(`ඞා ${Utilidades.obtenerNombreVisual(jugador)} empezó a hacer la tarea ${modoActual.toUpperCase()}.`);
        sala.reproducirSfx("sfxTripulanteTarea");
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.boolean.get("tripulanteHaciendoTarea")) return;

        const modo = jugador.string.get("tripulanteModo") ?? "cables";
        const nombre = Utilidades.obtenerNombreVisual(jugador);

        if (modo === "cables") {
            const mejora = Utilidades.mejorarEquipamientoAleatorio(sala, jugador);
            if (mejora !== "") {
                sala.reproducirSfx("robinMejora");
                sala.agregarRegistro(`ඞා ${nombre} mejoró ${mejora}.`);
            } else {
                sala.agregarRegistro(`ඞා ${nombre} no pudo mejorar nada.`);
            }
        } else if (modo === "archivos") {
            sala.repartirCartas(jugador, 2, "pasiva");
            sala.agregarRegistro(`ඞා ${nombre} robó 2 cartas.`);
        } else if (modo === "pescados") {
            if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
                Utilidades.aplicarCuracion(sala, jugador, 1, "pasiva", false);
                sala.agregarRegistro(`ඞා ${nombre} se cura.`);
            } else {
                sala.agregarRegistro(`ඞා ${nombre} no se pudo curar.`);
            }
        } else {
            Utilidades.agregarEscudos(sala, jugador, 2, 1, "pasiva");
            sala.agregarRegistro(`ඞා ${nombre} obtuvo 2 escudos.`);
        }

        jugador.boolean.set("tripulanteHaciendoTarea", false);
        jugador.spriteAvatarOpcional = "";
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.danoCuerpo > 0 && ctx.victima.boolean.get("tripulanteHaciendoTarea")) {
            ctx.victima.boolean.set("tripulanteHaciendoTarea", false);
            ctx.victima.spriteAvatarOpcional = "";
            sala.agregarRegistro(`ඞා ${Utilidades.obtenerNombreVisual(ctx.victima)} dejó de hacer la tarea.`);
            sala.reproducirSfx("sfxTripulanteInterrumpido");
        }
    }

    ejecutarHabilidadActiva(_sala: IMyRoom, jugador: Jugador, _client: ClienteJuego, idHabilidad: string): void {
        if (idHabilidad !== "tripulante" || !jugador.estaVivo) return;
        const boton = jugador.habilidadesActivas.find((h) => h.id === "tripulante");
        this.cambiarSiguienteTarea(jugador, boton);
    }

    private cambiarSiguienteTarea(jugador: Jugador, boton: HabilidadActiva | undefined): void {
        const actual = jugador.string.get("tripulanteModo") ?? "cables";
        const idx = this.ordenTareas.indexOf(actual as (typeof this.ordenTareas)[number]);
        const siguiente = this.ordenTareas[(idx + 1) % this.ordenTareas.length];
        jugador.string.set("tripulanteModo", siguiente);
        if (boton) {
            boton.spriteBoton = "botonTripulante" + Utilidades.capitalizar(siguiente);
        }
    }
}

export class Shelly implements IPersonaje {
    nombre = "Shelly";
    habilidad = "Escopetazo:\nBoton (1 por turno): descarta hasta 3 Bangs! y conjura un Escopetazo Bang!\nAl final del turno: si no usó su boton, conjura un Bang!.";
    vidasBase = 4;
    sfxDefault = "sfxShelly";
    sfxMuerte: [string, boolean] = ["sfxShellyMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "shellyEscopeta";
        boton.textoBoton = "Carga una escopeta";
        boton.tooltip = "Carga escopeta descartando Bang!";
        boton.spriteBoton = "botonShellyEscopeta";
        jugador.habilidadesActivas.push(boton);
        jugador.number.set("shellyRecarga", 0);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "shellyEscopeta");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        const recarga = jugador.number.get("shellyRecarga") ?? 0;
        jugador.number.set("shellyRecarga", Math.max(0, recarga - 1));
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "shellyEscopeta") return;

        const recarga = jugador.number.get("shellyRecarga") ?? 0;
        if (recarga > 0) {
            client.send("alerta_personal", `Esta habilidad se está recargando, faltan ${recarga} rondas.`);
            return;
        }

        let descartados = 0;
        for (let i = jugador.mano.length - 1; i >= 0 && descartados < 3; i--) {
            if (jugador.mano[i].nombre === "BANG!") {
                const extraida = jugador.mano.splice(i, 1)[0];
                if (extraida) sala.descartarCarta(extraida, jugador, "HABILIDAD");
                descartados++;
            }
        }

        if (descartados === 0) {
            client.send("alerta_personal", "Necesitás tener al menos un BANG! en tu mano para usar esta habilidad.");
            return;
        }

        const carta = CatalogoCartasEspeciales.crearEscopetazo(descartados);
        carta.esConjurada = true;
        jugador.mano.push(carta);
        jugador.number.set("shellyRecarga", 1);

        sala.agregarRegistro(`🔫 ¡${Utilidades.obtenerNombreVisual(jugador)} cargó su Escopetazo descartando ${descartados} BANG!`);
        sala.reproducirSfx("sfxShellyBoton");
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        if ((jugador.number.get("shellyRecarga") ?? 0) <= 0) {
            const bang = CatalogoCartasEspeciales.crearBang();
            bang.esConjurada = true;
            jugador.mano.push(bang);
            sala.reproducirSfx("habilidadShelly");
            sala.agregarRegistro(`🔫 ${Utilidades.obtenerNombreVisual(jugador)} conjura un Bang! por su pasiva.`);
        }
    }
}

export class Byron implements IPersonaje {
    nombre = "Byron";
    habilidad = "Tratamiento completo:\nBoton (1 por turno): descarta dos Bangs! y conjura un Botiquin.\nAl golpear: agrega 1 de efecto Malestar.";
    vidasBase = 4;
    sfxDefault = "sfxByron";
    sfxMuerte: [string, boolean] = ["sfxByronMuerte", true];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "byron_botiquin";
        boton.textoBoton = "Transmutar";
        boton.tooltip = "Transforma 2 BANG! en un Botiquín.";
        boton.spriteBoton = "botonByron";
        jugador.habilidadesActivas.push(boton);
        jugador.boolean.set("byronUsado", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "byron_botiquin");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("byronUsado", false);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "byron_botiquin") return;

        if (jugador.boolean.get("byronUsado")) {
            client.send("alerta_personal", "Ya usaste tu habilidad en este turno.");
            return;
        }

        const indices: number[] = [];
        for (let i = 0; i < jugador.mano.length && indices.length < 2; i++) {
            if (jugador.mano[i].nombre === "BANG!") indices.push(i);
        }

        if (indices.length < 2) {
            client.send("alerta_personal", "Necesitás tener al menos 2 BANG! en la mano.");
            return;
        }

        for (let i = indices.length - 1; i >= 0; i--) {
            const extraida = jugador.mano.splice(indices[i], 1)[0];
            if (extraida) sala.descartarCarta(extraida, jugador, "HABILIDAD");
        }

        const botiquin = CatalogoCartasEspeciales.crearBotiquin();
        botiquin.esConjurada = true;
        jugador.mano.push(botiquin);
        jugador.boolean.set("byronUsado", true);

        sala.agregarRegistro(`🧪 ¡${Utilidades.obtenerNombreVisual(jugador)} convirtió 2 BANG! en un Botiquín!`);
        sala.reproducirSfx("sfxByronHabilidad");
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        Utilidades.agregarEfecto(ctx.victima, "malestar", 1);
        sala.reproducirSfx("sfxByronAnticura");
    }
}

export class GeiruToneido implements IPersonaje {
    nombre = "Geiru Toneido";
    habilidad = "Payasa:\nAl inicio del turno: conjura una Horda de Bloons.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteGeiru", false];
    sfxDefault = "sfxGeiru";

    onIniciarTurno(sala: IMyRoom, miJugador: Jugador): void {
        const carta = CatalogoCartasEspeciales.crearHordaDeBloons();
        carta.esConjurada = true;
        miJugador.mano.push(carta);
        sala.agregarRegistro(`🎈 ¡${Utilidades.obtenerNombreVisual(miJugador)} conjuró una Horda de Bloons!`);
        sala.reproducirSfx("geiruBoton");
    }
}

export class Pierre implements IPersonaje {
    nombre = "Pierre";
    habilidad = "Tienda de calidad:\nCuando roba: tiene un % de robar 1 menos pero a cambio te da una carta de su tienda.\nAl inicio de la partida: coloca el % en 50.\nSi obtiene una carta de su tienda, el % baja en 10, si no sube en 20.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("pierre", 50);
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador): number {
        const prob = jugador.number.get("pierre") ?? 50;
        const tirada = Math.floor(Math.random() * 100) + 1;

        if (tirada <= prob) {
            jugador.number.set("pierre", Math.max(0, prob - 10));
            const carta = CatalogoCartasEspeciales.crearCartaPierreAleatoria();
            carta.esConjurada = true;
            jugador.mano.push(carta);
            sala.agregarRegistro(`🛒 ¡${Utilidades.obtenerNombreVisual(jugador)} obtuvo una carta de la tienda de Pierre!`);
            return -1;
        }

        jugador.number.set("pierre", Math.min(100, prob + 20));
        return 0;
    }
}

export class Wendy implements IPersonaje {
    nombre = "Wendy";
    habilidad = "Protectora:\nAl perder vida: ataca el escudo de los rivales siguientes para protegerse, si no puede, gana un escudo.\nBoton (1 por turno): descarta el Bang! de la izquierda y conjura un Secador.\nTiene 3 vidas.\nPenalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteWendy", false];
    sfxDefault = "sfxWendy";

    onAsignar(_sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) Utilidades.bajarVidaMaxima(jugador, 1);

        const boton = new HabilidadActiva();
        boton.id = "wendy_secador";
        boton.textoBoton = "Crear Secador";
        boton.tooltip = "Descarta tu BANG! de la izquierda y conjura un Secador.";
        boton.spriteBoton = "botonWendy";
        jugador.habilidadesActivas.push(boton);
        jugador.boolean.set("wendyUsada", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "wendy_secador");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("wendyUsada", false);
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.danoCuerpo <= 0) return;

        const ordenados = Utilidades.obtenerJugadoresEnOrdenHorario(sala, ctx.victima, true);
        let danoNoAbsorbido = ctx.danoCuerpo;

        for (let i = 0; i < ctx.danoCuerpo; i++) {
            let escudoRobado = false;
            for (let step = 1; step < ordenados.length; step++) {
                const target = ordenados[step];
                if (target.vidasEscudo > 0) {
                    escudoRobado = true;
                    sala.sistemaCombate.procesarDano(target, ctx.victima, 1, "SECADOR");
                    ctx.victima.vidas = Math.min(ctx.victima.vidasMaximas, ctx.victima.vidas + 1);
                    danoNoAbsorbido--;
                    sala.agregarRegistro(
                        `𖣘 ¡${Utilidades.obtenerNombreVisual(ctx.victima)} se protegió con el escudo de ${Utilidades.obtenerNombreVisual(target)}!`
                    );
                    break;
                }
            }
            if (!escudoRobado) break;
        }

        if (danoNoAbsorbido > 0) {
            Utilidades.agregarEscudos(sala, ctx.victima, 1, 1, "PASIVA");
            sala.agregarRegistro(
                `𖣘 ¡Al no encontrar escudos, ${Utilidades.obtenerNombreVisual(ctx.victima)} generó 1 escudo!`
            );
        }
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "wendy_secador") return;

        if (jugador.boolean.get("wendyUsada")) {
            client.send("alerta_personal", "Ya usaste tu habilidad en este turno.");
            return;
        }

        const idxBang = jugador.mano.findIndex((c: Carta) => c.nombre === "BANG!");
        if (idxBang === -1) {
            client.send("alerta_personal", "Necesitás tener al menos un BANG! en la mano.");
            return;
        }

        const extraida = jugador.mano.splice(idxBang, 1)[0];
        if (extraida) sala.descartarCarta(extraida, jugador, "HABILIDAD");

        const secador = CatalogoCartasEspeciales.crearSecador();
        secador.esConjurada = true;
        jugador.mano.push(secador);
        jugador.boolean.set("wendyUsada", true);

        sala.agregarRegistro(`𖣘 ¡${Utilidades.obtenerNombreVisual(jugador)} sacrificó su BANG! y conjuró un Secador!`);
        sala.reproducirSfx("sfxBotonWendy");
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class Abigail implements IPersonaje {
    nombre = "Abigail";
    habilidad = "Repugnante:\nAl golpear a otro jugador le agrega un efecto tocxic.\nBoton (1 por turno): pierde 1 vida y todos los demas obtienen 2 efecto tocxic.\nAl recibir daño: le agrega un efecto tocxic.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "abigail_tocxic";
        boton.textoBoton = "Ouija";
        boton.tooltip = "Pierde 1 vida, 2 tocxic al resto.";
        boton.spriteBoton = "botonAbigail";
        jugador.habilidadesActivas.push(boton);
        jugador.boolean.set("abigailRecarga", true);
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("abigailRecarga", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "abigail_tocxic");
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "abigail_tocxic") return;

        if (!jugador.boolean.get("abigailRecarga")) {
            client.send("alerta_personal", "Solo podés usar esta habilidad una vez por turno.");
            return;
        }
        if (jugador.vidas <= 1) {
            client.send("alerta_personal", "No podés usar la habilidad con 1 de vida.");
            return;
        }

        jugador.boolean.set("abigailRecarga", false);
        sala.getJugadores().forEach((j: Jugador) => {
            if (j.estaVivo && j !== jugador) Utilidades.agregarEfecto(j, "tocxic", 2);
        });
        sala.sistemaCombate.procesarDano(jugador, jugador, 1, "boton", { ignoraEscudo: true });
        sala.agregarRegistro(`☣️ ¡${Utilidades.obtenerNombreVisual(jugador)} pierde 1 vida y aplica 2 tocxic a todos!`);
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || ctx.atacante === ctx.victima || !ctx.victima.estaVivo) return;
        Utilidades.agregarEfecto(ctx.victima, "tocxic", 1);
        sala.agregarRegistro(
            `☣️ ${Utilidades.obtenerNombreVisual(ctx.atacante)} le agrega un efecto tocxic a ${Utilidades.obtenerNombreVisual(ctx.victima)}.`
        );
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || ctx.atacante === ctx.victima || !ctx.atacante.estaVivo) return;
        Utilidades.agregarEfecto(ctx.atacante, "tocxic", 1);
        sala.agregarRegistro(
            `☣️ ${Utilidades.obtenerNombreVisual(ctx.victima)} le agrega un efecto tocxic a ${Utilidades.obtenerNombreVisual(ctx.atacante)}.`
        );
    }
}

export class Zombistein implements IPersonaje {
    nombre = "Zombistein";
    habilidad = "GARGANTUAR:\nCuando tiene 2 vidas o menos: cambia al modo Zombistein enojado.\nLa primera vez que tiene 2 vidas o menos: lanza un zombidito a todos los demas jugadores.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteZombistein", false];
    sfxDefault = "sfxZombistein";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("esZombistein", true);
        jugador.boolean.set("zombiditoCargado", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("esZombistein");
        jugador.boolean.delete("zombiditoCargado");
    }

    modificarDanoAtacante(_sala: IMyRoom, ctx: ContextoDano): number {
        if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return 0;
        return ctx.atacante.vidas <= 2 ? 1 : 0;
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        this.actualizarSprite(ctx.victima);
        if (ctx.victima.boolean.get("zombiditoCargado") && ctx.victima.vidas <= 2) {
            ctx.victima.boolean.set("zombiditoCargado", false);
            sala.getJugadores().forEach((j: Jugador) => {
                if (j.estaVivo && j !== ctx.victima) {
                    const z = CatalogoCartasEspeciales.crearZombidito();
                    z.esConjurada = true;
                    j.mano.push(z);
                }
            });
            sala.reproducirSfx("zombiditoLanzado");
        }
    }

    onRecibirCuracion(_sala: IMyRoom, jugador: Jugador): void {
        this.actualizarSprite(jugador);
    }

    private actualizarSprite(jugador: Jugador): void {
        jugador.spriteAvatarOpcional = jugador.vidas <= 2 ? "Zombistein enojado" : "";
    }
}

export class Charlie implements IPersonaje {
    nombre = "Charlie";
    habilidad = "Digestion:\nCuando roba: conjura una crisalida con un % de exito.\nAl inicio de la partida: coloca el % en 50.\nSi obtiene la crisalida, el % baja en 10, si no sube en 20.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxCharlieMuerte", false];
    sfxDefault = "sfxCharlie";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("charlie", 50);
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador): number {
        const prob = jugador.number.get("charlie") ?? 50;
        const tirada = Math.floor(Math.random() * 100) + 1;

        if (tirada <= prob) {
            jugador.number.set("charlie", Math.max(0, prob - 10));
            const carta = CatalogoCartasEspeciales.crearCrisalida();
            carta.esConjurada = true;
            jugador.mano.push(carta);
            sala.reproducirSfx("sfxCharlieConjura" + Math.floor(Math.random() * 4));
            sala.agregarRegistro(`🐚 ¡${Utilidades.obtenerNombreVisual(jugador)} obtuvo una crisálida!`);
        } else {
            jugador.number.set("charlie", Math.min(100, prob + 20));
        }
        return 0;
    }
}

export class ElP implements IPersonaje {
    nombre = "ElP";
    habilidad = "Robotilin:\nAl perder vida: gana un jugo (limite 3).\nCuando obtiene 3 jugo: roba una carta.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxElpMuerto", false];
    sfxDefault = "sfxElp";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("jugo", 0);
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        const jugo = ctx.victima.number.get("jugo") ?? 0;
        if (!ctx.victima.estaVivo || ctx.danoCuerpo <= 0 || jugo >= 3) return;

        const nuevo = jugo + 1;
        ctx.victima.number.set("jugo", nuevo);
        sala.agregarRegistro(`🤖 ${Utilidades.obtenerNombreVisual(ctx.victima)} ganó un jugo.`);
        this.actualizarSprite(ctx.victima);

        if (nuevo >= 3) {
            sala.repartirCartas(ctx.victima, 1, "pasiva");
            sala.agregarRegistro(`🤖 ¡${Utilidades.obtenerNombreVisual(ctx.victima)} roba una carta por obtener 3 jugos!`);
            sala.reproducirSfx("sfxElpLleno");
        }
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo || (jugador.number.get("jugo") ?? 0) < 3) return;

        if (Utilidades.puedeRecibirCuracion(sala, jugador)) {
            Utilidades.aplicarCuracion(sala, jugador, 2, "pasiva", false);
            sala.reproducirSfx("curacion");
            sala.agregarRegistro(`🤖 ¡${Utilidades.obtenerNombreVisual(jugador)} se curó 2 por tener 3 jugos!`);
            jugador.number.set("jugo", 0);
            this.actualizarSprite(jugador);
        } else {
            sala.agregarRegistro(`🤖 ${Utilidades.obtenerNombreVisual(jugador)} está listo para curarse pero algo se lo impide.`);
        }
    }

    private actualizarSprite(jugador: Jugador): void {
        const r = jugador.number.get("jugo") ?? 0;
        jugador.spriteAvatarOpcional = r >= 1 && r <= 3 ? `ElP ${r}` : "";
    }
}

export class Tirachinas implements IPersonaje {
    nombre = "Tirachinas";
    habilidad = "Angry birds:\nAl inicio del turno: cambia de pajaro.\nLas probabilidades de cambiar a otro pajaro diferente son: red: 20%, chuck: 20%, blue: 23%, matilda: 5%, terrence: 3%, bomb: 6%, hal: 13%, bubbles: 10%.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["angryBirdsMuerto", false];
    sfxDefault = "sfxAngryBirds";

    private readonly pajaros = [
        { nombre: "red", probabilidad: 20 },
        { nombre: "chuck", probabilidad: 20 },
        { nombre: "blue", probabilidad: 23 },
        { nombre: "matilda", probabilidad: 5 },
        { nombre: "terrence", probabilidad: 3 },
        { nombre: "bomb", probabilidad: 6 },
        { nombre: "hal", probabilidad: 13 },
        { nombre: "bubbles", probabilidad: 10 }
    ] as const;

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.string.set("angryBird", "red");
        jugador.spriteAvatarOpcional = "Tirachinas red";
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.string.delete("angryBird");
    }

    modificarAlcanceAtacante(_sala: IMyRoom, atacante: Jugador): number {
        const pajaro = atacante.string.get("angryBird");
        if (pajaro === "chuck") return 3;
        if (pajaro === "blue") return 2;
        return 0;
    }

    modificarDanoAtacante(_sala: IMyRoom, ctx: ContextoDano): number {
        if (!ctx.atacante || (ctx.causa !== "BANG" && ctx.causa !== "Orbita BANG!")) return 0;
        return ctx.atacante.string.get("angryBird") === "terrence" ? 1 : 0;
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || !ctx.atacante.estaVivo || ctx.causa !== "BANG") return;
        const pajaro = ctx.atacante.string.get("angryBird");

        if (pajaro === "matilda" && ctx.victima.estaVivo) {
            const huevo = CatalogoCartasEspeciales.crearHuevoExplosivo();
            huevo.esConjurada = true;
            ctx.victima.mano.push(huevo);
            sala.agregarRegistro(
                `🥚 ${Utilidades.obtenerNombreVisual(ctx.atacante)} le coloca un Huevo explosivo a ${Utilidades.obtenerNombreVisual(ctx.victima)}.`
            );
        } else if (pajaro === "bomb" && ctx.victima.estaVivo) {
            const cant = Math.min(2, ctx.victima.mano.length);
            if (cant > 0) {
                const descartadas = ctx.victima.mano.splice(0, cant);
                for (const c of descartadas) sala.descartarCarta(c, ctx.victima, "pasiva");
                sala.agregarRegistro(
                    `💥 ¡${Utilidades.obtenerNombreVisual(ctx.atacante)} obligó a ${Utilidades.obtenerNombreVisual(ctx.victima)} a descartar ${cant} carta(s)!`
                );
            }
        } else if (pajaro === "hal") {
            sala.repartirCartas(ctx.atacante, 1, "pasiva");
            sala.agregarRegistro(`𓅫 ${Utilidades.obtenerNombreVisual(ctx.atacante)} robó una carta por su pasiva.`);
        } else if (pajaro === "bubbles") {
            Utilidades.agregarEscudos(sala, ctx.atacante, 1, 1, "pasiva");
            sala.agregarRegistro(`𓅫 ${Utilidades.obtenerNombreVisual(ctx.atacante)} obtuvo un escudo por su pasiva.`);
        }
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        const actual = jugador.string.get("angryBird");
        const opciones = this.pajaros.filter((p) => p.nombre !== actual);
        const total = opciones.reduce((acc, p) => acc + p.probabilidad, 0);
        let rand = Math.random() * total;

        for (const p of opciones) {
            rand -= p.probabilidad;
            if (rand < 0) {
                jugador.string.set("angryBird", p.nombre);
                jugador.spriteAvatarOpcional = "Tirachinas " + p.nombre;
                sala.agregarRegistro(`𓅫 ${Utilidades.obtenerNombreVisual(jugador)} cambió al pájaro ${p.nombre}.`);
                return;
            }
        }
    }
}

export class Nita implements IPersonaje {
    nombre = "Nita";
    habilidad = "Hermano oso:\nCada 2 vidas que pierde: invoca a un NPC Bruce en su sentido antihorario.";
    vidasBase = 4;
    sfxDefault = "sfxNita";
    sfxMuerte: [string, boolean] = ["sfxNitaMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("nitaVidasPerdidas", 0);
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo || ctx.danoCuerpo <= 0) return;
        let acumulado = (ctx.victima.number.get("nitaVidasPerdidas") ?? 0) + ctx.danoCuerpo;

        while (acumulado >= 2) {
            acumulado -= 2;
            Utilidades.invocarNpcEnMesa(sala, ctx.victima, "Bruce", 2, 0, "antihorario");
            sala.reproducirSfx("sfxNitaBruce");
        }
        ctx.victima.number.set("nitaVidasPerdidas", acumulado);
    }
}

export class Larry implements IPersonaje {
    nombre = "Larry";
    habilidad = "Gemelos justicieros:\nTiene 3 vidas.\nAl inicio de la partida: obtiene 1 escudo e invoca al NPC Lawrie en su sentido horario.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxLarryMuerte", false];
    sfxDefault = "sfxLarry";

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            Utilidades.bajarVidaMaxima(jugador, 1);
            Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
            Utilidades.invocarNpcEnMesa(sala, jugador, "Lawrie", 3, 3, "horario");
        }
    }
}

export class Bubble implements IPersonaje {
    nombre = "Bubble";
    habilidad = "Muchas burbujas:\nTiene 1 vida.\nAl empezar: gana 2 escudo e invoca a 4 NPC Bubble.\nAl inicio del turno, al recibir daño y cada 3 cartas jugadas: crea un NPC Bubble antihorario.\nAl final del turno: gana un escudo.\nAlmacenamiento 2.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxBubblenpcMuerte", false];

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (!esImitacion) {
            Utilidades.bajarVidaMaxima(jugador, 3);
            Utilidades.agregarEscudos(sala, jugador, 2, 1, "pasiva");
            for (let i = 0; i < 2; i++) {
                this.crearNpcBubble(sala, jugador, "horario");
                this.crearNpcBubble(sala, jugador, "antihorario");
            }
        }
        jugador.number.set("bubbleJugadas", 0);
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        this.crearNpcBubble(sala, jugador, "antihorario");
    }

    onPasarTurno(sala: IMyRoom, jugador: Jugador): void {
        Utilidades.agregarEscudos(sala, jugador, 1, 1, "pasiva");
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (ctx.victima.estaVivo) this.crearNpcBubble(sala, ctx.victima, "antihorario");
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const jugadas = (jugador.number.get("bubbleJugadas") ?? 0) + 1;
        if (jugadas >= 3) {
            jugador.number.set("bubbleJugadas", 0);
            this.crearNpcBubble(sala, jugador, "antihorario");
        } else {
            jugador.number.set("bubbleJugadas", jugadas);
        }
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return 2;
    }

    private crearNpcBubble(sala: IMyRoom, jugador: Jugador, sentido: "horario" | "antihorario"): void {
        Utilidades.invocarNpcEnMesa(sala, jugador, "Bubble_npc", 1, 1, sentido);
    }
}

export class Phoenix implements IPersonaje {
    nombre = "Phoenix";
    habilidad = "Asistentes:\nAl inicio de la partida: tus otras 2 opciones de eleccion se convierten en npc, empiezan con 3 cartas iniciales.";
    vidasBase = 4;
    sfxDefault = "sfxPhoenix";
    sfxMuerte: [string, boolean] = ["sfxPhoenixMuerte", true];

    onAsignar(sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        if (esImitacion) return;

        const inicio = jugador.reroll ? 3 : 0;
        const elecciones = Array.from(jugador.opcionesPersonaje)
            .slice(inicio, inicio + 3)
            .map((o) => o.nombre);

        if (elecciones.length < 3 || !elecciones.includes("Phoenix")) return;

        const [asistente1, asistente2] = elecciones.filter((n) => n !== "Phoenix");
        const j1 = Utilidades.invocarNpcEnMesa(sala, jugador, asistente1, 4, 3, "antihorario");
        const j2 = Utilidades.invocarNpcEnMesa(sala, jugador, asistente2, 4, 3, "horario");

        if (j1) jugador.boolean.set("phoenixMeme" + j1.personaje, true);
        if (j2) jugador.boolean.set("phoenixMeme" + j2.personaje, true);
    }

    onMuereNpc(sala: IMyRoom, jugador: Jugador, npcMuerto: Jugador): void {
        const miId = Utilidades.obtenerSessionIdDeJugador(sala, jugador);
        if (npcMuerto.idDueno !== miId || !jugador.boolean.get("phoenixMeme" + npcMuerto.personaje)) return;

        jugador.boolean.set("phoenixMeme" + npcMuerto.personaje, false);
        const contador = jugador.number.get("phoenixMeme") ?? 0;
        if (contador === 0) {
            jugador.number.set("phoenixMeme", 1);
            sala.reproducirSfx("phoenixChusquito");
        } else if (contador === 1) {
            jugador.number.set("phoenixMeme", 2);
            sala.reproducirSfx("phoenixPepelucho");
        }
    }
}

export class Clint implements IPersonaje {
    nombre = "Clint";
    habilidad = "Forja:\nAl equipar una carta que no sea un arma: roba 2 cartas.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, _carta: Carta, hueco: string): void {
        if (hueco === "arma") return;
        sala.repartirCartas(miJugador, 2, "pasiva");
        sala.agregarRegistro(`🔨 ¡${Utilidades.obtenerNombreVisual(miJugador)} robó 2 cartas por su pasiva!`);
    }
}

export class Kertley implements IPersonaje {
    nombre = "Kertley";
    habilidad = "Mejor fiscal:\nSus ataques ignoran el escudo.";
    vidasBase = 4;
    sfxDefault = "sfxKertley";
    sfxMuerte: [string, boolean] = ["sfxKertleyMuerte", true];

    modificarTraspasarEscudo(): boolean {
        return true;
    }
}

export class Susato implements IPersonaje {
    nombre = "Susato";
    habilidad = "Interesada:\nCuando roba al inicio del turno: en vez de robar, se le da a elegir entre +3 cartas extras y elije las que mas le interese, las cartas no elejidas van al descarte.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxSusatoMuerte", false];
    sfxDefault = "sfxSusato";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("susato", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("susato");
    }
}

export class Colt implements IPersonaje {
    nombre = "Colt";
    habilidad = "Pistolero equipado:\nAl equipar un arma: conjura un Bang!.\nAl equipar barril, dinamita, papapum, prision o monoaldea: conjura un Fallo!.";
    vidasBase = 4;
    sfxDefault = "sfxColt";
    sfxMuerte: [string, boolean] = ["sfxColtMuerte", false];

    onEquiparCarta(sala: IMyRoom, miJugador: Jugador, _carta: Carta, hueco: string): void {
        if (hueco === "arma") {
            const bang = CatalogoCartasEspeciales.crearBang();
            bang.esConjurada = true;
            miJugador.mano.push(bang);
            sala.agregarRegistro(`🔫 ¡${Utilidades.obtenerNombreVisual(miJugador)} conjuró un Bang! por su pasiva.`);
            sala.reproducirSfx("sfxColtHabilidad");
        } else if (hueco === "prision" || hueco === "dinamita" || hueco === "papa" || hueco === "barril" || hueco === "mira") {
            const fallo = CatalogoCartasEspeciales.crearFallo();
            fallo.esConjurada = true;
            miJugador.mano.push(fallo);
            sala.agregarRegistro(`🔫 ¡${Utilidades.obtenerNombreVisual(miJugador)} conjuró un Fallo! por su pasiva.`);
            sala.reproducirSfx("sfxColtHabilidad");
        }
    }
}

export class Cosmo implements IPersonaje {
    nombre = "Cosmo";
    vidasBase = 4;
    habilidad = "Campo magnetico:\nBoton (1 por turno): descarta tus 2 cartas BANG! de más a la izquierda para conjurar una Orbita BANG!, hace 0 de daño y al golpear agrega 3 efecto gravitacional.";
    sfxDefault = "sfxCosmo";
    sfxMuerte: [string, boolean] = ["sfxCosmoMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const hab = new HabilidadActiva();
        hab.id = "cosmo_orbita";
        hab.textoBoton = "Órbita BANG!";
        hab.tooltip = "Descarta 2 BANG! de tu mano para conjurar una Órbita BANG!.";
        hab.spriteBoton = "botonCosmo";
        jugador.habilidadesActivas.push(hab);
        jugador.boolean.set("cosmo_usado", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "cosmo_orbita");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("cosmo_usado", false);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "cosmo_orbita") return;

        if (jugador.boolean.get("cosmo_usado")) {
            client.send("alerta_personal", "Ya usaste esta habilidad en este turno.");
            return;
        }

        const indices: number[] = [];
        for (let i = 0; i < jugador.mano.length && indices.length < 2; i++) {
            if (jugador.mano[i].nombre === "BANG!") indices.push(i);
        }

        if (indices.length < 2) {
            client.send("alerta_personal", "Necesitás al menos 2 cartas BANG! para usar esta habilidad.");
            return;
        }

        for (let i = indices.length - 1; i >= 0; i--) {
            const desc = jugador.mano.splice(indices[i], 1)[0];
            if (desc) sala.descartarCarta(desc, jugador, "pasiva");
        }

        const orbita = CatalogoCartasEspeciales.crearOrbitaBang();
        orbita.esConjurada = true;
        jugador.mano.push(orbita);
        jugador.boolean.set("cosmo_usado", true);
        sala.agregarRegistro(`🪐 ${jugador.nombre} sacrificó 2 BANG! para conjurar una Órbita BANG!.`);
    }
}

export class Amber implements IPersonaje {
    nombre = "Amber";
    vidasBase = 4;
    habilidad = "Estoy caliente:\nAl golpear: agrega 1 efecto fuego al jugador golpeado.";
    sfxDefault = "sfxAmber";
    sfxMuerte: [string, boolean] = ["sfxAmberMuerte", false];

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || !ctx.victima.estaVivo) return;
        Utilidades.agregarEfecto(ctx.victima, "fuego", 1);
        sala.agregarRegistro(
            `🔥 ¡${Utilidades.obtenerNombreVisual(ctx.atacante)} incendia a ${Utilidades.obtenerNombreVisual(ctx.victima)} por su pasiva!`
        );
        sala.reproducirSfx("sfxFuego");
    }
}

export class FlorAmarilla implements IPersonaje {
    nombre = "Flor amarilla";
    vidasBase = 4;
    habilidad = "Has fallat:\nEn jugar un Fallo: conjura una carta Fallo.";
    sfxDefault = "sfxFlorAmarilla";
    sfxMuerte: [string, boolean] = ["sfxFlorAmarillaMuerte", false];

    onJugarCarta(sala: IMyRoom, jugador: Jugador, cartaJugada: Carta): void {
        if (!jugador.estaVivo || cartaJugada.nombre !== "¡Fallo!") return;
        const fallo = CatalogoCartasEspeciales.crearFallo();
        fallo.esConjurada = true;
        jugador.mano.push(fallo);
        sala.agregarRegistro(`🤠🌻 ${Utilidades.obtenerNombreVisual(jugador)} conjuró un ¡Fallo! por su pasiva.`);
    }
}

export class Maya implements IPersonaje {
    nombre = "Maya";
    habilidad = "Canalizacion:\nMientras esté viva, usa las habilidades de los muertos.\nSi hay un jugador muerto: obtiene penalizacion 1.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxMayaMuerte", true];
    sfxDefault = "sfxMaya";
    mantenerSpritePropio = true;

    obtenerPersonajesDelegados(sala: IMyRoom, jugador: Jugador): string[] {
        const nombres: string[] = [];
        sala.getJugadores().forEach((j: Jugador) => {
            if (!j.estaVivo && !j.esNpc && j !== jugador) {
                nombres.push(j.personaje);
            }
        });
        return nombres;
    }

    onMuereOtroPersonaje(sala: IMyRoom, victimaMuerta: Jugador, _asesino: Jugador | null, miJugador: Jugador): void {
        if (!victimaMuerta.beneficiarseDeSuMuerte) return;
        const clave = "mayaAsigno_" + victimaMuerta.personaje;
        if (miJugador.boolean.get(clave)) return;

        miJugador.boolean.set(clave, true);
        const pasiva = sala.obtenerIPersonaje(victimaMuerta.personaje);
        pasiva?.onAsignar?.(sala, miJugador, true);
    }

    modificarCartasEnManoAlPasarTurno(sala: IMyRoom): number {
        return sala.getTotalJugadoresMuertos() > 0 ? -1 : 0;
    }
}

export class Volpina implements IPersonaje {
    nombre = "Volpina";
    vidasBase = 4;
    habilidad = "Camuflaje:\nBoton (jugadores vivos usos por turno): imita en secreto las habilidades del otro jugador seleccionado mientras este viva.\nPenalizacion 1.";
    sfxDefault = "sfxVolpina";
    sfxMuerte: [string, boolean] = ["volpinaMuerte", false];
    mantenerSpritePropio = true;

    obtenerPersonajesDelegados(sala: IMyRoom, jugador: Jugador): string[] {
        const idImitado = jugador.string.get("volpinaImitandoId");
        if (!idImitado) return [];
        const objetivo = sala.getJugadores().get(idImitado);
        return objetivo && objetivo.estaVivo ? [objetivo.personaje] : [];
    }

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const boton = new HabilidadActiva();
        boton.id = "boton_volpina";
        boton.textoBoton = "Imitar";
        boton.tooltip = "Imita a otro jugador";
        boton.spriteBoton = "botonVolpina";
        jugador.habilidadesActivas.push(boton);
        jugador.number.set("volpinaUsos", 1);
    }

    onRemover(sala: IMyRoom, jugador: Jugador): void {
        this.limpiarImitacionActual(sala, jugador);
        Utilidades.removerBotonActivo(jugador, "boton_volpina");
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("volpinaUsos", sala.getTotalJugadoresVivos());
    }

    onMuereOtroPersonaje(sala: IMyRoom, victimaMuerta: Jugador, _asesino: Jugador | null, miJugador: Jugador): void {
        const idImitado = miJugador.string.get("volpinaImitandoId");
        const idMuerto = Utilidades.obtenerSessionIdDeJugador(sala, victimaMuerta);
        if (idImitado && idImitado === idMuerto) {
            this.limpiarImitacionActual(sala, miJugador);
        }
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo || idHabilidad !== "boton_volpina") return;

        const usos = jugador.number.get("volpinaUsos") ?? 0;
        const idImitadoActual = jugador.string.get("volpinaImitandoId") ?? "";
        const imitadoActual = idImitadoActual ? sala.getJugadores().get(idImitadoActual) ?? null : null;

        if (usos <= 0) {
            const msgActual = imitadoActual
                ? `\nAhora mismo estás imitando a ${Utilidades.obtenerNombreVisual(imitadoActual)}.`
                : "";
            client.send("alerta_personal", `No te quedan más usos para este turno.${msgActual}`);
            return;
        }

        // 1. Limpiamos el personaje anterior
        this.limpiarImitacionActual(sala, jugador);

        // 2. Buscamos al siguiente jugador vivo distinto de Volpina
        let objetivo = imitadoActual ?? jugador;
        let antiBucle = 0;
        do {
            const sig = Utilidades.obtenerSiguienteVivoHorario(sala, objetivo);
            if (!sig) return;
            objetivo = sig;
            antiBucle++;
        } while (objetivo === jugador && antiBucle < 100);

        if (objetivo === jugador) return;

        // 3. Asignamos la nueva imitación
        const nuevoId = Utilidades.obtenerSessionIdDeJugador(sala, objetivo);
        jugador.string.set("volpinaImitandoId", nuevoId);
        jugador.number.set("volpinaUsos", usos - 1);

        client.send(
            "alerta_personal",
            `Ahora estás imitando a ${Utilidades.obtenerNombreVisual(objetivo)}.\nTe quedan ${usos - 1} usos de habilidad.`
        );

        const claseNueva = sala.obtenerIPersonaje(objetivo.personaje);
        claseNueva?.onAsignar?.(sala, jugador, true);
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }

    private limpiarImitacionActual(sala: IMyRoom, jugador: Jugador): void {
        const idViejo = jugador.string.get("volpinaImitandoId");
        if (!idViejo) return;
        const viejo = sala.getJugadores().get(idViejo);
        if (viejo) {
            sala.obtenerIPersonaje(viejo.personaje)?.onRemover?.(sala, jugador);
        }
        jugador.string.delete("volpinaImitandoId");
    }
}

export class RoaringKnight implements IPersonaje {
    nombre = "Roaring knight";
    vidasBase = 4;
    habilidad = "Dificultad artificial:\nAl golpear: hace +1 de daño al primer jugador que golpea en cada turno.\nPenalizacion 1.";
    sfxDefault = "sfxCaballero";
    sfxMuerte: [string, boolean] = ["sfxCaballeroMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("roaringDaño", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("roaringDaño");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("roaringDaño", true);
    }

    modificarDanoAtacante(_sala: IMyRoom, ctx: ContextoDano): number {
        return ctx.atacante?.boolean.get("roaringDaño") ? 1 : 0;
    }

    onGolpear(_sala: IMyRoom, ctx: ContextoDano): void {
        ctx.atacante?.boolean.set("roaringDaño", false);
    }

    modificarCartasEnManoAlPasarTurno(): number {
        return -1;
    }
}

export class ShellyDeKiller implements IPersonaje {
    nombre = "Shelly de Killer";
    vidasBase = 4;
    habilidad = "Asesino:\nSe necesitan 2 Fallo para esquivar sus Bangs! o Tiratachuelas.\nAl morir (1 vez): descarta todas sus cartas, gana 2 efecto inmortalidad, baja su vida maxima a 1, obtiene penalizacion 1 y roba 2 cartas.";
    sfxDefault = "sfxDeKiller";
    sfxMuerte: [string, boolean] = ["sfxRadioMuerte", true];

    modificarFallosRequeridos(): number {
        return 1;
    }

    onRecibirDano(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.victima.estaVivo || ctx.victima.vidas > 0 || ctx.victima.boolean.get("killerYaMurio")) return;

        ctx.victima.boolean.set("killerYaMurio", true);
        ctx.victima.spriteAvatarOpcional = "Shelly de Killer radio";

        for (const carta of ctx.victima.mano) {
            sala.agregarAlDescarte(carta);
        }
        ctx.victima.mano.clear();

        Utilidades.agregarEfecto(ctx.victima, "inmortalidad", 2);
        ctx.victima.vidas = 1;
        Utilidades.bajarVidaMaxima(ctx.victima, 999);
        sala.repartirCartas(ctx.victima, 2, "pasiva");

        sala.agregarRegistro(
            `📻 ¡${Utilidades.obtenerNombreVisual(ctx.victima)} escapó del peligro antes de morir y dejó una radio misteriosa!`
        );
        sala.reproducirSfx("sfxDeKillerMuerte");
    }

    modificarCartasEnManoAlPasarTurno(_sala: IMyRoom, jugador: Jugador): number {
        return jugador.boolean.get("killerYaMurio") ? -1 : 0;
    }
}

export class Sirius implements IPersonaje {
    nombre = "Sirius";
    vidasBase = 4;
    habilidad = "Invocacion espejo:\nAl golpear (2 usos): crea un npc de 1 de vida y 1 carta en sentido antihorario con las habilidades del jugador golpeado.\nAl inicio del turno: recarga sus 2 usos de la habilidad al golpear.";
    sfxDefault = "sfxSirius";
    sfxMuerte: [string, boolean] = ["sfxSiriusMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("siriusUsos", 2);
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("siriusUsos", 2);
    }

    onInvocarNpc(_sala: IMyRoom, _dueno: Jugador, npcInvocado: Jugador): void {
        npcInvocado.boolean.set("npcDeSirius", true);
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || ctx.atacante === ctx.victima) return;
        const usos = ctx.atacante.number.get("siriusUsos") ?? 0;
        if (usos <= 0) return;

        ctx.atacante.number.set("siriusUsos", usos - 1);
        Utilidades.invocarNpcEnMesa(sala, ctx.atacante, ctx.victima.personaje, 1, 1, "antihorario");
        sala.reproducirSfx("sfxSiriusSombra");
    }
}

export class MRasmodius implements IPersonaje {
    nombre = "M.Rasmodius";
    vidasBase = 4;
    habilidad = "Maestro del conjuro:\nAl inicio del turno: desconjura sus cartas de la mano.\nCuando roba: tiene un % de robar una menos pero conjura una carta aleatoria del juego.\nAl iniciar la partida: coloca el % en 40.\nSi hace el conjuro: el % baja en 12, si no sube 20.";
    sfxMuerte: [string, boolean] = ["muerteStardew", true];
    sfxDefault = "sfxStardew";

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.number.set("mconjuro", 40);
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        for (const carta of jugador.mano) {
            carta.esConjurada = false;
        }
    }

    modificarRepartirCarta(sala: IMyRoom, jugador: Jugador): number {
        const prob = jugador.number.get("mconjuro") ?? 40;
        const tirada = Math.floor(Math.random() * 100) + 1;

        if (tirada <= prob) {
            const lista = CatalogoCartasEspeciales.obtenerTodasLasCartas();
            const aleatoria = lista[Math.floor(Math.random() * lista.length)];
            if (aleatoria) {
                aleatoria.esConjurada = true;
                jugador.mano.push(aleatoria);
            }
            sala.agregarRegistro(`🧙‍♂️ ¡${Utilidades.obtenerNombreVisual(jugador)} conjuró una carta aleatoria del juego!`);
            jugador.number.set("mconjuro", Math.max(0, prob - 12));
            return -1;
        }

        jugador.number.set("mconjuro", Math.min(100, prob + 20));
        return 0;
    }
}

export class Echo implements IPersonaje {
    nombre = "Echo";
    habilidad = "Duplicación:\nAl inicio del turno: se transforma en un personaje aleatorio del juego.";
    vidasBase = 4;
    sfxDefault = "sfxEcho";
    sfxMuerte: [string, boolean] = ["sfxEchoMuerte", false];

    obtenerPersonajesDelegados(_sala: IMyRoom, jugador: Jugador): string[] {
        const imitado = jugador.string.get("echoPersonaje");
        return imitado ? [imitado] : [];
    }

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("esEcho", true);
    }

    onRemover(sala: IMyRoom, jugador: Jugador): void {
        const anterior = jugador.string.get("echoPersonaje");
        if (anterior) {
            sala.obtenerIPersonaje(anterior)?.onRemover?.(sala, jugador);
            jugador.string.delete("echoPersonaje");
        }
        jugador.boolean.delete("esEcho");
        jugador.spriteAvatarOpcional = "";
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;

        const anterior = jugador.string.get("echoPersonaje");
        if (anterior) {
            sala.obtenerIPersonaje(anterior)?.onRemover?.(sala, jugador);
        }

        const todos = sala.gestorPersonajes.obtenerTodosParaRepartir().filter((p) => p.nombre !== "Echo");
        if (todos.length === 0) return;

        const sinRepetir = todos.filter((p) => p.nombre !== anterior);
        const pool = sinRepetir.length > 0 ? sinRepetir : todos;
        const elegido = pool[Math.floor(Math.random() * pool.length)];

        jugador.string.set("echoPersonaje", elegido.nombre);
        jugador.spriteAvatarOpcional = elegido.nombre;

        elegido.onAsignar?.(sala, jugador, true);

        sala.agregarRegistro(
            `🌀 ¡${Utilidades.obtenerNombreVisual(jugador)} se transformó en ${elegido.nombreMostrar ?? elegido.nombre}!`
        );
        sala.reproducirSfx("sfxEchoTransformacion");
    }

    onPostHookVisual(jugador: Jugador): void {
        const imitado = jugador.string.get("echoPersonaje");
        if (imitado && jugador.spriteAvatarOpcional === "") {
            jugador.spriteAvatarOpcional = imitado;
        }
    }
}

export class Dynamike implements IPersonaje {
    nombre = "Dynamike";
    habilidad = "Demolición:\nAl golpear con BANG! normal: le coloca una Mini dinamita a la víctima (3/16 de explotar con 1 de daño, si no pasa al siguiente libre).\nTiene +1 de suerte contra Dinamitas y Mini dinamitas.";
    vidasBase = 4;
    sfxDefault = "sfxDynamike";
    sfxMuerte: [string, boolean] = ["sfxDynamikeMuerte", false];

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || ctx.atacante === ctx.victima || !ctx.victima.estaVivo) return;
        if (ctx.cartaOrigen?.nombre !== "BANG!") return;

        const mini = CatalogoCartasEspeciales.crearMiniDinamita();
        mini.esConjurada = true;
        Utilidades.equiparCarta(sala, ctx.victima, mini, "miniDinamita");
        sala.agregarRegistro(
            `🧨 ¡${Utilidades.obtenerNombreVisual(ctx.atacante)} le colocó una Mini dinamita a ${Utilidades.obtenerNombreVisual(ctx.victima)}!`
        );
        sala.reproducirSfx("dinamita");
    }

    modificarRuletaLocal(_sala: IMyRoom, ctx: IContextoRuleta): void {
        if (ctx.motivo === "Dinamita" || ctx.motivo === "MiniDinamita") {
            ctx.bonusSuerte += 1;
        }
    }
}

export class BrockElCartero implements IPersonaje {
    nombre = "Brock el cartero";
    habilidad = "Brock el cartero soy:\nBoton 1 o Boton 2 (1 uso compartido por turno):\nBoton 1: conjura un CorreoExplosivo.\nBoton 2: conjura un Correo.\nSi rechazan el correo, nadie se entera de que habia dentro.";
    vidasBase = 4;
    sfxDefault = "sfxBrock";
    sfxMuerte: [string, boolean] = ["sfxBrockMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        const btnA = new HabilidadActiva();
        btnA.id = "brock_explosivo";
        btnA.textoBoton = "Correo explosivo";
        btnA.tooltip = "Conjura un paquete explosivo trampa.";
        btnA.spriteBoton = "botonBrockExplosivo";
        jugador.habilidadesActivas.push(btnA);

        const btnB = new HabilidadActiva();
        btnB.id = "brock_correo";
        btnB.textoBoton = "Correo";
        btnB.tooltip = "Conjura un Correo para enviar una carta de tu mano.";
        btnB.spriteBoton = "botonBrockCorreo";
        jugador.habilidadesActivas.push(btnB);

        jugador.boolean.set("brockUsado", false);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        Utilidades.removerBotonActivo(jugador, "brock_explosivo");
        Utilidades.removerBotonActivo(jugador, "brock_correo");
        jugador.boolean.delete("brockUsado");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("brockUsado", false);
    }

    ejecutarHabilidadActiva(sala: IMyRoom, jugador: Jugador, client: ClienteJuego, idHabilidad: string): void {
        if (!jugador.estaVivo) return;
        if (idHabilidad !== "brock_explosivo" && idHabilidad !== "brock_correo") return;

        if (jugador.boolean.get("brockUsado")) {
            client.send("alerta_personal", "Ya usaste tu habilidad de cartero en este turno.");
            return;
        }

        const carta =
            idHabilidad === "brock_explosivo"
                ? CatalogoCartasEspeciales.crearCorreoExplosivo()
                : CatalogoCartasEspeciales.crearCorreo();

        carta.esConjurada = true;
        jugador.mano.push(carta);
        jugador.boolean.set("brockUsado", true);

        // Registro y SFX neutros para no delatar si conjuró trampa o correo real
        sala.agregarRegistro(`✉️ ${Utilidades.obtenerNombreVisual(jugador)} preparó un paquete.`);
        sala.reproducirSfx("sfxBrockPaquete");
    }
}

export class Otis implements IPersonaje {
    nombre = "Otis";
    vidasBase = 4;
    habilidad = "Silencio:\nAl golpear por primera vez a un jugador durante tu turno: le agrega 1 efecto bloqueado.";
    sfxDefault = "sfxOtis";
    sfxMuerte: [string, boolean] = ["sfxOtisMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("otisBloqueo", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("otisBloqueo");
    }

    onIniciarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("otisBloqueo", true);
    }

    onPasarTurno(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("otisBloqueo", false);
    }

    onGolpear(sala: IMyRoom, ctx: ContextoDano): void {
        if (!ctx.atacante || ctx.atacante === ctx.victima || !ctx.victima.estaVivo) return;
        if (!ctx.atacante.boolean.get("otisBloqueo")) return;

        ctx.atacante.boolean.set("otisBloqueo", false);
        Utilidades.agregarEfecto(ctx.victima, "bloqueado", 1);
        sala.agregarRegistro(
            `🔇 ¡${Utilidades.obtenerNombreVisual(ctx.atacante)} bloqueó las habilidades de ${Utilidades.obtenerNombreVisual(ctx.victima)}!`
        );
        sala.reproducirSfx("sfxOtisBloqueo");
    }
}

// =============================================================================
// NPCS INVOCABLES
// =============================================================================

export class Bruce implements IPersonaje {
    nombre = "Bruce";
    habilidad = "NPC:\nNo roba cartas en su fase de robo.\nAl inicio de su turno: conjura un BANG!.\nAl jugar una carta: se mueve en sentido antihorario.";
    vidasBase = 2;
    esNpcInvocable = true;
    sfxDefault = "sfxBruce";
    sfxMuerte: [string, boolean] = ["sfxBruceMuerte", false];

    modificarRepartirCarta(_sala: IMyRoom, _jugador: Jugador, causa: string): number {
        return causa === "turno" ? -2 : 0;
    }

    onIniciarTurno(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        const bang = CatalogoCartasEspeciales.crearBang();
        bang.esConjurada = true;
        jugador.mano.push(bang);
        sala.agregarRegistro(`🐻 ¡${Utilidades.obtenerNombreVisual(jugador)} conjuró un BANG! al iniciar su turno!`);
    }

    onJugarCarta(sala: IMyRoom, jugador: Jugador): void {
        if (!jugador.estaVivo) return;
        Utilidades.moverPosicionFisica(sala, jugador, "antihorario");
        sala.agregarRegistro(`🐻 ¡${Utilidades.obtenerNombreVisual(jugador)} jugó una carta y se movió en sentido antihorario!`);
    }
}

export class Lawrie implements IPersonaje {
    nombre = "Lawrie";
    habilidad = "NPC:\nPuede recibir curacion.";
    vidasBase = 3;
    esNpcInvocable = true;
    sfxDefault = "sfxLawrie";
    sfxMuerte: [string, boolean] = ["sfxLawrieMuerte", false];

    onAsignar(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.set("lawrieCura", true);
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("lawrieCura");
    }
}

export class Bubble_npc implements IPersonaje {
    nombre = "Bubble_npc";
    habilidad = "NPC:\nAlmacenamiento 1.";
    vidasBase = 1;
    esNpcInvocable = true;
    sfxMuerte: [string, boolean] = ["sfxBubblenpcMuerte", false];

    modificarCartasEnManoAlPasarTurno(): number {
        return 1;
    }
}

export class Leon_oculto implements IPersonaje {
    nombre = "Leon_oculto";
    nombreMostrar = "Leon";
    habilidad = "Noooo leooooon:\nOculta todos sus visuales a los demas.\nAl final del turno: si hay menos de 2 npc leon_oculto: crea hasta 2 npc leon_oculto en sentido antihorario, luego intercambia o no de lugar con ellos de forma aleatoria.";
    vidasBase = 4;
    sfxMuerte: [string, boolean] = ["sfxLeonOcultoMuerte", true];
    sfxDefault = "sfxLeon";
    esNpcInvocable = true;

    onAsignar(_sala: IMyRoom, jugador: Jugador, esImitacion: boolean): void {
        jugador.spriteAvatarOpcional = "Leon";
        jugador.boolean.set("leonOcultar", true);
        jugador.boolean.set("leon_oculto", true);
        if (!esImitacion) {
            Utilidades.bajarVidaMaxima(jugador, 3);
        }
    }

    onRemover(_sala: IMyRoom, jugador: Jugador): void {
        jugador.boolean.delete("leonOcultar");
        jugador.boolean.delete("leon_oculto");
    }
}

// =============================================================================
// GESTOR DE PERSONAJES
// =============================================================================

export class GestorPersonajes {
    private personajes: Record<string, IPersonaje> = {};

    constructor() {
        const lista: IPersonaje[] = [
            new ColeCasiddy(), new Berry(), new Maton(), new Mandy(), new Tralalero(),
            new Darryl(), new JetpackCat(), new KayFaraday(), new Chester(), new Frank(),
            new Pam(), new Trucy(), new Luigi(), new Mario(), new Lesly(),
            new Mikotoba(), new Domino(), new Tilink(), new Flowery(), new Leon(),
            new Kazuma(), new Leah(), new Robin(), new Luciergana(), new Haley(),
            new Maggey(), new Mortis(), new Maya(), new Geraldo(), new RaymundoEscudos(),
            new Cubo(), new VonKarma(), new Mercy(), new Chispitas(), new Dahlia(),
            new Meg(), new Perro(), new DaveElLoco(), new Junkrat(), new Max(),
            new Pedro(), new Amelia(), new Microbios(), new PerroNinja(), new Monito(),
            new KarateKillo(), new Tripulante(), new Shelly(), new Byron(), new GeiruToneido(),
            new Wendy(), new Pierre(), new Zombistein(), new Abigail(), new Charlie(),
            new ElP(), new Tirachinas(), new Nita(), new Larry(), new Bubble(),
            new Phoenix(), new Clint(), new Kertley(), new Susato(), new Colt(),
            new Cosmo(), new Amber(), new FlorAmarilla(), new Volpina(), new Tracer(),
            new RoaringKnight(), new ShellyDeKiller(), new Sirius(), new MRasmodius(),
            new Echo(), new Dynamike(), new BrockElCartero(), new Otis(),
            // NPCs invocables
            new Lawrie(), new Bruce(), new Bubble_npc(), new Leon_oculto()
        ];

        for (const p of lista) {
            this.personajes[p.nombre] = p;
        }
    }

    public obtener(nombre: string): IPersonaje | null {
        return this.personajes[nombre] ?? null;
    }

    public obtenerTodosParaRepartir(): IPersonaje[] {
        return this.mezclar(Object.values(this.personajes).filter((p) => !p.esNpcInvocable));
    }

    public obtenerTodosLosNpc(): IPersonaje[] {
        return this.mezclar(Object.values(this.personajes).filter((p) => p.esNpcInvocable === true));
    }

    private mezclar(lista: IPersonaje[]): IPersonaje[] {
        const copia = [...lista];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = copia[i];
            copia[i] = copia[j];
            copia[j] = temp;
        }
        return copia;
    }
}