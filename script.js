// ============================================================
// script.js — PitacoFC Football Platform
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
  squad: {},        // positionId -> player object
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
  blurInterval: null,
  blurLevel: 20,
  timerInterval: null,
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
 * Retorna um elemento <img> para o escudo do clube.
 * Tenta PNG primeiro, depois GIF. Se nenhum carregar, mostra o ícone FA.
 * @param {string} badgePath  - valor de club.badge, ex: "escudo/Flamengo"
 * @param {string} clubName   - nome do clube (para alt text)
 * @param {string} cssClass   - classe extra na img
 */
function getBadgeImg(badgePath, clubName, cssClass = "") {
  if (!badgePath) return null;
  const img = document.createElement("img");
  img.alt = clubName;
  if (cssClass) img.className = cssClass;

  // Tenta PNG; se falhar, tenta GIF; se falhar, retorna null (caller usa ícone FA)
  img.src = badgePath + ".PNG";
  img.onerror = function () {
    if (!this._triedGif) {
      this._triedGif = true;
      this.src = badgePath + ".GIF";
    } else {
      // Ambos falharam — esconde a imagem e deixa o ícone FA visível
      this.style.display = "none";
      const fa = this.parentElement && this.parentElement.querySelector(".fa-shield-halved");
      if (fa) fa.style.display = "";
    }
  };
  img.onload = function () {
    // Esconde o ícone FA quando a imagem carrega
    const fa = this.parentElement && this.parentElement.querySelector(".fa-shield-halved");
    if (fa) fa.style.display = "none";
  };
  return img;
}

/**
 * Injeta o escudo num container que já tem um <i class="fa-solid fa-shield-halved"> dentro.
 * O ícone fica escondido quando a imagem carrega e reaparece se falhar.
 */
function injectBadge(container, badgePath, clubName, imgClass = "club-badge-img") {
  if (!badgePath) return;
  // Remove img anterior se houver
  const old = container.querySelector("." + imgClass);
  if (old) old.remove();

  const img = getBadgeImg(badgePath, clubName, imgClass);
  if (!img) return;
  // Garante que o ícone FA está visível até a img carregar
  const fa = container.querySelector(".fa-shield-halved");
  if (fa) fa.style.display = "";
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
});

// ============================================================
// PERSISTENCE
// ============================================================
function loadState() {
  const saved = localStorage.getItem("pitacofc_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch(e) { console.warn("Failed to load state"); }
  }
}

function saveState() {
  localStorage.setItem("pitacofc_state", JSON.stringify(state));
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  document.getElementById("navHamburger").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("navLinks");
    if (!e.target.closest(".nav-links") && !e.target.closest(".nav-hamburger")) {
      menu.classList.remove("open");
    }
  });
}

function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add("active");

  document.getElementById("navLinks").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });

  updateAllUI();
  if (pageId === "profile") renderAchievements();
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePlayerModal();
    }
    if (e.key === "Enter") {
      const gamesPage = document.getElementById("page-games");
      if (gamesPage && gamesPage.classList.contains("active")) {
        // trigger submit for focused game
        const focused = document.activeElement;
        if (focused && focused.id === "guessTeamInput") checkGuessTeam();
        if (focused && focused.id === "missingLinkInput") checkMissingLink();
        if (focused && focused.id === "careerQuizInput") checkCareerQuiz();
      }
    }
  });
}

