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
  setupNavigation();
  setupKeyboardShortcuts();
  initAllGames();
  renderPitch();
  updateAllUI();
  renderAchievements();
  renderRanking();
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

  if (pageId === "profile")  renderAchievements();
  if (pageId === "ranking")  renderRanking();
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