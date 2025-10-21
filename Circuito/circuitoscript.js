/* script.js — versión corregida sobre tu base original
   - mantiene toda la estructura anterior
   - randomiza las rotaciones de TODAS las piezas (incluyendo las del camino) para aumentar dificultad
   - mantiene la misma lógica BFS para detección A->B
   - "Mezclar" y "Reset" regeneran/mezclan correctamente y reinician el timer
   - sigue usando playTone/AudioContext del script anterior
*/

const ROWS = 5, COLS = 5;
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const btnMix = document.getElementById('btn-mix');
const btnReset = document.getElementById('btn-reset');
const btnCheck = document.getElementById('btn-check');
const messageEl = document.getElementById('message');

/* Audio (WebAudio, igual que antes) */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ audioCtx = null; }
  }
}
function playTone(freq=440, time=0.08, type='sine', gain=0.08) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time);
  setTimeout(()=>{ try{ o.stop(); }catch(e){} }, Math.max(10, (time+0.02)*1000));
}

/* tipos base (sin rotación) */
const PIECE_TYPES = {
  straight:  [1,0,1,0],
  corner:    [1,1,0,0],
  tee:       [1,1,0,1],
  cross:     [1,1,1,1],
  end:       [1,0,0,0],
};

/* Estado */
let grid = []; // array of cells { type, rot (current), targetRot (correct), r,c, path, el }
let timer = 30;
let timerId = null;
let gameActive = false;
let win = false;

const startCell = {r:0, c:0};
const endCell = {r:ROWS-1, c:COLS-1};

function idx(r,c){ return r*COLS + c; }
function inBounds(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }
function rotatedConns(base, rot){
  const out = [0,0,0,0];
  for(let i=0;i<4;i++) out[(i+rot)%4] = base[i];
  return out;
}

/* SVG renderer: igual que antes, pero sin forzar glow en el svg: glow lo manejamos con CSS cuando .cell.on */
function svgFor(conns, active=false){
  const stroke = active ? '#fff' : '#b9c2c7';
  const strokeWidth = 6;
  let paths = '';
  if(conns[0]) paths += `<path d="M22 6 L22 22" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  if(conns[1]) paths += `<path d="M38 22 L22 22" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  if(conns[2]) paths += `<path d="M22 38 L22 22" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  if(conns[3]) paths += `<path d="M6 22 L22 22" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  const centerFill = active ? '<circle cx="22" cy="22" r="6" fill="#fff" />' : '<circle cx="22" cy="22" r="6" fill="#9fb0b6" />';
  return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">${paths}${centerFill}</svg>`;
}

