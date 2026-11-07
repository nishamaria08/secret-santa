// Falling snow and twinkling fairy lights behind the page.
// Purely decoration: it never blocks taps or clicks.

(function () {
  const snow = document.getElementById('snow');
  const lights = document.getElementById('lights');

  // ---------- Snow ----------
  // Fewer flakes on phones so it stays smooth
  const flakeCount = window.innerWidth < 600 ? 25 : 45;
  const flakeShapes = ['❅', '❆', '•'];

  for (let i = 0; i < flakeCount; i++) {
    const flake = document.createElement('span');
    flake.className = 'flake';
    flake.textContent = flakeShapes[Math.floor(Math.random() * flakeShapes.length)];

    const duration = 8 + Math.random() * 10; // 8 to 18 seconds to fall
    flake.style.left = (Math.random() * 100) + '%';
    flake.style.fontSize = (10 + Math.random() * 14) + 'px';
    flake.style.opacity = 0.5 + Math.random() * 0.5;
    flake.style.animationDuration = duration + 's';
    // A negative delay means the snow is already mid-fall when the page opens
    flake.style.animationDelay = (-Math.random() * duration) + 's';
    flake.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');

    snow.appendChild(flake);
  }

  // ---------- Fairy lights along the top ----------
  const colours = ['#e53935', '#fdd835', '#ffffff', '#ff9800'];
  const bulbCount = Math.max(8, Math.floor(window.innerWidth / 40));

  for (let i = 0; i < bulbCount; i++) {
    const bulb = document.createElement('span');
    bulb.className = 'bulb';
    bulb.style.setProperty('--colour', colours[i % colours.length]);
    lights.appendChild(bulb);
  }

  // ---------- Trees along the snowy ground ----------
  const ground = document.getElementById('ground');
  const treeCount = Math.max(4, Math.floor(window.innerWidth / 90));

  for (let i = 0; i < treeCount; i++) {
    const tree = document.createElement('span');
    tree.className = 'tree';
    tree.textContent = '🎄';
    tree.style.fontSize = (1.8 + Math.random() * 1.2) + 'rem';
    ground.appendChild(tree);
  }

  // ---------- Santa flies at a different height each pass ----------
  const santa = document.getElementById('santa');
  santa.addEventListener('animationiteration', (event) => {
    if (event.animationName !== 'fly') return; // ignore the up-and-down bobbing
    santa.style.top = (6 + Math.random() * 22) + 'vh';
  });
})();
