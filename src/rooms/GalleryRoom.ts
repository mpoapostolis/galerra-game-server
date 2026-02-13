import { Room, Client } from "@colyseus/core";
import { Schema } from "@colyseus/schema";

// Minimal empty state (Colyseus requires one)
class EmptyState extends Schema {}

interface MoveData {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

interface SignalData {
  target: string;
  type: "offer" | "answer" | "ice";
  payload: string;
}

interface JoinOptions {
  galleryId?: string;
  userId?: string;
  name?: string;
  characterPath?: string;
  characterFile?: string;
}

interface PlayerInfo {
  sessionId: string;
  name: string;
  characterPath: string;
  characterFile: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export class GalleryRoom extends Room<EmptyState> {
  maxClients = 50;
  autoDispose = true;
  patchRate = 0; // Disable state patching entirely — we only use messages

  private playerData = new Map<string, PlayerInfo>();
  private playerUserIds = new Map<string, string>(); // sessionId -> userId

  // Signal rate limiting
  private signalRateLimit = 50;
  private signalRateLimitInterval = 1000;
  private clientSignalCounts = new Map<string, number[]>();

  onCreate(options: any) {
    this.setState(new EmptyState());

    if (options.galleryId) {
      this.roomId = options.galleryId;
    }

    // --- Position: broadcast to all others ---
    this.onMessage("move", (client, data: MoveData) => {
      const info = this.playerData.get(client.sessionId);
      if (!info) return;

      if (
        typeof data.x !== "number" || typeof data.y !== "number" ||
        typeof data.z !== "number" || typeof data.rotation !== "number" ||
        !Number.isFinite(data.x) || !Number.isFinite(data.y) ||
        !Number.isFinite(data.z) || !Number.isFinite(data.rotation)
      ) return;

      info.x = data.x;
      info.y = data.y;
      info.z = data.z;
      info.rotation = data.rotation;

      this.broadcast("player-moved", {
        sessionId: client.sessionId,
        x: data.x, y: data.y, z: data.z,
        rotation: data.rotation,
      }, { except: client });
    });

    // --- Character change ---
    this.onMessage("character", (client, data: { characterPath?: string; characterFile?: string }) => {
      const info = this.playerData.get(client.sessionId);
      if (!info) return;

      if (data.characterPath && typeof data.characterPath === "string" && !data.characterPath.includes("..")) {
        info.characterPath = data.characterPath;
      }
      if (data.characterFile && typeof data.characterFile === "string" &&
        (data.characterFile.endsWith(".glb") || data.characterFile.endsWith(".gltf"))) {
        info.characterFile = data.characterFile;
      }

      this.broadcast("player-character", {
        sessionId: client.sessionId,
        characterPath: info.characterPath,
        characterFile: info.characterFile,
      }, { except: client });
    });

    // --- WebRTC signal relay ---
    this.onMessage("signal", (client, data: SignalData) => {
      if (!data.target || !data.type || !data.payload) return;
      if (!["offer", "answer", "ice"].includes(data.type)) return;

      const now = Date.now();
      const counts = this.clientSignalCounts.get(client.sessionId) || [];
      const recent = counts.filter((ts) => now - ts < this.signalRateLimitInterval);
      if (recent.length >= this.signalRateLimit) return;
      recent.push(now);
      this.clientSignalCounts.set(client.sessionId, recent);

      const targetClient = this.clients.find((c) => c.sessionId === data.target);
      if (!targetClient) return;

      targetClient.send("signal", {
        from: client.sessionId,
        type: data.type,
        payload: data.payload,
      });
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`[JOIN] ${client.sessionId} joining room ${this.roomId}`);

    // Kick duplicate userId sessions
    if (options.userId) {
      this.playerUserIds.forEach((uid, sid) => {
        if (uid === options.userId && sid !== client.sessionId) {
          console.log(`[JOIN] Evicting duplicate userId ${uid} session ${sid}`);
          const old = this.clients.find((c) => c.sessionId === sid);
          if (old) old.leave(4000);
          else this.removePlayer(sid);
        }
      });
    }

    const name = options.name || "Guest " + client.sessionId.slice(0, 4);
    const info: PlayerInfo = {
      sessionId: client.sessionId,
      name,
      characterPath: options.characterPath || "/models/characters/",
      characterFile: options.characterFile || "worker.glb",
      x: 0, y: 0, z: 0, rotation: 0,
    };

    this.playerData.set(client.sessionId, info);
    if (options.userId) this.playerUserIds.set(client.sessionId, options.userId);

    // Send snapshot of existing players to the new client
    const existing: PlayerInfo[] = [];
    this.playerData.forEach((p, sid) => {
      if (sid !== client.sessionId) existing.push(p);
    });
    client.send("room-state", { players: existing });

    // Tell everyone else
    this.broadcast("player-joined", info, { except: client });

    console.log(`[JOIN] ${name} joined (${this.playerData.size} players)`);
  }

  private removePlayer(sessionId: string) {
    this.playerData.delete(sessionId);
    this.playerUserIds.delete(sessionId);
    this.clientSignalCounts.delete(sessionId);
  }

  onLeave(client: Client, consented: boolean) {
    const info = this.playerData.get(client.sessionId);
    console.log(`[LEAVE] ${info?.name || "?"} (${client.sessionId})${consented ? "" : " disconnected"}`);
    this.removePlayer(client.sessionId);
    this.broadcast("player-left", { sessionId: client.sessionId });
  }

  onDispose() {
    console.log(`[DISPOSE] Room ${this.roomId}`);
    this.playerData.clear();
    this.playerUserIds.clear();
    this.clientSignalCounts.clear();
  }
}