/* ---------- GENERACIÓN DE TABLERO ---------- */
/* buildPath: genera un camino simple (sin repetir) desde start hasta end */
function buildPath(start, end) {
  const maxAttempts = 2000;
  let attempts = 0;
  while(attempts++ < maxAttempts){
    const visited = new Set();
    const path = [];
    path.push(start);
    visited.add(idx(start.r,start.c));
    while(path.length){
      const cur = path[path.length-1];
      if(cur.r === end.r && cur.c === end.c) return path.slice();
      const nbs = shuffle([
        {r:cur.r-1,c:cur.c},
        {r:cur.r,c:cur.c+1},
        {r:cur.r+1,c:cur.c},
        {r:cur.r,c:cur.c-1},
      ]).filter(n => inBounds(n.r,n.c) && !visited.has(idx(n.r,n.c)));
      if(nbs.length===0){
        visited.delete(idx(cur.r,cur.c));
        path.pop();
      } else {
        const next = nbs[0];
        visited.add(idx(next.r,next.c));
        path.push(next);
      }
    }
  }
  // fallback (muy improbable)
  const fallback = [];
  for(let r=0;r<=end.r;r++) fallback.push({r,c:0});
  for(let c=1;c<=end.c;c++) fallback.push({r:end.r,c});
  return fallback;
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function dirBetween(a,b){
  if(b.r === a.r-1 && b.c === a.c) return 0;
  if(b.c === a.c+1 && b.r === a.r) return 1;
  if(b.r === a.r+1 && b.c === a.c) return 2;
  if(b.c === a.c-1 && b.r === a.r) return 3;
  return null;
}
function rotationForSingleDir(dir){ return (4 - dir) % 4; }
function computeRotationForDirections(type, neighbors){
  const base = PIECE_TYPES[type];
  for(let rot=0; rot<4; rot++){
    const rc = rotatedConns(base, rot);
    let ok=true;
    for(const d of neighbors){ if(rc[d] !== 1) { ok=false; break; } }
    if(ok) return rot;
  }
  return 0;
}

/* generateBoard: crea tipos (y la targetRot correcta) y luego ALEATORIZA las rotaciones iniciales
   -> así el tablero es SOLVABLE (por rotaciones) pero no viene resuelto (difícil)
*/
function generateBoard(){
  grid = new Array(ROWS*COLS);
  const path = buildPath(startCell, endCell);

  // asigno tipos y targetRot correctas para cada celda del camino
  for(let i=0;i<path.length;i++){
    const {r,c} = path[i];
    const neighbors = [];
    if(i>0){
      const prev = path[i-1];
      if(prev.r === r-1 && prev.c===c) neighbors.push(0);
      if(prev.r === r+1 && prev.c===c) neighbors.push(2);
      if(prev.c === c-1 && prev.r===r) neighbors.push(3);
      if(prev.c === c+1 && prev.r===r) neighbors.push(1);
    }
    if(i<path.length-1){
      const next = path[i+1];
      if(next.r === r-1 && next.c===c) neighbors.push(0);
      if(next.r === r+1 && next.c===c) neighbors.push(2);
      if(next.c === c-1 && next.r===r) neighbors.push(3);
      if(next.c === c+1 && next.r===r) neighbors.push(1);
    }
    let type = 'end';
    if(neighbors.length === 1) type = 'end';
    else if(neighbors.length === 2){
      if((neighbors.includes(0) && neighbors.includes(2)) || (neighbors.includes(1) && neighbors.includes(3))) type = 'straight';
      else type = 'corner';
    } else if(neighbors.length === 3) type = 'tee';
    else type = 'cross';
    const correctRot = computeRotationForDirections(type, neighbors);
    // store targetRot but DON'T aplicar target como rot actual — lo hacemos aleatorio luego
    grid[idx(r,c)] = { type, targetRot: correctRot, rot: 0, r, c, path:true, el:null };
  }

  // resto de celdas -> tipos aleatorios y sin targetRot (no forman parte del camino)
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const id = idx(r,c);
      if(grid[id]) continue;
      const pool = ['straight','corner','tee','cross','straight','corner','end'];
      const t = pool[Math.floor(Math.random()*pool.length)];
      grid[id] = { type: t, targetRot: null, rot: 0, r, c, path:false, el:null };
    }
  }

  // start/end: forzamos tipo 'end' y computamos su targetRot
  const startNeighbor = path[1];
  const startDir = dirBetween(startCell, startNeighbor);
  grid[idx(startCell.r, startCell.c)].type = 'end';
  grid[idx(startCell.r, startCell.c)].targetRot = rotationForSingleDir(startDir);

  const endNeighbor = path[path.length-2];
  const endDir = dirBetween(endCell, endNeighbor);
  grid[idx(endCell.r, endCell.c)].type = 'end';
  grid[idx(endCell.r, endCell.c)].targetRot = rotationForSingleDir(endDir);

  // AHORA: randomizo rotaciones actuales para TODAS las celdas (esto hace el puzzle difícil)
  for(const cell of grid){
    cell.rot = Math.floor(Math.random()*4);
  }

  renderBoard();
}

