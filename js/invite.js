// Screen 2: the invitation card.
// Put your card in the main folder and name it exactly: invitation.png

function showInviteScreen(onNext) {
  const screen = document.getElementById('screen-invite');

  screen.innerHTML = `
    <h1>You're invited! 🎄</h1>
    <a href="invitation.png" target="_blank" rel="noopener">
      <img class="invite-img" src="invitation.png" alt="Secret Santa invitation">
    </a>
    <p class="muted">Tap the card to see it full size.</p>
    <button id="invite-next" class="btn" type="button">Reveal my Secret Santa</button>
  `;

  showScreen('screen-invite');

  const button = document.getElementById('invite-next');
  button.addEventListener('click', () => {
    button.disabled = true;
    onNext();
  });
}
