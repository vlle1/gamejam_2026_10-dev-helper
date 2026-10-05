// --- Device detection ---
// Mobile mode is based on device capabilities (touch input), NOT resolution:
// phones can have large, high-DPI screens, and desktops can have small
// windows. A device with a coarse pointer (finger) is treated as mobile.
function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches
    || (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
}
function updateDeviceMode() {
  document.body.classList.toggle('is-mobile', isTouchDevice());
}
function enterMobileMode() {
  updateDeviceMode();
  if (!isTouchDevice()) return;
  if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
}

// --- Difficulty setting ---
// Adjusts the target circle radius. Persisted to localStorage and applied to
// the current game immediately. Existing targets keep their hit state and
// position; only their radius is updated so already-hit targets stay grey.
function setDifficulty(difficulty) {
  if (!CONFIG.difficulty[difficulty]) return;
  state.difficulty = difficulty;
  localStorage.setItem(`${STORAGE_PREFIX}difficulty`, difficulty);
  updateDifficultyUi();
  // Update the radius of existing targets without resetting their hit state.
  if (state.running) {
    const radius = getTargetRadius(getLevel(), state.round !== CONFIG.round.first);
    state.targets.forEach(target => { target.r = radius * fieldScale(); });
    updateUi();
  }
}
function updateDifficultyUi() {
  document.querySelectorAll('.difficulty-option').forEach(button => {
    const active = button.dataset.difficulty === state.difficulty;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('pointerdown', event => {
  if (!state.running || state.gameOver || state.shotInMotion || state.strokes >= getLevel().maxShots) return;
  state.dragging = true;
  state.dragStart = pointerPosition(event);
  state.dragCurrent = state.dragStart;
  state.power = 0;
  setPhase('phase.drag');
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});
canvas.addEventListener('pointermove', event => {
  if (!state.dragging) return;
  updateDrag(pointerPosition(event));
  event.preventDefault();
});
canvas.addEventListener('pointerup', event => {
  if (!state.dragging) return;
  updateDrag(pointerPosition(event));
  releaseShot();
  canvas.releasePointerCapture(event.pointerId);
  event.preventDefault();
});
canvas.addEventListener('pointercancel', event => {
  if (!state.dragging) return;
  state.dragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  state.power = 0;
  setPhase('phase.ready');
  canvas.releasePointerCapture(event.pointerId);
  updateUi();
});
//start: click / enter
ui.startButton.addEventListener('click', () => { beginGame(); enterMobileMode(); });
ui.undoButton.addEventListener('click', undoLastShot);
ui.levelIntroButton.addEventListener('click', hideLevelIntro);
ui.roundStars.addEventListener('click', event => showStarRules(getLevel(), event.currentTarget));
ui.starRulesCloseButton.addEventListener('click', hideStarRules);
ui.nextLevelButton.addEventListener('click', startNextHighscoreLevel);
ui.replayLevelButton.addEventListener('click', replayHighscoreLevel);
ui.shareHighscoreButton.addEventListener('click', shareHighscoreArtwork);
ui.tipsButton.addEventListener('click', () => {
  ui.tipsPanel.hidden = !ui.tipsPanel.hidden;
  ui.tipsButton.textContent = ui.tipsPanel.hidden ? t('tips.show') : t('tips.hide');
});
ui.nextTipButton.addEventListener('click', updateTip);
ui.langToggle.addEventListener('click', () => {
  setLanguage(currentLang === 'de' ? 'en' : 'de');
});
ui.levelMenuButton.addEventListener('click', () => {
  ui.appShell.classList.add('is-intro');
  updateLevelContent();
});
// Clicking outside the level-selection card closes it and returns to the game.
ui.startScreen.addEventListener('click', event => {
  if (event.target === ui.startScreen || !ui.startCard.contains(event.target)) {
    ui.appShell.classList.remove('is-intro');
  }
});

// --- Pause menu (mobile) ---
// The pause menu is the mobile replacement for the desktop control panel:
// title, restart, level select, difficulty and tips in one overlay.
function isPauseMenuOpen() {
  return !ui.pauseMenu.hidden;
}
function openPauseMenu() {
  if (!state.running || state.gameOver) return;
  ui.pauseMenu.hidden = false;
  ui.pauseButton.setAttribute('aria-expanded', 'true');
  ui.pauseResumeButton.focus();
}
function closePauseMenu() {
  ui.pauseMenu.hidden = true;
  ui.pauseButton.setAttribute('aria-expanded', 'false');
  ui.pauseButton.focus();
}
ui.pauseButton.addEventListener('click', openPauseMenu);
ui.pauseResumeButton.addEventListener('click', closePauseMenu);
// Clicking the dimmed backdrop closes the pause menu.
ui.pauseMenu.addEventListener('click', event => {
  if (event.target === ui.pauseMenu) closePauseMenu();
});
ui.pauseRestartButton.addEventListener('click', () => {
  closePauseMenu();
  beginGame();
});
ui.pauseUndoButton.addEventListener('click', () => {
  undoLastShot();
  closePauseMenu();
});
ui.pauseLevelButton.addEventListener('click', () => {
  closePauseMenu();
  ui.appShell.classList.add('is-intro');
  updateLevelContent();
});
ui.pauseTipsButton.addEventListener('click', () => {
  // Mirror the tips panel state into the pause menu copy.
  ui.pauseTipsPanel.hidden = !ui.pauseTipsPanel.hidden;
  ui.pauseTipsButton.textContent = ui.pauseTipsPanel.hidden ? t('tips.show') : t('tips.hide');
  if (!ui.pauseTipsPanel.hidden) syncPauseTip();
});
ui.pauseNextTipButton.addEventListener('click', () => {
  updateTip();
  syncPauseTip();
});
// Language toggle inside the pause menu (same behavior as the top-bar toggle).
ui.pauseLangToggle.addEventListener('click', () => {
  setLanguage(currentLang === 'de' ? 'en' : 'de');
});
// Keep the pause-menu tip text in sync with the shared tipIndex.
function syncPauseTip() {
  const level = getLevel();
  const tips = levelTips(level);
  ui.pauseTipTitle.textContent = t('tips.title', { n: state.tipIndex + 1, total: tips.length });
  ui.pauseTipText.textContent = tips[state.tipIndex];
}
ui.mobileMenuButton.addEventListener('click', () => {
  const isOpen = ui.controlPanel.classList.toggle('is-open');
  ui.mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('.difficulty-option').forEach(button => {
  button.addEventListener('click', () => setDifficulty(button.dataset.difficulty));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!ui.starRulesModal.hidden) {
      hideStarRules();
      return;
    }
    if (isPauseMenuOpen()) {
      closePauseMenu();
      return;
    }
  }
  if (event.key === 'Escape' && !ui.highscoreModal.hidden) {
    closeHighscoreArtwork();
    return;
  }
  if (event.key === 'Enter' && !event.repeat) beginGame();
});

resizeCanvas();
initPhysics();
resetBall(false);
state.targets = createTargets();
applyStaticTranslations();
updateLevelContent();
updateDeviceMode();
updateDifficultyUi();
updateUi();
requestAnimationFrame(loop);
