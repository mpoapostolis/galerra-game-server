import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotation: number = 0;
  @type("string") name: string = "Guest";
  @type("string") galleryId: string = "";
  @type("string") userId: string = "";
  @type("string") deviceId: string = "";
  @type("string") characterPath: string = "/models/characters/";
  @type("string") characterFile: string = "worker.glb";
}

export class ChatMessage extends Schema {
  @type("string") id: string = "";
  @type("string") senderId: string = "";
  @type("string") senderName: string = "";
  @type("string") message: string = "";
  @type("number") timestamp: number = 0;
}

export class GalleryState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
}
