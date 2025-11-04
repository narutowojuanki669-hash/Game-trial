// wsClient.js
// Town of Shadows WebSocket client

const BACKEND_WS_BASE = "wss://town-of-shadows-server.onrender.com/ws";

export class TownOfShadowsWS {
  constructor(roomId, playerName = "Player") {
    this.roomId = roomId;
    this.playerName = playerName;
    this.ws = null;
    this.onMessage = null;
    this.onSystem = null;
    this.onRoomUpdate = null;
    this.onChat = null;
    this.onPrivateRole = null;
  }

  connect() {
    this.ws = new WebSocket(`${BACKEND_WS_BASE}/${this.roomId}`);
    this.ws.onopen = () => {
      console.log("✅ WS connected");
      // attempt to claim a slot via join message (server assigns a bot slot to this client)
      this.send({ type: "join", name: this.playerName });
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "system") {
        this.onSystem && this.onSystem(msg.text);
      } else if (msg.type === "room" || msg.type === "room_info") {
        this.onRoomUpdate && this.onRoomUpdate(msg.room);
      } else if (msg.type === "chat") {
        this.onChat && this.onChat(msg.from, msg.text);
      } else if (msg.type === "private_role") {
        this.onPrivateRole && this.onPrivateRole(msg);
      } else {
        this.onMessage && this.onMessage(msg);
      }
    };
    this.ws.onclose = () => console.log("❌ WS closed");
    this.ws.onerror = (e) => console.error("WS error", e);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    } else {
      console.warn("WS not open yet");
    }
  }

  sendChat(text) {
    this.send({ type: "chat", from: this.playerName, text });
  }

  // role actions: actor (your name), target (player name), type (action string)
  queueAction(actor, target, type) {
    this.send({ type: "player_action", action: { actor, target, type } });
  }

  startGame() {
    this.send({ type: "start_game", roomId: this.roomId });
  }

  vote(slot, targetName) {
    this.send({ type: "vote", slot, target: targetName });
  }
    }
