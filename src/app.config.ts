import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { GalleryRoom } from "./rooms/GalleryRoom";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define "gallery" room
         */
        gameServer.define('gallery', GalleryRoom)
            .filterBy(['galleryId']);

    },

    initializeExpress: (app) => {
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
            app.use("/", playground);
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#express
         */
        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
