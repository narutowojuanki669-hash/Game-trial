// wsClient.js - corrected, exported functions and helpers
// IMPORTANT: set BACKEND to your render host (no trailing slash)
const BACKEND = "https://town-of-shadows-server.onrender.com";

let ws = null;
let currentRoom = null;
let mySlot = null;
let myName = null;

// Create room (if roomId blank it creates a new one) and join
export async function createAndJoin(roomId, name) {
  myName = name || "joiboi";
  let chosenRoom = roomId;
  if (!chosenRoom) {
    // Create a room and use it
    const res = await fetch(`${BACKEND}/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_name: myName })
    });
    const data = await res.json();
    chosenRoom = data.roomId;
  }

  // Join the room (assigns first free slot)
  const joinRes = await fetch(`${BACKEND}/join-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: chosenRoom, name: myName })
  });
  const j = await joinRes.json();
  currentRoom = chosenRoom;
  mySlot = j.slot;
  // return the important info
  return { roomId: chosenRoom, slot: mySlot, role: j.role, room: j.room };
}

// Connect WS to room; onMsg is a message handler (msg, ws)
export function connectWS(roomId, onMsg) {
  if (!roomId) throw new Error("roomId required for connectWS");
  const wsUrl = `${BACKEND.replace("https", "wss")}/ws/${roomId}`;
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    console.log("WS open", wsUrl);
    // let the caller know
    if (onMsg) onMsg({ type: "system", text: "ws_open" }, ws);
    // if we already have slot info, identify immediately
    if (mySlot) identify(mySlot);
  };
  ws.onmessage = (ev) => {
    let parsed;
    try { parsed = JSON.parse(ev.data); } catch(e){ console.error("bad json", e, ev.data); return; }
    if (onMsg) onMsg(parsed, ws);
  };
  ws.onclose = () => {
    console.log("WS closed, will try reconnect in 3s");
    if (onMsg) onMsg({ type: "system", text: "ws_closed" }, ws);
    setTimeout(()=> {
      try { connectWS(roomId, onMsg); } catch(e){ console.error(e); }
    }, 3000);
  };
  ws.onerror = (e) => console.error("WS error", e);
  return ws;
}

// Identify this websocket connection as a specific slot on server
export function identify(slot) {
  mySlot = slot;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // will identify on open
    return;
  }
  ws.send(JSON.stringify({ type: "identify", slot }));
}

// send a chat message via WS
export function sendChat(text, channel = "public") {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const payload = { type: "chat", from: myName || `Player ${mySlot}`, channel, text };
  ws.send(JSON.stringify(payload));
}

// queue a night action via WS (client-side calls this)
export function sendAction(action) {
  // action: { actor, target, type, actor_role }
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "player_action", action }));
}

// accuse during voting phase (simple wrapper)
export function accuse(from, target) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "accuse", from, target }));
}

// send a verdict vote (guilty / innocent)
export function verdictVote(from, choice) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "verdict_vote", from, choice }));
}

// direct vote during voting stage
export function vote(from, target) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "vote", from, target }));
}

// start game by calling REST start endpoint (also exposed)
export async function startGame(roomId) {
  if (!roomId && !currentRoom) throw new Error("roomId required");
  const rid = roomId || currentRoom;
  const res = await fetch(`${BACKEND}/start-game/${rid}`, { method: "POST" });
  return await res.json();
}

// get room info via REST
export async function fetchRoom(roomId) {
  const rid = roomId || currentRoom;
  const r = await fetch(`${BACKEND}/room/${rid}`);
  return await r.json();
}

// convenience to gracefully close WS
export function closeWS() {
  if (ws) ws.close();
  ws = null;
  currentRoom = null;
  mySlot = null;
  myName = null;
    }
