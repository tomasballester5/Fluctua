const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20; // tamaño de cada bloque
let snake = [{ x: 9 * box, y: 10 * box }];
let direction = "RIGHT";
let score = 0;
let highscore = localStorage.getItem("highscore") || 0;

let food = generateFood();

// 🔹 Generar comida dentro del mapa visible y alineada a la grilla
function generateFood() {
  const maxCols = Math.floor(canvas.width / box);
  const maxRows = Math.floor(canvas.height / box);
  const x = Math.floor(Math.random() * maxCols) * box;
  const y = Math.floor(Math.random() * maxRows) * box;
  return { x, y };
}

document.addEventListener("keydown", directionControl);

function directionControl(e) {
  if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  else if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  else if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
  else if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
}

// 🎮 Controles táctiles
document.getElementById("upBtn").addEventListener("touchstart", () => {
  if (direction !== "DOWN") direction = "UP";
});
document.getElementById("downBtn").addEventListener("touchstart", () => {
  if (direction !== "UP") direction = "DOWN";
});
document.getElementById("leftBtn").addEventListener("touchstart", () => {
  if (direction !== "RIGHT") direction = "LEFT";
});
document.getElementById("rightBtn").addEventListener("touchstart", () => {
  if (direction !== "LEFT") direction = "RIGHT";
});

function draw() {
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? "#e53935" : "#9aa3ab";
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }

  // Comida
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.arc(food.x + box / 2, food.y + box / 2, box / 2.5, 0, 2 * Math.PI);
  ctx.fill();

  // Movimiento
  let headX = snake[0].x;
  let headY = snake[0].y;

  if (direction === "LEFT") headX -= box;
  if (direction === "UP") headY -= box;
  if (direction === "RIGHT") headX += box;
  if (direction === "DOWN") headY += box;

  // Comer
  if (headX === food.x && headY === food.y) {
    score++;
    food = generateFood();
  } else {
    snake.pop();
  }

  const newHead = { x: headX, y: headY };

  // Colisión
  if (
    headX < 0 ||
    headY < 0 ||
    headX >= canvas.width ||
    headY >= canvas.height ||
    collision(newHead, snake)
  ) {
    clearInterval(game);
    if (score > highscore) {
      localStorage.setItem("highscore", score);
    }
    alert("¡Perdiste! Reiniciá para volver a jugar.");
    return;
  }

  snake.unshift(newHead);

  document.getElementById("score").textContent = score;
  document.getElementById("highscore").textContent = highscore;
}

function collision(head, array) {
  for (let i = 0; i < array.length; i++) {
    if (head.x === array[i].x && head.y === array[i].y) {
      return true;
    }
  }
  return false;
}

const game = setInterval(draw, 100);
