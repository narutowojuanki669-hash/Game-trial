// wsClient.js - frontend logic (voting UI, grid roles, phase bar)
// Update BACKEND to your render backend URL (no trailing slash)
const BACKEND = "https://town-of-shadows-server.onrender.com";

let ws = null;
let mySlot = null;
let myName = "";
let myRole = "";
let roomId = null;
let selectedVote = null;
let phaseSeconds = 0;
let phaseTimer = null;
let playersState = [];

function createOrJoin() {
  myName = document.getElementById("playerName").value || "joiboi";
  roomId = document.getElementById("roomId").value || null;
  if (!roomId) {
    // create
    fetch(`${BACKEND}/create-room`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({host_name: myName})
    }).then(r=>r.json()).then(d=>{
      roomId = d.roomId;
      joinRoom();
    });
  } else {
    joinRoom();
  }
}

function joinRoom() {
  fetch(`${BACKEND}/join-room`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({roomId, name: myName})
  }).then(r=>r.json()).then(d=>{
    mySlot = d.slot;
    myRole = d.role;
    document.getElementById("statusLine").innerText = `Room ${roomId} | You: ${myName} (slot ${mySlot})`;
    openWS();
    document.getElementById("connect").style.display = "none";
    document.getElementById("gameArea").style.display = "block";
  }).catch(e=>{
    alert("Join failed");
  });
}

function openWS() {
  ws = new WebSocket(`${BACKEND.replace("https","wss")}/ws/${roomId}`);
  ws.onopen = ()=>{};
  ws.onmessage = (ev)=>{ const msg = JSON.parse(ev.data); handleMsg(msg); };
  ws.onclose = ()=>{ document.getElementById("statusLine").innerText = "Disconnected"; };
}

function handleMsg(msg) {
  if (msg.type === "system") addChat(`⚙️ ${msg.text}`);
  if (msg.type === "chat") addChat(`${msg.from}: ${msg.text}`);
  if (msg.type === "private_role") {
    myRole = msg.role;
    addChat(`🔒 Your role: ${myRole}`);
  }
  if (msg.type === "room") {
    playersState = msg.room.players;
    renderGrid(playersState);
  }
  if (msg.type === "phase") {
    handlePhase(msg.phase, msg.seconds, msg.players || null);
  }
  if (msg.type === "faction_mates") {
    // show faction mates roles on grid by marking playersState
    applyFactionDisplay(msg.mates);
  }
  if (msg.type === "tutorial" && msg.show) {
    alert("Tutorial: Read the rules before playing.");
  }
}

function addChat(text) {
  const cb = document.getElementById("chatBox");
  cb.innerHTML += `<div>${text}</div>`;
  cb.scrollTop = cb.scrollHeight;
}

function renderGrid(players) {
  const grid = document.getElementById("playerGrid");
  grid.innerHTML = "";
  players.forEach(p=>{
    const el = document.createElement("div");
    el.className = "player" + (p.alive ? "" : " dead");
    el.id = "player-"+p.slot;
    let html = `<div>#${p.slot}</div><div>${p.name}</div>`;
    if (p.revealed && p.role) {
      html += `<div class="role">${p.role}</div>`;
    } else {
      // if we know faction-mate role was supplied earlier, show it
      if (p._visibleRole) html += `<div class="role">${p._visibleRole}</div>`;
    }
    el.innerHTML = html;
    el.onclick = ()=> onPlayerClick(p.slot);
    grid.appendChild(el);
  });
}

function applyFactionDisplay(mates) {
  // mates: [{slot, role, name, alive}]
  mates.forEach(m=>{
    const p = playersState.find(x=>x.slot===m.slot);
    if (p) {
      p._visibleRole = m.role;
    }
  });
  renderGrid(playersState);
}

function onPlayerClick(slot) {
  const btn = document.getElementById("player-"+slot);
  if (!btn) return;
  // only allow selecting alive players
  const p = playersState.find(x=>x.slot===slot);
  if (!p || !p.alive) return;
  // select/deselect
  if (selectedVote === slot) {
    selectedVote = null;
    btn.classList.remove("selected");
    document.getElementById("voteMsg").innerText = "No vote selected";
  } else {
    // clear previous
    if (selectedVote) {
      const prev = document.getElementById("player-"+selectedVote);
      if (prev) prev.classList.remove("selected");
    }
    selectedVote = slot;
    btn.classList.add("selected");
    document.getElementById("voteMsg").innerText = `Selected: Player ${slot}`;
  }
}

function castVote(target) {
  if (!ws) return;
  if (target === "skip") {
    ws.send(JSON.stringify({type:"vote", from:myName, target:"skip"}));
    addChat(`You skipped voting`);
    return;
  }
  ws.send(JSON.stringify({type:"vote", from:myName, target:String(target)}));
  addChat(`You voted for Player ${target}`);
}

function confirmVote() {
  if (!selectedVote) {
    alert("Select a player tile first or press Skip");
    return;
  }
  castVote(selectedVote);
}

function changeVote() {
  if (!selectedVote) alert("Select a player first");
  else {
    // just toggle selection so player can choose another
    const el = document.getElementById("player-"+selectedVote);
    if (el) el.classList.remove("selected");
    selectedVote = null;
    document.getElementById("voteMsg").innerText = "Change your vote now";
  }
}

function sendChat() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  // if numeric during voting, shorthand handled on backend; still send as chat so it's visible
  ws.send(JSON.stringify({type:"chat", from:myName, text}));
  input.value = "";
}

function handlePhase(phaseName, seconds, playersList) {
  document.getElementById("phaseLabel").innerText = `Phase: ${phaseName}`;
  startPhaseTimer(seconds, phaseName);
  // show or hide voting UI
  if (phaseName === "day_vote") {
    document.getElementById("votePanel").style.display = "flex";
    // if backend included players to vote on, re-render grid with alive only
    if (playersList) {
      playersState = playersState.map(p=>{
        const remote = playersList.find(r=>r.slot===p.slot);
        if (remote) p.alive = remote.alive;
        return p;
      });
      renderGrid(playersState);
    }
  } else {
    document.getElementById("votePanel").style.display = "none";
    // clear selection
    if (selectedVote) {
      const el = document.getElementById("player-"+selectedVote);
      if (el) el.classList.remove("selected");
      selectedVote = null;
      document.getElementById("voteMsg").innerText = "";
    }
  }
}

function startPhaseTimer(seconds, phaseName) {
  phaseSeconds = seconds;
  clearInterval(phaseTimer);
  updateFill(1); // full at start
  phaseTimer = setInterval(()=>{
    phaseSeconds--;
    const pct = Math.max(0, phaseSeconds) / Math.max(1, seconds);
    updateFill(pct);
    if (phaseSeconds <= 0) clearInterval(phaseTimer);
  }, 1000);
}

function updateFill(pct) {
  const fill = document.getElementById("phaseFill");
  if (!fill) return;
  fill.style.width = `${Math.round(pct*100)}%`;
  // color by phase (yellow for day, purple for night)
  const label = document.getElementById("phaseLabel").innerText.toLowerCase();
  if (label.includes("night")) fill.style.background = "linear-gradient(90deg,#7f53ac,#5d35a9)";
  else fill.style.background = "linear-gradient(90deg,#f1c40f,#f39c12)";
}

// small helper to set BACKEND from UI if needed
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') {
    const input = document.getElementById("chatInput");
    if (document.activeElement === input) sendChat();
  }
});
