document.addEventListener("DOMContentLoaded", () => {
const intro = document.getElementById("intro");
const main = document.getElementById("main-content");
const btn = document.getElementById("btn-continuar");

btn.addEventListener("click", () => {
// Animación de salida con blur
intro.style.transition = "opacity 1s ease, filter 1s ease, transform 1s ease";
intro.style.opacity = "0";
intro.style.filter = "blur(10px)";
intro.style.transform = "scale(1.05)";
  setTimeout(() => {
  intro.style.display = "none";
  main.classList.remove("hidden");
  requestAnimationFrame(() => {
    main.style.opacity = "1";
  });
}, 900);
});
});
