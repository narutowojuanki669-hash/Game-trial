// Adjust URLs if needed
const BACKEND = "https://town-of-shadows-server.onrender.com";

let ws;
let slot = 0;
let role = "";
let phase = "waiting";
let timerMax = 0;

async function init(){
  const name = prompt("Enter your name","joiboi") || "Player";
  const roomId = "A11368"; // Example fixed room id
  const joinRes = await fetch(`${BACKEND}/join-room`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({roomId,name})
  });
  const data = await joinRes.json();
  slot = data.slot;

  ws = new WebSocket(`${BACKEND.replace("https","wss")}/ws/${data.room}/${slot}`);
  ws.onopen = () => console.log("Connected to WS");
  ws.onmessage = (e)=>handleMessage(JSON.parse(e.data));

  document.getElementById("sendBtn").onclick=sendMsg;
  document.getElementById("startBtn").onclick=startGame;
  document.getElementById("voteBtn").onclick=vote;
  document.getElementById("skillBtn").onclick=useSkill;
}

function handleMessage(msg){
  const chatDiv=document.getElementById("chat");
  if(msg.type==="chat"){
    const div=document.createElement("div");
    div.textContent=`${msg.name}: ${msg.text}`;
    chatDiv.appendChild(div);
    chatDiv.scrollTop=chatDiv.scrollHeight;
  }else if(msg.type==="private_role"){
    role = msg.role;
    alert(`Your role is ${role}`);
  }else if(msg.type==="phase"){
    phase = msg.phase;
    timerMax = msg.time;
    document.getElementById("phase").textContent=`${phase}`;
    startTimer(msg.time);
    toggleButtons();
  }else if(msg.type==="timer"){
    updateTimer(msg.remaining,msg.phase);
  }
}

function sendMsg(){
  const msg=document.getElementById("msg");
  if(msg.value.trim()==="")return;
  ws.send(JSON.stringify({type:"chat",name:"You",text:msg.value}));
  msg.value="";
}

async function startGame(){
  await fetch(`${BACKEND}/start-game/A11368`,{method:"POST"});
  document.getElementById("startBtn").disabled=true;
}

function toggleButtons(){
  const voteBtn=document.getElementById("voteBtn");
  const skillBtn=document.getElementById("skillBtn");
  voteBtn.disabled=!(phase.toLowerCase().includes("voting"));
  skillBtn.disabled=!(phase.toLowerCase().includes("night"));
}

function startTimer(seconds){
  const bar=document.getElementById("timerBar");
  bar.style.width="100%";
  bar.style.background="lime";
  let remaining=seconds;
  const int=setInterval(()=>{
    remaining--;
    bar.style.width=(remaining/seconds*100)+"%";
    if(remaining<=(seconds/3))bar.style.background="orange";
    if(remaining<=5)bar.style.background="red";
    if(remaining<=0){
      clearInterval(int);
      bar.style.width="0%";
    }
  },1000);
}

function updateTimer(rem,ph){
  document.getElementById("phase").textContent=`${ph} (${rem}s left)`;
}

function vote(){
  ws.send(JSON.stringify({type:"chat",name:"System",text:"You voted"}));
}

function useSkill(){
  ws.send(JSON.stringify({type:"chat",name:"System",text:`${role} used skill`}));
}

init();
