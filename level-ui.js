function levelName(level) { return t(level.nameKey); }
function levelDescription(level) { return t(level.descriptionKey); }
function levelTips(level) { return level.tipKeys.map(key => t(key)); }
function getTargetRadius(level, isRestPoint = false) {
  const baseRadius = isRestPoint ? CONFIG.target.restPointRadius : CONFIG.target.firstRoundRadius;
  const difficultyMultiplier = CONFIG.difficulty[state.difficulty] ?? 1;
  return baseRadius * (level.targetRadiusMultiplier || 1) * difficultyMultiplier;
}

function getLevel(id = state.levelId) { return LEVELS.find(level => level.id === id) || LEVELS[0]; }
function isLevelUnlocked(id) { 
  return true 
  // sequential level unlock
  // id === LEVELS[0].id || localStorage.getItem(`${STORAGE_PREFIX}unlocked:${id}`) === 'true'; 
  }
function getBestRounds(id) { return Number(localStorage.getItem(`${STORAGE_PREFIX}best:${id}`)) || null; }
function getStarsForRounds(level, rounds) {
  if (rounds <= 0) return 0;
  if (rounds <= level.threeStarRounds) return 3;
  if (rounds <= level.twoStarRounds) return 2;
  return 1;
}
function getLevelStars(level) {
  const best = getBestRounds(level.id);
  return best === null ? 0 : getStarsForRounds(level, best);
}
let starRulesTrigger = ui.roundStars;
function showStarRules(level = getLevel(), trigger = ui.roundStars) {
  starRulesTrigger = trigger;
  ui.starRulesTitle.textContent = t('starRules.title', { level: levelName(level) });
  ui.starRulesList.innerHTML = [
    ['★', t('starRules.one')],
    ['★★', t('starRules.two', { n: level.twoStarRounds })],
    ['★★★', t('starRules.three', { n: level.threeStarRounds })]
  ].map(([stars, rule]) => `<li><span class="star-rules-stars" aria-hidden="true">${stars}</span><span>${rule}</span></li>`).join('');
  ui.starRulesModal.hidden = false;
  ui.starRulesCloseButton.focus();
}
function hideStarRules() {
  ui.starRulesModal.hidden = true;
  starRulesTrigger.focus();
}
function recordLevelWin(level, rounds) {
  const best = getBestRounds(level.id);
  if (best === null || rounds < best) localStorage.setItem(`${STORAGE_PREFIX}best:${level.id}`, String(rounds));
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  if (nextLevel) localStorage.setItem(`${STORAGE_PREFIX}unlocked:${nextLevel.id}`, 'true');
}
function boardCoordinate(point) {
  const level = getLevel();
  return point.normalized
    ? { x: width() * point.x, y: height() * point.y }
    : { x: width() * point.x / level.board.width, y: height() * point.y / level.board.height };
}
function getShape() {
  const level = getLevel();
  return level.shape || { type: 'rectangle' };
}
function shapePoints() {
  const shape = getShape();
  if (shape.type !== 'polygon') return [];
  return shape.points.map(p => ({ x: width() * p.x, y: height() * p.y }));
}
function shapeCircle() {
  const shape = getShape();
  if (shape.type !== 'circle') return null;
  const minDim = Math.min(width(), height());
  return {
    x: width() * shape.center.x,
    y: height() * shape.center.y,
    r: shape.radius * minDim
  };
}
function shapeStadium() {
  const shape = getShape();
  if (shape.type !== 'stadium') return null;
  const h = height() * shape.height;
  return {
    x: width() * shape.center.x,
    y: height() * shape.center.y,
    w: width() * shape.width,
    h,
    // A stadium always has semicircular ends, so the corner radius equals
    // half the height. This keeps the shape valid at any height.
    r: h / 2
  };
}
// Trace a stadium (rounded rectangle) path onto the current context.
function traceStadium(ctx, s) {
  const halfW = s.w / 2;
  const halfH = s.h / 2;
  const r = s.r;
  const leftCx = s.x - (halfW - r);
  const rightCx = s.x + (halfW - r);
  ctx.beginPath();
  ctx.moveTo(leftCx, s.y - halfH);
  ctx.lineTo(rightCx, s.y - halfH);
  ctx.arc(rightCx, s.y, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(leftCx, s.y + halfH);
  ctx.arc(leftCx, s.y, r, Math.PI / 2, Math.PI * 3 / 2);
  ctx.closePath();
}
function drawLevelPreview(canvas, level) {
  const ratio = window.devicePixelRatio || 1;
  const w = level.board.width;
  const h = level.board.height;
  const scale = Math.min(canvas.width / w, canvas.height / h);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const shape = level.shape || { type: 'rectangle' };
  const toPx = p => ({ x: p.x * canvas.width, y: p.y * canvas.height });
  // outside of the playable shape
  ctx.fillStyle = COLORS.outside;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shape.type === 'polygon') {
    const points = shape.points.map(toPx);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.clip();
  } else if (shape.type === 'circle') {
    const minDim = Math.min(canvas.width, canvas.height);
    const c = { x: shape.center.x * canvas.width, y: shape.center.y * canvas.height, r: shape.radius * minDim };
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape.type === 'stadium') {
    const h = shape.height * canvas.height;
    const s = {
      x: shape.center.x * canvas.width,
      y: shape.center.y * canvas.height,
      w: shape.width * canvas.width,
      h,
      r: h / 2
    };
    traceStadium(ctx, s);
    ctx.clip();
  }
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = COLORS.stripe;
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += CONFIG.drawing.stripeSpacing * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
  // shape outline
  if (shape.type === 'polygon') {
    const points = shape.points.map(toPx);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
  } else if (shape.type === 'circle') {
    const minDim = Math.min(canvas.width, canvas.height);
    const c = { x: shape.center.x * canvas.width, y: shape.center.y * canvas.height, r: shape.radius * minDim };
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
  } else if (shape.type === 'stadium') {
    const h = shape.height * canvas.height;
    const s = {
      x: shape.center.x * canvas.width,
      y: shape.center.y * canvas.height,
      w: shape.width * canvas.width,
      h,
      r: h / 2
    };
    traceStadium(ctx, s);
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
  }
  // targets
  const targets = level.targets.map(point => point.normalized
    ? { x: point.x * canvas.width, y: point.y * canvas.height }
    : { x: point.x / w * canvas.width, y: point.y / h * canvas.height });
  targets.forEach(target => {
    ctx.beginPath();
    ctx.arc(target.x, target.y, getTargetRadius(level) * scale, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.red;
    ctx.fill();
  });
  (level.items || []).forEach(item => {
    const point = item.normalized
      ? { x: item.x * canvas.width, y: item.y * canvas.height }
      : { x: item.x / w * canvas.width, y: item.y / h * canvas.height };
    const radius = getTargetRadius(level) * scale;
    const style = ITEM_STYLES[item.type] || { color: item.color || COLORS.item };
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.fill();
    if (item.type === 'barrier' || item.type === 'turn' || item.type === 'prediction') {
      // Reuse the in-game icon drawing at the preview position.
      drawItem({ ...item, x: point.x, y: point.y, r: radius }, scale);
    } else {
      ctx.fillStyle = COLORS.itemSymbol;
      ctx.font = `700 ${Math.max(8, radius * 1.1)}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.symbol || '', point.x, point.y);
    }
  });
  // ball
  const ball = level.ball.normalized
    ? { x: level.ball.x * canvas.width, y: level.ball.y * canvas.height }
    : { x: level.ball.x / w * canvas.width, y: level.ball.y / h * canvas.height };
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, CONFIG.ball.radius * scale, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.cream;
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
}

function renderLevelSelector() {
  const previewWidth = 384;
  ui.levelSelector.innerHTML = LEVELS.map(level => {
    const locked = !isLevelUnlocked(level.id);
    const best = getBestRounds(level.id);
    const stars = getLevelStars(level);
    const starLabel = t('level.stars', { n: stars });
    const filledStars = '★'.repeat(stars);
    const emptyStars = '☆'.repeat(3 - stars);
    const aspect = level.board.width / level.board.height;
    const pluralSuffix = best === 1 ? '' : (currentLang === 'de' ? 'n' : 's');
    const status = locked
      ? t('level.locked')
      : best
        ? t('level.best', { n: best, n2: pluralSuffix })
        : t('level.unplayed');
    return `<button class="level-option" data-level="${level.id}" type="button" ${locked ? 'disabled' : ''}>
      <span class="level-preview-wrap"><canvas class="level-preview" width="${previewWidth}" height="${Math.round(previewWidth / aspect)}" data-level="${level.id}"></canvas><span class="level-stars" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${starLabel}" title="${starLabel}" data-level-stars="${level.id}"><i class="star-filled">${filledStars}</i><i class="star-empty">${emptyStars}</i></span></span>
      <span class="level-meta"><strong>${levelName(level)}</strong><span class="level-status">${status}</span></span>
    </button>`;
  }).join('');
  ui.levelSelector.querySelectorAll('.level-option').forEach(button => button.addEventListener('click', () => {
    beginGame(button.dataset.level);
    enterMobileMode();
    showLevelIntro(getLevel());
  }));
  ui.levelSelector.querySelectorAll('[data-level-stars]').forEach(stars => {
    const level = LEVELS.find(level => level.id === stars.dataset.levelStars);
    if (!level) return;
    stars.addEventListener('click', event => {
      event.stopPropagation();
      showStarRules(level, event.currentTarget);
    });
    stars.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      showStarRules(level, event.currentTarget);
    });
  });
  ui.levelSelector.querySelectorAll('canvas.level-preview').forEach(canvas => {
    const level = LEVELS.find(level => level.id === canvas.dataset.level);
    if (level) drawLevelPreview(canvas, level);
  });
}
function updateLevelContent() {
  const level = getLevel();
  const tips = levelTips(level);
  ui.hint.textContent = levelDescription(level);
  ui.tipTitle.textContent = t('tips.title', { n: 1, total: tips.length });
  ui.tipText.textContent = tips[0];
  document.querySelector('.course-wrap').classList.toggle('tutorial-board', level.id === 'tutorial-1');
  renderLevelSelector();
}
function showLevelIntro(level) {
  ui.levelIntroTitle.textContent = levelName(level);
  ui.levelIntroText.textContent = levelDescription(level);
  ui.levelIntro.hidden = false;
  ui.levelIntroButton.focus();
}
function hideLevelIntro() {
  ui.levelIntro.hidden = true;
}
function updateTip() {
  const level = getLevel();
  const tips = levelTips(level);
  state.tipIndex = (state.tipIndex + 1) % tips.length;
  ui.tipTitle.textContent = t('tips.title', { n: state.tipIndex + 1, total: tips.length });
  ui.tipText.textContent = tips[state.tipIndex];
}
