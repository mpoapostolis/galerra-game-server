import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { GalleryRoom } from "./rooms/GalleryRoom";

export default config({

    initializeGameServer: (gameServer) => {
        gameServer.define('gallery', GalleryRoom)
            .filterBy(['galleryId']);
    },

    initializeExpress: async (app) => {

        // Health check
        app.get("/health", (_req, res) => {
            res.json({ status: "ok", uptime: process.uptime() });
        });

        // Playground (dev only)
        if (process.env.NODE_ENV !== "production") {
            const { playground } = await import("@colyseus/playground");
            app.use("/", playground);
        }

        // Monitor (password protected)
        const basicAuth = (req: any, res: any, next: any) => {
            const auth = req.headers.authorization;
            if (!auth) {
                res.setHeader('WWW-Authenticate', 'Basic realm="Monitor"');
                return res.status(401).send('Auth required');
            }

            const [scheme, credentials] = auth.split(' ');
            if (scheme !== 'Basic') return res.status(401).send('Bad scheme');

            const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
            if (
                username === (process.env.MONITOR_USERNAME || 'admin') &&
                process.env.MONITOR_PASSWORD &&
                password === process.env.MONITOR_PASSWORD
            ) {
                return next();
            }

            res.setHeader('WWW-Authenticate', 'Basic realm="Monitor"');
            return res.status(401).send('Bad credentials');
        };

        app.use("/colyseus", basicAuth, monitor());
    },

    beforeListen: () => {
        console.log(`[SERVER] Galerra game server starting (NODE_ENV=${process.env.NODE_ENV || "development"})`);
    }
});
