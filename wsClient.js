// wsClient.js – Town of Shadows frontend connection

const BACKEND = "https://town-of-shadows-server.onrender.com";
const ROOM_ID = "A11368"; // or whichever room you’re using
let ws;
let mySlot = null;

// connect to WebSocket
function connectWS() {
  const wsUrl = BACKEND.replace("https", "wss") + `/ws/${ROOM_ID}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to WS");
    document.getElementById("connection").innerText = "🟢 Connected to backend";
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("WS:", msg);

    // 🔹 handle role assignment popup
    if (msg.type === "private_role") {
      const roleText = msg.role || "Unknown";
      const explain = msg.explain ? "\n" + msg.explain : "";
      alert(`Your role: ${roleText}${explain}`);
      return;
    }

    // 🔹 system messages
    if (msg.type === "system") {
      appendChat("🌀", msg.text);
      return;
    }

    // 🔹 chat messages
    if (msg.type === "chat") {
      appendChat(msg.from, msg.text);
      return;
    }

    // 🔹 phase updates
    if (msg.type === "phase") {
      const phaseBox = document.getElementById("phase");
      if (phaseBox) {
        phaseBox.innerText = `${msg.phase} (${msg.seconds}s)`;
      }
      return;
    }

    // 🔹 room updates (grid refresh)
    if (msg.type === "room") {
      const grid = document.getElementById("playerGrid");
      if (grid) renderGrid(msg.room.players);
      return;
    }
  };

  ws.onclose = () => {
    document.getElementById("connection").innerText = "🔴 Disconnected (retrying...)";
    setTimeout(connectWS, 4000);
  };
}

function identify(slot) {
  mySlot = slot;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "identify", slot }));
  }
}

function sendChat(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "chat", from: `Player ${mySlot}`, text }));
}

function appendChat(from, text) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  const div = document.createElement("div");
  div.textContent = `${from}: ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderGrid(players) {
  const grid = document.getElementById("playerGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.textAlign = "center";

  let row;
  players.forEach((p, i) => {
    if (i % 5 === 0) {
      row = document.createElement("tr");
      table.appendChild(row);
    }
    const cell = document.createElement("td");
    cell.style.border = "1px solid #555";
    cell.style.padding = "6px";
    cell.style.minWidth = "70px";
    cell.style.backgroundColor = p.alive ? "#2a2a2a" : "#5a1a1a";
    cell.style.color = "#fff";
    cell.textContent = `${p.name}\n${p.alive ? "" : "(dead)"}`;
    row.appendChild(cell);
  });
  grid.appendChild(table);
}

async function startGame() {
  try {
    const res = await fetch(`${BACKEND}/start-game/${ROOM_ID}`, { method: "POST" });
    const data = await res.json();
    console.log("Game started:", data);
  } catch (e) {
    console.error("Start failed:", e);
  }
}

// 🟢 auto connect
window.addEventListener("DOMContentLoaded", () => {
  connectWS();

  const sendBtn = document.getElementById("sendBtn");
  const chatInput = document.getElementById("chatInput");
  if (sendBtn && chatInput) {
    sendBtn.onclick = () => {
      if (chatInput.value.trim()) {
        sendChat(chatInput.value.trim());
        chatInput.value = "";
      }
    };
  }

  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.onclick = () => startGame();
  }
});
