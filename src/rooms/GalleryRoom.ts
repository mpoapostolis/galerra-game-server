import { Room, Client } from "@colyseus/core";
import { GalleryState, Player } from "./schema/GalleryState";

export class GalleryRoom extends Room<GalleryState> {
    maxClients = 50;

    onCreate(options: any) {
        this.setState(new GalleryState());

        if (options.galleryId) {
            this.roomId = options.galleryId;
        }

        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.z = data.z;
                player.rotation = data.rotation;
            }
        });

        this.onMessage("chat", (client, message) => {
            // Broadcast chat message to all clients in the room
            // synchronizing by sending it back to everyone
            const player = this.state.players.get(client.sessionId);
            const name = player?.name || "Guest";

            this.broadcast("chat", {
                senderId: client.sessionId,
                senderName: name,
                message: message,
                timestamp: Date.now()
            });
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        const player = new Player();

        // Initial position
        player.x = 0;
        player.y = 0;
        player.z = 0;
        player.rotation = 0;

        // Assign galleryId if provided
        if (options.galleryId) {
            player.galleryId = options.galleryId;
        }

        // Assign name if provided
        if (options.name) {
            player.name = options.name;
        } else {
            player.name = "Guest " + client.sessionId.slice(0, 4);
        }

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
