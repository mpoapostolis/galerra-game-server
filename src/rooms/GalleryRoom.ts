import { Room, Client } from "@colyseus/core";
import { GalleryState, Player, ChatMessage } from "./schema/GalleryState";

interface MoveData {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

interface CharacterData {
  path?: string;
  file?: string;
}

interface JoinOptions {
  galleryId?: string;
  userId?: string;
  deviceId?: string;
  name?: string;
  characterPath?: string;
  characterFile?: string;
}

export class GalleryRoom extends Room<GalleryState> {
  maxClients = 50;
  maxChatMessages = 100; // Keep last 100 messages to prevent memory issues
  maxMessageLength = 500; // Max characters per message
  chatRateLimit = 3; // Max messages per interval
  chatRateLimitInterval = 1000; // 1 second
  private clientMessageCounts = new Map<string, number[]>(); // Track message timestamps per client

  onCreate(options: any) {
    this.setState(new GalleryState());

    if (options.galleryId) {
      this.roomId = options.galleryId;
    }

    this.onMessage("move", (client, data: MoveData) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          console.warn(`[MOVE] Player not found: ${client.sessionId}`);
          return;
        }

        // Validate numbers (prevent NaN, Infinity, etc.)
        if (
          typeof data.x !== "number" ||
          typeof data.y !== "number" ||
          typeof data.z !== "number" ||
          typeof data.rotation !== "number" ||
          !Number.isFinite(data.x) ||
          !Number.isFinite(data.y) ||
          !Number.isFinite(data.z) ||
          !Number.isFinite(data.rotation)
        ) {
          console.warn(
            `[MOVE] Invalid coordinates from ${client.sessionId}:`,
            data,
          );
          return;
        }

        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.rotation = data.rotation;
      } catch (error) {
        console.error(
          `[MOVE] Error handling move from ${client.sessionId}:`,
          error,
        );
      }
    });

    this.onMessage("character", (client, data: CharacterData) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) {
          console.warn(`[CHARACTER] Player not found: ${client.sessionId}`);
          return;
        }

        // Validate and sanitize character path (prevent path traversal)
        if (data.path !== undefined) {
          if (typeof data.path !== "string") {
            console.warn(
              `[CHARACTER] Invalid path type from ${client.sessionId}`,
            );
            return;
          }

          // Prevent path traversal attacks
          if (data.path.includes("..") || data.path.includes("~")) {
            console.warn(
              `[CHARACTER] Potential path traversal attempt from ${client.sessionId}: ${data.path}`,
            );
            return;
          }

          player.characterPath = data.path;
        }

        // Validate character file
        if (data.file !== undefined) {
          if (typeof data.file !== "string") {
            console.warn(
              `[CHARACTER] Invalid file type from ${client.sessionId}`,
            );
            return;
          }

          // Basic file extension validation
          if (!data.file.endsWith(".glb") && !data.file.endsWith(".gltf")) {
            console.warn(
              `[CHARACTER] Invalid file extension from ${client.sessionId}: ${data.file}`,
            );
            return;
          }

          player.characterFile = data.file;
        }

        console.log(
          `[CHARACTER] ${player.name} updated character: path=${player.characterPath}, file=${player.characterFile}`,
        );
      } catch (error) {
        console.error(
          `[CHARACTER] Error handling character update from ${client.sessionId}:`,
          error,
        );
      }
    });

    this.onMessage("chat", (client, message: string) => {
      try {
        // Validate message
        if (!message || typeof message !== "string") {
          console.warn(
            `[CHAT] Invalid message type from ${client.sessionId}`,
          );
          return;
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length === 0) {
          return; // Ignore empty messages
        }

        if (trimmedMessage.length > this.maxMessageLength) {
          console.warn(
            `[CHAT] Message too long from ${client.sessionId}: ${trimmedMessage.length} chars (max: ${this.maxMessageLength})`,
          );
          return;
        }

        // Rate limiting
        const now = Date.now();
        const clientMessages = this.clientMessageCounts.get(client.sessionId) || [];

        // Remove old timestamps outside the rate limit window
        const recentMessages = clientMessages.filter(
          (ts) => now - ts < this.chatRateLimitInterval,
        );

        if (recentMessages.length >= this.chatRateLimit) {
          console.warn(
            `[CHAT] Rate limit exceeded for ${client.sessionId} (${recentMessages.length} msgs in ${this.chatRateLimitInterval}ms)`,
          );
          return;
        }

        recentMessages.push(now);
        this.clientMessageCounts.set(client.sessionId, recentMessages);

        const player = this.state.players.get(client.sessionId);
        const name = player?.name || "Guest";
        const timestamp = now;

        // Create and store chat message in state
        const chatMessage = new ChatMessage();
        chatMessage.id = `${client.sessionId}-${timestamp}`;
        chatMessage.senderId = client.sessionId;
        chatMessage.senderName = name;
        chatMessage.message = trimmedMessage;
        chatMessage.timestamp = timestamp;

        this.state.chatMessages.push(chatMessage);

        // Trim old messages if we exceed the limit
        if (this.state.chatMessages.length > this.maxChatMessages) {
          const removed = this.state.chatMessages.splice(
            0,
            this.state.chatMessages.length - this.maxChatMessages,
          );
          console.log(
            `[CHAT] Trimmed ${removed.length} old messages (keeping last ${this.maxChatMessages})`,
          );
        }

        // Log the chat message
        console.log(
          `[CHAT] Room: ${this.roomId} | User: ${name} (${client.sessionId}) | Message: "${trimmedMessage}"`,
        );

        // Broadcast chat message to all clients
        this.broadcast("chat", {
          id: chatMessage.id,
          senderId: client.sessionId,
          senderName: name,
          message: trimmedMessage,
          timestamp: timestamp,
        });
      } catch (error) {
        console.error(
          `[CHAT] Error handling message from ${client.sessionId}:`,
          error,
        );
      }
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`[JOIN] ${client.sessionId} joining room ${this.roomId}`);

    // Enforce Single Session per User OR Device
    const joiningUserId = options.userId;
    const joiningDeviceId = options.deviceId;

    this.state.players.forEach((p, sessionId) => {
      let isDuplicate = false;

      if (joiningUserId && p.userId === joiningUserId) isDuplicate = true;
      if (joiningDeviceId && p.deviceId === joiningDeviceId) isDuplicate = true;

      if (isDuplicate && sessionId !== client.sessionId) {
        console.log(
          `Duplicate session detected (User: ${joiningUserId}, Device: ${joiningDeviceId}). Removing old session ${sessionId}.`,
        );
        const oldClient = this.clients.find((c) => c.sessionId === sessionId);
        if (oldClient) {
          oldClient.leave(4000); // 4000 = Replaced
        } else {
          this.state.players.delete(sessionId);
        }
      }
    });

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

    // Assign userId if provided
    if (options.userId) {
      player.userId = options.userId;
    }
    // Assign deviceId if provided
    if (options.deviceId) {
      player.deviceId = options.deviceId;
    }

    // Assign character if provided
    if (options.characterPath) {
      player.characterPath = options.characterPath;
    }
    if (options.characterFile) {
      player.characterFile = options.characterFile;
    }

    // Assign name if provided
    if (options.name) {
      player.name = options.name;
    } else {
      player.name = "Guest " + client.sessionId.slice(0, 4);
    }

    this.state.players.set(client.sessionId, player);

    console.log(
      `[JOIN] Player joined successfully: ${player.name} (userId: ${player.userId || "none"}, deviceId: ${player.deviceId || "none"})`,
    );
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const playerName = player?.name || "Unknown";

    console.log(
      `[LEAVE] ${playerName} (${client.sessionId}) left${consented ? " (consented)" : " (disconnected)"}`,
    );

    // Clean up player state
    this.state.players.delete(client.sessionId);

    // Clean up rate limit tracking
    this.clientMessageCounts.delete(client.sessionId);
  }

  onDispose() {
    console.log(
      `[DISPOSE] Room ${this.roomId} disposing (${this.state.players.size} players, ${this.state.chatMessages.length} messages)`,
    );

    // Clean up all rate limit tracking
    this.clientMessageCounts.clear();
  }
}
