import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { GalleryRoom } from "./rooms/GalleryRoom";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define "gallery" room
         */
        gameServer.define('gallery', GalleryRoom)
            .filterBy(['galleryId']);

    },

    initializeExpress: async (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://docs.colyseus.io/tools/monitor/#express
         */
        app.get("/hello_world", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        // Add a deployment check
        app.get("/deployment-check", (req, res) => {
            res.send("v2-with-chat-fixed");
        });

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this publicly in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            const { playground } = await import("@colyseus/playground");
            app.use("/", playground);
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#express
         */
        const basicAuth = (req: any, res: any, next: any) => {
            const auth = req.headers.authorization;

            if (!auth) {
                res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
                return res.status(401).send('Authentication required');
            }

            const [scheme, credentials] = auth.split(' ');
            if (scheme !== 'Basic') {
                return res.status(401).send('Invalid authentication scheme');
            }

            const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
            const validUsername = process.env.MONITOR_USERNAME || 'admin';
            const validPassword = process.env.MONITOR_PASSWORD || 'changeme123';

            if (username === validUsername && password === validPassword) {
                return next();
            }

            res.setHeader('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
            return res.status(401).send('Invalid credentials');
        };

        app.use("/colyseus", basicAuth, monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
