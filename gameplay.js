function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = getLevel().board.width * ratio;
  canvas.height = getLevel().board.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function width() { return getLevel().board.width; }
function height() { return getLevel().board.height; }

// Sets the phase label and colors the live-dot: green when ready to shoot,
// red otherwise (dragging, rolling, won, over).
function setPhase(key) {
  ui.phase.textContent = t(key);
  const ready = key === 'phase.ready';
  ui.liveDot.classList.toggle('is-ready', ready);
}
function resetBall(keepRest) {
  const start = getLevel().ball.normalized
    ? { x: width() * getLevel().ball.x, y: height() * getLevel().ball.y }
    : boardCoordinate(getLevel().ball);
  setBallPosition(start.x, start.y);
  stopBallBody();
  state.ball.r = CONFIG.ball.radius * fieldScale();
  state.shotInMotion = false;
  if (!keepRest) state.restPoints = [];
}

function createTarget(point, radius = CONFIG.target.firstRoundRadius) {
  return { ...point, r: radius * fieldScale(), hit: false };
}

function createItem(item) {
  const point = boardCoordinate(item);
  return { ...item, x: point.x, y: point.y, r: getTargetRadius(getLevel(), state.round !== CONFIG.round.first), active: true };
}

function createItems() {
  return (getLevel().items || []).map(createItem);
}

function activateItem(item) {
  item.active = false;
  if (item.type === 'erasor' && state.restPoints.length > 0) {
    state.restPoints.pop();
  }
  if (item.type === 'barrier') {
    // Barrier is consumed after the ball bounces off it once. The physics
    // collision event marks it _consumed and stepPhysics removes the body.
    if (!item._consumed) {
      item._consumed = true;
      removeBarrierBody(item);
      ui.message.textContent = t('message.itemBarrierUsed');
    }
  }
  if (item.type === 'prediction') {
    // The next slingshot shows a simulated preview line (one reflection).
    state.predictionCharges = 1;
    ui.message.textContent = t('message.itemPrediction');
  }
  if (item.type === 'turn') {
    // Deflect the ball in the direction the arrow points (360°).
    const dir = item.direction ?? 0;
    const speed = Math.max(Math.hypot(state.ball.vx, state.ball.vy), CONFIG.ball.baseShotSpeed * fieldScale() * .5);
    setBallVelocity(Math.cos(dir) * speed, Math.sin(dir) * speed);
    ui.message.textContent = t('message.itemTurn');
  }
}

function getTargetLayout() {
  if (state.round === CONFIG.round.first) {
    return getLevel().targets.map(point => boardCoordinate(point));
  }
  return state.restPoints.length
    ? state.restPoints.map(point => ({ ...point }))
    : [{ x: width() * LEVEL_LAYOUTS.first[1].x, y: height() * LEVEL_LAYOUTS.first[1].y }];
}

function createTargets() {
  const radius = getTargetRadius(getLevel(), state.round !== CONFIG.round.first);
  return getTargetLayout().map(point => createTarget(point, radius));
}

function checkInitialCollisions() {
    state.targets = state.targets.filter(target => Math.hypot(state.ball.x - target.x, state.ball.y - target.y) >= state.ball.r + target.r);
    if (state.targets.length > 0) return false;

    state.history.push(0);
    state.shotInMotion = false;
    state.running = false;
    state.gameOver = true;
    const isNewBest = recordLevelWin(getLevel(), state.round);
    setPhase('phase.won');
    ui.message.textContent = t('message.won', { level: levelName(getLevel()) });
    showBanner(t('banner.win', { level: levelName(getLevel()) }), getLevelStars(getLevel()));
    ui.startButton.textContent = t('start.playAgain');
    renderLevelSelector();
    showHighscoreArtwork(getLevel(), state.round, state.roundTargetCounts, isNewBest);
    return true;
  }

function beginGame(levelId = state.levelId) {
  state.levelId = levelId;
  updateLevelContent();
  resizeCanvas();
  initPhysics();
  state.running = true;
  state.gameOver = false;
  state.round = CONFIG.round.first;
  state.strokes = 0;
  state.history = [];
  state.roundTargetCounts = [];
  state.restPoints = [];
  state.items = [];
  state.predictionCharges = getLevel().predictionCharges || 0;
  state.tipIndex = 0;
  resetBall(false);
  state.restPoints.push({ x: state.ball.x, y: state.ball.y });
  state.targets = createTargets();
  state.roundTargetCounts.push(state.targets.length);
  state.items = createItems();
  state.items.forEach(item => { if (item.type === 'barrier') addBarrierBody(item); });
  ui.appShell.classList.remove('is-intro');
  ui.startButton.textContent = t('start.restart');
  ui.tipsPanel.hidden = true;
  ui.tipsButton.textContent = t('tips.show');
  if (!checkInitialCollisions()) {
    ui.message.textContent = t('message.nextRound');
  }
  updateUi();
}