// ============================================================
// UI UPDATES
// ============================================================
function updateAllUI() {
  // Navbar
  document.getElementById("navCoins").textContent = state.coins;

  // Game pages
  ["gamesCoins", "builderCoins", "homeCoins"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = state.coins;
  });

  // Home progress
  setEl("homeTeamValue", state.teamValue);
  setEl("homeGamesPlayed", state.gamesPlayed);
  setEl("homeCorrect", state.correctAnswers);

  // Builder
  setEl("builderBudget", state.coins);
  setEl("builderTeamVal", state.teamValue);
  const playerCount = Object.keys(state.squad).length;
  setEl("builderPlayerCount", `${playerCount}/11`);

  // Profile
  setEl("profileCoins", state.coins);
  setEl("profileTeamVal", state.teamValue);
  setEl("profileGamesPlayed", state.gamesPlayed);
  setEl("profileBestStreak", state.bestStreak);
  setEl("profileCorrect", state.correctAnswers);
  const acc = state.totalAnswers > 0 ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0;
  setEl("profileAccuracy", acc + "%");
  setEl("profileUsernameDisplay", state.username);

  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) usernameInput.value = state.username === "Guest Manager" ? "" : state.username;

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
    p.innerHTML = '<i class="fa-solid fa-coins"></i>';
    const angle = (i / count) * Math.PI * 2;
    const dist = 60 + Math.random() * 60;
    p.style.left = (x || window.innerWidth / 2) + "px";
    p.style.top = (y || window.innerHeight / 2) + "px";
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

  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", warning: "fa-triangle-exclamation" };
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.35s ease forwards";
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

  // Only use clubs that have a badge path
  const data = guessTeamData.filter(c => c.badge);
  if (!data.length) return;

  const idx = Math.floor(Math.random() * data.length);
  guessTeamState.current = data[idx];
  guessTeamState.blurLevel = 20;

  const placeholder = document.getElementById("badgePlaceholder");

  // Background color tint from club color
  placeholder.style.background = `linear-gradient(135deg, ${guessTeamState.current.color}22, ${guessTeamState.current.color}44)`;

  // Remove any previous badge img
  const oldImg = placeholder.querySelector(".guess-badge-img");
  if (oldImg) oldImg.remove();

  // Restore fallback icon & initial (hidden once image loads)
  const faIcon = placeholder.querySelector("i");
  const initialSpan = placeholder.querySelector("span");
  if (faIcon) { faIcon.style.display = ""; faIcon.style.color = guessTeamState.current.color; }
  if (initialSpan) { initialSpan.textContent = guessTeamState.current.name.charAt(0); initialSpan.style.color = guessTeamState.current.color; }

  // Inject real badge
  if (guessTeamState.current.badge) {
    const img = document.createElement("img");
    img.className = "guess-badge-img";
    img.alt = guessTeamState.current.name;
    img.src = guessTeamState.current.badge + ".PNG";
    img.onerror = function () {
      if (!this._triedGif) {
        this._triedGif = true;
        this.src = guessTeamState.current.badge + ".GIF";
      } else {
        this.style.display = "none";
        if (faIcon) faIcon.style.display = "";
        if (initialSpan) initialSpan.style.display = "";
      }
    };
    img.onload = function () {
      if (faIcon) faIcon.style.display = "none";
      if (initialSpan) initialSpan.style.display = "none";
    };
    placeholder.appendChild(img);
  }

  document.getElementById("leagueHintText").textContent = `Hint: ${guessTeamState.current.league}`;
  document.getElementById("guessTeamInput").value = "";
  document.getElementById("guessTeamFeedback").innerHTML = "";
  document.getElementById("blurTimerFill").style.width = "100%";
  document.getElementById("blurHint").textContent = "Badge is blurred — guess fast for more points!";

  // Apply blur
  applyBadgeBlur(20);

  // Timer to reduce blur
  let elapsed = 0;
  guessTeamState.blurInterval = setInterval(() => {
    elapsed++;
    const progress = elapsed / 30;
    const newBlur = Math.max(0, 20 - (20 * progress));
    applyBadgeBlur(newBlur);
    document.getElementById("blurTimerFill").style.width = (100 - (progress * 100)) + "%";
    if (elapsed >= 30) {
      clearInterval(guessTeamState.blurInterval);
      document.getElementById("blurHint").textContent = "Badge fully revealed!";
    }
  }, 1000);

  document.getElementById("guessTeamInput").focus();
}

function applyBadgeBlur(level) {
  const badge = document.getElementById("blurredBadge");
  badge.style.filter = `blur(${level}px)`;
}

function checkGuessTeam() {
  const input = document.getElementById("guessTeamInput").value.trim();
  if (!input) return;

  const correct = guessTeamState.current.name;
  const isCorrect = normalizeStr(input) === normalizeStr(correct) ||
                    normalizeStr(correct).includes(normalizeStr(input)) && input.length >= 4;

  if (isCorrect) {
    guessTeamState.score++;
    guessTeamState.streak++;
    state.gamesPlayed++;
    state.currentStreak = guessTeamState.streak;
    clearInterval(guessTeamState.blurInterval);
    applyBadgeBlur(0);
    showFeedback("guessTeamFeedback", true, `Correct! It was ${correct}`);
    updateGameScores("guessTeam");
    awardCoins(15 + (guessTeamState.streak > 3 ? 5 : 0));
    setTimeout(() => loadNextGuessTeam(), 1800);
  } else {
    guessTeamState.wrong++;
    guessTeamState.streak = 0;
    state.totalAnswers++;
    saveState();
    showFeedback("guessTeamFeedback", false, `Wrong! Try again or skip.`);
    updateGameScores("guessTeam");
    document.getElementById("guessTeamInput").value = "";
  }

  updateAllUI();
}

