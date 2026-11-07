// Screen 1b: Tap the Santa
// A grid of squares. Santa appears in a random square; tap him before he moves.
// Sometimes a snowman decoy appears too. Tapping it costs points.
// Practice rounds are not scored. The real round's score is passed to onFinished(score).

const GAME = {
  practiceSeconds: 8,
  realSeconds: 20,
  gridSize: 4,       // 4 = a 4x4 grid (16 squares)
  hitPoints: 10,     // points for tapping Santa
  missPoints: 10,    // points lost for tapping an empty square
  decoyPoints: 20,   // points lost for tapping the snowman
  decoyChance: 0.6,  // how often the snowman appears (0.6 = 60% of the time)
  slowestMs: 750,    // how long Santa stays still at the start
  fastestMs: 400     // how long Santa stays still by the end (he speeds up)
};

function showGameScreen(onFinished) {
  const screen = document.getElementById('screen-game');
  showScreen('screen-game');
  showIntro();

  // ---------- Intro: the rules ----------
  function showIntro() {
    screen.innerHTML = `
      <div class="big-icon">🎅</div>
      <h1>Tap the Santa</h1>
      <p>Hi ${escapeHtml(state.name)}! Santa pops up in a random square. Tap him as fast as you can. He gets faster as time runs out.</p>
      <p><strong>+${GAME.hitPoints}</strong> for each 🎅<br>
         <strong>−${GAME.decoyPoints}</strong> for tapping the ⛄ snowman<br>
         <strong>−${GAME.missPoints}</strong> for tapping an empty square</p>
      <p>You have ${GAME.realSeconds} seconds and only <strong>one</strong> real go, so practise first.</p>
      <button id="game-practice" class="btn" type="button">Practice round (${GAME.practiceSeconds} seconds)</button>
      <button id="game-real" class="btn btn-secondary" type="button">Skip practice and play for real</button>
    `;
    document.getElementById('game-practice').addEventListener('click', startPractice);
    document.getElementById('game-real').addEventListener('click', startReal);
  }

  function startPractice() {
    playRound(GAME.practiceSeconds, true, showPracticeResult);
  }

  function startReal() {
    playRound(GAME.realSeconds, false, showFinalResult);
  }

  // ---------- After a practice round ----------
  function showPracticeResult(score) {
    screen.innerHTML = `
      <h1>Practice over</h1>
      <p>You scored <strong>${score}</strong> in ${GAME.practiceSeconds} seconds.</p>
      <p>The real game lasts ${GAME.realSeconds} seconds and you only get one go.</p>
      <button id="game-real" class="btn" type="button">I'm ready, start the real game</button>
      <button id="game-practice" class="btn btn-secondary" type="button">Practice again</button>
    `;
    document.getElementById('game-real').addEventListener('click', startReal);
    document.getElementById('game-practice').addEventListener('click', startPractice);
  }

  // ---------- After the real round ----------
  function showFinalResult(score) {
    screen.innerHTML = `
      <div class="big-icon">🎉</div>
      <h1>Well done!</h1>
      <p>Your score</p>
      <p class="final-score">${score}</p>
      <button id="game-continue" class="btn" type="button">Continue</button>
    `;
    const button = document.getElementById('game-continue');
    button.addEventListener('click', () => {
      button.disabled = true; // stop double taps saving twice
      onFinished(score);
    });
  }

  // ---------- One round of the game ----------
  function playRound(seconds, isPractice, whenDone) {
    screen.innerHTML = `
      <p class="game-label">${isPractice ? 'Practice round' : 'Real game'}</p>
      <div class="game-status">
        <span>Time: <strong id="game-time">${seconds}</strong></span>
        <span>Score: <strong id="game-score">0</strong></span>
      </div>
      <p id="game-message" class="game-message">Get ready...</p>
      <div id="game-grid" class="game-grid"></div>
    `;

    const timeEl = document.getElementById('game-time');
    const scoreEl = document.getElementById('game-score');
    const messageEl = document.getElementById('game-message');
    const grid = document.getElementById('game-grid');

    // Build the squares
    const cellCount = GAME.gridSize * GAME.gridSize;
    grid.style.gridTemplateColumns = `repeat(${GAME.gridSize}, 1fr)`;
    const cells = [];
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'game-cell';
      cell.dataset.index = i;
      grid.appendChild(cell);
      cells.push(cell);
    }

    let score = 0;
    let santaIndex = -1;
    let decoyIndex = -1;
    let running = false;
    let startTime = 0;
    let endTime = 0;
    let moveTimer = null;
    let clockTimer = null;

    function randomCell() {
      return Math.floor(Math.random() * cellCount);
    }

    // Move Santa (and maybe the snowman) to new random squares
    function placeSanta() {
      cells.forEach((cell) => { cell.textContent = ''; });

      let next;
      do {
        next = randomCell();
      } while (next === santaIndex);
      santaIndex = next;
      cells[santaIndex].textContent = '🎅';

      decoyIndex = -1;
      if (Math.random() < GAME.decoyChance) {
        do {
          decoyIndex = randomCell();
        } while (decoyIndex === santaIndex);
        cells[decoyIndex].textContent = '⛄';
      }

      // Santa gets faster as time goes on
      const progress = Math.min(1, (Date.now() - startTime) / (seconds * 1000));
      const delay = GAME.slowestMs - (GAME.slowestMs - GAME.fastestMs) * progress;

      clearTimeout(moveTimer);
      moveTimer = setTimeout(placeSanta, delay);
    }

    // Taps (works for both touchscreens and mouse clicks)
    grid.addEventListener('pointerdown', (event) => {
      if (!running) return;
      const cell = event.target.closest('.game-cell');
      if (!cell) return;
      event.preventDefault();

      const index = Number(cell.dataset.index);
      if (index === santaIndex) {
        score += GAME.hitPoints;
        placeSanta();
      } else if (index === decoyIndex) {
        score = Math.max(0, score - GAME.decoyPoints);
        cells[decoyIndex].textContent = '';
        decoyIndex = -1;
      } else {
        score = Math.max(0, score - GAME.missPoints);
      }
      scoreEl.textContent = score;
    });

    // 3, 2, 1 countdown, then start
    let count = 3;
    messageEl.textContent = count;
    const countdown = setInterval(() => {
      count--;
      if (count > 0) {
        messageEl.textContent = count;
      } else {
        clearInterval(countdown);
        begin();
      }
    }, 1000);

    function begin() {
      running = true;
      messageEl.textContent = 'Go!';
      startTime = Date.now();
      endTime = startTime + seconds * 1000;
      placeSanta();
      clockTimer = setInterval(tick, 100);
    }

    function tick() {
      const msLeft = endTime - Date.now();
      timeEl.textContent = Math.max(0, Math.ceil(msLeft / 1000));
      if (msLeft <= 0) finish();
    }

    function finish() {
      running = false;
      clearInterval(clockTimer);
      clearTimeout(moveTimer);
      cells.forEach((cell) => { cell.textContent = ''; });
      messageEl.textContent = "Time's up!";
      setTimeout(() => whenDone(score), 1000);
    }
  }
}
