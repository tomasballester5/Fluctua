// ---------- Variables principales ----------
const bg = document.getElementById('bgCanvas');
const game = document.getElementById('gameCanvas');
const ctxBg = bg.getContext('2d');
const ctx = game.getContext('2d');

const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popupTitle');
const popupText = document.getElementById('popupText');
const popupOk = document.getElementById('popupOk');
const startBtn = document.getElementById('startBtn');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timeEl = document.getElementById('time');

let W, H, maze, cellSize = 36;
// player.size controla el tamaño "visible" de la nota y ayuda a la detección básica
let player = { x: 0, y: 0, size: 12 };
let goal = { x: 0, y: 0, size: 14 };
let playing = false, lives = 3, score = 0;
let startTime = 0;

// Nueva bandera: hasta que el usuario mueva el mouse dentro del canvas,
// la nota permanece en spawn y no se detectan colisiones.
let followMouse = false;

let spawn = { x: 0, y: 0 }; // guardamos el punto seguro de inicio

// ---------- Colores ----------
const PALETTE = {
  bg: "#0c0e10",
  wall: "#1c1e22",
  path: "#eaeef4",
  accent: "#e62b3f"
};

// ---------- Ajustar tamaño ----------
function resize() {
  const rect = bg.parentElement.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  bg.width = game.width = W;
  bg.height = game.height = H;
}
window.addEventListener("resize", resize);