function skipGuessTeam() {
  clearInterval(guessTeamState.blurInterval);
  const name = guessTeamState.current ? guessTeamState.current.name : "?";
  showFeedback("guessTeamFeedback", false, `Skipped. It was ${name}`);
  guessTeamState.streak = 0;
  state.currentStreak = 0;
  updateGameScores("guessTeam");
  setTimeout(() => loadNextGuessTeam(), 1500);
}

function updateGameScores(game) {
  if (game === "guessTeam") {
    setEl("guessTeamScore", guessTeamState.score);
    setEl("guessTeamWrong", guessTeamState.wrong);
    setEl("guessTeamStreak", guessTeamState.streak);
  } else if (game === "missingLink") {
    setEl("missingLinkScore", missingLinkState.score);
    setEl("missingLinkWrong", missingLinkState.wrong);
  } else if (game === "careerQuiz") {
    setEl("careerQuizScore", careerQuizState.score);
    setEl("careerQuizWrong", careerQuizState.wrong);
  } else if (game === "trueOrFalse") {
    setEl("tofScore", trueOrFalseState.score);
    setEl("tofWrong", trueOrFalseState.wrong);
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
  const pairs = missingLinkPairs;
  let idx;
  do { idx = Math.floor(Math.random() * pairs.length); }
  while (missingLinkState.usedIndices.length < pairs.length && missingLinkState.usedIndices.includes(idx));

  if (missingLinkState.usedIndices.length >= pairs.length) missingLinkState.usedIndices = [];
  missingLinkState.usedIndices.push(idx);
  missingLinkState.current = pairs[idx];

  const club1 = clubs.find(c => c.name === missingLinkState.current.club1);
  const club2 = clubs.find(c => c.name === missingLinkState.current.club2);

  document.getElementById("missingClub1Name").textContent = missingLinkState.current.club1;
  document.getElementById("missingClub2Name").textContent = missingLinkState.current.club2;

  const badge1 = document.querySelector("#missingClub1 .club-badge-display");
  const badge2 = document.querySelector("#missingClub2 .club-badge-display");

  // Render club 1
  if (club1) {
    badge1.style.borderColor = club1.color;
    badge1.style.background = club1.color + "11";
    const fa1 = badge1.querySelector("i");
    if (fa1) { fa1.style.color = club1.color; fa1.style.display = ""; }
    if (club1.badge) injectBadge(badge1, club1.badge, club1.name, "missing-badge-img");
  }

  // Render club 2
  if (club2) {
    badge2.style.borderColor = club2.color;
    badge2.style.background = club2.color + "11";
    const fa2 = badge2.querySelector("i");
    if (fa2) { fa2.style.color = club2.color; fa2.style.display = ""; }
    if (club2.badge) injectBadge(badge2, club2.badge, club2.name, "missing-badge-img");
  }

  document.getElementById("missingLinkInput").value = "";
  document.getElementById("missingLinkFeedback").innerHTML = "";
  document.getElementById("missingLinkInput").focus();
}

function checkMissingLink() {
  const input = document.getElementById("missingLinkInput").value.trim();
  if (!input || !missingLinkState.current) return;

  const validAnswers = missingLinkState.current.answers;
  const isCorrect = validAnswers.some(ans =>
    normalizeStr(input) === normalizeStr(ans) ||
    normalizeStr(ans).includes(normalizeStr(input)) && input.length >= 4 ||
    normalizeStr(input).includes(normalizeStr(ans.split(" ").pop())) && input.length >= 4
  );

  if (isCorrect) {
    missingLinkState.score++;
    state.gamesPlayed++;
    showFeedback("missingLinkFeedback", true, `Correct! Valid answers: ${validAnswers.slice(0,2).join(", ")}`);
    updateGameScores("missingLink");
    awardCoins(20);
    setTimeout(() => loadNextMissingLink(), 2000);
  } else {
    missingLinkState.wrong++;
    state.totalAnswers++;
    saveState();
    showFeedback("missingLinkFeedback", false, `Not quite. Try another player!`);
    updateGameScores("missingLink");
    document.getElementById("missingLinkInput").value = "";
  }

  updateAllUI();
}

function nextMissingLink() {
  const answers = missingLinkState.current ? missingLinkState.current.answers.slice(0, 2).join(", ") : "";
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
  const data = careerQuizPlayers;
  let idx;
  do { idx = Math.floor(Math.random() * data.length); }
  while (careerQuizState.usedIndices.length < data.length && careerQuizState.usedIndices.includes(idx));

  if (careerQuizState.usedIndices.length >= data.length) careerQuizState.usedIndices = [];
  careerQuizState.usedIndices.push(idx);
  careerQuizState.current = data[idx];

  // Render timeline
  const timeline = document.getElementById("careerTimeline");
  timeline.innerHTML = "";

  careerQuizState.current.clubs.forEach((clubName, i) => {
    const clubData = clubs.find(c => c.name === clubName);
    const chip = document.createElement("div");
    chip.className = "career-club-chip";
    chip.style.animationDelay = `${i * 0.1}s`;
    if (clubData) {
      chip.style.borderColor = clubData.color + "66";
      chip.style.background = clubData.color + "0d";
    }

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-shield-halved";
    if (clubData) icon.style.color = clubData.color;
    chip.appendChild(icon);

    // Inject badge image if available
    if (clubData && clubData.badge) {
      const img = document.createElement("img");
      img.className = "chip-badge-img";
      img.alt = clubName;
      img.src = clubData.badge + ".PNG";
      img.onerror = function () {
        if (!this._triedGif) { this._triedGif = true; this.src = clubData.badge + ".GIF"; }
        else { this.style.display = "none"; icon.style.display = ""; }
      };
      img.onload = function () { icon.style.display = "none"; };
      chip.insertBefore(img, icon);
    }

    const span = document.createElement("span");
    span.textContent = clubName;
    chip.appendChild(span);
    timeline.appendChild(chip);

    // Arrow between chips
    if (i < careerQuizState.current.clubs.length - 1) {
      const arrow = document.createElement("i");
      arrow.className = "fa-solid fa-arrow-right";
      arrow.style.cssText = "color:var(--gray-300);font-size:0.7rem;margin-top:0.5rem;";
      timeline.appendChild(arrow);
    }
  });

  document.getElementById("careerHintText").textContent = careerQuizState.current.hint || "";
  document.getElementById("careerQuizInput").value = "";
  document.getElementById("careerQuizFeedback").innerHTML = "";
  document.getElementById("careerQuizInput").focus();
}

function checkCareerQuiz() {
  const input = document.getElementById("careerQuizInput").value.trim();
  if (!input || !careerQuizState.current) return;

  const correct = careerQuizState.current.name;
  const nameParts = correct.toLowerCase().split(" ");
  const inputLower = normalizeStr(input);

  const isCorrect = normalizeStr(correct) === inputLower ||
                    nameParts.some(part => part.length > 3 && inputLower.includes(part));

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
    showFeedback("careerQuizFeedback", false, `Wrong. Keep guessing or skip!`);
    updateGameScores("careerQuiz");
    document.getElementById("careerQuizInput").value = "";
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
  const data = trueOrFalseQuestions;
  let idx;
  do { idx = Math.floor(Math.random() * data.length); }
  while (trueOrFalseState.usedIndices.length < data.length && trueOrFalseState.usedIndices.includes(idx));

  if (trueOrFalseState.usedIndices.length >= data.length) trueOrFalseState.usedIndices = [];
  trueOrFalseState.usedIndices.push(idx);
  trueOrFalseState.current = data[idx];

  document.getElementById("tofPlayer").textContent = trueOrFalseState.current.player;
  document.getElementById("tofClub").textContent = trueOrFalseState.current.club;
  document.getElementById("tofFeedback").innerHTML = "";
}

function checkTrueOrFalse(userAnswer) {
  if (!trueOrFalseState.current) return;

  const correct = trueOrFalseState.current.answer;
  const isCorrect = userAnswer === correct;

  if (isCorrect) {
    trueOrFalseState.score++;
    trueOrFalseState.streak++;
    state.gamesPlayed++;
    state.currentStreak = trueOrFalseState.streak;
    const msg = correct ? "TRUE - They did play there!" : "FALSE - They never played there!";
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

function launchGame(gameId) {
  navigateTo("games");
  setTimeout(() => {
    const el = document.getElementById("game-" + gameId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ============================================================
// TEAM BUILDER
// ============================================================
function renderPitch() {
  const container = document.getElementById("pitchPositions");
  container.innerHTML = "";
  const formation = formations[state.currentFormation];

  formation.positions.forEach(pos => {
    const node = document.createElement("div");
    node.className = "pos-node";
    node.id = "pos-" + pos.id;
    node.style.left = pos.x + "%";
    node.style.top = pos.y + "%";

    const player = state.squad[pos.id];

    if (player) {
      node.classList.add("filled");
      node.innerHTML = `
        <div class="pos-node-inner">
          <div class="pos-circle">
            ${player.image ? `<img src="${player.image}" class="pos-player-photo" alt="${player.name}" />` : `<i class="fa-solid fa-user"></i>`}
          </div>
          <div class="pos-player-name">${getShortName(player.name)}</div>
          <button class="pos-remove-btn" onclick="removePlayer('${pos.id}', event)" title="Remove player">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>`;
    } else {
      node.innerHTML = `
        <div class="pos-node-inner">
          <div class="pos-circle">${pos.label}</div>
        </div>`;
      node.addEventListener("click", () => openPlayerModal(pos.id, pos.type));
    }

    container.appendChild(node);
  });
}

function changeFormation(formationKey) {
  // Remove players that no longer have matching positions
  const oldPositions = formations[state.currentFormation].positions.map(p => p.id);
  const newPositions = formations[formationKey].positions.map(p => p.id);

  // Keep players whose slot exists in new formation
  const newSquad = {};
  newPositions.forEach(posId => {
    if (state.squad[posId]) newSquad[posId] = state.squad[posId];
  });
  state.squad = newSquad;
  state.currentFormation = formationKey;

  document.querySelectorAll(".formation-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.formation === formationKey);
  });

  recalcTeamValue();
  renderPitch();
  updateSquadList();
  saveState();
}

function openPlayerModal(positionId, positionType) {
  state.currentPositionClicked = positionId;
  state.currentPositionType = positionType;
  playerModalFilter = { position: positionType, search: "" };

  document.getElementById("modalPositionTag").textContent = positionType;
  document.getElementById("playerSearchInput").value = "";

  // Set filter button
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === positionType || (positionType === "all" && b.dataset.filter === "all"));
  });
  // Default to show all but highlight the type
  filterByPosition(positionType, document.querySelector(`[data-filter="${positionType}"]`));

  renderModalPlayers();
  document.getElementById("playerModal").classList.add("open");
  setTimeout(() => document.getElementById("playerSearchInput").focus(), 150);
}

function closePlayerModal() {
  document.getElementById("playerModal").classList.remove("open");
  state.currentPositionClicked = null;
  state.currentPositionType = null;
}

function filterByPosition(pos, btn) {
  playerModalFilter.position = pos;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderModalPlayers();
}

function filterPlayers() {
  playerModalFilter.search = document.getElementById("playerSearchInput").value.trim().toLowerCase();
  renderModalPlayers();
}

function renderModalPlayers() {
  const list = document.getElementById("modalPlayerList");
  list.innerHTML = "";

  const selectedPlayerNames = Object.values(state.squad).map(p => p.name);

  let filtered = players.filter(p => {
    const posMatch = playerModalFilter.position === "all" || p.position === playerModalFilter.position;
    const searchMatch = !playerModalFilter.search ||
      p.name.toLowerCase().includes(playerModalFilter.search) ||
      p.clubs.some(c => c.toLowerCase().includes(playerModalFilter.search));
    return posMatch && searchMatch;
  });

  filtered.sort((a, b) => b.price - a.price);

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--gray-400);">
      <i class="fa-solid fa-user-slash" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
      No players found
    </div>`;
    return;
  }

  filtered.forEach(player => {
    const alreadySelected = selectedPlayerNames.includes(player.name);
    const canAfford = player.price <= state.coins;

    const item = document.createElement("div");
    item.className = `player-list-item ${!canAfford ? "cannot-afford" : ""} ${alreadySelected ? "already-selected" : ""}`;

    item.innerHTML = `
      <div class="player-avatar">
        ${player.image ? `<img src="${player.image}" alt="${player.name}" />` : `<i class="fa-solid fa-user"></i>`}
      </div>
      <div class="player-item-info">
        <div class="player-item-name">${player.name}</div>
        <div class="player-item-meta">
          <span class="player-pos-badge ${player.position}">${player.position}</span>
          <span class="player-item-nation"><i class="fa-solid fa-flag" style="font-size:0.65rem;margin-right:2px;"></i>${player.nation}</span>
        </div>
      </div>
      <div class="player-item-price">
        <i class="fa-solid fa-coins"></i>
        ${player.price}
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
  if (player.price > state.coins) {
    showToast("Not enough coins!", "error");
    return;
  }

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

  // Refund half the price
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
  if (Object.keys(state.squad).length === 0) {
    showToast("Squad is already empty!", "warning");
    return;
  }

  let refund = 0;
  Object.values(state.squad).forEach(p => { refund += Math.floor(p.price / 2); });
  state.squad = {};
  state.coins += refund;
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
  const formation = formations[state.currentFormation];
  const entries = formation.positions
    .map(pos => ({ pos, player: state.squad[pos.id] }))
    .filter(e => e.player);

  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-squad">
      <i class="fa-solid fa-users-slash"></i>
      <span>No players selected yet</span>
    </div>`;
    return;
  }

  list.innerHTML = entries.map(({ pos, player }) => `
    <div class="squad-player-row">
      <div class="squad-pos-badge ${player.position}">${pos.label}</div>
      <div class="squad-player-info">
        <b>${player.name}</b>
        <small>${player.nation}</small>
      </div>
      <div class="squad-player-price">
        <i class="fa-solid fa-coins"></i>
        ${player.price}
      </div>
    </div>
  `).join("");
}

// ============================================================
// PROFILE
// ============================================================
function saveUsername() {
  const input = document.getElementById("usernameInput").value.trim();
  if (!input) { showToast("Enter a username first!", "warning"); return; }
  if (input.length < 2) { showToast("Username too short!", "warning"); return; }

  state.username = input;
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
  showToast("Profile reset!", "warning");
}

// ============================================================
// ACHIEVEMENTS
// ============================================================
const achievementDefs = [
  { id: "first_correct", icon: "fa-star", label: "First Steps", desc: "Get your first correct answer", check: s => s.correctAnswers >= 1 },
  { id: "ten_correct", icon: "fa-medal", label: "Getting Warm", desc: "Get 10 correct answers", check: s => s.correctAnswers >= 10 },
  { id: "fifty_correct", icon: "fa-trophy", label: "True Scholar", desc: "Get 50 correct answers", check: s => s.correctAnswers >= 50 },
  { id: "streak_3", icon: "fa-fire", label: "On Fire", desc: "Reach a streak of 3", check: s => s.bestStreak >= 3 },
  { id: "streak_5", icon: "fa-fire-flame-curved", label: "Inferno", desc: "Reach a streak of 5", check: s => s.bestStreak >= 5 },
  { id: "coins_200", icon: "fa-coins", label: "Coin Collector", desc: "Accumulate 200 coins", check: s => s.coins >= 200 },
  { id: "full_squad", icon: "fa-users", label: "Full House", desc: "Fill all 11 positions", check: s => Object.keys(s.squad).length >= 11 },
  { id: "play_10", icon: "fa-gamepad", label: "Dedicated", desc: "Play 10 mini-games", check: s => s.gamesPlayed >= 10 },
  { id: "accuracy_80", icon: "fa-bullseye", label: "Sharp Mind", desc: "Reach 80% accuracy (min 10 answers)", check: s => s.totalAnswers >= 10 && (s.correctAnswers / s.totalAnswers) >= 0.8 }
];

function renderAchievements() {
  const list = document.getElementById("achievementsList");
  list.innerHTML = achievementDefs.map(ach => {
    const unlocked = ach.check(state);
    return `<div class="achievement-item ${unlocked ? "unlocked" : ""}">
      <div class="achievement-icon">
        <i class="fa-solid ${ach.icon}"></i>
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
  if (parts.length === 1) return name;
  if (parts.length === 2) return name;
  return parts[0].charAt(0) + ". " + parts.slice(-1)[0];
}

function showFeedback(elId, isCorrect, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  const icon = isCorrect
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-circle-xmark"></i>';
  el.className = `game-feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`;
  el.innerHTML = `${icon} ${message}`;
}

// Close modal on overlay click
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("playerModal").addEventListener("click", function(e) {
    if (e.target === this) closePlayerModal();
  });
});
