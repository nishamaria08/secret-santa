// Screen 1a: "Play to unlock" + password box.
// When the password is right, calls onUnlocked(password, result).

function showLockScreen(onUnlocked) {
  const screen = document.getElementById('screen-lock');

  screen.innerHTML = `
    <div class="big-icon">🔒</div>
    <h1>Secret Santa</h1>
    <p>Play the game to unlock your Secret Santa.</p>

    <button id="lock-play" class="btn" type="button">Play to unlock</button>

    <form id="lock-form" hidden>
      <label for="lock-password">Enter your password</label>
      <input id="lock-password" type="text"
             autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
      <button id="lock-submit" class="btn" type="submit">Unlock</button>
      <p id="lock-error" class="error"></p>
    </form>
  `;

  showScreen('screen-lock');

  const playButton = document.getElementById('lock-play');
  const form = document.getElementById('lock-form');
  const input = document.getElementById('lock-password');
  const submitButton = document.getElementById('lock-submit');
  const error = document.getElementById('lock-error');

  // Step 1: "Play to unlock" reveals the password box
  playButton.addEventListener('click', () => {
    playButton.hidden = true;
    form.hidden = false;
    input.focus();
  });

  // Step 2: check the password with the Google Sheet
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop the page reloading

    const password = input.value.trim();
    if (password === '') {
      error.textContent = 'Please enter your password.';
      return;
    }

    error.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Checking...';

    try {
      const result = await api.login(password);
      if (result.ok) {
        onUnlocked(password, result);
        return;
      }
      error.textContent = result.error === 'Wrong password'
        ? "That password didn't work. Check it and try again."
        : result.error;
    } catch (err) {
      error.textContent = 'Could not connect. Check your internet and try again.';
    }

    submitButton.disabled = false;
    submitButton.textContent = 'Unlock';
  });
}