function setRound(nextRound, result) {
  const previousRestPoints = state.restPoints.map(point => ({ ...point }));
  state.round = nextRound;
  state.strokes = 0;
  state.targets = previousRestPoints.map(point => createTarget(point, getTargetRadius(getLevel(), true)));
  state.roundTargetCounts.push(state.targets.length);
  stopBall();
  state.restPoints = [];
  state.restPoints.push({ x: state.ball.x, y: state.ball.y });
  // Remove consumed barriers from the physics world, then maybe spawn a new item.
  state.items.filter(item => !item.active && item.type === 'barrier').forEach(removeBarrierBody);
  spawnRandomItems();
  showBanner(result);
  ui.message.textContent = t('message.restTargets');
  checkInitialCollisions();
  updateUi();
}

function showBanner(text, stars = 0) {
  const starDisplay = stars > 0 ? `<b class="banner-stars" aria-label="${t('level.stars', { n: stars })}"><i class="star-filled">${'★'.repeat(stars)}</i><i class="star-empty">${'☆'.repeat(3 - stars)}</i></b>` : '';
  ui.roundBanner.innerHTML = `<span>${text}${starDisplay}</span>`;
  ui.roundBanner.classList.remove('show', 'hole-in-zero');
  if (text.startsWith(t('banner.win', { level: '' }).trim())) {
    ui.roundBanner.classList.add('hole-in-zero');
  }
  void ui.roundBanner.offsetWidth;
  ui.roundBanner.classList.add('show');
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * width() / rect.width,
    y: (event.clientY - rect.top) * height() / rect.height
  };
}
function updateDrag(position) {
  state.dragCurrent = position;
  const pullX = state.dragStart.x - position.x;
  const pullY = state.dragStart.y - position.y;
  const distance = Math.hypot(pullX, pullY);
  state.power = Math.min(CONFIG.ball.maximumPower, distance / (CONFIG.ball.dragLimit * fieldScale()) * CONFIG.ball.maximumPower);
  if (distance > 0) state.angle = Math.atan2(pullY, pullX);
  setPhase('phase.release');
  updateUi();
}
function getPreviewBall() {
  if (!state.dragging || !state.dragStart || !state.dragCurrent) {
    return { x: state.ball.x, y: state.ball.y };
  }
  const offsetX = state.dragCurrent.x - state.dragStart.x;
  const offsetY = state.dragCurrent.y - state.dragStart.y;
  const distance = Math.hypot(offsetX, offsetY);
  const maxPull = CONFIG.ball.dragLimit * fieldScale();
  const scale = distance > maxPull ? maxPull / distance : 1;
  return {
    x: state.ball.x + offsetX * scale,
    y: state.ball.y + offsetY * scale
  };
}

// Simulated trajectory for the Prediction item: mirrors releaseShot() exactly
// (same strength/speed math) and returns the path including one reflection.
// The simulation is cached per drag position so it only reruns when the aim
// actually changes (running a Matter sim every frame would be too heavy).
let predictionCache = { key: null, result: null };
function getPredictionPath() {
  if (!state.predictionCharges || !state.dragging || !state.dragStart || !state.dragCurrent) {
    predictionCache = { key: null, result: null };
    return null;
  }
  const preview = getPreviewBall();
  // The shot is released in the PULL direction (opposite to where you drag),
  // matching releaseShot() which uses state.angle = atan2(dragStart - current).
  const offsetX = state.ball.x - preview.x;
  const offsetY = state.ball.y - preview.y;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance <= 0) return null;
  const key = `${Math.round(preview.x)}|${Math.round(preview.y)}|${Math.round(state.power)}`;
  if (predictionCache.key === key) return predictionCache.result;
  const angle = Math.atan2(offsetY, offsetX);
  const strength = Math.max(CONFIG.ball.minimumStrength, state.power / CONFIG.ball.maximumPower);
  const speed = CONFIG.ball.baseShotSpeed * fieldScale() * strength;
  const result = simulateShot(state.ball.x, state.ball.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
  predictionCache = { key, result };
  return result;
}
function releaseShot() {
  if (!state.dragging) return;
  // Keep the ball at its start position. The drag preview is purely visual
  // (drawn via drawSlingshot) and must not move the physics body, otherwise
  // the ball could end up outside the walls and get stuck.
  state.dragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  const strength = Math.max(CONFIG.ball.minimumStrength, state.power / CONFIG.ball.maximumPower);
  const speed = CONFIG.ball.baseShotSpeed * fieldScale() * strength;
  setBallVelocity(Math.cos(state.angle) * speed, Math.sin(state.angle) * speed);
  // Prediction item only applies to this shot.
  if (!getLevel().predictionChargesPersistent) state.predictionCharges = 0;
  state.strokes += 1;
  state.shotInMotion = true;
  setPhase('phase.rolling');
  ui.message.textContent = t('message.rolling');
  updateUi();
}

