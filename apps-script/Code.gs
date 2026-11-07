// =============================================================
// Secret Santa backend (Google Apps Script)
// Paste this whole file into Extensions -> Apps Script in your Sheet.
// The website talks to this script; it never sees the Sheet directly.
// =============================================================

const SHEET_NAME = 'Players';

// Column positions in the Players tab (0 = column A)
const COL = {
  name: 0,        // A
  password: 1,    // B
  played: 2,      // C
  score: 3,       // D
  assignedTo: 4,  // E
  playedAt: 5     // F
};

// -------------------------------------------------------------
// Entry points
// -------------------------------------------------------------

// Opening the web app URL in a browser shows this. Handy for testing.
function doGet() {
  return json({ ok: true, message: 'Secret Santa backend is running' });
}

// The website sends every request here as JSON: { action: '...', ... }
function doPost(e) {
  // Only one request at a time, so two people can't clash.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const req = JSON.parse(e.postData.contents);
    let result;

    switch (req.action) {
      case 'login':
        result = login(req.password);
        break;
      case 'submitScore':
        result = submitScore(req.password, req.score);
        break;
      case 'reveal':
        result = reveal(req.password);
        break;
      case 'leaderboard':
        result = leaderboard();
        break;
      default:
        result = { ok: false, error: 'Unknown action' };
    }

    return json(result);
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// Actions
// -------------------------------------------------------------

// Check the password. Tells the website the player's name and
// whether they have already played.
function login(password) {
  const rows = getRows();
  const player = findPlayer(rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };

  ensureAssignments(rows);

  return { ok: true, name: player.name, played: player.played };
}

// Save the game score and mark the player as played.
// A second attempt is ignored, so nobody can replay for a better score.
function submitScore(password, score) {
  const rows = getRows();
  const player = findPlayer(rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };
  if (player.played) return { ok: true, alreadyPlayed: true };

  const cleanScore = Math.max(0, Math.round(Number(score) || 0));
  const sheet = getSheet();
  sheet.getRange(player.rowNumber, COL.played + 1).setValue(true);
  sheet.getRange(player.rowNumber, COL.score + 1).setValue(cleanScore);
  sheet.getRange(player.rowNumber, COL.playedAt + 1).setValue(new Date());

  return { ok: true };
}

// Tell the player who they are buying for (only after they've played).
function reveal(password) {
  const rows = getRows();
  const player = findPlayer(rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };
  if (!player.played) return { ok: false, error: 'Play the game first' };

  return { ok: true, name: player.name, assignedTo: player.assignedTo };
}

// Everyone who has played, highest score first.
// Ties go to whoever played first.
function leaderboard() {
  const rows = getRows()
    .filter(r => r.played)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.playedAt - b.playedAt;
    })
    .map(r => ({ name: r.name, score: r.score }));

  return { ok: true, players: rows };
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Could not find a tab called "' + SHEET_NAME + '"');
  return sheet;
}

// Read every player row from the sheet (skips blank rows).
function getRows() {
  const values = getSheet().getDataRange().getValues();
  const rows = [];

  for (let i = 1; i < values.length; i++) { // start at 1 to skip the header row
    const r = values[i];
    const name = String(r[COL.name]).trim();
    if (name === '') continue;

    rows.push({
      rowNumber: i + 1, // sheet rows start at 1
      name: name,
      password: String(r[COL.password]).trim(),
      played: String(r[COL.played]).toUpperCase() === 'TRUE',
      score: Number(r[COL.score]) || 0,
      assignedTo: String(r[COL.assignedTo]).trim(),
      playedAt: r[COL.playedAt] instanceof Date ? r[COL.playedAt].getTime() : 0
    });
  }

  return rows;
}

// Find a player by password. Not case-sensitive, so phone
// auto-capitalisation doesn't lock anyone out.
function findPlayer(rows, password) {
  const p = String(password || '').trim().toLowerCase();
  if (p === '') return null;
  return rows.find(r => r.password.toLowerCase() === p) || null;
}

// The first time anyone logs in, decide everyone's Secret Santa at once.
// Shuffle the names and give each person the next one along the list
// (the last person gets the first). Nobody ever gets themselves, and
// the draw can never get stuck at the end.
function ensureAssignments(rows) {
  const filled = rows.filter(r => r.assignedTo !== '').length;
  if (filled === rows.length) return; // already done

  if (filled > 0) {
    throw new Error('Some names in column E are missing. Clear all of column E (except the header) and try again.');
  }
  if (rows.length < 2) {
    throw new Error('Add at least 2 players to the sheet.');
  }

  const shuffled = rows.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  const sheet = getSheet();
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length];
    giver.assignedTo = receiver.name;
    sheet.getRange(giver.rowNumber, COL.assignedTo + 1).setValue(receiver.name);
  }
}