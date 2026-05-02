// ============================================================
// script.js — PitacoFC Football Platform  (fixed)
// ============================================================

// ---- STATE ----
let state = {
  coins: 100,
  username: "Guest Manager",
  gamesPlayed: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  bestStreak: 0,
  currentStreak: 0,
  teamValue: 0,
  squad: {},
  currentFormation: "4-3-3",
  currentPositionClicked: null,
  currentPositionType: null
};

// ---- GAME-SPECIFIC STATE ----
let guessTeamState = {
  current: null,
  score: 0,
  wrong: 0,
  streak: 0,
  blurInterval: null,   // combined blur + timer tick
  blurLevel: 20,
  timeLeft: 30
};

let missingLinkState = {
  current: null,
  score: 0,
  wrong: 0,
  usedIndices: []
};

let careerQuizState = {
  current: null,
  score: 0,
  wrong: 0,
  usedIndices: []
};

let trueOrFalseState = {
  current: null,
  score: 0,
  wrong: 0,
  streak: 0,
  usedIndices: []
};

let playerModalFilter = { position: "all", search: "" };

// ============================================================
// BADGE HELPERS
// ============================================================

/**
 * Injeta um escudo (<img>) dentro de um container que já possui
 * <i class="fa-solid fa-shield-halved">.
 * A imagem oculta o ícone quando carrega; o ícone reaparece se falhar.
 */
function injectBadge(container, badgePath, clubName, imgClass = "club-badge-img") {
  if (!badgePath || !container) return;

  // Remove imagem anterior
  const old = container.querySelector("." + imgClass);
  if (old) old.remove();

  const fa = container.querySelector(".fa-shield-halved");
  if (fa) fa.style.display = "";

  const img = document.createElement("img");
  img.alt = clubName;
  img.className = imgClass;
  img.src = badgePath + ".PNG";

  img.onerror = function () {
    if (!this._triedGif) {
      this._triedGif = true;
      this.src = badgePath + ".GIF";
    } else {
      this.style.display = "none";
      if (fa) fa.style.display = "";
    }
  };

  img.onload = function () {
    if (fa) fa.style.display = "none";
  };

  container.insertBefore(img, container.firstChild);
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  loadSettings();          // NEW: load theme + language from localStorage
  setupNavigation();
  setupKeyboardShortcuts();
  initAllGames();
  renderPitch();
  updateAllUI();
  renderAchievements();
  renderRanking();
  renderCuriosidades();    // NEW: render curiosidades section
  initWelcomeModal();
  applyTranslations();     // NEW: apply i18n after all DOM is ready
});

// ============================================================
// PERSISTENCE
// ============================================================
function loadState() {
  const saved = localStorage.getItem("pitacofc_state");
  if (saved) {
    try { Object.assign(state, JSON.parse(saved)); }
    catch(e) { console.warn("Failed to load state"); }
  }
}

function saveState() {
  localStorage.setItem("pitacofc_state", JSON.stringify(state));
}

// ============================================================
// WELCOME MODAL
// ============================================================
function initWelcomeModal() {
  const seen = localStorage.getItem("pitacofc_welcome_seen");
  if (!seen) {
    const overlay = document.getElementById("welcomeModal");
    overlay.classList.add("open");
  }
}

function closeWelcomeModal() {
  localStorage.setItem("pitacofc_welcome_seen", "1");
  const overlay = document.getElementById("welcomeModal");
  overlay.classList.remove("open");
}

function switchWmTab(tabId, btn) {
  // Toggle tab buttons
  document.querySelectorAll(".wm-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");

  // Toggle tab bodies
  document.getElementById("wm-howto").classList.add("wm-body--hidden");
  document.getElementById("wm-facts").classList.add("wm-body--hidden");
  document.getElementById("wm-" + tabId).classList.remove("wm-body--hidden");
}

// Close welcome modal on overlay click (outside card)
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("welcomeModal").addEventListener("click", function(e) {
    if (e.target === this) closeWelcomeModal();
  });
});

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  // Sidebar nav links
  document.querySelectorAll(".nav-link").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Bottom nav links (mobile)
  document.querySelectorAll(".bnav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });
}

function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  // Show target
  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  // Update sidebar nav
  document.querySelectorAll(".nav-link").forEach(n => {
    n.classList.toggle("active", n.dataset.page === pageId);
  });

  // Update bottom nav (mobile)
  document.querySelectorAll(".bnav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
  updateAllUI();

  if (pageId === "profile")     renderAchievements();
  if (pageId === "ranking")     renderRanking();
  if (pageId === "curiosities") renderCuriosidades();
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayerModal();

    if (e.key === "Enter") {
      const gamesPage = document.getElementById("page-games");
      if (gamesPage && gamesPage.classList.contains("active")) {
        const focused = document.activeElement;
        if (focused && focused.id === "guessTeamInput")  checkGuessTeam();
        if (focused && focused.id === "missingLinkInput") checkMissingLink();
        if (focused && focused.id === "careerQuizInput")  checkCareerQuiz();
      }
    }
  });
}

