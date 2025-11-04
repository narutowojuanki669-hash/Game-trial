// api.js
const API_BASE_URL = "https://town-of-shadows-server.onrender.com";

export async function testConnection() {
  const res = await fetch(`${API_BASE_URL}/test`);
  return await res.text();
}

// Example for making game requests later
export async function getGameState() {
  const res = await fetch(`${API_BASE_URL}/game/state`);
  return await res.json();
    }
