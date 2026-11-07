// =============================================================
// Secret Santa backend (Google Apps Script)
// Paste this whole file into Extensions -> Apps Script in your Sheet.
// The website talks to this script; it never sees the Sheet directly.
// =============================================================

const SHEET_NAME = 'Players';

// Column headers the script looks for in row 1 of the Players tab.
// The columns can be in any order; only the header text matters.
const HEADERS = {
  name: 'name',
  password: 'password',
  played: 'played',
  score: 'score',
  assignedTo: 'assigned_to',
  playedAt: 'played_at',
  wishlist: 'wishlist'
};

const WISHLIST_MAX_LENGTH = 500;

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
      case 'saveWishlist':
        result = saveWishlist(req.password, req.wishlist);
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
  const data = loadData();
  const player = findPlayer(data.rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };

  ensureAssignments(data);

  return { ok: true, name: player.name, played: player.played };
}

// Save the game score and mark the player as played.
// A second attempt is ignored, so nobody can replay for a better score.
function submitScore(password, score) {
  const data = loadData();
  const player = findPlayer(data.rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };
  if (player.played) return { ok: true, alreadyPlayed: true };

  const cleanScore = Math.max(0, Math.round(Number(score) || 0));
  setCell(data, player, 'played', true);
  setCell(data, player, 'score', cleanScore);
  setCell(data, player, 'playedAt', new Date());

  return { ok: true };
}

// Tell the player who they are buying for (only after they've played),
// that person's wishlist, and their own wishlist so they can edit it.
function reveal(password) {
  const data = loadData();
  const player = findPlayer(data.rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };
  if (!player.played) return { ok: false, error: 'Play the game first' };

  const receiver = data.rows.find(r => r.name === player.assignedTo);

  return {
    ok: true,
    name: player.name,
    assignedTo: player.assignedTo,
    theirWishlist: receiver ? receiver.wishlist : '',
    myWishlist: player.wishlist,
    allNames: data.rows.map(r => r.name) // used for the spinning name draw
  };
}

// Save the player's own wishlist.
function saveWishlist(password, wishlist) {
  const data = loadData();
  const player = findPlayer(data.rows, password);
  if (!player) return { ok: false, error: 'Wrong password' };
  if (!player.played) return { ok: false, error: 'Play the game first' };

  const text = String(wishlist || '').trim().slice(0, WISHLIST_MAX_LENGTH);

  // A leading apostrophe stops Sheets treating text like "=..." as a formula.
  // It isn't shown in the Sheet or sent back to the website.
  const safeText = /^[=+\-@]/.test(text) ? "'" + text : text;
  setCell(data, player, 'wishlist', safeText);

  return { ok: true, wishlist: text };
}

// Everyone who has played, highest score first.
// Ties go to whoever played first.
function leaderboard() {
  const players = loadData().rows
    .filter(r => r.played)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.playedAt - b.playedAt;
    })
    .map(r => ({ name: r.name, score: r.score }));

  return { ok: true, players: players };
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Read the whole Players tab: works out which column is which from the
// headers in row 1, then reads every player row (skipping blank rows).
function loadData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Could not find a tab called "' + SHEET_NAME + '"');

  const values = sheet.getDataRange().getValues();
  const headerRow = values[0].map(h => String(h).trim().toLowerCase());

  const cols = {};
  for (const key in HEADERS) {
    const index = headerRow.indexOf(HEADERS[key]);
    if (index === -1) {
      throw new Error('Missing column "' + HEADERS[key] + '" in row 1 of the ' + SHEET_NAME + ' tab');
    }
    cols[key] = index;
  }

  const rows = [];
  for (let i = 1; i < values.length; i++) { // start at 1 to skip the header row
    const r = values[i];
    const name = String(r[cols.name]).trim();
    if (name === '') continue;

    rows.push({
      rowNumber: i + 1, // sheet rows start at 1
      name: name,
      password: String(r[cols.password]).trim(),
      played: String(r[cols.played]).toUpperCase() === 'TRUE',
      score: Number(r[cols.score]) || 0,
      assignedTo: String(r[cols.assignedTo]).trim(),
      playedAt: r[cols.playedAt] instanceof Date ? r[cols.playedAt].getTime() : 0,
      wishlist: String(r[cols.wishlist]).trim()
    });
  }

  return { sheet: sheet, cols: cols, rows: rows };
}

// Write one value into a player's row, e.g. setCell(data, player, 'score', 50)
function setCell(data, player, columnKey, value) {
  data.sheet.getRange(player.rowNumber, data.cols[columnKey] + 1).setValue(value);
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
function ensureAssignments(data) {
  const rows = data.rows;
  const filled = rows.filter(r => r.assignedTo !== '').length;
  if (filled === rows.length) return; // already done

  if (filled > 0) {
    throw new Error('Some names in the assigned_to column are missing. Clear the whole column (except the header) and try again.');
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

  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length];
    giver.assignedTo = receiver.name;
    setCell(data, giver, 'assignedTo', receiver.name);
  }
}