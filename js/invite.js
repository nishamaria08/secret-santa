// Screen 2: the invitation card.
// Put your card in the main folder and name it exactly: invitation.png

function showInviteScreen(onNext) {
  const screen = document.getElementById('screen-invite');

  screen.innerHTML = `
    
    <img class="invite-img" src="invitation.png" alt="Secret Santa invitation" draggable="false">
    <button id="invite-next" class="btn" type="button">Reveal my Secret Santa</button>
  `;

  showScreen('screen-invite');

  const button = document.getElementById('invite-next');
  button.addEventListener('click', () => {
    button.disabled = true;
    onNext();
  });
}
