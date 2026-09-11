/* =========================================
   BLUE STRIKE MATCH 3D - LÓGICA Y GRÁFICOS
   ========================================= */

const Game = (function() {
  // 1. GRÁFICOS INCRUSTADOS (Imposible que se rompan)
  const ITEMS = [
    // 0: Balón 3D
    `url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="%23ffffff" stroke="%23001a40" stroke-width="3"/><polygon points="50,15 70,30 62,55 38,55 30,30" fill="%23001a40"/><path d="M50,15 L50,0 M70,30 L90,20 M62,55 L85,75 M38,55 L15,75 M30,30 L10,20" stroke="%23001a40" stroke-width="4"/></svg>')`,
    // 1: Trofeo Oro
    `url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20,20 L80,20 L70,55 C70,75 30,75 30,55 Z" fill="%23facc15" stroke="%23854d0e" stroke-width="4"/><rect x="40" y="70" width="20" height="20" fill="%23eab308"/><path d="M20,20 C5,20 5,45 25,40 M80,20 C95,20 95,45 75,40" fill="none" stroke="%23facc15" stroke-width="8" stroke-linecap="round"/></svg>')`,
    // 2: Guayo Verde
    `url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10,40 C30,20 60,30 80,45 C95,55 90,75 75,75 L15,75 C5,75 0,50 10,40 Z" fill="%2310b981" stroke="%23064e3b" stroke-width="4"/><circle cx="25" cy="80" r="5" fill="%23fff"/><circle cx="50" cy="80" r="5" fill="%23fff"/><circle cx="75" cy="80" r="5" fill="%23fff"/></svg>')`,
    // 3: Escudo Azul
    `url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,5 L90,20 L90,55 C90,85 50,95 50,95 C50,95 10,85 10,55 L10,20 Z" fill="%233b82f6" stroke="%231e3a8a" stroke-width="4"/><polygon points="50,30 65,50 40,50" fill="%23fff"/></svg>')`,
    // 4: Tarjeta / Silbato (Roja)
    `url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="15" width="50" height="70" rx="8" fill="%23ef4444" stroke="%237f1d1d" stroke-width="4"/><circle cx="50" cy="50" r="10" fill="%23fff"/></svg>')`
  ];

  // VARIABLES GLOBALES
  const ROWS = 7, COLS = 7;
  let board = [], selected = null, isProcessing = false, isLevelFinished = false;
  
  let curLevel = parseInt(localStorage.getItem('bs_lvl')) || 1;
  let coins = parseInt(localStorage.getItem('bs_coins')) || 150;
  let stars = parseInt(localStorage.getItem('bs_stars')) || 0;
  let score = 0, goal = 500, moves = 15;
  let audioCtx = null;

  // 2. SISTEMA DE AUDIO (Seguro para móviles)
  function playSound(type) {
    if(!audioCtx || audioCtx.state !== 'running') return;
    let osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    
    if(type === 'match') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'win') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start(); osc.stop(audioCtx.currentTime + 0.6);
    }
  }

  function triggerVibrate(ms) { if(navigator.vibrate) navigator.vibrate(ms); }

  function updateHUD() {
    document.getElementById('ui-coins').innerText = coins;
    document.getElementById('ui-stars').innerText = stars;
  }

  // 3. GENERACIÓN DEL MAPA CURVO
  function renderMap() {
    const cont = document.getElementById('pathContainer');
    cont.innerHTML = '';
    let maxLevels = Math.max(20, curLevel + 5);
    
    for(let i=1; i<=maxLevels; i++) {
      let node = document.createElement('div');
      node.className = 'map-node';
      if(i < curLevel) node.classList.add('completed');
      if(i === curLevel) node.classList.add('active');
      node.innerText = i < curLevel ? '✔' : i;
      
      // Curva ZigZag perfecta
      let offset = Math.sin(i * 0.85) * 80; 
      node.style.transform = `translateX(${offset}px)`;
      
      if(i <= curLevel) node.onclick = () => startLevel(i);
      cont.appendChild(node);
    }
  }

  // 4. INICIO DE NIVEL
  function startLevel(l) {
    score = 0; 
    moves = l === 1 ? 8 : Math.max(12, 20 - Math.floor(l/3));
    goal = l === 1 ? 200 : 400 + (l*150);
    isLevelFinished = false; // RESUELVE EL BUG DE VICTORIA MÚLTIPLE
    
    document.getElementById('mapView').classList.add('hidden');
    document.getElementById('stadiumView').classList.add('hidden');
    document.getElementById('gameView').classList.remove('hidden');
    
    document.getElementById('ui-level').innerText = l;
    document.getElementById('ui-score').innerText = score;
    document.getElementById('ui-goal').innerText = goal;
    document.getElementById('ui-moves').innerText = moves;

    let tut = document.getElementById('tutorialMsg');
    if(l === 1) { tut.classList.remove('hidden'); tut.innerText = '👆 Arrastra para alinear 3 balones iguales'; }
    else { tut.classList.add('hidden'); }

    createBoard();
  }

  function createBoard() {
    do {
      board = [];
      for(let r=0; r<ROWS; r++) {
        board[r] = [];
        for(let c=0; c<COLS; c++) board[r][c] = Math.floor(Math.random() * ITEMS.length);
      }
    } while(findMatches().length > 0);
    drawBoard();
  }

  function drawBoard() {
    let grid = document.getElementById('gridBoard');
    grid.innerHTML = '';
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS; c++) {
        let cell = document.createElement('div');
        cell.className = 'cell';
        if(selected && selected.r === r && selected.c === c) cell.classList.add('selected');
        
        if(board[r][c] !== null) {
          let icon = document.createElement('div');
          icon.style.width = '100%'; icon.style.height = '100%';
          icon.style.background = ITEMS[board[r][c]];
          icon.style.backgroundSize = 'contain';
          icon.style.backgroundRepeat = 'no-repeat';
          icon.style.backgroundPosition = 'center';
          icon.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))';
          icon.className = 'icon-item';
          cell.appendChild(icon);
        }
        
        cell.onclick = () => handleTap(r, c);
        grid.appendChild(cell);
      }
    }
  }

  // 5. LÓGICA DE MATCH 3
  async function handleTap(r, c) {
    if(isProcessing || isLevelFinished) return;
    document.getElementById('tutorialMsg').classList.add('hidden');

    if(!selected) {
      selected = {r,c}; drawBoard();
    } else {
      let isAdjacent = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
      if(isAdjacent) {
        isProcessing = true;
        
        // Intercambio
        let temp = board[selected.r][selected.c];
        board[selected.r][selected.c] = board[r][c];
        board[r][c] = temp;
        drawBoard();

        let matches = findMatches();
        if(matches.length > 0) {
          moves--; document.getElementById('ui-moves').innerText = moves;
          await processCascades();
        } else {
          // Revertir si no hay match
          temp = board[selected.r][selected.c];
          board[selected.r][selected.c] = board[r][c];
          board[r][c] = temp;
          drawBoard();
        }
        selected = null; isProcessing = false;
      } else {
        selected = {r,c}; drawBoard();
      }
    }
  }

  function findMatches() {
    let matched = new Set();
    // Horizontales
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS-2; c++) {
        let v = board[r][c];
        if(v !== null && v === board[r][c+1] && v === board[r][c+2]) {
          matched.add(`${r},${c}`); matched.add(`${r},${c+1}`); matched.add(`${r},${c+2}`);
        }
      }
    }
    // Verticales
    for(let c=0; c<COLS; c++) {
      for(let r=0; r<ROWS-2; r++) {
        let v = board[r][c];
        if(v !== null && v === board[r+1][c] && v === board[r+2][c]) {
          matched.add(`${r},${c}`); matched.add(`${r+1},${c}`); matched.add(`${r+2},${c}`);
        }
      }
    }
    return Array.from(matched).map(s => { let [r,c] = s.split(',').map(Number); return {r,c}; });
  }

  async function processCascades() {
    let matches = findMatches();
    while(matches.length > 0) {
      playSound('match'); triggerVibrate(40);
      score += matches.length * 30;
      document.getElementById('ui-score').innerText = score;

      // Efecto Visual Combo
      if(matches.length >= 4) {
        let msg = document.getElementById('msgCombo');
        msg.classList.add('active');
        setTimeout(() => msg.classList.remove('active'), 800);
        triggerVibrate([50, 50]);
      }

      // Romper fichas
      matches.forEach(({r,c}) => {
        board[r][c] = null;
        let cell = document.getElementById('gridBoard').children[r*COLS + c];
        if(cell) cell.classList.add('exploding');
      });

      await new Promise(res => setTimeout(res, 250));

      // Gravedad
      for(let c=0; c<COLS; c++) {
        let emptyRow = ROWS-1;
        for(let r=ROWS-1; r>=0; r--) {
          if(board[r][c] !== null) {
            board[emptyRow][c] = board[r][c];
            if(emptyRow !== r) board[r][c] = null;
            emptyRow--;
          }
        }
        // Nuevas fichas
        for(let r=emptyRow; r>=0; r--) board[r][c] = Math.floor(Math.random() * ITEMS.length);
      }
      drawBoard();
      await new Promise(res => setTimeout(res, 300));
      matches = findMatches();
    }

    // VERIFICAR VICTORIA/DERROTA
    if(score >= goal && !isLevelFinished) {
      isLevelFinished = true; // EVITA EL BUCLE DEL VIDEO
      setTimeout(() => {
        playSound('win');
        document.getElementById('modalWin').classList.remove('hidden');
      }, 500);
    } else if (moves <= 0 && !isLevelFinished) {
      isLevelFinished = true;
      setTimeout(() => document.getElementById('modalLose').classList.remove('hidden'), 500);
    }
  }

  // 6. API PÚBLICA PARA EL HTML
  return {
    init: function() {
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if(audioCtx.state === 'suspended') audioCtx.resume();
      document.getElementById('startScreen').style.display = 'none';
      updateHUD(); renderMap();
    },
    switchTab: function(tab) {
      if(tab === 'torneo') {
        document.getElementById('mapView').classList.remove('hidden');
        document.getElementById('stadiumView').classList.add('hidden');
        document.getElementById('tabTorneo').classList.add('active');
        document.getElementById('tabEstadio').classList.remove('active');
      } else {
        document.getElementById('mapView').classList.add('hidden');
        document.getElementById('stadiumView').classList.remove('hidden');
        document.getElementById('tabTorneo').classList.remove('active');
        document.getElementById('tabEstadio').classList.add('active');
      }
    },
    claimVictory: function() {
      document.getElementById('modalWin').classList.add('hidden');
      coins += 50; stars += 3;
      if(curLevel === parseInt(document.getElementById('ui-level').innerText)) curLevel++;
      localStorage.setItem('bs_lvl', curLevel);
      localStorage.setItem('bs_coins', coins);
      localStorage.setItem('bs_stars', stars);
      
      document.getElementById('gameView').classList.add('hidden');
      document.getElementById('mapView').classList.remove('hidden');
      updateHUD(); renderMap();
    },
    quitLevel: function() {
      document.getElementById('modalLose').classList.add('hidden');
      document.getElementById('gameView').classList.add('hidden');
      document.getElementById('mapView').classList.remove('hidden');
      updateHUD(); renderMap();
    },
    useBooster: function(type) {
      if(isProcessing || isLevelFinished || coins < 20) return;
      coins -= 20; updateHUD();
      if(type === 'shuffle') {
        createBoard(); triggerVibrate(50);
      }
    }
  };
})();
