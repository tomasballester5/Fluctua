const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 🧩 Mantiene canvas físico = tamaño visible
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Escalas relativas
function scale(val) {
  return val * (canvas.width / 600); // 600px es tamaño base
}

// Variables base
const paddle = {
  x: canvas.width / 2 - scale(50),
  y: canvas.height - scale(30),
  width: scale(100),
  height: scale(15),
  speed: scale(7),
  dx: 0
  let paddleWidth = canvas.width * 0.18;
paddleWidth = Math.max(60, Math.min(paddleWidth, 120));

};

let ball = {
  x: canvas.width / 2,
  y: canvas.height - scale(45),
  size: scale(10),
  speed: scale(4),
  dx: scale(4),
  dy: -scale(4)
};

const brickRowCount = 5;
const brickColumnCount = 8;

// 🔧 Tamaño adaptable con límites
let brickWidth = canvas.width / brickColumnCount - 10;
brickWidth = Math.max(50, Math.min(brickWidth, 90)); // mínimo 50px, máximo 90px

let brickHeight = canvas.height * 0.05;
brickHeight = Math.max(12, Math.min(brickHeight, 25)); // mínimo 12px, máximo 25px

const brickPadding = 8;

// 🔼 Margen superior proporcional
const brickOffsetTop = Math.max(50, canvas.height * 0.08);
const brickOffsetLeft = (canvas.width - (brickColumnCount * (brickWidth + brickPadding))) / 2;


let score = 0;
let lives = 3;
let bricks = [];
let isGameRunning = false;
let powerups = [];

let leftPressed = false;
let rightPressed = false;

function createBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
  }
}
createBricks();

function drawPaddle() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.fillStyle = "#000";
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(paddle.x + i * 10, paddle.y, 2, paddle.height);
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
  ctx.fillStyle = "#e53935";
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status == 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.fillStyle = "#e53935";
        ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
      }
    }
  }
}

function drawPowerups() {
  powerups.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function movePaddle() {
  if (leftPressed) paddle.x -= paddle.speed;
  if (rightPressed) paddle.x += paddle.speed;

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width)
    paddle.x = canvas.width - paddle.width;
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.size < 0 || ball.x + ball.size > canvas.width)
    ball.dx *= -1;
  if (ball.y - ball.size < 0) ball.dy *= -1;

  if (
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.y + ball.size > paddle.y
  ) {
    ball.dy = -ball.speed;
    playSound("bounce");
  }

  if (ball.y + ball.size > canvas.height) {
    lives--;
    document.getElementById("lives").textContent = lives;
    if (lives <= 0) {
      alert("¡Fin del juego!");
      document.location.reload();
    } else {
      resetBall();
    }
  }

  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status == 1) {
        if (
          ball.x > b.x &&
          ball.x < b.x + brickWidth &&
          ball.y > b.y &&
          ball.y < b.y + brickHeight
        ) {
          ball.dy *= -1;
          b.status = 0;
          score += 10;
          document.getElementById("score").textContent = score;
          playSound("break");

          if (Math.random() < 0.05) spawnPowerup(b.x + brickWidth / 2, b.y);
        }
      }
    }
  }
}

function spawnPowerup(x, y) {
  const types = [
    { name: "lentitud", color: "#2196F3", effect: () => { ball.dx *= 0.7; ball.dy *= 0.7; } },
    { name: "rapidez", color: "#FF9100", effect: () => { ball.dx *= 1.5; ball.dy *= 1.5; } },
    { name: "vida+", color: "#00E676", effect: () => { lives++; document.getElementById("lives").textContent = lives; } },
    { name: "vida-", color: "#FF1744", effect: () => { lives--; document.getElementById("lives").textContent = lives; } },
    { name: "reinicio", color: "#FFD600", effect: () => createBricks() }
  ];
  const p = types[Math.floor(Math.random() * types.length)];
  powerups.push({ ...p, x, y });
}

function movePowerups() {
  powerups.forEach((p, index) => {
    p.y += 2;
    if (p.y > canvas.height) powerups.splice(index, 1);
    if (
      p.x > paddle.x &&
      p.x < paddle.x + paddle.width &&
      p.y + 10 > paddle.y
    ) {
      p.effect();
      powerups.splice(index, 1);
    }
  });
}

function playSound(type) {
  const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.connect(gain);
  gain.connect(ctxAudio.destination);
  if (type === "break") osc.frequency.value = 440;
  else if (type === "bounce") osc.frequency.value = 220;
  else osc.frequency.value = 660;
  gain.gain.value = 0.05;
  osc.start();
  osc.stop(ctxAudio.currentTime + 0.1);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawPaddle();
  drawBall();
  drawPowerups();
  movePowerups();
}

function update() {
  if (!isGameRunning) return;
  movePaddle();
  moveBall();
  draw();
  requestAnimationFrame(update);
}

function startGame() {
  if (!isGameRunning) {
    isGameRunning = true;
    update();
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  document.getElementById("score").textContent = score;
  document.getElementById("lives").textContent = lives;
  createBricks();
  resetBall();
  isGameRunning = true;
  update();
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 45;
  ball.dx = 4;
  ball.dy = -4;
}

// 🎮 Controles teclado
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") rightPressed = true;
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.code === "Space") startGame();
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowRight") rightPressed = false;
  if (e.key === "ArrowLeft") leftPressed = false;
});

// 🎮 Controles táctiles
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

if (leftBtn && rightBtn) {
  leftBtn.addEventListener("touchstart", () => (leftPressed = true));
  leftBtn.addEventListener("touchend", () => (leftPressed = false));
  rightBtn.addEventListener("touchstart", () => (rightPressed = true));
  rightBtn.addEventListener("touchend", () => (rightPressed = false));
}

// 🔁 Botón de reinicio
document.getElementById("resetBtn").addEventListener("click", resetGame);

// Dibuja escena inicial
draw();




