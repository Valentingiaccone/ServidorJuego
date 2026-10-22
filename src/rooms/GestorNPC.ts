// GestorNPC.ts
import { Carta, Jugador } from "./schema/MyRoomState.js";
import { Utilidades } from "./Utilidades.js";

export class GestorNPC {

    /**
     * Crea un objeto cliente simulado para que el servidor procese las jugadas
     * del NPC igual que las de un jugador humano.
     */
    public static crearClienteNpc(idNpc: string) {
        return {
            sessionId: idNpc,
            send: (tipo: string, datos?: any) => {
                // El NPC ignora alertas personales en silencio
            }
        };
    }

    /**
     * Determina si un objetivo es aliado del NPC (él mismo, su dueño, u otro NPC del mismo dueño).
     */
    public static esAliado(idNpc: string, npc: Jugador, idObjetivo: string, jugadorObjetivo: Jugador): boolean {
        if (idObjetivo === idNpc) return true;
        if (npc.idDueno !== "") {
            if (idObjetivo === npc.idDueno) return true;
            if (jugadorObjetivo && jugadorObjetivo.esNpc && jugadorObjetivo.idDueno === npc.idDueno) return true;
        }
        return false;
    }

    // =========================================================================
    // 1. RESPUESTAS AUTOMÁTICAS (RULETAS, PANELES DE BOTONES Y SELECCIÓN DE CARTAS)
    // =========================================================================