/* ---------- RENDER ---------- */
function renderBoard(){
  boardEl.innerHTML = '';
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell = grid[idx(r,c)];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r; el.dataset.c = c;
      const base = PIECE_TYPES[cell.type] || PIECE_TYPES['straight'];
      const conns = rotatedConns(base, cell.rot || 0);
      el.innerHTML = svgFor(conns, false);

      if(r === startCell.r && c === startCell.c){
        const badge = document.createElement('div'); badge.style.position='absolute';
        badge.style.right='6px'; badge.style.top='6px'; badge.style.fontSize='12px';
        badge.style.color='#fff'; badge.textContent='A'; el.appendChild(badge);
      } else if(r === endCell.r && c === endCell.c){
        const badge = document.createElement('div'); badge.style.position='absolute';
        badge.style.right='6px'; badge.style.top='6px'; badge.style.fontSize='12px';
        badge.style.color='#fff'; badge.textContent='B'; el.appendChild(badge);
      }

      boardEl.appendChild(el);
      cell.el = el;

      // click -> rotar la pieza (y actualizar)
      el.addEventListener('click', ()=>{
        ensureAudio();
        if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        cell.rot = (cell.rot + 1) % 4;
        // animacion "giro" visual:
        el.style.transition = 'transform 160ms ease';
        el.style.transform = `rotate(${cell.rot * 90}deg)`;
        playTone(720 + Math.random()*80, 0.08, 'sine', 0.06);
        setTimeout(()=> {
          // re-render svg con nueva orientación lógica
          const base2 = PIECE_TYPES[cell.type];
          const conns2 = rotatedConns(base2, cell.rot);
          cell.el.innerHTML = svgFor(conns2, false)
            + ( (r===startCell.r && c===startCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">A</div>` : '' )
            + ( (r===endCell.r && c===endCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">B</div>` : '' );
          setTimeout(()=> el.style.transform = '', 220);
          evaluateConnections(false);
        }, 10);
      });
    }
  }
  evaluateConnections(false);
}

/* ---------- EVALUACIÓN (BFS desde A) ---------- */
function evaluateConnections(announce=true){
  // limpiar clases
  grid.forEach(cell => { if(cell.el) cell.el.classList.remove('on'); });
  win = false;

  const q = [];
  const visited = new Set();
  q.push({r:startCell.r, c:startCell.c});
  visited.add(idx(startCell.r,startCell.c));
  let reached = false;

  while(q.length){
    const cur = q.shift();
    const curCell = grid[idx(cur.r,cur.c)];
    if(cur.r === endCell.r && cur.c === endCell.c){ reached = true; break; }
    const base = PIECE_TYPES[curCell.type];
    const curConns = rotatedConns(base, curCell.rot || 0);
    const deltas = [ [-1,0], [0,1], [1,0], [0,-1] ];
    for(let d=0; d<4; d++){
      if(!curConns[d]) continue;
      const nr = cur.r + deltas[d][0]; const nc = cur.c + deltas[d][1];
      if(!inBounds(nr,nc)) continue;
      const nbCell = grid[idx(nr,nc)];
      const nbBase = PIECE_TYPES[nbCell.type];
      const nbConns = rotatedConns(nbBase, nbCell.rot || 0);
      const opposite = (d+2)%4;
      if(nbConns[opposite]){
        const id = idx(nr,nc);
        if(!visited.has(id)){
          visited.add(id);
          q.push({r:nr,c:nc});
        }
      }
    }
  }

  if(reached){
    for(const id of visited){
      const cell = grid[id];
      if(cell && cell.el){
        cell.el.classList.add('on'); // CSS manejará el glow en el SVG
        const base2 = PIECE_TYPES[cell.type];
        const conns2 = rotatedConns(base2, cell.rot);
        cell.el.innerHTML = svgFor(conns2, true)
          + ( (cell.r===startCell.r && cell.c===startCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">A</div>` : '' )
          + ( (cell.r===endCell.r && cell.c===endCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">B</div>` : '' );
      }
    }
    win = true;
    statusEl.textContent = '✅ Conectado';
    statusEl.style.color = '#cfeee6';
    if(announce){
      messageEl.textContent = '¡Bien! A está conectado con B.';
      playTone(1200,0.18,'triangle',0.14);
      stopTimer();
    } else {
      playTone(1000, 0.06, 'sine', 0.06);
    }
  } else {
    // redraw reachable (visited) but not glowing
    for(const id of visited){
      const cell = grid[id];
      if(cell && cell.el){
        const base2 = PIECE_TYPES[cell.type];
        const conns2 = rotatedConns(base2, cell.rot);
        cell.el.innerHTML = svgFor(conns2, false)
          + ( (cell.r===startCell.r && cell.c===startCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">A</div>` : '' )
          + ( (cell.r===endCell.r && cell.c===endCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">B</div>` : '' );
      }
    }
    statusEl.textContent = 'Desconectado';
    statusEl.style.color = '';
    if(announce){
      messageEl.textContent = 'No hay ruta completa aún.';
      playTone(320, 0.08, 'sine', 0.06);
    }
  }
}

/* ---------- TIMER ---------- */
function startTimer(){
  stopTimer();
  timer = 30;
  updateTimerDisplay();
  gameActive = true;
  timerId = setInterval(()=>{
    timer--;
    updateTimerDisplay();
    if(timer <= 0){
      stopTimer();
      gameActive = false;
      messageEl.textContent = '⨉ Tiempo agotado. Intentá de nuevo.';
      // apagar glows
      grid.forEach(cell => {
        if(cell.el) {
          cell.el.classList.remove('on');
          const base2 = PIECE_TYPES[cell.type];
          const conns2 = rotatedConns(base2, cell.rot);
          cell.el.innerHTML = svgFor(conns2, false)
            + ( (cell.r===startCell.r && cell.c===startCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">A</div>` : '' )
            + ( (cell.r===endCell.r && cell.c===endCell.c) ? `<div style="position:absolute;right:6px;top:6px;font-size:12px;color:#fff">B</div>` : '' );
        }
      });
      statusEl.textContent = '⨉ Tiempo';
      playTone(120, 0.5, 'sine', 0.18);
    }
  }, 1000);
}
function stopTimer(){ if(timerId) clearInterval(timerId); timerId = null; }
function updateTimerDisplay(){ const mm = Math.floor(timer/60).toString().padStart(2,'0'); const ss = (timer%60).toString().padStart(2,'0'); timerEl.textContent = `${mm}:${ss}`; }

/* ---------- BOTONES ---------- */
/* Mezclar: re-randomiza rotaciones del tablero (sin cambiar tipos del camino) y reinicia timer */
btnMix.addEventListener('click', ()=>{
  ensureAudio();
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  playTone(680,0.08,'sine',0.08);
  // random rotations for ALL cells (incl path) to increase difficulty
  for(const cell of grid){
    cell.rot = Math.floor(Math.random()*4);
  }
  renderBoard();
  startTimer();
  messageEl.textContent = 'Tablero mezclado.';
});

/* Reset: genera un tablero nuevo (nuevo camino), reinicia timer */
btnReset.addEventListener('click', ()=>{
  ensureAudio();
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  playTone(520,0.08,'sine',0.08);
  generateBoard();
  startTimer();
  messageEl.textContent = 'Tablero reiniciado.';
});

/* Check manual */
btnCheck.addEventListener('click', ()=>{
  ensureAudio();
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  evaluateConnections(true);
});

/* ---------- INIT ---------- */
generateBoard();
startTimer();
messageEl.textContent = 'Conectá A con B en 30s. Rotá las piezas con click.';
setTimeout(()=> evaluateConnections(false), 100);