// ============================================================
// GAME TABS  (called from HTML: switchGameTab('guessTeam', this))
// ============================================================
function switchGameTab(gameId, btn) {
  document.querySelectorAll(".game-panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("game-" + gameId);
  if (panel) panel.classList.add("active");

  document.querySelectorAll(".gtab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

// Called from home tiles
function launchGame(gameId) {
  navigateTo("games");
  setTimeout(() => {
    const btn = document.querySelector(`.gtab[data-game="${gameId}"]`);
    switchGameTab(gameId, btn);
  }, 250);
}

// ============================================================
// UI UPDATES
// ============================================================
function updateAllUI() {
  // Coins — sidebar + topbar (mobile) + page pills
  const coinIds = ["sidebarCoins", "topbarCoins", "homeCoins", "gamesCoins", "builderCoins"];
  coinIds.forEach(id => setEl(id, state.coins));

  // Home stats strip
  setEl("homeStreak", state.bestStreak);

  // Home dashboard cards
  setEl("homeTeamValue",   state.teamValue);
  setEl("homeGamesPlayed", state.gamesPlayed);
  const acc = state.totalAnswers > 0
    ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0;
  setEl("homeAccuracy", acc + "%");

  // Builder controls
  setEl("builderBudget",      state.coins);
  setEl("builderTeamVal",     state.teamValue);
  const playerCount = Object.keys(state.squad).length;
  setEl("builderPlayerCount", `${playerCount}/11`);
  setEl("squadCountBadge",    `${playerCount}/11`);

  // Profile
  setEl("profileCoins",       state.coins);
  setEl("profileTeamVal",     state.teamValue);
  setEl("profileGamesPlayed", state.gamesPlayed);
  setEl("profileBestStreak",  state.bestStreak);
  setEl("profileCorrect",     state.correctAnswers);
  setEl("profileAccuracy",    acc + "%");
  setEl("profileUsernameDisplay", state.username);

  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput)
    usernameInput.value = state.username === "Guest Manager" ? "" : state.username;

  updateSquadList();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
// COINS
// ============================================================
function awardCoins(amount, x, y) {
  state.coins += amount;
  state.correctAnswers++;
  state.totalAnswers++;
  if (state.currentStreak > state.bestStreak) state.bestStreak = state.currentStreak;
  saveState();
  updateAllUI();
  spawnCoinBurst(x, y, amount);
  showToast(`+${amount} coins earned!`, "success");
}

function deductCoins(amount) {
  state.coins -= amount;
  saveState();
  updateAllUI();
}

function spawnCoinBurst(x, y, amount) {
  const container = document.getElementById("coinBurst");
  const count = Math.min(Math.ceil(amount / 5), 12);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "coin-particle";
    p.innerHTML = '<i class="ph ph-coins"></i>';
    const angle = (i / count) * Math.PI * 2;
    const dist  = 60 + Math.random() * 60;
    p.style.left = (x || window.innerWidth  / 2) + "px";
    p.style.top  = (y || window.innerHeight / 2) + "px";
    p.style.setProperty("--tx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--ty", Math.sin(angle) * dist + "px");
    container.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconMap = { success: "ph-check-circle", error: "ph-x-circle", warning: "ph-warning" };
  const icon = iconMap[type] || iconMap.success;
  toast.innerHTML = `<i class="ph ${icon}"></i><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity   = "0";
    toast.style.transform = "translateX(30px)";
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    setTimeout(() => toast.remove(), 350);
  }, 2500);
}

// ============================================================
// GAME: GUESS THE TEAM
// ============================================================
function initGuessTeam() {
  loadNextGuessTeam();
}

function loadNextGuessTeam() {
  clearInterval(guessTeamState.blurInterval);

  // Prefer guessTeamData if defined in data.js, otherwise fall back to clubs
  const pool = (typeof guessTeamData !== "undefined" ? guessTeamData : (typeof clubs !== "undefined" ? clubs : []))
    .filter(c => c && c.badge);
  if (!pool.length) return;

  const idx = Math.floor(Math.random() * pool.length);
  guessTeamState.current  = pool[idx];
  guessTeamState.blurLevel = 20;
  guessTeamState.timeLeft  = 30;

  // Reset badge container  (id="guessTeamBadge" in HTML)
  const container = document.getElementById("guessTeamBadge");
  if (container) {
    container.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    container.style.filter = "blur(20px)";
    injectBadge(container, guessTeamState.current.badge, guessTeamState.current.name);
  }

  // Reset blur bar  (id="blurFill")
  const blurFill = document.getElementById("blurFill");
  if (blurFill) blurFill.style.width = "100%";

  // Reset timer ring  (id="timerCircle", id="guessTeamTimer")
  const timerCircle = document.getElementById("timerCircle");
  if (timerCircle) timerCircle.style.strokeDashoffset = "0";
  setEl("guessTeamTimer", "30");

  // Clear inputs / feedback
  const input    = document.getElementById("guessTeamInput");
  const feedback = document.getElementById("guessTeamFeedback");
  if (input)    { input.value = ""; input.focus(); }
  if (feedback) { feedback.innerHTML = ""; feedback.className = "game-feedback"; }

  // Combined 1-second tick: blur + timer ring
  let elapsed = 0;
  guessTeamState.blurInterval = setInterval(() => {
    elapsed++;
    guessTeamState.timeLeft = 30 - elapsed;

    // Timer text
    setEl("guessTeamTimer", guessTeamState.timeLeft);

    // Timer ring: stroke-dasharray="163.4" → offset 0→163.4
    if (timerCircle) timerCircle.style.strokeDashoffset = String((elapsed / 30) * 163.4);

    // Blur: 20→0
    const newBlur = Math.max(0, 20 - (20 * elapsed / 30));
    if (container) container.style.filter = `blur(${newBlur}px)`;

    // Blur bar: 100%→0%
    if (blurFill) blurFill.style.width = Math.max(0, 100 - (elapsed / 30 * 100)) + "%";

    if (elapsed >= 30) {
      clearInterval(guessTeamState.blurInterval);
      nextGuessTeam(); // time's up — skip automatically
    }
  }, 1000);
}

function checkGuessTeam() {
  const inputEl = document.getElementById("guessTeamInput");
  const input   = inputEl ? inputEl.value.trim() : "";
  if (!input || !guessTeamState.current) return;

  const correct   = guessTeamState.current.name;
  const isCorrect = normalizeStr(input) === normalizeStr(correct) ||
    (normalizeStr(correct).includes(normalizeStr(input)) && input.length >= 4);

  if (isCorrect) {
    guessTeamState.score++;
    guessTeamState.streak++;
    state.gamesPlayed++;
    state.currentStreak = guessTeamState.streak;
    clearInterval(guessTeamState.blurInterval);
    const container = document.getElementById("guessTeamBadge");
    if (container) container.style.filter = "none";
    showFeedback("guessTeamFeedback", true, `Correct! It was ${correct}`);
    updateGameScores("guessTeam");
    awardCoins(15 + (guessTeamState.streak > 3 ? 5 : 0));
    setTimeout(() => loadNextGuessTeam(), 1800);
  } else {
    guessTeamState.wrong++;
    state.totalAnswers++;
    saveState();
    showFeedback("guessTeamFeedback", false, "Wrong! Try again or skip.");
    updateGameScores("guessTeam");
    if (inputEl) inputEl.value = "";
  }
  updateAllUI();
}

// HTML calls nextGuessTeam() on the Skip button
function nextGuessTeam() {
  clearInterval(guessTeamState.blurInterval);
  const name = guessTeamState.current ? guessTeamState.current.name : "?";
  showFeedback("guessTeamFeedback", false, `Skipped. It was ${name}`);
  guessTeamState.streak = 0;
  state.currentStreak   = 0;
  updateGameScores("guessTeam");
  setTimeout(() => loadNextGuessTeam(), 1500);
}

function updateGameScores(game) {
  // IDs in HTML: gtScore, gtWrong, gtStreak / mlScore, mlWrong / cqScore, cqWrong / tofScore, tofWrong, tofStreak
  if (game === "guessTeam") {
    setEl("gtScore",  guessTeamState.score);
    setEl("gtWrong",  guessTeamState.wrong);
    setEl("gtStreak", guessTeamState.streak);
  } else if (game === "missingLink") {
    setEl("mlScore", missingLinkState.score);
    setEl("mlWrong", missingLinkState.wrong);
  } else if (game === "careerQuiz") {
    setEl("cqScore", careerQuizState.score);
    setEl("cqWrong", careerQuizState.wrong);
  } else if (game === "trueOrFalse") {
    setEl("tofScore",  trueOrFalseState.score);
    setEl("tofWrong",  trueOrFalseState.wrong);
    setEl("tofStreak", trueOrFalseState.streak);
  }
}

// ============================================================
// GAME: MISSING LINK
// ============================================================
function initMissingLink() {
  loadNextMissingLink();
}

function loadNextMissingLink() {
  if (typeof missingLinkPairs === "undefined" || !missingLinkPairs.length) return;

  let idx;
  do { idx = Math.floor(Math.random() * missingLinkPairs.length); }
  while (missingLinkState.usedIndices.length < missingLinkPairs.length &&
         missingLinkState.usedIndices.includes(idx));

  if (missingLinkState.usedIndices.length >= missingLinkPairs.length)
    missingLinkState.usedIndices = [];
  missingLinkState.usedIndices.push(idx);
  missingLinkState.current = missingLinkPairs[idx];

  const clubsData = typeof clubs !== "undefined" ? clubs : [];
  const club1 = clubsData.find(c => c.name === missingLinkState.current.club1);
  const club2 = clubsData.find(c => c.name === missingLinkState.current.club2);

  // HTML structure: <div class="ml-club-card" id="mlClubA"><i class="fa-solid fa-shield-halved"></i><span>—</span></div>
  const cardA = document.getElementById("mlClubA");
  const cardB = document.getElementById("mlClubB");

  function setupCard(card, clubObj, clubName) {
    if (!card) return;
    // Reset to base HTML
    card.innerHTML = '<i class="fa-solid fa-shield-halved"></i><span>' + clubName + '</span>';
    if (clubObj && clubObj.badge) injectBadge(card, clubObj.badge, clubName);
  }

  setupCard(cardA, club1, missingLinkState.current.club1);
  setupCard(cardB, club2, missingLinkState.current.club2);

  const inputEl   = document.getElementById("missingLinkInput");
  const feedbackEl = document.getElementById("missingLinkFeedback");
  if (inputEl)    { inputEl.value = ""; inputEl.focus(); }
  if (feedbackEl) { feedbackEl.innerHTML = ""; feedbackEl.className = "game-feedback"; }
}

function checkMissingLink() {
  const inputEl = document.getElementById("missingLinkInput");
  const input   = inputEl ? inputEl.value.trim() : "";
  if (!input || !missingLinkState.current) return;

  const validAnswers = missingLinkState.current.answers;
  const isCorrect = validAnswers.some(ans =>
    normalizeStr(input) === normalizeStr(ans) ||
    (normalizeStr(ans).includes(normalizeStr(input)) && input.length >= 4) ||
    (normalizeStr(input).includes(normalizeStr(ans.split(" ").pop())) && input.length >= 4)
  );

  if (isCorrect) {
    missingLinkState.score++;
    state.gamesPlayed++;
    showFeedback("missingLinkFeedback", true,
      `Correct! Valid: ${validAnswers.slice(0, 2).join(", ")}`);
    updateGameScores("missingLink");
    awardCoins(20);
    setTimeout(() => loadNextMissingLink(), 2000);
  } else {
    missingLinkState.wrong++;
    state.totalAnswers++;
    saveState();
    showFeedback("missingLinkFeedback", false, "Not quite. Try another player!");
    updateGameScores("missingLink");
    if (inputEl) inputEl.value = "";
  }
  updateAllUI();
}

function nextMissingLink() {
  const answers = missingLinkState.current
    ? missingLinkState.current.answers.slice(0, 2).join(", ") : "";
  showFeedback("missingLinkFeedback", false, `Skipped. Valid: ${answers}`);
  setTimeout(() => loadNextMissingLink(), 1800);
}

// ============================================================
// GAME: CAREER QUIZ
// ============================================================
function initCareerQuiz() {
  loadNextCareerQuiz();
}

function loadNextCareerQuiz() {
  if (typeof careerQuizPlayers === "undefined" || !careerQuizPlayers.length) return;

  let idx;
  do { idx = Math.floor(Math.random() * careerQuizPlayers.length); }
  while (careerQuizState.usedIndices.length < careerQuizPlayers.length &&
         careerQuizState.usedIndices.includes(idx));

  if (careerQuizState.usedIndices.length >= careerQuizPlayers.length)
    careerQuizState.usedIndices = [];
  careerQuizState.usedIndices.push(idx);
  careerQuizState.current = careerQuizPlayers[idx];

  // HTML: <div class="career-flow" id="careerFlow"></div>
  const flow = document.getElementById("careerFlow");
  if (!flow) return;
  flow.innerHTML = "";

  const clubsData = typeof clubs !== "undefined" ? clubs : [];

  careerQuizState.current.clubs.forEach((clubName, i) => {
    const clubObj = clubsData.find(c => c.name === clubName);

    // Career node
    const node = document.createElement("div");
    node.className = "career-node";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-shield-halved";
    if (clubObj) icon.style.color = clubObj.color || "";
    node.appendChild(icon);

    if (clubObj && clubObj.badge) {
      const img = document.createElement("img");
      img.className = "club-badge-img";
      img.alt = clubName;
      img.src = clubObj.badge + ".PNG";
      img.onerror = function () {
        if (!this._triedGif) { this._triedGif = true; this.src = clubObj.badge + ".GIF"; }
        else { this.style.display = "none"; icon.style.display = ""; }
      };
      img.onload = function () { icon.style.display = "none"; };
      node.insertBefore(img, icon);
    }

    const span = document.createElement("span");
    span.textContent = clubName;
    node.appendChild(span);
    flow.appendChild(node);

    // Arrow between nodes
    if (i < careerQuizState.current.clubs.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "career-arrow";
      arrow.textContent = "→";
      flow.appendChild(arrow);
    }
  });

  const inputEl    = document.getElementById("careerQuizInput");
  const feedbackEl = document.getElementById("careerQuizFeedback");
  if (inputEl)    { inputEl.value = ""; inputEl.focus(); }
  if (feedbackEl) { feedbackEl.innerHTML = ""; feedbackEl.className = "game-feedback"; }
}

function checkCareerQuiz() {
  const inputEl = document.getElementById("careerQuizInput");
  const input   = inputEl ? inputEl.value.trim() : "";
  if (!input || !careerQuizState.current) return;

  const correct   = careerQuizState.current.name;
  const nameParts = correct.toLowerCase().split(" ");
  const inputLow  = normalizeStr(input);

  const isCorrect = normalizeStr(correct) === inputLow ||
    nameParts.some(part => part.length > 3 && inputLow.includes(part));

  if (isCorrect) {
    careerQuizState.score++;
    state.gamesPlayed++;
    showFeedback("careerQuizFeedback", true, `Correct! It was ${correct}`);
    updateGameScores("careerQuiz");
    awardCoins(25);
    setTimeout(() => loadNextCareerQuiz(), 2000);
  } else {
    careerQuizState.wrong++;
    state.totalAnswers++;
    saveState();
    showFeedback("careerQuizFeedback", false, "Wrong. Keep guessing or skip!");
    updateGameScores("careerQuiz");
    if (inputEl) inputEl.value = "";
  }
  updateAllUI();
}

function nextCareerQuiz() {
  const name = careerQuizState.current ? careerQuizState.current.name : "?";
  showFeedback("careerQuizFeedback", false, `Skipped. It was ${name}`);
  setTimeout(() => loadNextCareerQuiz(), 1800);
}

// ============================================================
// GAME: TRUE OR FALSE
// ============================================================
function initTrueOrFalse() {
  loadNextTrueOrFalse();
}

function loadNextTrueOrFalse() {
  if (typeof trueOrFalseQuestions === "undefined" || !trueOrFalseQuestions.length) return;

  let idx;
  do { idx = Math.floor(Math.random() * trueOrFalseQuestions.length); }
  while (trueOrFalseState.usedIndices.length < trueOrFalseQuestions.length &&
         trueOrFalseState.usedIndices.includes(idx));

  if (trueOrFalseState.usedIndices.length >= trueOrFalseQuestions.length)
    trueOrFalseState.usedIndices = [];
  trueOrFalseState.usedIndices.push(idx);
  trueOrFalseState.current = trueOrFalseQuestions[idx];

  // HTML: <p id="tofText">Loading...</p>
  const { player, club } = trueOrFalseState.current;
  setEl("tofText", `${player} played for ${club}`);

  const feedbackEl = document.getElementById("tofFeedback");
  if (feedbackEl) { feedbackEl.innerHTML = ""; feedbackEl.className = "game-feedback"; }
}

function checkTrueOrFalse(userAnswer) {
  if (!trueOrFalseState.current) return;

  const correct    = trueOrFalseState.current.answer;
  const isCorrect  = userAnswer === correct;

  if (isCorrect) {
    trueOrFalseState.score++;
    trueOrFalseState.streak++;
    state.gamesPlayed++;
    state.currentStreak = trueOrFalseState.streak;
    const msg = correct ? "TRUE — They did play there!" : "FALSE — They never played there!";
    showFeedback("tofFeedback", true, msg);
    updateGameScores("trueOrFalse");
    awardCoins(10 + (trueOrFalseState.streak > 3 ? 5 : 0));
    setTimeout(() => loadNextTrueOrFalse(), 1500);
  } else {
    trueOrFalseState.wrong++;
    trueOrFalseState.streak = 0;
    state.totalAnswers++;
    saveState();
    const msg = correct ? "Wrong! They DID play there." : "Wrong! They NEVER played there.";
    showFeedback("tofFeedback", false, msg);
    updateGameScores("trueOrFalse");
    setTimeout(() => loadNextTrueOrFalse(), 1800);
  }
  updateAllUI();
}

// ============================================================
// INIT ALL GAMES
// ============================================================
function initAllGames() {
  initGuessTeam();
  initMissingLink();
  initCareerQuiz();
  initTrueOrFalse();
}

// ============================================================
// TEAM BUILDER
// ============================================================
function renderPitch() {
  const container = document.getElementById("pitchPositions");
  if (!container) return;
  container.innerHTML = "";

  if (typeof formations === "undefined") return;
  const formation = formations[state.currentFormation];
  if (!formation) return;

  formation.positions.forEach(pos => {
    const slot = document.createElement("div");
    slot.className = "player-slot";
    slot.id = "slot-" + pos.id;
    slot.style.left = pos.x + "%";
    slot.style.top  = pos.y + "%";

    const player = state.squad[pos.id];

    if (player) {
      slot.classList.add("filled");

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-slot-btn visible";
      removeBtn.innerHTML = "&times;";
      removeBtn.onclick = (e) => removePlayer(pos.id, e);

      // Circle
      const circle = document.createElement("div");
      circle.className = "slot-circle filled";
      if (player.image) {
        const img = document.createElement("img");
        img.src   = player.image;
        img.alt   = player.name;
        circle.appendChild(img);
      } else {
        circle.innerHTML = '<i class="ph ph-user"></i>';
      }

      // Label (short name)
      const label = document.createElement("div");
      label.className   = "slot-label";
      label.textContent = getShortName(player.name);

      // Position tag
      const posTag = document.createElement("div");
      posTag.className   = "slot-pos-tag";
      posTag.textContent = player.position || pos.label;

      slot.appendChild(removeBtn);
      slot.appendChild(circle);
      slot.appendChild(label);
      slot.appendChild(posTag);
    } else {
      slot.onclick = () => openPlayerModal(pos.id, pos.type);

      const circle = document.createElement("div");
      circle.className = "slot-circle";
      circle.innerHTML  = '<i class="ph ph-plus"></i>';

      const label = document.createElement("div");
      label.className   = "slot-label";
      label.textContent = pos.label;

      slot.appendChild(circle);
      slot.appendChild(label);
    }

    container.appendChild(slot);
  });
}

function changeFormation(formationKey, btn) {
  if (typeof formations === "undefined") return;

  const newPositions = formations[formationKey].positions.map(p => p.id);
  const newSquad = {};
  newPositions.forEach(posId => {
    if (state.squad[posId]) newSquad[posId] = state.squad[posId];
  });

  state.squad = newSquad;
  state.currentFormation = formationKey;

  // HTML uses class .fmtn-btn (not .formation-btn)
  document.querySelectorAll(".fmtn-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.formation === formationKey);
  });

  recalcTeamValue();
  renderPitch();
  updateSquadList();
  saveState();
  updateAllUI();
}

function openPlayerModal(positionId, positionType) {
  state.currentPositionClicked = positionId;
  state.currentPositionType    = positionType;
  playerModalFilter = { position: positionType || "all", search: "" };

  setEl("modalPositionTag", positionType || "ALL");

  const searchInput = document.getElementById("playerSearchInput");
  if (searchInput) searchInput.value = "";

  // HTML uses class .mfilter (not .filter-btn)
  document.querySelectorAll(".mfilter").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === (positionType || "all") ||
      (!positionType && b.dataset.filter === "all"));
  });

  renderModalPlayers();
  document.getElementById("playerModal").classList.add("open");
  setTimeout(() => { if (searchInput) searchInput.focus(); }, 150);
}

function closePlayerModal() {
  const modal = document.getElementById("playerModal");
  if (modal) modal.classList.remove("open");
  state.currentPositionClicked = null;
  state.currentPositionType    = null;
}

function filterByPosition(pos, btn) {
  playerModalFilter.position = pos;
  document.querySelectorAll(".mfilter").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderModalPlayers();
}

function filterPlayers() {
  const searchInput = document.getElementById("playerSearchInput");
  playerModalFilter.search = searchInput ? searchInput.value.trim().toLowerCase() : "";
  renderModalPlayers();
}

function renderModalPlayers() {
  const list = document.getElementById("modalPlayerList");
  if (!list || typeof players === "undefined") return;
  list.innerHTML = "";

  const selectedNames = Object.values(state.squad).map(p => p.name);

  let filtered = players.filter(p => {
    const posMatch    = playerModalFilter.position === "all" || p.position === playerModalFilter.position;
    const searchMatch = !playerModalFilter.search ||
      p.name.toLowerCase().includes(playerModalFilter.search) ||
      (p.clubs || []).some(c => c.toLowerCase().includes(playerModalFilter.search));
    return posMatch && searchMatch;
  });

  filtered.sort((a, b) => b.price - a.price);

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-3);">
      <i class="ph ph-user-slash" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
      No players found
    </div>`;
    return;
  }

  filtered.forEach(player => {
    const alreadySelected = selectedNames.includes(player.name);
    const canAfford       = player.price <= state.coins;

    const item = document.createElement("div");
    item.className = `player-list-item${!canAfford ? " cannot-afford" : ""}${alreadySelected ? " already-selected" : ""}`;

    item.innerHTML = `
      <div class="player-avatar">
        ${player.image
          ? `<img src="${player.image}" alt="${player.name}" />`
          : `<i class="ph ph-user"></i>`}
      </div>
      <div class="player-item-info">
        <div class="player-item-name">${player.name}</div>
        <div class="player-item-meta">
          <span class="player-pos-badge ${player.position}">${player.position}</span>
          <span class="player-item-nation">${player.nation || ""}</span>
        </div>
      </div>
      <div class="player-item-price">
        <i class="ph ph-coins"></i>${player.price}
      </div>`;

    if (!alreadySelected && canAfford) {
      item.addEventListener("click", () => selectPlayer(player));
    } else if (alreadySelected) {
      item.title = "Already in squad";
    } else {
      item.title = `Need ${player.price - state.coins} more coins`;
    }

    list.appendChild(item);
  });
}

function selectPlayer(player) {
  if (!state.currentPositionClicked) return;
  if (player.price > state.coins) { showToast("Not enough coins!", "error"); return; }

  deductCoins(player.price);
  state.squad[state.currentPositionClicked] = player;

  recalcTeamValue();
  renderPitch();
  updateSquadList();
  saveState();
  closePlayerModal();
  showToast(`${player.name} added to squad!`, "success");
}

function removePlayer(positionId, event) {
  if (event) event.stopPropagation();
  const player = state.squad[positionId];
  if (!player) return;

  const refund = Math.floor(player.price / 2);
  state.coins += refund;
  delete state.squad[positionId];

  recalcTeamValue();
  renderPitch();
  updateSquadList();
  saveState();
  updateAllUI();
  showToast(`${player.name} removed. +${refund} coins refunded.`, "warning");
}

function clearTeam() {
  if (!Object.keys(state.squad).length) {
    showToast("Squad is already empty!", "warning");
    return;
  }
  let refund = 0;
  Object.values(state.squad).forEach(p => { refund += Math.floor(p.price / 2); });
  state.squad    = {};
  state.coins   += refund;
  state.teamValue = 0;

  renderPitch();
  updateSquadList();
  saveState();
  updateAllUI();
  showToast(`Team cleared. +${refund} coins refunded.`, "warning");
}

function recalcTeamValue() {
  state.teamValue = Object.values(state.squad).reduce((sum, p) => sum + p.price, 0);
}

function updateSquadList() {
  const list = document.getElementById("squadList");
  if (!list || typeof formations === "undefined") return;

  const formation = formations[state.currentFormation];
  if (!formation) return;

  const entries = formation.positions
    .map(pos => ({ pos, player: state.squad[pos.id] }))
    .filter(e => e.player);

  if (!entries.length) {
    // CSS class is .squad-empty  (not .empty-squad)
    list.innerHTML = `<div class="squad-empty">
      <i class="ph ph-users-three"></i>
      <span>No players selected</span>
    </div>`;
    return;
  }

  list.innerHTML = entries.map(({ pos, player }) => `
    <div class="squad-player-row">
      <div class="squad-pos-badge ${player.position}">${pos.label}</div>
      <div class="squad-player-info">
        <b>${player.name}</b>
        <small>${player.nation || ""}</small>
      </div>
      <div class="squad-player-price">
        <i class="ph ph-coins"></i>${player.price}
      </div>
    </div>
  `).join("");
}

// ============================================================
// RANKING
// ============================================================
const mockRanking = [
  { name: "TopManager",   coins: 520, teamValue: 850, accuracy: 86 },
  { name: "FutbolPro",    coins: 410, teamValue: 660, accuracy: 79 },
  { name: "TacticMaster", coins: 360, teamValue: 590, accuracy: 74 },
  { name: "BallWizard",   coins: 280, teamValue: 480, accuracy: 68 },
  { name: "GoalHunter",   coins: 210, teamValue: 380, accuracy: 61 },
];

function renderRanking() {
  const list = document.getElementById("rankingList");
  if (!list) return;

  const userAcc = state.totalAnswers > 0
    ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0;

  const all = [
    ...mockRanking,
    { name: state.username, coins: state.coins, teamValue: state.teamValue, accuracy: userAcc, isYou: true }
  ].sort((a, b) => b.coins - a.coins);

  const yourPos = all.findIndex(p => p.isYou) + 1;

  list.innerHTML = all.map((p, i) => {
    const pos      = i + 1;
    const posClass = pos === 1 ? "gold" : pos === 2 ? "silver" : pos === 3 ? "bronze" : "";
    return `<div class="ranking-row ${p.isYou ? "is-you" : ""}">
      <span class="rank-pos ${posClass}">${pos}</span>
      <span class="rank-name">${p.name}${p.isYou ? " ★" : ""}</span>
      <span class="rank-coins">${p.coins}</span>
      <span class="rank-tv">${p.teamValue}</span>
      <span class="rank-acc">${p.accuracy}%</span>
    </div>`;
  }).join("");

  setEl("yourRankPos",    yourPos);
  setEl("yourRankName",   state.username);
  setEl("yourRankDetail", `${state.coins} coins · ${userAcc}% accuracy`);
}

// ============================================================
// PROFILE
// ============================================================
function saveUsername() {
  const input = document.getElementById("usernameInput");
  const val   = input ? input.value.trim() : "";
  if (!val)        { showToast("Enter a username first!", "warning"); return; }
  if (val.length < 2) { showToast("Username too short!", "warning"); return; }
  state.username = val;
  saveState();
  updateAllUI();
  showToast("Username saved!", "success");
}

function addTestCoins() {
  state.coins += 100;
  saveState();
  updateAllUI();
  showToast("+100 test coins added!", "success");
}

function resetProfile() {
  if (!confirm("Reset all data? This cannot be undone.")) return;
  localStorage.removeItem("pitacofc_state");
  state = {
    coins: 100,
    username: "Guest Manager",
    gamesPlayed: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    bestStreak: 0,
    currentStreak: 0,
    teamValue: 0,
    squad: {},
    currentFormation: "4-3-3",
    currentPositionClicked: null,
    currentPositionType: null
  };
  saveState();
  updateAllUI();
  renderPitch();
  renderAchievements();
  renderRanking();
  showToast("Profile reset!", "warning");
}

// ============================================================
// ACHIEVEMENTS
// ============================================================
const achievementDefs = [
  { id: "first_correct", icon: "ph-star",           label: "First Steps",    desc: "Get your first correct answer",          check: s => s.correctAnswers >= 1 },
  { id: "ten_correct",   icon: "ph-medal",           label: "Getting Warm",   desc: "Get 10 correct answers",                 check: s => s.correctAnswers >= 10 },
  { id: "fifty_correct", icon: "ph-trophy",          label: "True Scholar",   desc: "Get 50 correct answers",                 check: s => s.correctAnswers >= 50 },
  { id: "streak_3",      icon: "ph-fire",            label: "On Fire",        desc: "Reach a streak of 3",                    check: s => s.bestStreak >= 3 },
  { id: "streak_5",      icon: "ph-fire-simple",     label: "Inferno",        desc: "Reach a streak of 5",                    check: s => s.bestStreak >= 5 },
  { id: "coins_200",     icon: "ph-coins",           label: "Coin Collector", desc: "Accumulate 200 coins",                   check: s => s.coins >= 200 },
  { id: "full_squad",    icon: "ph-users-three",     label: "Full House",     desc: "Fill all 11 positions",                  check: s => Object.keys(s.squad).length >= 11 },
  { id: "play_10",       icon: "ph-game-controller", label: "Dedicated",      desc: "Play 10 mini-games",                     check: s => s.gamesPlayed >= 10 },
  { id: "accuracy_80",   icon: "ph-target",          label: "Sharp Mind",     desc: "Reach 80% accuracy (min 10 answers)",    check: s => s.totalAnswers >= 10 && (s.correctAnswers / s.totalAnswers) >= 0.8 }
];

function renderAchievements() {
  const list = document.getElementById("achievementsList");
  if (!list) return;
  list.innerHTML = achievementDefs.map(ach => {
    const unlocked = ach.check(state);
    return `<div class="achievement-item ${unlocked ? "unlocked" : ""}">
      <div class="achievement-icon-wrap">
        <i class="ph ${ach.icon}"></i>
      </div>
      <div class="achievement-info">
        <b>${ach.label}</b>
        <small>${ach.desc}</small>
      </div>
    </div>`;
  }).join("");
}

// ============================================================
// HELPERS
// ============================================================
function normalizeStr(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function getShortName(name) {
  const parts = name.trim().split(" ");
  if (parts.length <= 2) return name;
  return parts[0].charAt(0) + ". " + parts[parts.length - 1];
}

function showFeedback(elId, isCorrect, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  const icon = isCorrect
    ? '<i class="ph ph-check-circle"></i>'
    : '<i class="ph ph-x-circle"></i>';
  el.className = `game-feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`;
  el.innerHTML = `${icon} ${message}`;
}

// Close modal on overlay click
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("playerModal");
  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === this) closePlayerModal();
    });
  }
});
// ============================================================
// SETTINGS — PERSISTENCE (Tema + Idioma)
// ============================================================

