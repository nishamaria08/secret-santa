// Screen 4: the leaderboard.
// Shows everyone who has played, highest score first, with your own row highlighted.
// players comes from the Sheet: [{ name, score }, ...] already sorted.

function showLeaderboardScreen(players, myName) {
  const screen = document.getElementById('screen-leaderboard');
  showScreen('screen-leaderboard');
  render(players);

  function render(list) {
    screen.innerHTML = `
      <div class="big-icon">🏆</div>
      <h1>Leaderboard</h1>
      ${list.length === 0 ? '<p class="muted">Nobody has played yet.</p>' : buildList(list)}
      <p class="muted">${list.length} ${list.length === 1 ? 'person has' : 'people have'} played so far.</p>
      <button id="lb-refresh" class="btn" type="button">Refresh scores</button>
      <button id="lb-back" class="btn btn-secondary" type="button">Back to my Secret Santa</button>
      <p id="lb-status" class="status"></p>
    `;

    const refreshButton = document.getElementById('lb-refresh');
    const status = document.getElementById('lb-status');

    refreshButton.addEventListener('click', async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Refreshing...';
      status.textContent = '';
      try {
        const result = await api.leaderboard();
        if (result.ok) {
          render(result.players);
          return;
        }
        status.textContent = result.error || 'Could not refresh. Please try again.';
      } catch (err) {
        status.textContent = 'Could not connect. Check your internet and try again.';
      }
      refreshButton.disabled = false;
      refreshButton.textContent = 'Refresh scores';
    });

    document.getElementById('lb-back').addEventListener('click', () => goToDraw(true));
  }

  function buildList(list) {
    const medals = ['🥇', '🥈', '🥉'];
    let rank = 0;
    let previousScore = null;

    const rows = list.map((player, index) => {
      // Equal scores share the same rank (e.g. 1, 2, 2, 4)
      if (player.score !== previousScore) rank = index + 1;
      previousScore = player.score;

      const isMe = player.name === myName;
      const rankLabel = rank <= 3 ? medals[rank - 1] : rank;

      return `
        <li class="lb-row${isMe ? ' lb-me' : ''}">
          <span class="lb-rank">${rankLabel}</span>
          <span class="lb-name">${escapeHtml(player.name)}${isMe ? ' (you)' : ''}</span>
          <span class="lb-score">${player.score}</span>
        </li>
      `;
    });

    return `<ol class="lb-list">${rows.join('')}</ol>`;
  }
}
