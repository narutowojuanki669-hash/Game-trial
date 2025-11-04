// wsClient.js
// --- Town of Shadows WebSocket Frontend Client ---
// Works with backend at https://town-of-shadows-server.onrender.com

const BACKEND_WS = "wss://town-of-shadows-server.onrender.com/ws";

export class TownOfShadowsWS {
  constructor(roomId, playerName = "Player") {
    this.roomId = roomId;
    this.playerName = playerName;
    this.ws = null;
    this.onMessage = null;
    this.onSystem = null;
    this.onRoomUpdate = null;
    this.onChat = null;
  }

  connect() {
    this.ws = new WebSocket(`${BACKEND_WS}/${this.roomId}`);
    this.ws.onopen = () => {
      console.log(`✅ Connected to room ${this.roomId}`);
      this.send({ type: "join", name: this.playerName });
    };
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("📩 Message:", msg);

      if (msg.type === "system") {
        this.onSystem && this.onSystem(msg.text);
      } else if (msg.type === "room") {
        this.onRoomUpdate && this.onRoomUpdate(msg.room);
      } else if (msg.type === "chat") {
        this.onChat && this.onChat(msg.from, msg.text);
      } else {
        this.onMessage && this.onMessage(msg);
      }
    };
    this.ws.onclose = () => console.log("❌ Disconnected");
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendChat(text) {
    this.send({ type: "chat", from: this.playerName, text });
  }
        }
