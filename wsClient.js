// wsClient.js — WebSocket client for Town of Shadows frontend
// Set BACKEND to your backend URL (no trailing slash)
export const BACKEND = "https://town-of-shadows-server.onrender.com";

let ws = null;
let currentRoom = null;
let mySlot = null;
let myName = null;
let externalHandler = null;

export async function createAndJoin(roomId, name) {
  myName = name || "joiboi";
  let chosenRoom = roomId && roomId.trim() ? roomId.trim() : null;
  if (!chosenRoom) {
    const res = await fetch(`${BACKEND}/create-room`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({host_name: myName})
    });
    if (!res.ok) {
      const txt = await res.text(); throw new Error(txt);
    }
    const data = await res.json();
    chosenRoom = data.roomId;
  }
  const joinRes = await fetch(`${BACKEND}/join-room`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({roomId: chosenRoom, name: myName})
  });
  if (!joinRes.ok) {
    const t = await joinRes.text(); throw new Error(t);
  }
  const j = await joinRes.json();
  currentRoom = chosenRoom;
  mySlot = j.slot;
  connectWS(currentRoom, (m) => {
    if (externalHandler) externalHandler(m);
  });
  // identify once ws open
  setTimeout(()=> { if (ws && ws.readyState === WebSocket.OPEN) identify(mySlot); }, 400);
  return {roomId: chosenRoom, slot: mySlot, role: j.role, room: j.room};
}

export function connectWS(roomId, onMsg) {
  if (!roomId) throw new Error("roomId required for connectWS");
  const wsUrl = `${BACKEND.replace(/^http/, "ws")}/ws/${roomId}`;
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    console.log("WS open", wsUrl);
    if (onMsg) onMsg({type:"system", text:"ws_open"});
    if (mySlot) identify(mySlot);
  };
  ws.onmessage = (ev) => {
    let parsed;
    try { parsed = JSON.parse(ev.data); } catch(e) { console.error("bad json", e, ev.data); return; }
    if (onMsg) onMsg(parsed);
  };
  ws.onclose = () => {
    console.log("WS closed; reconnecting in 3s");
    if (onMsg) onMsg({type:"system", text:"ws_closed"});
    setTimeout(()=> {
      try { connectWS(roomId, onMsg); } catch(e){ console.error(e); }
    }, 3000);
  };
  ws.onerror = (e) => console.error("WS error", e);
  return ws;
}

export function identify(slot) {
  mySlot = slot;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:"identify", slot}));
}

export function sendChat(text, channel="public") {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const payload = {type:"chat", from: myName || `Player ${mySlot}`, channel, text};
  ws.send(JSON.stringify(payload));
}

export function sendAction(action) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:"player_action", action}));
}

export function accuse(from, target) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:"accuse", from, target}));
}

export function verdictVote(from, choice) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:"verdict_vote", from, choice}));
}

export function vote(from, target) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:"vote", from, target}));
}

export async function startGame(roomId) {
  if (!roomId && !currentRoom) throw new Error("roomId required");
  const rid = roomId || currentRoom;
  const res = await fetch(`${BACKEND}/start-game/${rid}`, {method:"POST"});
  const j = await res.json();
  return j;
}

export async function fetchRoom(roomId) {
  const rid = roomId || currentRoom;
  const r = await fetch(`${BACKEND}/room/${rid}`);
  return await r.json();
}

export function closeWS() {
  if (ws) ws.close();
  ws = null; currentRoom = null; mySlot = null; myName = null;
}

export function setExternalHandler(fn) { externalHandler = fn; }
