// Screen 3: the name draw.
// First time: names flick past and slow down until it lands on the person.
// Returning players: goes straight to the result.
// The result shows who you're buying for, their wishlist, and a box for your own wishlist.
//
// info comes from the Sheet: { name, assignedTo, theirWishlist, myWishlist, allNames }

function showDrawScreen(info, isReturning, onNext) {
  const screen = document.getElementById('screen-draw');
  showScreen('screen-draw');

  if (isReturning) {
    showResult();
  } else {
    spin();
  }

  // ---------- The spinning name draw ----------
  function spin() {
    screen.innerHTML = `
      <div class="big-icon">🎁</div>
      <h1>Drawing your name...</h1>
      <p id="draw-spinner" class="draw-name">?</p>
    `;

    const spinner = document.getElementById('draw-spinner');
    const others = info.allNames.filter((n) => n !== info.name);
    const totalSteps = 20;
    let step = 0;

    function next() {
      step++;
      if (step >= totalSteps) {
        spinner.textContent = info.assignedTo;
        setTimeout(showResult, 1500);
        return;
      }
      spinner.textContent = others[Math.floor(Math.random() * others.length)];
      setTimeout(next, 60 + step * 8); // each name stays a little longer, so it slows down
    }

    next();
  }

  // ---------- The result + wishlists ----------
  function showResult() {
    const theirWishlist = info.theirWishlist
      ? `<div class="wishlist-box">${escapeHtml(info.theirWishlist)}</div>`
      : `<p class="muted">${escapeHtml(info.assignedTo)} hasn't added a wishlist yet. Log in again later with your password to check.</p>`;

    screen.innerHTML = `
      ${isReturning ? `<p>Welcome back, ${escapeHtml(info.name)}!</p>` : ''}
      <div class="big-icon">🎅</div>
      <p>You are the Secret Santa for</p>
      <p class="draw-name">${escapeHtml(info.assignedTo)}</p>
      <p class="muted">Shh, keep it a secret! 🤫</p>

      <h2>${escapeHtml(info.assignedTo)}'s wishlist</h2>
      ${theirWishlist}

      <hr>

      <h2>Your wishlist</h2>
      <label for="wishlist-input" class="wishlist-label">
        What would you like to get? Name specific things, or just the kind of stuff you enjoy.
      </label>
      <textarea id="wishlist-input" rows="4" maxlength="500"
        placeholder="e.g. earrings, anything arts and crafts, useful things for the kitchen, workout gear">${escapeHtml(info.myWishlist || '')}</textarea>
      <button id="wishlist-save" class="btn" type="button">Save my wishlist</button>
      <p id="wishlist-status" class="status"></p>

      <button id="draw-next" class="btn btn-secondary" type="button">See the leaderboard</button>
    `;

    const input = document.getElementById('wishlist-input');
    const saveButton = document.getElementById('wishlist-save');
    const status = document.getElementById('wishlist-status');
    const nextButton = document.getElementById('draw-next');
    let lastSaved = (info.myWishlist || '').trim();

    // Saves the wishlist. Returns true if it worked.
    async function save() {
      saveButton.disabled = true;
      nextButton.disabled = true;
      saveButton.textContent = 'Saving...';
      status.textContent = '';

      let worked = false;
      try {
        const result = await api.saveWishlist(state.password, input.value);
        if (result.ok) {
          lastSaved = result.wishlist;
          status.textContent = 'Saved! You can change it any time by logging in again.';
          worked = true;
        } else {
          status.textContent = result.error || 'Could not save. Please try again.';
        }
      } catch (err) {
        status.textContent = 'Could not connect. Check your internet and try again.';
      }

      saveButton.disabled = false;
      nextButton.disabled = false;
      saveButton.textContent = 'Save my wishlist';
      return worked;
    }

    saveButton.addEventListener('click', save);

    // If they typed something but forgot to press Save, save it for them first.
    nextButton.addEventListener('click', async () => {
      if (input.value.trim() !== lastSaved) {
        const worked = await save();
        if (!worked) return;
      }
      onNext();
    });
  }
}
