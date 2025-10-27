// Snakescript.js — correcciones: estética, comida visible, scaling y touch controls

// ==== CONFIG y elementos DOM ====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const foodIcon = document.getElementById("foodIcon");
const scoreEl = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

// parámetros lógicos del juego (en "píxeles lógicos")
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 600;
const CELL = 20; // tamaño de celda en píxeles lógicos

// estado
let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = null;
let headPos = { x: 0, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let GAME_RUNNING = false;
let GAME_OVER = false;
let lastTime = 0;
let moveTimer = 0;
const stepTime = 0.09;

// ==== Helpers: crear icono de comida (Lucide) ====
function createFoodIcon() {
  // icono inline (lucide) — mantiene estilo anterior y hace visible el elemento
  foodIcon.innerHTML = `<i data-lucide="music" style="width:28px; height:28px; color:#fff; filter: drop-shadow(0 0 6px #e53935);"></i>`;
  // forzar z-index y visibilidad (por si en tu CSS quedaba atrás)
  foodIcon.style.zIndex = 999;
  foodIcon.style.display = "flex";
  foodIcon.style.pointerEvents = "none";
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
}
createFoodIcon();

// ==== Redimensionado y scaling correcto (evita recortes) ====
function resizeCanvas() {
  // fijamos el tamaño visual (coincide con tu CSS original: 800x600)
  canvas.style.width = `${LOGICAL_WIDTH}px`;
  canvas.style.height = `${LOGICAL_HEIGHT}px`;

  // usar devicePixelRatio para nitidez; mantenemos el sistema de coordenadas en "píxeles lógicos"
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(LOGICAL_WIDTH * dpr);
  canvas.height = Math.round(LOGICAL_HEIGHT * dpr);

  // transform para que 1 unidad lógica = 1 CSS pixel en el contexto
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", () => {
  resizeCanvas();
  // reposicionar el icono de comida si el canvas cambia
  placeFoodIcon();
});
resizeCanvas();



// ==== Posicionar la comida correctamente dentro del área visible ====
function placeFood() {
  let tries = 0;
  do {
    food.x = Math.floor(Math.random() * (LOGICAL_WIDTH / CELL)) * CELL + CELL / 2;
    food.y = Math.floor(Math.random() * (LOGICAL_HEIGHT / CELL)) * CELL + CELL / 2;
    tries++;
    const conflict = snake.some((p) => Math.hypot(p.x - food.x, p.y - food.y) < CELL * 0.9);
    if (!conflict) break;
  } while (tries < 200);

  placeFoodIcon();
}
function placeFoodIcon() {
  const rect = canvas.getBoundingClientRect();
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const offsetX = rect.left - parentRect.left;
  const offsetY = rect.top - parentRect.top;
  const scaleX = rect.width / LOGICAL_WIDTH;
  const scaleY = rect.height / LOGICAL_HEIGHT;
  foodIcon.style.left = `${offsetX + food.x * scaleX}px`;
  foodIcon.style.top = `${offsetY + food.y * scaleY}px`;
  foodIcon.style.transform = "translate(-50%, -50%)";
  foodIcon.style.display = "flex";
}


// ==== Reiniciar juego ====
function resetGame() {
  const startX = Math.floor((LOGICAL_WIDTH / CELL) / 2) * CELL + CELL / 2;
  const startY = Math.floor((LOGICAL_HEIGHT / CELL) / 2) * CELL + CELL / 2;
  snake = [
    { x: startX, y: startY },
    { x: startX - CELL, y: startY },
    { x: startX - CELL * 2, y: startY },
  ];
  headPos = { ...snake[0] };
  dir = { x: 1, y: 0 };
  nextDir = null;
  score = 0;
  GAME_RUNNING = false;
  GAME_OVER = false;
  updateUI();
  placeFood();
  render(); // dibujar estado inicial
}

// ==== Loop principal ====
function loop(ts) {
  if (!GAME_RUNNING || GAME_OVER) return;
  const dt = (ts - lastTime) / 1000 || 0;
  lastTime = ts;
  moveTimer += dt;

  if (nextDir) {
    // aplicar dirección pendiente
    dir = nextDir;
    nextDir = null;
  }

  if (moveTimer >= stepTime) {
    moveTimer = 0;
    headPos.x += dir.x * CELL;
    headPos.y += dir.y * CELL;

    // colisión con bordes
    if (headPos.x < 0 || headPos.x >= LOGICAL_WIDTH || headPos.y < 0 || headPos.y >= LOGICAL_HEIGHT) {
      return gameOver();
      
      spawnParticles(food.x, food.y, "#e53935");

    }

    snake.unshift({ x: headPos.x, y: headPos.y });

    // comer comida: solo si la cabeza quedó exactamente en la celda de comida
    if (Math.abs(headPos.x - food.x) < CELL / 2 && Math.abs(headPos.y - food.y) < CELL / 2) {
      score++;
      updateUI();
      placeFood();
      // NO hacemos pop() -> la serpiente crece
    } else {
      snake.pop(); // no comió: mantener longitud
    }

    // auto-colisión
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === headPos.x && snake[i].y === headPos.y) return gameOver();
    }
  }

  render();
  requestAnimationFrame(loop);
}
// ==== PARTICULAS ====
let particles = [];

