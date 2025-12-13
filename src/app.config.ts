import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";

/**
 * Import your Room files
 */
import { GalleryRoom } from "./rooms/GalleryRoom";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        // Register the gallery room
        // Enable per-gallery rooms by filtering by galleryId
        gameServer.define('gallery', GalleryRoom).filterBy(['galleryId']);

    },

    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        app.get("/hello_world", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        // Playground removed as requested

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
