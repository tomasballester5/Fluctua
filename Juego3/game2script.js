// Referencias a elementos
const gameCanvas = document.getElementById("gameCanvas");
const ctx = gameCanvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const popup = document.getElementById("popup");
const popupOk = document.getElementById("popupOk");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const timeEl = document.getElementById("time");

let running = false;
let player = { x: 50, y: 50, size: 20 };
let goal = { x: 400, y: 250, size: 30 };
let walls = [];
let score = 0;
let lives = 3;
let startTime = 0;

// Ajustar canvas al tamaño del contenedor
function resizeCanvas() {
  gameCanvas.width = gameCanvas.clientWidth;
  gameCanvas.height = gameCanvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Crear un laberinto simple
function crearLaberinto() {
  walls = [
    { x: 100, y: 0, w: 10, h: 200 },
    { x: 200, y: 150, w: 10, h: 200 },
    { x: 300, y: 0, w: 10, h: 200 },
    { x: 400, y: 150, w: 10, h: 200 },
    { x: 0, y: 350, w: 500, h: 10 },
  ];
}

// Dibuja todo
function draw() {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  // Paredes
  ctx.fillStyle = "#444";
  walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

  // Meta
  ctx.fillStyle = "#2ecc71";
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Jugador
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Detectar colisiones
function colision() {
  for (let w of walls) {
    if (
      player.x + player.size / 2 > w.x &&
      player.x - player.size / 2 < w.x + w.w &&
      player.y + player.size / 2 > w.y &&
      player.y - player.size / 2 < w.y + w.h
    ) {
      perderVida();
    }
  }
  // Meta alcanzada
  const dx = player.x - goal.x;
  const dy = player.y - goal.y;
  if (Math.sqrt(dx * dx + dy * dy) < (player.size + goal.size) / 2) {
    ganar();
  }
}

function perderVida() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    gameOver();
  } else {
    resetPlayer();
  }
}

function ganar() {
  score += 100;
  scoreEl.textContent = score;
  resetPlayer();
}

function resetPlayer() {
  player.x = 50;
  player.y = 50;
}

function gameOver() {
  running = false;
  popup.classList.remove("hidden");
}

// Actualiza el tiempo
function updateTime() {
  if (!running) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const sec = String(elapsed % 60).padStart(2, "0");
  timeEl.textContent = `${min}:${sec}`;
  requestAnimationFrame(updateTime);
}

// Bucle principal
function loop() {
  if (!running) return;
  draw();
  colision();
  requestAnimationFrame(loop);
}

// Iniciar juego
function iniciarJuego() {
  popup.classList.add("hidden");
  startBtn.style.display = "none";
  crearLaberinto();
  resetPlayer();
  running = true;
  startTime = Date.now();
  loop();
  updateTime();
}

startBtn.addEventListener("click", iniciarJuego);
document.addEventListener("keydown", e => {
  if (e.code === "Space") iniciarJuego();
});
popupOk.addEventListener("click", iniciarJuego);

// 🖱️ Movimiento con mouse
gameCanvas.addEventListener("mousemove", (e) => {
  if (!running) return;
  const rect = gameCanvas.getBoundingClientRect();
  player.x = e.clientX - rect.left;
  player.y = e.clientY - rect.top;
});

// 📱 Movimiento táctil
gameCanvas.addEventListener("touchmove", (e) => {
  if (!running) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = gameCanvas.getBoundingClientRect();
  player.x = touch.clientX - rect.left;
  player.y = touch.clientY - rect.top;
}, { passive: false });