let appSettings = {
  language: "pt",   // "pt" | "en"
  theme: "normal"   // "normal" | "inverted"
};

function loadSettings() {
  const saved = localStorage.getItem("pitacofc_settings");
  if (saved) {
    try { Object.assign(appSettings, JSON.parse(saved)); }
    catch(e) { console.warn("Failed to load settings"); }
  }
  // Apply theme immediately on load (prevents flash)
  applyTheme(appSettings.theme, false);
  updateSettingsUI();
}

function saveSettings() {
  localStorage.setItem("pitacofc_settings", JSON.stringify(appSettings));
}

// ============================================================
// SISTEMA DE TEMA (Inversão de Cores)
// ============================================================

function toggleTheme() {
  const newTheme = appSettings.theme === "normal" ? "inverted" : "normal";
  applyTheme(newTheme, true);
  appSettings.theme = newTheme;
  saveSettings();
  updateSettingsUI();
  showToast(
    newTheme === "inverted"
      ? (appSettings.language === "pt" ? "Tema invertido ativado!" : "Inverted theme activated!")
      : (appSettings.language === "pt" ? "Tema padrão restaurado!" : "Default theme restored!"),
    "success"
  );
}

function applyTheme(theme, animate) {
  const body = document.body;
  if (animate) {
    body.style.transition = "background 0.3s, color 0.3s";
    setTimeout(() => { body.style.transition = ""; }, 400);
  }
  if (theme === "inverted") {
    body.classList.add("theme-inverted");
  } else {
    body.classList.remove("theme-inverted");
  }
}