function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 1,
      color,
    });
  }
}

function updateParticles(dt) {
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= dt * 2;
  }
  particles = particles.filter((p) => p.life > 0);
}

function renderParticles() {
  for (let p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ==== Render: restaurada estética original (cuerpo como trazo, cabeza circular) ====
function render() {
  // dibujar fondo (coordenadas lógicas)
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
spawnParticles(food.x, food.y, "#e53935");

  // cuadrícula tenue
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= LOGICAL_WIDTH; x += CELL) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= LOGICAL_HEIGHT; y += CELL) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(LOGICAL_WIDTH, y + 0.5);
    ctx.stroke();
  }

  // cuerpo: trazo continuo (como estaba originalmente)
  if (snake.length > 1) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = CELL - 2;
    ctx.strokeStyle = "#ededf4";
    ctx.beginPath();
    ctx.moveTo(snake[0].x, snake[0].y);
    for (let i = 1; i < snake.length; i++) ctx.lineTo(snake[i].x, snake[i].y);
    ctx.stroke();
  }

  // cabeza: círculo rojo
  const head = snake[0];
  ctx.beginPath();
  ctx.fillStyle = "#e53935";
  ctx.arc(head.x, head.y, (CELL / 2) - 2, 0, Math.PI * 2);
  ctx.fill();

  // Si el juego terminó, dibujar overlay
  if (GAME_OVER) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "28px Montserrat, Arial";
    ctx.textAlign = "center";
    ctx.fillText("¡Perdiste!", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 20);
    ctx.font = "18px Montserrat, Arial";
    ctx.fillText("Presiona ESPACIO para reiniciar", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 20);
  }

  // reposicionar icono de comida en caso de que cambie la ventana
  placeFoodIcon();
}

// ==== UI / auxiliares ====
function updateUI() {
  scoreEl.textContent = score;
}
function gameOver() {
  GAME_OVER = true;
  GAME_RUNNING = false;
  render();
}

// ==== Controles teclado ====
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (!GAME_RUNNING && !GAME_OVER) startGame();
    else if (GAME_OVER) resetGame();
    e.preventDefault();
    return;
  }

  let d = null;
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") d = { x: 0, y: -1 };
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") d = { x: 0, y: 1 };
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") d = { x: -1, y: 0 };
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") d = { x: 1, y: 0 };
  if (d && !(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
});

// ==== Controles táctiles: gamepad ====
document.querySelectorAll(".pad-btn").forEach((btn) => {
  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault(); // necesario para que no se pase al scroll
      const dirName = btn.dataset.dir;
      let newDir = null;
      if (dirName === "up" && dir.y !== 1) newDir = { x: 0, y: -1 };
      else if (dirName === "down" && dir.y !== -1) newDir = { x: 0, y: 1 };
      else if (dirName === "left" && dir.x !== 1) newDir = { x: -1, y: 0 };
      else if (dirName === "right" && dir.x !== -1) newDir = { x: 1, y: 0 };
      if (newDir) nextDir = newDir;
    },
    { passive: false }
  );

  // opcional: support para click (por si el touch no está disponible)
  btn.addEventListener("click", (e) => {
    const dirName = btn.dataset.dir;
    let newDir = null;
    if (dirName === "up" && dir.y !== 1) newDir = { x: 0, y: -1 };
    else if (dirName === "down" && dir.y !== -1) newDir = { x: 0, y: 1 };
    else if (dirName === "left" && dir.x !== 1) newDir = { x: -1, y: 0 };
    else if (dirName === "right" && dir.x !== -1) newDir = { x: 1, y: 0 };
    if (newDir) nextDir = newDir;
  });
});

// ==== Start / Reset ====
function startGame() {
  if (GAME_RUNNING) return;
  GAME_RUNNING = true;
  GAME_OVER = false;
  lastTime = performance.now();
  moveTimer = 0;
  requestAnimationFrame(loop);
}

resetBtn.addEventListener("click", resetGame);
startBtn.addEventListener("click", startGame);

// ==== Inicialización ====
resetGame();