// ---------- Generar laberinto ----------
function generateMaze(cols, rows) {
  const maze = Array(rows).fill(0).map(() => Array(cols).fill(0));

  function carve(x, y) {
    const dirs = [[0,-1],[1,0],[0,1],[-1,0]].sort(() => Math.random()-0.5);
    maze[y][x] = 1;
    for (const [dx, dy] of dirs) {
      const nx = x + dx * 2, ny = y + dy * 2;
      if (ny > 0 && ny < rows && nx > 0 && nx < cols && maze[ny][nx] === 0) {
        maze[y + dy][x + dx] = 1;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);
  // Aseguramos una entrada y salida en los bordes (puede adaptarse)
  maze[1][0] = 1; // entrada en el borde izquierdo
  maze[rows - 2][cols - 1] = 1; // salida en el borde derecho
  return maze;
}

// ---------- Dibujar laberinto ----------
function drawMaze() {
  ctxBg.clearRect(0, 0, W, H);
  const rows = maze.length;
  const cols = maze[0].length;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctxBg.fillStyle = maze[y][x] === 1 ? PALETTE.bg : PALETTE.wall;
      ctxBg.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // marcar punto A y B según entrada/salida reales (buscamos la celda de entrada/salida)
  // Para simplicidad: A en (1,1) -> representar en canvas; B en (cols-2, rows-2)
  ctxBg.fillStyle = PALETTE.accent;
  ctxBg.font = "bold 16px sans-serif";

  // Encontrar coordenadas exactas de las celdas que sean pasillo en los bordes:
  // A: la primera celda libre desde la izquierda en la fila 1
  let aCell = { cx: 1, cy: 1 };
  for (let x = 0; x < maze[0].length; x++) {
    if (maze[1][x] === 1) { aCell = { cx: x, cy: 1 }; break; }
  }
  // B: la primera celda libre desde la derecha en la fila rows-2
  let bCell = { cx: maze[0].length - 2, cy: maze.length - 2 };
  for (let x = maze[0].length - 1; x >= 0; x--) {
    if (maze[maze.length - 2][x] === 1) { bCell = { cx: x, cy: maze.length - 2 }; break; }
  }

  ctxBg.fillText("A →", aCell.cx * cellSize + 6, aCell.cy * cellSize + 18);
  ctxBg.fillText("← B", bCell.cx * cellSize + cellSize - 32, bCell.cy * cellSize + cellSize - 6);

  // meta (círculo final)
  ctxBg.beginPath();
  ctxBg.arc(goal.x, goal.y, goal.size, 0, Math.PI * 2);
  ctxBg.fill();
}

// ---------- Ícono Lucide ----------
const noteIcon = new Image();
// Uso music-2; si querés otro icon cambiar src.
noteIcon.src = "https://unpkg.com/lucide-static/icons/music-2.svg";

// ---------- Control de mouse ----------
let mouse = { x: 0, y: 0 };
game.addEventListener("mousemove", e => {
  const r = game.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  // la primera vez que el usuario mueva el puntero dentro del canvas
  if (!followMouse) followMouse = true;
});
game.addEventListener("touchmove", e => {
  const r = game.getBoundingClientRect();
  const t = e.touches[0];
  mouse.x = t.clientX - r.left;
  mouse.y = t.clientY - r.top;
  if (!followMouse) followMouse = true;
});

// Cuando el mouse sale del canvas, dejamos de seguir (opcional)
// pero no desactivamos seguimiento si ya se movió; se puede comentar si no lo querés.
game.addEventListener("mouseleave", () => {
  // no forzamos followMouse = false; dejamos que siga si ya se movió
});

// ---------- Detección de colisión (mejorada) ----------
function isWall(x, y) {
  // revisamos 4 puntos alrededor del centro (aprox área del icono)
  const offsets = [
    [0, 0],
    [player.size * 0.6, 0],
    [-player.size * 0.6, 0],
    [0, player.size * 0.6],
    [0, -player.size * 0.6]
  ];
  for (const [ox, oy] of offsets) {
    const px = x + ox, py = y + oy;
    const cx = Math.floor(px / cellSize);
    const cy = Math.floor(py / cellSize);
    if (cy < 0 || cx < 0 || cy >= maze.length || cx >= maze[0].length) return true;
    if (maze[cy][cx] === 0) return true;
  }
  return false;
}

// ---------- Dibujar nota musical ----------
function drawNote(x, y) {
  // si ícono no cargó, dibujamos un círculo fallback
  if (!noteIcon.complete) {
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(x, y, player.size, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  // Dibujar icono centrado; escala si hace falta
  const s = Math.max(1, player.size / 8);
  const w = 24 * s, h = 24 * s;
  ctx.drawImage(noteIcon, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---------- Pop-up ----------
function showPopup(title, msg) {
  popup.classList.remove("hidden");
  popupTitle.textContent = title;
  popupText.textContent = msg;
  playing = false;
  // restaurar cursor del sistema al mostrar pop-up
  game.style.cursor = "";
}
popupOk.onclick = () => {
  popup.classList.add("hidden");
  startGame();
};

// ---------- Lógica principal ----------
function update(dt) {
  if (!playing) return;

  // Si el jugador no movió todavía, la nota permanece en spawn
  if (followMouse) {
    player.x = mouse.x;
    player.y = mouse.y;
  } else {
    // mantener la nota en spawn hasta que el jugador mueva el cursor
    player.x = spawn.x;
    player.y = spawn.y;
  }

  // Solo validar colisiones cuando el jugador haya movido el mouse
  if (followMouse) {
    if (isWall(player.x, player.y)) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        showPopup("Perdiste", "Tocaste la pared.");
        return;
      } else {
        // al chocar pero con vidas > 0, devolvemos a spawn y damos protección temporal
        followMouse = false;          // forzamos que vuelva a spawn hasta que el usuario mueva
        mouse.x = spawn.x;
        mouse.y = spawn.y;
        player.x = spawn.x;
        player.y = spawn.y;
      }
    }
  }

  // victoria
  const dx = player.x - goal.x;
  const dy = player.y - goal.y;
  if (Math.sqrt(dx * dx + dy * dy) < goal.size) {
    score += 100;
    scoreEl.textContent = score;
    showPopup("¡Ganaste!", "Completaste el laberinto.");
  }

  // tiempo
  const elapsed = Date.now() - startTime;
  const sec = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  timeEl.textContent = `${mm}:${ss}`;
}

// ---------- Render ----------
function render() {
  ctx.clearRect(0, 0, W, H);
  // dibujamos la nota siempre en player.x/player.y
  drawNote(player.x, player.y);
}

// ---------- Loop ----------
let last = 0;
function loop(ts) {
  const dt = ts - last;
  last = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------- Iniciar juego ----------
function startGame() {
  resize();
  maze = generateMaze(Math.floor(W / cellSize), Math.floor(H / cellSize));

  // calcular spawn seguro: centro de la primera celda libre (1,1) o buscar el primer pasillo
  let found = false;
  for (let y = 0; y < maze.length && !found; y++) {
    for (let x = 0; x < maze[0].length && !found; x++) {
      if (maze[y][x] === 1) {
        // preferimos una celda interior (no borde) para spawn
        if (x > 0 && y > 0 && x < maze[0].length - 1 && y < maze.length - 1) {
          spawn.x = x * cellSize + cellSize / 2;
          spawn.y = y * cellSize + cellSize / 2;
          found = true;
        }
      }
    }
  }
  if (!found) {
    // fallback: coordenada por defecto
    spawn.x = cellSize * 1.5;
    spawn.y = cellSize * 1.5;
  }

  // posicion inicial y meta
  player.x = spawn.x;
  player.y = spawn.y;
  goal.x = W - cellSize * 1.5;
  goal.y = H - cellSize * 1.5;

  // reiniciar estados
  lives = 3;
  livesEl.textContent = lives;
  score = 0;
  scoreEl.textContent = score;
  startTime = Date.now();
  followMouse = false; // hasta que el usuario mueva el mouse dentro del canvas
  drawMaze();
  popup.classList.add("hidden");
  playing = true;

  // transformar cursor en "personaje": ocultamos cursor del sistema sobre el canvas
  game.style.cursor = "none";

  requestAnimationFrame(loop);
}

startBtn.onclick = startGame;
window.addEventListener("keydown", e => {
  if (e.code === "Space" && !playing) startGame();
});
resize();