    public static verificarRuletaNpc(sala: any) {
        let idActual = sala.state.jugadorDesenfundando;
        if (!idActual) return;

        let jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.jugadorDesenfundando === idActual) {
                sala.procesarVoltearCarta(this.crearClienteNpc(idActual));
            }
        }, 500);
    }

    public static verificarInteraccionUniversalNpc(sala: any) {
        let idActual = sala.state.interaccionActiva.idJugadorObjetivo;
        if (!idActual) return;

        let jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.interaccionActiva.idJugadorObjetivo !== idActual) return;

            // Trata de elegir el botón 1, si no puede el 2, si no el 3, etc.
            let opciones = sala.state.interaccionActiva.opciones;
            let opcionElegida = opciones.find((op: any) => op.habilitado === true);

            if (opcionElegida) {
                sala.procesarResponderInteraccion(this.crearClienteNpc(idActual), opcionElegida.idAccion);
            }
        }, 500);
    }

    public static verificarSeleccionCartaNpc(sala: any) {
        let idActual = sala.state.seleccionCartasActiva.idJugadorObjetivo;
        if (!idActual) return;

        let jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.seleccionCartasActiva.idJugadorObjetivo !== idActual) return;

            let opciones = sala.state.seleccionCartasActiva.opciones;
            if (opciones && opciones.length > 0) {
                let idxRandom = Math.floor(Math.random() * opciones.length);
                let elegida = opciones[idxRandom];
                if (elegida) {
                    sala.procesarRespuestaSeleccionCarta(this.crearClienteNpc(idActual), elegida.idRespuesta);
                }
            } else {
                // Si por algún motivo no hubiera opciones válidas, cancela para no trabar la partida
                sala.procesarRespuestaSeleccionCarta(this.crearClienteNpc(idActual), "cancelar");
            }
        }, 500);
    }

    // =========================================================================
    // 2. BUCLE PRINCIPAL DEL TURNO DEL NPC (2 PASADAS + DESCARTE + PASAR TURNO)
    // =========================================================================

    public static iniciarTurnoNpc(sala: any, idNpc: string) {
        let npc = sala.state.jugadores.get(idNpc);
        if (!npc || !npc.esNpc || !npc.estaVivo) return;

        this.programarPasoTurnoNpc(sala, idNpc, 1, 0);
    }

    private static programarPasoTurnoNpc(sala: any, idNpc: string, pasada: number, indiceCarta: number) {
        let delay = Math.floor(Math.random() * 500) + 250;

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.turnoActual !== idNpc) return;

            let npc = sala.state.jugadores.get(idNpc);
            if (!npc || !npc.estaVivo) return;

            // Si hay una interacción, ruleta o selección activa, esperamos a que termine
            if (sala.juegoPausado()) {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta);
                return;
            }

            // Si ya recorrió todas las cartas de su mano en esta pasada
            if (indiceCarta >= npc.mano.length) {
                if (pasada === 1) {
                    // Segunda pasada desde la izquierda (índice 0)
                    this.programarPasoTurnoNpc(sala, idNpc, 2, 0);
                } else {
                    // Terminó la segunda pasada: descartar excedente y pasar turno
                    this.finalizarTurnoNpc(sala, idNpc, npc);
                }
                return;
            }

            let carta = npc.mano[indiceCarta];
            if (!carta) {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, 0);
                return;
            }

            let seJugo = this.intentarJugarCarta(sala, idNpc, npc, carta);

            if (seJugo) {
                // Al jugarse la carta en indiceCarta, la siguiente carta se corrió a este mismo índice
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta);
            } else {
                // No se pudo jugar, probamos con la siguiente carta a la derecha
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta + 1);
            }
        }, delay);
    }

    private static finalizarTurnoNpc(sala: any, idNpc: string, npc: Jugador) {
        let clienteNpc = this.crearClienteNpc(idNpc);
        let frenoSeguridad = 50;

        // Usamos un bucle que evaluará dinámicamente el estado en CADA descarte
        while (true) {
            // 1. Chequeos de seguridad básicos para salir del bucle
            if (!npc.estaVivo || sala.state.turnoActual !== idNpc || npc.mano.length === 0 || frenoSeguridad <= 0) {
                break;
            }

            // 2. Recalcular el límite de cartas EXACTO en este preciso instante
            let modificacion = 0;
            let pasiva = sala.gestorPersonajes.obtener(npc.personaje);
            if (pasiva && pasiva.modificarCartasEnManoAlPasarTurno) {
                modificacion = pasiva.modificarCartasEnManoAlPasarTurno(sala, npc);
            }
            let limiteManoActual = Math.max(0, npc.vidas + modificacion);

            // 3. Si ya cumplimos la regla de salud = cartas, rompemos el bucle
            if (npc.mano.length <= limiteManoActual) {
                break;
            }

            // 4. Si seguimos teniendo cartas de más, descartamos UNA sola
            frenoSeguridad--;
            let idxRandom = Math.floor(Math.random() * npc.mano.length);
            let cartaADescartar = npc.mano[idxRandom];
            
            if (cartaADescartar) {
                // Al descartar, pueden pasar mil cosas (daño, robos extra, muerte)
                // Por eso, la próxima iteración del while volverá a evaluar TODO desde cero.
                sala.procesarDescartarCarta(clienteNpc, cartaADescartar.id);
            }
        }

        // 5. Una vez terminados todos los descartes, evaluamos si puede pasar de turno
        // (Verificamos de nuevo que siga vivo, ya que pudo morir por el efecto de un descarte)
        if (npc.estaVivo && sala.state.turnoActual === idNpc) {
            sala.procesarPasarTurno(clienteNpc);
        }
    }

    // =========================================================================
    // 3. LÓGICA PARA JUGAR CARTAS Y ELEGIR OBJETIVOS ALEATORIOS
    // =========================================================================

    private static intentarJugarCarta(sala: any, idNpc: string, npc: Jugador, carta: Carta): boolean {
        if (carta.tipoDeUso === "oculto") return false;

        let clienteNpc = this.crearClienteNpc(idNpc);

        // Cartas instantáneas o de equipamiento propio
        if (carta.tipoDeUso === "instantanea" || carta.tipoDeUso === "equipamiento") {
            return sala.procesarJugarCarta(clienteNpc, carta.id);
        }

        // Cartas que requieren elegir un jugador objetivo
        if (
            carta.tipoDeUso === "objetivo" ||
            carta.tipoDeUso === "objetivoVecino" ||
            carta.tipoDeUso === "objetivoGlobal" ||
            carta.tipoDeUso === "objetivoUniversal"
        ) {
            let objetivosValidos = this.obtenerObjetivosValidos(sala, idNpc, npc, carta);
            if (objetivosValidos.length === 0) return false;

            let idObjetivo = objetivosValidos[Math.floor(Math.random() * objetivosValidos.length)];

            if (carta.efecto.startsWith("prision")) {
                return sala.procesarEncarcelar(clienteNpc, { idCartaJugada: carta.id, idObjetivo: idObjetivo });
            } else {
                let resultado = sala.procesarJugarCartaObjetivo(clienteNpc, { idCarta: carta.id, idObjetivo: idObjetivo });
                // Si la carta era Pánico, abre el panel de selección de cartas y se consume al elegir
                if (!resultado && sala.state.seleccionCartasActiva.idJugadorObjetivo === idNpc) {
                    return true;
                }
                return resultado;
            }
        }

        return false;
    }

    private static obtenerObjetivosValidos(sala: any, idNpc: string, npc: Jugador, carta: Carta): string[] {
        let accion = carta.efecto.split("_")[0];
        let esBeneficiosa = (accion === "curarDuo" || accion === "secador" || carta.tipoEmbrujo === "bueno");

        let vivos: string[] = [];
        sala.state.ordenSillasFisicas.forEach((id: string) => {
            let j = sala.state.jugadores.get(id);
            if (j && j.estaVivo) vivos.push(id);
        });

        let idxAtacante = vivos.indexOf(idNpc);
        if (idxAtacante === -1) return [];

        let statsArma = Utilidades.getDatosArma(npc);
        let candidatos: string[] = [];

        vivos.forEach((idCandidato) => {
            let candidato = sala.state.jugadores.get(idCandidato);
            if (!candidato || !candidato.estaVivo) return;

            // Nunca se apunta a sí mismo (salvo embrujo bueno)
            if (idCandidato === idNpc && carta.tipoEmbrujo !== "bueno") return;

            // Si NO es una carta beneficiosa, jamás ataca a su dueño ni a otros NPCs aliados
            if (!esBeneficiosa && this.esAliado(idNpc, npc, idCandidato, candidato)) return;

            // Validaciones de distancia según el tipo de uso de la carta
            let idxVictima = vivos.indexOf(idCandidato);
            let n = vivos.length;
            let diff = Math.abs(idxAtacante - idxVictima);
            let distanciaFisica = Math.min(diff, n - diff);

            if (carta.tipoDeUso === "objetivoVecino") {
                if (distanciaFisica > 1) return;
            } else if (carta.tipoDeUso === "objetivo") {
                if (distanciaFisica < statsArma.alcanceMinimo) return;
                let distModificada = this.calcularDistanciaServidor(sala, npc, candidato, distanciaFisica);
                if (distModificada > statsArma.alcance) return;
            }

            // Validaciones específicas por efecto para no intentar jugadas inválidas
            if (accion === "prision") {
                if (vivos.length <= 2) return;
                if (candidato.rol === "Sheriff" || candidato.equipamiento.has("prision")) return;
            } else if (accion === "crisalida") {
                if (candidato.equipamiento.has("crisalida")) return;
            } else if (accion === "forzar") {
                if ((candidato.mano.length === 0 && candidato.equipamiento.size === 0) || candidato.equipamiento.has("espantacocoroch")) return;
            } else if (accion === "robarEnemigo") {
                if (candidato.mano.length === 0 && candidato.equipamiento.size === 0) return;
            } else if (accion === "desequipar") {
                if (candidato.equipamiento.size === 0) return;
            } else if (accion === "valerieLadrona" || accion === "trebolador") {
                if (candidato.mano.length === 0) return;
            } else if (accion === "curarDuo") {
                if (!Utilidades.puedeRecibirCuracion(sala, npc) || !Utilidades.puedeRecibirCuracion(sala, candidato)) return;
            }

            candidatos.push(idCandidato);
        });

        return candidatos;
    }

    private static calcularDistanciaServidor(sala: any, atacante: Jugador, victima: Jugador, distanciaFisica: number): number {
        let distancia = distanciaFisica;

        let miraAtacante = atacante.equipamiento.get("mira");
        if (miraAtacante) distancia -= (miraAtacante.nombre === "Monoaldea Pro" ? 2 : 1);

        let mustangVictima = victima.equipamiento.get("mustang");
        if (mustangVictima) distancia += (mustangVictima.nombre === "Caballo Pro" ? 2 : 1);

        if (victima.number.has("jetpackCat")) distancia += victima.number.get("jetpackCat");
        if (atacante.modificarAlcance) distancia -= atacante.modificarAlcance;
        if (victima.modificarDistancia) distancia += victima.modificarDistancia;
        if (atacante.number.get("pedroCrecimiento")) distancia -= atacante.number.get("pedroCrecimiento");
        if (atacante.string.get("angryBird") === "chuck") distancia -= 3;
        if (atacante.string.get("angryBird") === "blue") distancia -= 2;

        const i = Utilidades.contarCartasPorNombre(atacante, "Anillo de iridio");
        if (i > 0) distancia -= 3 * i;

        let pasivaAtacante = sala.gestorPersonajes.obtener(atacante.personaje);
        if (pasivaAtacante && pasivaAtacante.modificarDistancia) {
            distancia = pasivaAtacante.modificarDistancia(sala, atacante, victima, distancia);
        }

        let pasivaVictima = sala.gestorPersonajes.obtener(victima.personaje);
        if (pasivaVictima && pasivaVictima.modificarDistancia) {
            distancia = pasivaVictima.modificarDistancia(sala, atacante, victima, distancia);
        }

        return Math.max(0, distancia);
    }
}