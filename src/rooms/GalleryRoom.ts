import { Room, Client } from "@colyseus/core";
import { GalleryState, Player } from "./schema/GalleryState";

export class GalleryRoom extends Room<GalleryState> {
    maxClients = 16; // Support reasonable lobby size

    onCreate(options: any) {
        // "create room with that id" -> Explicitly set roomId to the galleryId if provided
        if (options.galleryId) {
            this.roomId = options.galleryId;
        }

        this.setState(new GalleryState());

        // Handle movement updates from client
        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;
                player.rotation = data.rotation;
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        // Create player instance for this client
        const player = new Player();

        // If options provided, set initial position (optional)
        if (options.x) player.x = options.x;
        if (options.y) player.y = options.y;
        if (options.z) player.z = options.z;
        if (options.rotation) player.rotation = options.rotation;

        this.state.players.set(client.sessionId, player);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
