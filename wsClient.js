// wsClient.js - handles game websocket + UI updates

const BACKEND = "https://town-of-shadows-server.onrender.com"; // update if backend changes
let ws = null;
let mySlot = null;
let myName = "";
let myRole = "";
let roomId = null;
let phase = "";
let playerMap = {};

async function createRoom() {
  const name = document.getElementById("playerName").value || "Host";
  const res = await fetch(`${BACKEND}/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_name: name }),
  });
  const data = await res.json();
  roomId = data.roomId;
  joinRoom(roomId);
}

async function joinRoom(id = null) {
  roomId = id || document.getElementById("roomId").value;
  myName = document.getElementById("playerName").value || "Player";
  const res = await fetch(`${BACKEND}/join-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, name: myName }),
  });
  const data = await res.json();
  mySlot = data.slot;
  myRole = data.role;
  document.getElementById("connect").style.display = "none";
  document.getElementById("gameplay").style.display = "block";
  document.getElementById("statusText").innerText = `Room: ${roomId} | Role: ${myRole}`;
  openWS();
}

function openWS() {
  ws = new WebSocket(`${BACKEND.replace("https", "wss")}/ws/${roomId}`);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    handleMsg(msg);
  };
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "identify", slot: mySlot }));
  };
}

function sendChat() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  ws.send(JSON.stringify({ type: "chat", from: myName, text }));
  input.value = "";
}

function startGame() {
  ws.send(JSON.stringify({ type: "start_game" }));
}

function handleMsg(msg) {
  const chatBox = document.getElementById("chatBox");
  if (msg.type === "system") {
    chatBox.innerHTML += `<div style="color:#ff8;">${msg.text}</div>`;
  }
  if (msg.type === "chat") {
    const c = msg.channel === "mafia" ? "#f44" : msg.channel === "cult" ? "#4f4" : "#ccc";
    chatBox.innerHTML += `<div style="color:${c}"><b>${msg.from}:</b> ${msg.text}</div>`;
  }
  if (msg.type === "phase") {
    phase = msg.phase;
    document.getElementById("phaseText").innerText = `🕒 ${msg.phase} (${msg.seconds}s)`;
  }
  if (msg.type === "private_role") {
    myRole = msg.role;
    document.getElementById("statusText").innerText = `Room: ${roomId} | Role: ${myRole}`;
  }
  if (msg.type === "room") updateGrid(msg.room.players);
  if (msg.type === "tutorial" && msg.show) showTutorial();
  if (msg.type === "faction_mates") showFaction(msg.mates);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateGrid(players) {
  const grid = document.getElementById("playerGrid");
  grid.innerHTML = "";
  players.forEach((p) => {
    const div = document.createElement("div");
    div.className = "player";
    if (!p.alive) div.classList.add("dead");
    let inner = `#${p.slot} ${p.name}`;
    if (p.revealed && p.role) inner += `<br><small>${p.role}</small>`;
    div.innerHTML = inner;
    grid.appendChild(div);
    playerMap[p.slot] = p.name;
  });
}

function showTutorial() {
  document.getElementById("tutorialPopup").style.display = "block";
}
function closeTutorial() {
  document.getElementById("tutorialPopup").style.display = "none";
}

function showRules() {
  document.getElementById("rulesPopup").style.display = "block";
}
function closeRules() {
  document.getElementById("rulesPopup").style.display = "none";
}

function showFaction(mates) {
  const chatBox = document.getElementById("chatBox");
  if (!mates || mates.length === 0) return;
  let text = "Faction Mates:\n" + mates.map(m => `#${m.slot} ${m.name} (${m.role})`).join(", ");
  chatBox.innerHTML += `<div style="color:#6ff;">${text}</div>`;
}
