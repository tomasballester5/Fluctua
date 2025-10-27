// Snake — Fluctua (corregido)

// ====== CONFIG ======
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const foodIcon = document.getElementById('foodIcon');
const scoreEl = document.getElementById('score');
const speedDisplay = document.getElementById('speedDisplay');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const brandLogo = document.getElementById('brandLogo');

// Ocultos en CSS, pero las referencias no se borran
const btnMenu = document.getElementById('btnMenu');
const btnAcerca = document.getElementById('btnAcerca');

brandLogo.onclick = () => window.location.href = '../Principal/Principal.html';

// Tamaño fijo del canvas interno (coincide con el visual)
canvas.width = 800;
canvas.height = 600;

const CELL = 20;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let GAME_RUNNING = false;
let GAME_OVER = false;

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = null;
let headPos = { x: 0, y: 0 };
let stepTime = 0.09;
let moveTimer = 0;
let lastTime = 0;
let targetLength = 0;
let score = 0;
let food = { x: 0, y: 0 };
let particles = [];

// ====== AUDIO ======
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
}
function playNote(freq=440, time=0.14, type='sine', gain=0.06) {
  if(!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time);
  setTimeout(()=>{ try{o.stop();}catch(e){} }, (time+0.02)*1000);
}
let bgOsc = null;
function startBackgroundAmbience(){
  ensureAudio();
  if(!audioCtx || bgOsc) return;
  bgOsc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  bgOsc.type = 'sine';
  bgOsc.frequency.value = 110;
  g.gain.value = 0.004;
  bgOsc.connect(g); g.connect(audioCtx.destination);
  bgOsc.start();
}
function stopBackgroundAmbience(){
  try{ if(bgOsc){ bgOsc.stop(); bgOsc.disconnect(); bgOsc=null } }catch(e){}
}

// ====== COMIDA ======
function createFoodIcon() {
  foodIcon.innerHTML = `<i data-lucide="music" style="color: #fff; filter: drop-shadow(0 0 6px #e53935);"></i>`;
  if(window.lucide) lucide.createIcons();
}
createFoodIcon();

function placeFood(){
  let tries = 0;
  do {
    food.x = Math.floor(Math.random() * (WIDTH / CELL)) * CELL + CELL/2;
    food.y = Math.floor(Math.random() * (HEIGHT / CELL)) * CELL + CELL/2;
    tries++;
    const conflict = snake.some(p => Math.hypot(p.x - food.x, p.y - food.y) < CELL*0.9);
    if(!conflict) break;
  } while(tries < 200);

  const offsetX = canvas.offsetLeft;
  const offsetY = canvas.offsetTop;
  foodIcon.style.left = `${food.x + offsetX}px`;
  foodIcon.style.top = `${food.y + offsetY}px`;
}

// ====== REINICIAR ======
function resetGame() {
  const startX = Math.floor((WIDTH / CELL) / 2) * CELL + CELL/2;
  const startY = Math.floor((HEIGHT / CELL) / 2) * CELL + CELL/2;
  snake = [
    { x: startX, y: startY },
    { x: startX - CELL, y: startY },
    { x: startX - CELL*2, y: startY }
  ];
  headPos = { ...snake[0] };
  dir = { x: 1, y: 0 };
  nextDir = null;
  score = 0;
  GAME_RUNNING = false;
  GAME_OVER = false;
  targetLength = CELL * 3;
  updateUI();
  placeFood();
  render();
}

// ====== LOOP ======
function loop(ts) {
  if (!GAME_RUNNING || GAME_OVER) return;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  moveTimer += dt;

  if (nextDir) {
    dir = nextDir;
    nextDir = null;
  }

  if (moveTimer >= stepTime) {
    moveTimer = 0;
    headPos.x += dir.x * CELL;
    headPos.y += dir.y * CELL;

    if (headPos.x < 0 || headPos.x >= WIDTH || headPos.y < 0 || headPos.y >= HEIGHT) {
      gameOver(); return;
    }

    snake.unshift({ x: headPos.x, y: headPos.y });
    while (snake.length * CELL > targetLength) snake.pop();

    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === headPos.x && snake[i].y === headPos.y) {
        gameOver(); return;
      }
    }

    if (Math.abs(headPos.x - food.x) < CELL/2 && Math.abs(headPos.y - food.y) < CELL/2) {
      targetLength += CELL * 3;
      score++;
      updateUI();
      const freqs = [523, 587, 659, 698, 784, 880, 988];
      const f = freqs[score % freqs.length];
      ensureAudio();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      playNote(f, 0.16, "sine", 0.12);
      placeFood();
    }
  }

  render();
  requestAnimationFrame(loop);
}

// ====== INPUT ======
window.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    if(!GAME_RUNNING && !GAME_OVER){
      ensureAudio();
      if(audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(()=>startGame());
      } else startGame();
    } else if(GAME_OVER){
      resetGame();
    }
    e.preventDefault();
    return;
  }

  let d = null;
  if(e.key === 'ArrowUp' || e.key === 'w') d = {x:0,y:-1};
  if(e.key === 'ArrowDown' || e.key === 's') d = {x:0,y:1};
  if(e.key === 'ArrowLeft' || e.key === 'a') d = {x:-1,y:0};
  if(e.key === 'ArrowRight' || e.key === 'd') d = {x:1,y:0};

  if(d && !(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
});

function startGame(){
  GAME_RUNNING = true;
  lastTime = performance.now();
  moveTimer = 0;
  startBackgroundAmbience();
  requestAnimationFrame(loop);
}

function renderGrid(){
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for(let x=0; x<=WIDTH; x+=CELL){
    ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,HEIGHT); ctx.stroke();
  }
  for(let y=0; y<=HEIGHT; y+=CELL){
    ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(WIDTH,y+0.5); ctx.stroke();
  }
}

function render() {
  ctx.fillStyle = "#071018";
  ctx.fillRect(0,0,WIDTH,HEIGHT);
  renderGrid();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = CELL - 2;
  ctx.strokeStyle = '#ededf4';
  ctx.beginPath();
  ctx.moveTo(snake[0].x, snake[0].y);
  for(let i=1;i<snake.length;i++) ctx.lineTo(snake[i].x, snake[i].y);
  ctx.stroke();

  const head = snake[0];
  ctx.beginPath();
  ctx.fillStyle = '#e53935';
  ctx.arc(head.x, head.y, (CELL/2)-2, 0, Math.PI*2);
  ctx.fill();

  const offsetX = canvas.offsetLeft;
  const offsetY = canvas.offsetTop;
  foodIcon.style.left = `${food.x + offsetX}px`;
  foodIcon.style.top = `${food.y + offsetY}px`;

  if(GAME_OVER){
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "28px Montserrat, Arial";
    ctx.textAlign = "center";
    ctx.fillText("¡Perdiste!", WIDTH/2, HEIGHT/2 - 20);
    ctx.font = "18px Montserrat, Arial";
    ctx.fillText("Presiona ESPACIO para reiniciar", WIDTH/2, HEIGHT/2 + 20);
  }
}

function updateUI(){
  scoreEl.textContent = score;
}

function gameOver(){
  stopBackgroundAmbience();
  GAME_OVER = true;
  GAME_RUNNING = false;
  render();
}

startBtn.addEventListener('click', ()=> startGame());
resetBtn.addEventListener('click', ()=>{ stopBackgroundAmbience(); resetGame(); });

resetGame();
placeFood();
render();
updateUI();
