// Controls the order of the screens:
// lock -> game -> invitation -> draw -> leaderboard
// Players who have already played go: lock -> draw -> leaderboard

// Who is playing during this visit
const state = {
  password: '',
  name: ''
};

// Show one screen and hide the rest
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.hidden = (screen.id !== id);
  });
  window.scrollTo(0, 0);
}

// Makes text safe to put inside the page (e.g. a name containing < or &)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Show a loading message while talking to the Sheet.
// If it fails, show the error and a "Try again" button, and keep trying
// until it works. Returns the successful result.
async function runStep(message, task) {
  showScreen('screen-loading');
  const text = document.getElementById('loading-text');
  const retry = document.getElementById('loading-retry');

  while (true) {
    text.textContent = message;
    retry.hidden = true;

    try {
      const result = await task();
      if (result.ok) return result;
      text.textContent = result.error || 'Something went wrong.';
    } catch (err) {
      text.textContent = 'Could not connect. Check your internet and try again.';
    }

    retry.hidden = false;
    await new Promise((resolve) => retry.addEventListener('click', resolve, { once: true }));
  }
}

function start() {
  showLockScreen((password, result) => {
    state.password = password;
    state.name = result.name;

    if (result.played) {
      goToDraw(true);   // returning player: skip the game
    } else {
      goToGame();
    }
  });
}

function goToGame() {
  showGameScreen(async (score) => {
    await runStep('Saving your score...', () => api.submitScore(state.password, score));
    goToInvite();
  });
}

function goToInvite() {
  showInviteScreen(() => goToDraw(false));
}

async function goToDraw(isReturning) {
  const result = await runStep('Finding your Secret Santa...', () => api.reveal(state.password));
  showDrawScreen(result.assignedTo, isReturning, () => goToLeaderboard());
}

async function goToLeaderboard() {
  const result = await runStep('Loading the leaderboard...', () => api.leaderboard());
  showLeaderboardScreen(result.players, state.name);
}

start();
