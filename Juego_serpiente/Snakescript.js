// Snake — Fluctua (versión fluida y con correcciones)
// Movimiento fluido, sin diagonales, arranque más corto

// ====== CONFIG ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  // Detecta el tamaño real visible del canvas en pantalla
  const displayWidth = Math.min(window.innerWidth * 0.9, 700);
  const displayHeight = displayWidth; // cuadrado

  // Asigna ese mismo tamaño como tamaño interno lógico del canvas
  canvas.width = displayWidth;
  canvas.height = displayHeight;

  // Si usás un grid o tamaño de celda, recalculalo acá:
  if (typeof cellSize !== 'undefined') {
    gridWidth = Math.floor(canvas.width / cellSize);
    gridHeight = Math.floor(canvas.height / cellSize);
  }
}

// Ejecutar al inicio y al cambiar tamaño
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const foodIcon = document.getElementById('foodIcon');
const scoreEl = document.getElementById('score');
const speedDisplay =
