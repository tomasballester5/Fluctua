// ===== Snake — Fluctua (corregido móvil, comida, tamaño, controles) =====

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const foodIcon = document.getElementById("foodIcon");
const scoreEl = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

canvas.width = 800;
canvas.height = 600;
const CELL = 20;

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = null;
let headPos = { x: 0, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let GAME_RUNNING = false;
let GAME_OVER = false;

function resetGame() {
  const startX = Math.floor((canvas.width / CELL) / 2) * CELL + CELL / 2;
  const startY = Math.floor((canvas.height / CELL) / 2) * CELL + CELL / 2;
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
  render();
}

// === COMIDA (ajustada para móviles, dentro del canvas visible)
function placeFood() {
  let tries = 0;
  do {
    food.x = Math.floor(Math.random() * (canvas.width / CELL)) * CELL + CELL / 2;
    food.y = Math.floor(Math.random() * (canvas.height / CELL)) * CELL + CELL / 2;
    tries++;
    const conflict = snake.some(
      (p) => Math.hypot(p.x - food.x, p.y - food.y) < CELL * 0.9
    );
    if (!conflict) break;
  } while (tries < 200);

  // Colocar el ícono en el centro del canvas visible
  const rect = canvas.getBoundingClientRect();
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const offsetX = rect.left - parentRect.left;
  const offsetY = rect.top - parentRect.top;
  foodIcon.style.left = `${food.x + offsetX}px`;
  foodIcon.style.top = `${food.y + offsetY}px`;
}

// === LOOP DE JUEGO
let lastTime = 0;
let moveTimer = 0;
const stepTime = 0.09;

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

    // Bordes
    if (
      headPos.x < 0 ||
      headPos.x >= canvas.width ||
      headPos.y < 0 ||
      headPos.y >= canvas.height
    ) {
      gameOver();
      return;
    }

    snake.unshift({ x: headPos.x, y: headPos.y });

    // Comer comida
    if (
      Math.abs(headPos.x - food.x) < CELL / 2 &&
      Math.abs(headPos.y - food.y) < CELL / 2
    ) {
      score++;
      updateUI();
      placeFood();
    } else {
      snake.pop(); // solo si no come
    }

    // Colisión con cuerpo
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === headPos.x && snake[i].y === headPos.y) {
        gameOver();
        return;
      }
    }
  }

  render();
  requestAnimationFrame(loop);
}

// === RENDERIZADO Y ESCALADO ADAPTATIVO
function render() {
  // Escalado para móviles
  const ratio = Math.min(
    canvas.clientWidth / canvas.width,
    canvas.clientHeight / canvas.height
  );
  ctx.save();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // cuadrícula leve
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let x = 0; x <= canvas.width; x += CELL) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += CELL) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // dibujar cuerpo
  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? "#e53935" : "#ededf4";
    ctx.beginPath();
    ctx.arc(snake[i].x, snake[i].y, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // actualizar posición del ícono de comida (por si el tamaño visual cambia)
  const rect = canvas.getBoundingClientRect();
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const offsetX = rect.left - parentRect.left;
  const offsetY = rect.top - parentRect.top;
  foodIcon.style.left = `${food.x + offsetX}px`;
  foodIcon.style.top = `${food.y + offsetY}px`;
}

// === CONTROLES PC
window.addEventListener("keydown", (e) => {
  let d = null;
  if (e.key === "ArrowUp" || e.key === "w") d = { x: 0, y: -1 };
  if (e.key === "ArrowDown" || e.key === "s") d = { x: 0, y: 1 };
  if (e.key === "ArrowLeft" || e.key === "a") d = { x: -1, y: 0 };
  if (e.key === "ArrowRight" || e.key === "d") d = { x: 1, y: 0 };
  if (d && !(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
  if (e.code === "Space") {
    if (!GAME_RUNNING) startGame();
    else if (GAME_OVER) resetGame();
  }
});

// === CONTROLES TOUCH (funcionales ahora)
document.querySelectorAll(".pad-btn").forEach((btn) => {
  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
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
});

function startGame() {
  GAME_RUNNING = true;
  GAME_OVER = false;
  lastTime = performance.now();
  moveTimer = 0;
  requestAnimationFrame(loop);
}

function updateUI() {
  scoreEl.textContent = score;
}

function gameOver() {
  GAME_OVER = true;
  GAME_RUNNING = false;
}

resetBtn.addEventListener("click", resetGame);
startBtn.addEventListener("click", startGame);

resetGame();