function updateSettingsUI() {
  // Theme toggle track
  const track = document.querySelector(".theme-toggle-track");
  if (track) {
    track.classList.toggle("active", appSettings.theme === "inverted");
  }

  // Language buttons
  const btnPT = document.getElementById("langBtnPT");
  const btnEN = document.getElementById("langBtnEN");
  if (btnPT) btnPT.classList.toggle("active", appSettings.language === "pt");
  if (btnEN) btnEN.classList.toggle("active", appSettings.language === "en");
}

// ============================================================
// SISTEMA DE IDIOMA (PT / EN)
// ============================================================

const translations = {
  pt: {
    nav_home:            "Home",
    nav_games:           "Mini-Games",
    nav_games_short:     "Games",
    nav_builder:         "Team Builder",
    nav_builder_short:   "Builder",
    nav_ranking:         "Ranking",
    nav_curiosidades:    "Curiosidades",
    nav_curio_short:     "Curios.",
    nav_profile:         "Profile",
    nav_settings:        "Configurações",
    nav_settings_short:  "Config.",
    label_balance:       "Saldo",
    hero_kicker:         "Plataforma de Inteligência Futebolística",
    hero_headline:       "Monte o<br><em>Time Perfeito.</em>",
    hero_body:           "Teste seus conhecimentos nos mini-games, ganhe moedas e monte o seu sonho. Estratégia e paixão.",
    cta_play:            "Jogar Agora",
    cta_build:           "Montar Time",
    hstat_players:       "Jogadores",
    hstat_clubs:         "Clubes",
    hstat_games:         "Games",
    hstat_streak:        "Melhor Sequência",
    dash_coins:          "Saldo de Moedas",
    dash_value:          "Valor do Time",
    dash_played:         "Jogos Disputados",
    dash_accuracy:       "Precisão",
    games_sub:           "Ganhe moedas. Expanda seu time.",
    games_sub2:          "Escolha um desafio e ganhe moedas",
    view_all:            "Ver todos",
    game_guessTeam:      "Adivinhe o Time",
    game_guessTeam_sub:  "Identifique o clube pelo escudo borrado",
    game_missingLink:    "Elo Perdido",
    game_missingLink_sub:"Encontre o jogador que une dois clubes",
    game_career:         "Carreira do Jogador",
    game_career_sub:     "Adivinhe o jogador pelo histórico de clubes",
    game_tof:            "Verdade ou Mito",
    game_tof_sub:        "Este jogador realmente atuou neste clube?",
    game_budget:         "Time com Orçamento",
    game_budget_sub:     "Monte o melhor time dentro do seu orçamento",
    ctrl_formation:      "Formação",
    ctrl_stats:          "Estatísticas do Time",
    ctrl_budget:         "Orçamento",
    ctrl_teamval:        "Valor do Time",
    ctrl_players:        "Jogadores",
    btn_clear:           "Limpar Elenco",
    squad_list:          "Lista do Elenco",
    squad_empty:         "Nenhum jogador selecionado",
    ranking_sub:         "Melhores managers da plataforma",
    leaderboard:         "Placar",
    ranking_manager:     "Manager",
    ranking_coins:       "Moedas",
    ranking_teamval:     "Valor do Time",
    ranking_accuracy:    "Precisão",
    your_rank:           "Sua Posição",
    nav_profile:         "Perfil",
    profile_sub:         "Suas estatísticas e conquistas",
    stat_coins:          "Moedas",
    stat_teamval:        "Valor do Time",
    stat_games:          "Jogos",
    stat_streak:         "Melhor Sequência",
    stat_correct:        "Acertos",
    stat_accuracy:       "Precisão",
    btn_save:            "Salvar",
    btn_reset:           "Resetar",
    achievements:        "Conquistas",
    curiosidades_sub:    "Fatos surpreendentes do mundo do futebol",
    filter_all:          "Todos",
    filter_wc:           "Copa do Mundo",
    filter_records:      "Recordes",
    filter_legends:      "Lendas",
    filter_bizarre:      "Bizarrices",
    filter_clubs:        "Clubes",
    filter_controversies:"Controvérsias",
    settings_sub:        "Personalize sua experiência",
    settings_lang_title: "Idioma / Language",
    settings_lang_sub:   "Escolha o idioma da interface",
    settings_theme_title:"Tema / Theme",
    settings_theme_sub:  "Inverta o esquema de cores do site",
    settings_about_title:"Sobre o App",
    settings_about_sub:  "Informações da plataforma",
    about_version:       "Versão",
    about_curiosities:   "Curiosidades",
    about_games:         "Mini-Games",
    theme_normal:        "Padrão",
    theme_inverted:      "Invertido",
    modal_select:        "Selecionar Jogador",
    credits_text:        "Site criado por <strong>kzincks</strong>",
    builder_sub:         "Monte seu time dos sonhos"
  },
  en: {
    nav_home:            "Home",
    nav_games:           "Mini-Games",
    nav_games_short:     "Games",
    nav_builder:         "Team Builder",
    nav_builder_short:   "Builder",
    nav_ranking:         "Ranking",
    nav_curiosidades:    "Trivia",
    nav_curio_short:     "Trivia",
    nav_profile:         "Profile",
    nav_settings:        "Settings",
    nav_settings_short:  "Settings",
    label_balance:       "Balance",
    hero_kicker:         "Football Intelligence Platform",
    hero_headline:       "Build the<br><em>Perfect Squad.</em>",
    hero_body:           "Test your knowledge with mini-games, earn coins, and assemble your dream team. Strategy meets passion.",
    cta_play:            "Play Now",
    cta_build:           "Build Team",
    hstat_players:       "Players",
    hstat_clubs:         "Clubs",
    hstat_games:         "Games",
    hstat_streak:        "Best Streak",
    dash_coins:          "Coin Balance",
    dash_value:          "Team Value",
    dash_played:         "Games Played",
    dash_accuracy:       "Accuracy",
    games_sub:           "Earn coins. Expand your squad.",
    games_sub2:          "Choose a challenge and earn coins",
    view_all:            "View all",
    game_guessTeam:      "Guess the Team",
    game_guessTeam_sub:  "Identify the club from a blurred badge",
    game_missingLink:    "Missing Link",
    game_missingLink_sub:"Find the player who connects two clubs",
    game_career:         "Player Career",
    game_career_sub:     "Guess the player from their club history",
    game_tof:            "True or False",
    game_tof_sub:        "Did this player really play for that club?",
    game_budget:         "Budget Squad",
    game_budget_sub:     "Build the best team within your budget",
    ctrl_formation:      "Formation",
    ctrl_stats:          "Squad Stats",
    ctrl_budget:         "Budget",
    ctrl_teamval:        "Team Value",
    ctrl_players:        "Players",
    btn_clear:           "Clear Squad",
    squad_list:          "Squad List",
    squad_empty:         "No players selected",
    ranking_sub:         "Top managers on the platform",
    leaderboard:         "Leaderboard",
    ranking_manager:     "Manager",
    ranking_coins:       "Coins",
    ranking_teamval:     "Team Value",
    ranking_accuracy:    "Accuracy",
    your_rank:           "Your Rank",
    nav_profile:         "Profile",
    profile_sub:         "Your stats and achievements",
    stat_coins:          "Coins",
    stat_teamval:        "Team Value",
    stat_games:          "Games",
    stat_streak:         "Best Streak",
    stat_correct:        "Correct",
    stat_accuracy:       "Accuracy",
    btn_save:            "Save",
    btn_reset:           "Reset",
    achievements:        "Achievements",
    curiosidades_sub:    "Surprising facts from the world of football",
    filter_all:          "All",
    filter_wc:           "World Cup",
    filter_records:      "Records",
    filter_legends:      "Legends",
    filter_bizarre:      "Bizarre",
    filter_clubs:        "Clubs",
    filter_controversies:"Controversies",
    settings_sub:        "Personalize your experience",
    settings_lang_title: "Language / Idioma",
    settings_lang_sub:   "Choose the interface language",
    settings_theme_title:"Theme / Tema",
    settings_theme_sub:  "Invert the site's color scheme",
    settings_about_title:"About the App",
    settings_about_sub:  "Platform information",
    about_version:       "Version",
    about_curiosities:   "Trivia facts",
    about_games:         "Mini-Games",
    theme_normal:        "Default",
    theme_inverted:      "Inverted",
    modal_select:        "Select Player",
    credits_text:        "Site created by <strong>kzincks</strong>",
    builder_sub:         "Assemble your dream squad"
  }
};