function stopBall() {
  stopBallBody();
  state.shotInMotion = false;
}

function update(dt) {
  if (!state.shotInMotion) {
    return;
  }
  stepPhysics(dt);
  const ball = state.ball;
  state.targets.forEach(target => {
    if (!target.hit && Math.hypot(ball.x - target.x, ball.y - target.y) < ball.r + target.r) {
      target.hit = true;
    }
  });
  // Barrier consumption is handled by the physics collision event
  // (handleBarrierCollision in physics.js). Only non-barrier items are
  // collected by proximity here.
  state.items.forEach(item => {
    if (item.active && item.type !== 'barrier' && Math.hypot(ball.x - item.x, ball.y - item.y) < ball.r + item.r) {
      activateItem(item);
    }
  });
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < CONFIG.ball.minimumRollSpeed * fieldScale()) {
    if (speed > 0) state.angle = Math.atan2(ball.vy, ball.vx);
    stopBall();
    setPhase('phase.ready');
    finishShot();
  }
}

function finishShot() {
  const allHit = state.targets.every(target => target.hit);
  if (allHit) {
    state.history.push(state.strokes);
    const result = scoreName(state.strokes - state.targets.length);
    state.restPoints.push({ x: state.ball.x, y: state.ball.y });
    setRound(state.round + 1, result);
  } else if (state.strokes >= getLevel().maxShots) {
    endGame();
  } else {
    state.restPoints.push({ x: state.ball.x, y: state.ball.y });
    const remainingTargets = getRemainingTargetCount();
    const plural = remainingTargets === 1 ? '' : (currentLang === 'de' ? 'e' : 's');
    ui.message.textContent = t('message.targetsLeft', { n: remainingTargets, e: plural });
  }
  updateUi();
}

function getRemainingTargetCount() {
  return state.targets.filter(target => !target.hit).length;
}

function scoreName(delta) {
  if (delta <= -2) return t('score.eagle');
  if (delta === -1) return t('score.birdie');
  if (delta === 0) return t('score.par');
  if (delta === 1) return t('score.bogey');
  return t('score.doubleBogey');
}

function endGame() {
  state.gameOver = true;
  state.running = false;
  setPhase('phase.over');
  ui.message.textContent = t('message.over', { rounds: state.round - 1 });
  showBanner(t('banner.gameover'));
  ui.startButton.textContent = t('start.playAgain');
  renderLevelSelector();
  showHighscoreArtwork(getLevel(), state.round - 1, state.roundTargetCounts, false, false);
}

