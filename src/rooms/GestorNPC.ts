import type { ClienteJuego, IMyRoom } from "./IMyRoom.js";
import type { Carta, Jugador, OpcionInteraccion } from "./schema/MyRoomState.js";

export class GestorNPC {
    public static crearClienteNpc(idNpc: string): ClienteJuego {
        return {
            sessionId: idNpc,
            send: (_tipo: string, _datos?: unknown) => {
                // El NPC ignora alertas personales en silencio
            }
        };
    }

    public static esAliado(
        idNpc: string,
        npc: Jugador,
        idObjetivo: string,
        jugadorObjetivo: Jugador
    ): boolean {
        if (idObjetivo === idNpc) return true;
        if (npc.idDueno !== "") {
            if (idObjetivo === npc.idDueno) return true;
            if (jugadorObjetivo.esNpc && jugadorObjetivo.idDueno === npc.idDueno) return true;
        }
        return false;
    }

    // =========================================================================
    // 1. RESPUESTAS AUTOMÁTICAS (RULETAS, BOTONES Y SELECCIÓN DE CARTAS)
    // =========================================================================

    public static verificarRuletaNpc(sala: IMyRoom): void {
        const idActual = sala.state.jugadorDesenfundando;
        if (!idActual) return;

        const jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        const delay = Math.max(100, 1500 - 100 * sala.getTotalNpc());

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.jugadorDesenfundando === idActual) {
                sala.procesarVoltearCarta(this.crearClienteNpc(idActual));
            }
        }, delay);
    }

    public static verificarInteraccionUniversalNpc(sala: IMyRoom): void {
        const idActual = sala.state.interaccionActiva.idJugadorObjetivo;
        if (!idActual) return;

        const jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        const delay = Math.max(100, 1500 - 100 * sala.getTotalNpc());

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.interaccionActiva.idJugadorObjetivo !== idActual) return;

            const opciones = Array.from(sala.state.interaccionActiva.opciones);
            const opcionElegida = opciones.find((op: OpcionInteraccion) => op.habilitado);

            if (opcionElegida) {
                sala.procesarResponderInteraccion(this.crearClienteNpc(idActual), opcionElegida.idAccion);
            }
        }, delay);
    }

    public static verificarSeleccionCartaNpc(sala: IMyRoom): void {
        const idActual = sala.state.seleccionCartasActiva.idJugadorObjetivo;
        if (!idActual) return;

        const jugador = sala.state.jugadores.get(idActual);
        if (!jugador || !jugador.esNpc || !jugador.estaVivo) return;

        const delay = Math.max(100, 1500 - 100 * sala.getTotalNpc());

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.seleccionCartasActiva.idJugadorObjetivo !== idActual) return;

            const opciones = Array.from(sala.state.seleccionCartasActiva.opciones);
            if (opciones.length > 0) {
                const elegida = opciones[Math.floor(Math.random() * opciones.length)];
                if (elegida) {
                    sala.procesarRespuestaSeleccionCarta(this.crearClienteNpc(idActual), elegida.idRespuesta);
                    return;
                }
            }
            sala.procesarRespuestaSeleccionCarta(this.crearClienteNpc(idActual), "cancelar");
        }, delay);
    }

    // =========================================================================
    // 2. BUCLE PRINCIPAL DEL TURNO DEL NPC (2 PASADAS + DESCARTE + PASAR)
    // =========================================================================

    public static iniciarTurnoNpc(sala: IMyRoom, idNpc: string): void {
        const npc = sala.state.jugadores.get(idNpc);
        if (!npc || !npc.esNpc || !npc.estaVivo) return;

        this.programarPasoTurnoNpc(sala, idNpc, 1, 0);
    }

    private static programarPasoTurnoNpc(
        sala: IMyRoom,
        idNpc: string,
        pasada: number,
        indiceCarta: number
    ): void {
        const totalNpc = sala.getTotalNpc();
        const rango = Math.max(100, 1000 - 60 * totalNpc);
        const minimo = Math.max(100, 500 - 30 * totalNpc);
        const delay = Math.floor(Math.random() * rango) + minimo;

        sala.clock.setTimeout(() => {
            if (sala.state.estadoJuego !== "Jugando") return;
            if (sala.state.turnoActual !== idNpc) return;

            const npc = sala.state.jugadores.get(idNpc);
            if (!npc || !npc.estaVivo) return;

            if (sala.juegoPausado()) {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta);
                return;
            }

            if (indiceCarta >= npc.mano.length) {
                if (pasada === 1) {
                    this.programarPasoTurnoNpc(sala, idNpc, 2, 0);
                } else {
                    this.finalizarTurnoNpc(sala, idNpc, npc);
                }
                return;
            }

            const carta = npc.mano[indiceCarta];
            if (!carta) {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, 0);
                return;
            }

            const seJugo = this.intentarJugarCarta(sala, idNpc, npc, carta);

            if (seJugo) {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta);
            } else {
                this.programarPasoTurnoNpc(sala, idNpc, pasada, indiceCarta + 1);
            }
        }, delay);
    }

    private static finalizarTurnoNpc(sala: IMyRoom, idNpc: string, npc: Jugador): void {
        const clienteNpc = this.crearClienteNpc(idNpc);
        let frenoSeguridad = 50;

        while (frenoSeguridad > 0) {
            if (!npc.estaVivo || sala.state.turnoActual !== idNpc || npc.mano.length === 0 || sala.juegoPausado()) {
                break;
            }

            const modificacion = sala.motorEventos.sumar(
                npc,
                "modificarCartasEnManoAlPasarTurno",
                npc
            );
            const limiteManoActual = Math.max(0, npc.vidas + modificacion);

            if (npc.mano.length <= limiteManoActual) {
                break;
            }

            frenoSeguridad--;
            const idxRandom = Math.floor(Math.random() * npc.mano.length);
            const cartaADescartar = npc.mano[idxRandom];
            if (cartaADescartar) {
                sala.procesarDescartarCarta(clienteNpc, cartaADescartar.id);
            }
        }

        if (npc.estaVivo && sala.state.turnoActual === idNpc && !sala.juegoPausado()) {
            sala.procesarPasarTurno(clienteNpc);
        } else if (npc.estaVivo && sala.state.turnoActual === idNpc && sala.juegoPausado()) {
            // Si un descarte abrió una ruleta o interacción, reintentamos pasar cuando se destrabe
            this.programarPasoTurnoNpc(sala, idNpc, 2, npc.mano.length);
        }
    }

    // =========================================================================
    // 3. SELECCIÓN DE CARTAS Y OBJETIVOS (USA SistemaCombate COMO ÚNICA FUENTE)
    // =========================================================================

    private static intentarJugarCarta(
        sala: IMyRoom,
        idNpc: string,
        npc: Jugador,
        carta: Carta
    ): boolean {
        if (carta.tipoDeUso === "oculto") return false;

        const def = sala.sistemaCartas.obtener(carta.nombre);
        if (!def) return false;

        const clienteNpc = this.crearClienteNpc(idNpc);

        if (def.reglaObjetivo.tipo === "ninguno") {
            return sala.procesarJugarCarta(clienteNpc, carta.id);
        }

        const esBeneficiosa = def.reglaObjetivo.esBeneficiosa === true;
        const validos = sala.sistemaCombate.obtenerObjetivosValidos(idNpc, carta);

        const candidatos = validos.filter((idCand: string) => {
            const cand = sala.state.jugadores.get(idCand);
            if (!cand || !cand.estaVivo) return false;

            if (esBeneficiosa) {
                return true;
            }
            // Jamás ataca a sí mismo, a su dueño ni a otros NPCs aliados
            return !this.esAliado(idNpc, npc, idCand, cand);
        });

        if (candidatos.length === 0) return false;

        // Si es beneficiosa, prioriza aliados (incluyéndose si aplica)
        let poolFinal = candidatos;
        if (esBeneficiosa) {
            const aliados = candidatos.filter((idCand: string) => {
                const cand = sala.state.jugadores.get(idCand);
                return cand ? this.esAliado(idNpc, npc, idCand, cand) : false;
            });
            if (aliados.length > 0) poolFinal = aliados;
        }

        const idObjetivo = poolFinal[Math.floor(Math.random() * poolFinal.length)];
        return sala.procesarJugarCarta(clienteNpc, carta.id, idObjetivo);
    }
}