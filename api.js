// api.js
const API_BASE_URL = "https://town-of-shadows-server.onrender.com";

export async function testConnection() {
  document.body.innerHTML = `<h2 style="color:yellow;text-align:center;margin-top:20%">Connecting to backend...</h2>`;
  try {
    const res = await fetch(`${API_BASE_URL}/test`);
    const text = await res.text();
    document.body.innerHTML = `<h2 style="color:lightgreen;text-align:center;margin-top:20%">✅ Connected!</h2><p style="text-align:center">${text}</p>`;
  } catch (err) {
    document.body.innerHTML = `<h2 style="color:red;text-align:center;margin-top:20%">❌ Connection Failed</h2><p style="text-align:center">${err}</p>`;
  }
}
