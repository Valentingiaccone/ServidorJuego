import type { IMyRoom } from "./IMyRoom.js";
import type { Jugador } from "./schema/MyRoomState.js";

export class GestorMusica {
    private musicaNormal: boolean = true;
    private banderaPrimerMuerto: boolean = true;

    constructor(private sala: IMyRoom) {}

    public sortearEstiloParaPartida(): void {
        this.musicaNormal = Math.random() < 0.5;
        this.banderaPrimerMuerto = true;
    }

    public reproducirSeleccionPersonaje(): void {
        if (this.sala.state.estadoJuego === "Terminado") return;
        this.sala.broadcast("musica", "seleccionDePersonaje");
    }

    public reproducirEvento(pista: string): void {
        if (this.sala.state.estadoJuego === "Terminado") return;
        this.sala.broadcast("musica", pista);
    }

    public reproducirFin(): void {
        this.sala.broadcast("musica", "fin");
    }

    public actualizarAutomatica(): void {
        if (this.sala.state.estadoJuego !== "Jugando") return;

        let totalVivos = 0;
        let totalMuertos = 0;

        this.sala.state.jugadores.forEach((j: Jugador) => {
            if (j.esNpc) return;
            if (j.estaVivo) totalVivos++;
            else totalMuertos++;
        });

        const sufijo = this.musicaNormal ? "" : "_V2";

        if (totalMuertos === 0) {
            this.sala.broadcast("musica", "juego" + sufijo);
            return;
        }

        if (totalMuertos === 1 && this.banderaPrimerMuerto) {
            this.banderaPrimerMuerto = false;
            this.sala.broadcast("musica", "musicaPrimerMuerto" + sufijo);
            return;
        }

        if (totalVivos > 5) {
            this.sala.broadcast("musica", "juego" + sufijo);
        } else if (totalVivos >= 2) {
            this.sala.broadcast("musica", `juegoQuedan${totalVivos}${sufijo}`);
        }
    }
}