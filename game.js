function enterMobileMode() {
  const isMobile = window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(max-width: 850px)').matches
    || window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches;
  if (!isMobile) return;
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
ui.levelIntroButton.addEventListener('click', hideLevelIntro);
ui.roundStars.addEventListener('click', event => showStarRules(getLevel(), event.currentTarget));
ui.starRulesCloseButton.addEventListener('click', hideStarRules);
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
ui.mobileMenuButton.addEventListener('click', () => {
  const isOpen = ui.controlPanel.classList.toggle('is-open');
  ui.mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
});
document.querySelectorAll('.difficulty-option').forEach(button => {
  button.addEventListener('click', () => setDifficulty(button.dataset.difficulty));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !ui.starRulesModal.hidden) {
    hideStarRules();
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
updateDifficultyUi();
updateUi();
requestAnimationFrame(loop);
