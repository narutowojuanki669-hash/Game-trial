// api.js
const API_BASE_URL = "https://town-of-shadows-server.onrender.com";

export async function testConnection() {
  try {
    const res = await fetch(`${API_BASE_URL}/test`);
    const text = await res.text();
    console.log("✅ Backend Response:", text);
    document.body.innerHTML = `<h2 style="color:white;text-align:center;margin-top:20%">Backend says: ${text}</h2>`;
  } catch (err) {
    console.error("❌ Connection failed:", err);
    document.body.innerHTML = `<h2 style="color:red;text-align:center;margin-top:20%">Connection failed: ${err}</h2>`;
  }
}
