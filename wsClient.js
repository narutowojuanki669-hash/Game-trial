// wsClient.js - baseline client that uses REST join then WS identify
const BACKEND = "https://town-of-shadows-server.onrender.com";

export async function createAndJoin(roomId, name) {
  // Create room if roomId is blank
  let chosenRoom = roomId;
  if (!chosenRoom) {
    const res = await fetch(`${BACKEND}/create-room`, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ host_name: name })});
    const data = await res.json();
    chosenRoom = data.roomId;
  }
  // join
  const joinRes = await fetch(`${BACKEND}/join-room`, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ roomId: chosenRoom, name })});
  const j = await joinRes.json();
  return { roomId: chosenRoom, slot: j.slot, role: j.role };
}

export function connectWS(roomId, onMsg) {
  const ws = new WebSocket(`${BACKEND.replace("https","wss")}/ws/${roomId}`);
  ws.onopen = () => console.log("WS connected");
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    onMsg(msg, ws);
  };
  ws.onclose = () => console.log("WS closed");
  ws.onerror = (e) => console.error("WS error", e);
  return ws;
}

export async function startGame(roomId) {
  await fetch(`${BACKEND}/start-game/${roomId}`, { method: "POST" });
}