function setLanguage(lang) {
  appSettings.language = lang;
  saveSettings();
  applyTranslations();
  updateSettingsUI();
  // Re-render curiosidades so category names update
  renderCuriosidades();
  showToast(
    lang === "pt" ? "Idioma: Português 🇧🇷" : "Language: English 🇬🇧",
    "success"
  );
}

function applyTranslations() {
  const lang  = appSettings.language || "pt";
  const dict  = translations[lang] || translations["pt"];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) {
      el.innerHTML = dict[key];
    }
  });

  // Update html lang attribute
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";

  // Update curiosidades counter label
  const curioCount = document.getElementById("curiositiesCount");
  if (curioCount && typeof curiosidadesData !== "undefined") {
    curioCount.textContent = lang === "pt"
      ? `${curiosidadesData.length} fatos`
      : `${curiosidadesData.length} facts`;
  }

  // Update settings curiosities count
  const settingsCurioCount = document.getElementById("settingsCurioCount");
  if (settingsCurioCount && typeof curiosidadesData !== "undefined") {
    settingsCurioCount.textContent = lang === "pt"
      ? `${curiosidadesData.length} fatos`
      : `${curiosidadesData.length} facts`;
  }

  // Update category filter buttons for current language
  updateCurioFilterLabels(lang);
}

