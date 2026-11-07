// Every call to the Google Sheet goes through here.

async function callBackend(payload) {
  // Sending as plain text avoids a browser security check (CORS)
  // that Apps Script doesn't support.
  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Network error ' + response.status);
  }
  return response.json();
}

const api = {
  login: (password) => callBackend({ action: 'login', password: password }),
  submitScore: (password, score) => callBackend({ action: 'submitScore', password: password, score: score }),
  reveal: (password) => callBackend({ action: 'reveal', password: password }),
  leaderboard: () => callBackend({ action: 'leaderboard' })
};