let highscoreShareData = null;
function showHighscoreArtwork(level, rounds, targetCounts, isNewBest = true, completed = true) {
  const stars = getStarsForRounds(level, rounds);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  highscoreShareData = { level, rounds, stars, nextLevel, isNewBest, completed, targetCounts: targetCounts.slice(0, Math.max(rounds, 1)) };
  ui.highscoreArtwork.querySelector('.eyebrow').textContent = !completed ? t('highscore.failed') : isNewBest ? t('highscore.eyebrow') : t('highscore.completed');
  ui.highscoreTitle.textContent = levelName(level);
  ui.highscoreRounds.textContent = rounds;
  ui.highscoreCaption.textContent = completed ? t('highscore.caption', { rounds }) : t('highscore.failedCaption', { rounds });
  ui.highscoreDifficulty.textContent = t(`difficulty.${state.difficulty}`);
  ui.highscoreStars.innerHTML = `<span aria-hidden="true">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
  ui.highscoreStars.setAttribute('aria-label', t('level.stars', { n: stars }));
  ui.shareHighscoreButton.hidden = !isNewBest || !completed;
  ui.highscoreMap.width = 480;
  ui.highscoreMap.height = 270;
  drawLevelPreview(ui.highscoreMap, level);
  ui.nextLevelButton.disabled = !nextLevel || !completed;
  ui.roundVisualization.innerHTML = highscoreShareData.targetCounts.map((count, index) => `
    <span class="round-bar" style="--target-count:${Math.max(count, 1)}">
      <i>${count}</i><b></b><small>${index + 1}</small>
    </span>`).join('');
  ui.highscoreModal.hidden = false;
  (nextLevel ? ui.nextLevelButton : ui.replayLevelButton).focus();
}
function closeHighscoreArtwork() {
  ui.highscoreModal.hidden = true;
  ui.shareStatus.textContent = '';
}
function replayHighscoreLevel() {
  closeHighscoreArtwork();
  beginGame(highscoreShareData.level.id);
}
function startNextHighscoreLevel() {
  if (!highscoreShareData.nextLevel) return;
  closeHighscoreArtwork();
  beginGame(highscoreShareData.nextLevel.id);
  showLevelIntro(getLevel());
}
function drawHighscoreImage() {
  const image = document.createElement('canvas');
  image.width = 1200;
  image.height = 630;
  const imageContext = image.getContext('2d');
  imageContext.fillStyle = '#f4f1e9';
  imageContext.fillRect(0, 0, image.width, image.height);
  imageContext.fillStyle = '#1e6b5b';
  imageContext.fillRect(0, 0, image.width, 22);
  imageContext.fillStyle = '#17211f';
  imageContext.font = '600 28px "DM Mono", monospace';
  imageContext.fillText(!highscoreShareData.completed ? t('highscore.failed') : highscoreShareData.isNewBest ? t('highscore.eyebrow') : t('highscore.completed'), 70, 92);
  imageContext.font = '700 76px "Space Grotesk", sans-serif';
  imageContext.fillText(levelName(highscoreShareData.level), 70, 180);
  imageContext.font = '600 44px "Space Grotesk", sans-serif';
  imageContext.fillText(`${highscoreShareData.rounds} ${t('highscore.rounds')}`, 70, 250);
  imageContext.fillStyle = '#1e6b5b';
  imageContext.font = '600 22px "DM Mono", monospace';
  imageContext.fillText(t(`difficulty.${state.difficulty}`), 70, 290);
  imageContext.fillStyle = '#ffd447';
  imageContext.font = '600 42px "Space Grotesk", sans-serif';
  imageContext.fillText(`${'★'.repeat(highscoreShareData.stars)}${'☆'.repeat(3 - highscoreShareData.stars)}`, 390, 248);
  const map = document.createElement('canvas');
  map.width = 480;
  map.height = 270;
  drawLevelPreview(map, highscoreShareData.level);
  imageContext.drawImage(map, 650, 80, 480, 270);
  imageContext.font = '500 24px "DM Mono", monospace';
  imageContext.fillStyle = '#71807b';
  imageContext.fillText(t('highscore.targetsPerRound'), 70, 320);
  const counts = highscoreShareData.targetCounts;
  const max = Math.max(...counts, 1);
  counts.forEach((count, index) => {
    const x = 80 + index * 100;
    const barHeight = 170 * count / max;
    imageContext.fillStyle = '#e94b3c';
    imageContext.fillRect(x, 530 - barHeight, 54, barHeight);
    imageContext.fillStyle = '#17211f';
    imageContext.font = '600 22px "DM Mono", monospace';
    imageContext.fillText(String(count), x + 17, 555 - barHeight);
    imageContext.fillStyle = '#71807b';
    imageContext.fillText(String(index + 1), x + 20, 580);
  });
  imageContext.fillStyle = '#1e6b5b';
  imageContext.font = '600 24px "DM Mono", monospace';
  imageContext.fillText('hole in 0', 970, 570);
  return image;
}
async function shareHighscoreArtwork() {
  if (!highscoreShareData) return;
  const image = drawHighscoreImage();
  const blob = await new Promise(resolve => image.toBlob(resolve, 'image/png'));
  const filename = `hole-in-0-${highscoreShareData.level.id}-highscore.png`;
  const shareText = t('highscore.shareText', { level: levelName(highscoreShareData.level), rounds: highscoreShareData.rounds, url: window.location.protocol.startsWith('http') ? window.location.href : CONFIG.shareUrl });
  try {
    if (blob && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
      await navigator.share({ title: 'hole in 0', text: shareText, files: [new File([blob], filename, { type: 'image/png' })] });
      ui.shareStatus.textContent = t('highscore.shared');
      return;
    }
    if (window.AndroidShare && typeof window.AndroidShare.shareArtwork === 'function') {
      window.AndroidShare.shareArtwork(image.toDataURL('image/png'), shareText, filename);
      ui.shareStatus.textContent = t('highscore.shared');
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      ui.shareStatus.textContent = t('highscore.copied');
    } else {
      ui.shareStatus.textContent = shareText;
    }
  } catch (error) {
    if (error.name !== 'AbortError') ui.shareStatus.textContent = t('highscore.shareFailed');
  }
}