function updateCurioFilterLabels(lang) {
  const filterMap = {
    pt: {
      "all":             "Todos",
      "Copa do Mundo":   "Copa do Mundo",
      "Recordes":        "Recordes",
      "Lendas":          "Lendas",
      "Bizarrices":      "Bizarrices",
      "Clubes":          "Clubes",
      "Controvérsias":   "Controvérsias"
    },
    en: {
      "all":             "All",
      "Copa do Mundo":   "World Cup",
      "Recordes":        "Records",
      "Lendas":          "Legends",
      "Bizarrices":      "Bizarre",
      "Clubes":          "Clubs",
      "Controvérsias":   "Controversies"
    }
  };
  const map = filterMap[lang] || filterMap["pt"];
  document.querySelectorAll(".curio-filter-btn").forEach(btn => {
    const cat = btn.dataset.cat;
    if (map[cat]) btn.textContent = map[cat];
  });
}

// ============================================================
// CURIOSIDADES — Rendering
// ============================================================

let curiosidadesCurrentFilter = "all";

function renderCuriosidades() {
  const grid = document.getElementById("curiositiesGrid");
  if (!grid || typeof curiosidadesData === "undefined") return;

  const lang = appSettings.language || "pt";

  const filtered = curiosidadesCurrentFilter === "all"
    ? curiosidadesData
    : curiosidadesData.filter(c => c.category === curiosidadesCurrentFilter);

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-3);">
      <i class="ph ph-magnifying-glass" style="font-size:2rem;display:block;margin-bottom:0.75rem;"></i>
      ${lang === "pt" ? "Nenhuma curiosidade encontrada." : "No facts found."}
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((item, idx) => {
    const title    = lang === "en" ? item.titleEn    : item.title;
    const text     = lang === "en" ? item.textEn     : item.text;
    const category = lang === "en" ? item.categoryEn : item.category;

    return `
      <div class="curiosity-card" style="--curio-color: ${item.color}">
        <div class="curiosity-card-top">
          <div class="curiosity-icon">
            <i class="ph ${item.icon}"></i>
          </div>
          <div class="curiosity-meta">
            <span class="curiosity-category">${category}</span>
            <span class="curiosity-title">${title}</span>
          </div>
        </div>
        <p class="curiosity-text">${text}</p>
        <span class="curiosity-card-num">#${String(item.id).padStart(2, "0")}</span>
      </div>`;
  }).join("");

  // Update counter
  const counter = document.getElementById("curiositiesCount");
  if (counter) {
    counter.textContent = lang === "pt"
      ? `${filtered.length} fatos`
      : `${filtered.length} facts`;
  }
}

function filterCuriosidades(cat, btn) {
  curiosidadesCurrentFilter = cat;

  // Update active filter button
  document.querySelectorAll(".curio-filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  renderCuriosidades();
}