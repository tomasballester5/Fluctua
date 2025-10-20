document.addEventListener("DOMContentLoaded", () => {
const intro = document.getElementById("intro");
const main = document.getElementById("main-content");
const btn = document.getElementById("btn-continuar");

btn.addEventListener("click", () => {
// Animación de salida suave
intro.style.opacity = "0";
intro.style.transform = "translateY(-20px)";
intro.style.transition = "opacity 0.8s ease, transform 0.8s ease";
  // Mostrar main después de desvanecer la intro
setTimeout(() => {
  intro.style.display = "none";
  main.classList.remove("hidden");
  requestAnimationFrame(() => {
    main.style.opacity = "1";
  });
}, 800);
});
});
