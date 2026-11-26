import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint
} from "colyseus";
import cors from "cors";

import { MyRoom } from "./rooms/MyRoom.js";
import { GestorPersonajes } from "./rooms/Personajes.js";
import { CatalogoCartasEspeciales } from "./rooms/CatalogoCartasEspeciales.js";

const gestorPersonajesWiki = new GestorPersonajes();

function construirDatosWiki() {
    const personajes = gestorPersonajesWiki.obtenerTodosParaRepartir().map((p) => ({
        nombre: p.nombre,
        nombreMostrar: p.nombreMostrar ?? p.nombre,
        habilidad: p.habilidad,
        sfxDefault: p.sfxDefault ?? "sfxMensaje",
        spriteFueraDeJuego: p.spriteFueraDeJuego === true
    }));

    const npcs = gestorPersonajesWiki.obtenerTodosLosNpc().map((p) => ({
        nombre: p.nombre,
        nombreMostrar: p.nombreMostrar ?? p.nombre,
        habilidad: p.habilidad,
        sfxDefault: p.sfxDefault ?? "sfxMensaje",
        spriteFueraDeJuego: p.spriteFueraDeJuego === true
    }));

    const cartas = CatalogoCartasEspeciales.obtenerTodasLasCartas().map((c) => ({
        nombre: c.nombre,
        descripcion: c.descripcion
    }));

    return { personajes, npcs, cartas };
}

const server = defineServer({
    rooms: {
        my_room: defineRoom(MyRoom)
        // A futuro, cuando agregues el modo de un jugador:
        // aventura: defineRoom(AventuraRoom)
    },

    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET" }, async () => {
            return { message: "Hello World" };
        })
    }),

    express: (app) => {
        app.use(cors());

        app.get("/hi", (_req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        // Endpoint REST de la Wiki: 1 sola petición HTTP sin abrir sala WebSocket
        app.get("/api/wiki", (_req, res) => {
            res.json(construirDatosWiki());
        });

        app.use("/monitor", monitor());

        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }
});

export default server;