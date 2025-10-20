function goHome() {
  window.location.href = "Principal.html";
}

function selectTopButton(section) {
  const minijuegosBtn = document.getElementById("btn-minijuegos");
  const acercadeBtn = document.getElementById("btn-acercade");

  minijuegosBtn.classList.remove("active");
  acercadeBtn.classList.remove("active");

  if (section === "minijuegos") {
    minijuegosBtn.classList.add("active");
  } else {
    acercadeBtn.classList.add("active");
    window.location.href = "../Acerca_de/acercade.html";
  }
}

const juegos = {
  circuito: {
    nombre: "Circuitos",
    imagen: "Circuito.png",
    descripcion: "Conectá los cables correctamente para activar el circuito. Un desafío de lógica y precisión.",
    link: "../Circuito/circuito.html"
  },
  snake: {
    nombre: "Serpiente",
    imagen: "../Juego_serpiente/Snake.png",
    descripcion: "Controlá la serpiente, comé los puntos y evitá chocar contigo mismo. ¡Un clásico moderno!",
    link: "../Juego_serpiente/Snake.html"
  },
  brick: {
    nombre: "Brick Breaker",
    imagen: "BrickBreaker.png",
    descripcion: "Destruí los ladrillos con la pelota. ¡Demostrá tu precisión y reflejos!",
    link: "../Juego2/Game1.html"
  },
  maze: {
    nombre: "Fluctua Maze",
    imagen: "../Juego3/Maze.png",
    descripcion: "Explorá el laberinto de Fluctua y encontrá la salida. Un desafío visual y de orientación.",
    link: "../Juego3/Game2.html"
  }
};

// Función principal: muestra info a la derecha
function selectGame(id) {
  const infoDiv = document.getElementById("game-info");
  const juego = juegos[id];

  infoDiv.innerHTML = `
    <div class="game-preview">
      <img src="${juego.imagen}" alt="${juego.nombre}" class="info-image">
      <h2>${juego.nombre}</h2>
      <p>${juego.descripcion}</p>
      <button class="play-btn" onclick="window.location.href='${juego.link}'">JUGAR</button>
    </div>
  `;

  // opcional: resaltar el seleccionado
  document.querySelectorAll('.game-card').forEach(card => card.classList.remove('selected'));
  document.getElementById(`card-${id}`).classList.add('selected');
}

function selectTopButton(btn) {
  document.querySelectorAll('.top-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${btn}`).classList.add('active');
}

function goHome() {
  window.location.href = "Principal.html";
}



function selectGame(id) {
  document.querySelectorAll(".game-card").forEach(card => card.classList.remove("active"));
  document.getElementById(`card-${id}`).classList.add("active");

  const game = juegos[id];
  const info = document.getElementById("game-info");

  info.innerHTML = `
    <img src="${game.imagen}" alt="${game.nombre}" class="game-preview">
    <h2>${game.nombre}</h2>
    <p>${game.descripcion}</p>
    <button class="play-btn" onclick="window.location.href='${game.link}'">JUGAR</button>
  `;
}


