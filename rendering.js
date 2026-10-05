function clipToShape(shape) {
  if (shape.type === 'polygon') {
    const points = shapePoints();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.clip();
  } else if (shape.type === 'circle') {
    const c = shapeCircle();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape.type === 'stadium') {
    traceStadium(ctx, shapeStadium());
    ctx.clip();
  }
}

function draw() {
  const w = width(); const h = height();
  const scale = fieldScale();
  const shape = getShape();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLORS.outside; ctx.fillRect(0, 0, w, h);
  ctx.save();
  clipToShape(shape);
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COLORS.stripe; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += CONFIG.drawing.stripeSpacing * scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); }
  ctx.restore();
  // shape outline
  const { outerBorderWidth } = CONFIG.drawing;
  if (shape.type === 'polygon') {
    const points = shapePoints();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = outerBorderWidth * scale;
    ctx.stroke();
  } else if (shape.type === 'circle') {
    const c = shapeCircle();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = outerBorderWidth * scale;
    ctx.stroke();
  } else if (shape.type === 'stadium') {
    const s = shapeStadium();
    traceStadium(ctx, s);
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = outerBorderWidth * scale;
    ctx.stroke();
  }
  ctx.save();
  clipToShape(shape);
  state.targets.forEach(target => {
    ctx.beginPath(); ctx.arc(target.x, target.y, target.r + CONFIG.target.collisionHalo * scale, 0, Math.PI * 2);
    ctx.fillStyle = target.hit ? COLORS.targetHitHalo : COLORS.targetOpenHalo; ctx.fill();
    ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
    ctx.fillStyle = target.hit ? COLORS.grey : COLORS.red; ctx.fill();
  });
  state.items.forEach(item => {
    if (!item.active) return;
    drawItem(item, scale);
  });
  state.restPoints.forEach(point => drawX(point.x, point.y));
  if (state.running && !state.shotInMotion) {
    const previewBall = getPreviewBall();
    drawSlingshot(state.ball.x, state.ball.y, previewBall.x, previewBall.y);
    // Prediction item: simulated trajectory with one wall reflection.
    const prediction = getPredictionPath();
    if (prediction) drawPredictionPath(prediction);
  }
  const displayedBall = getPreviewBall();
  drawBall(displayedBall.x, displayedBall.y);
  ctx.restore();
}
function drawSlingshot(anchorX, anchorY, ballX, ballY) {
  if (anchorX === ballX && anchorY === ballY) return; // no slingshot if no pull
  const direction = Math.atan2(ballY - anchorY, ballX - anchorX);
  const scale = fieldScale();
  const armLength = CONFIG.drawing.slingshotArmLength * scale;
  const leftArm = direction - Math.PI + CONFIG.drawing.slingshotArmSpread;
  const rightArm = direction - Math.PI - CONFIG.drawing.slingshotArmSpread;
  const leftTip = { x: anchorX + Math.cos(leftArm) * armLength, y: anchorY + Math.sin(leftArm) * armLength };
  const rightTip = { x: anchorX + Math.cos(rightArm) * armLength, y: anchorY + Math.sin(rightArm) * armLength };
  const leftAttach = { x: ballX + Math.cos(leftArm) * state.ball.r, y: ballY + Math.sin(leftArm) * state.ball.r };
  const rightAttach = { x: ballX + Math.cos(rightArm) * state.ball.r, y: ballY + Math.sin(rightArm) * state.ball.r };
  ctx.save();
  ctx.strokeStyle = COLORS.slingshot;
  ctx.lineWidth = CONFIG.drawing.slingshotLineWidth * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(leftTip.x, leftTip.y);
  ctx.lineTo(leftAttach.x, leftAttach.y);
  ctx.moveTo(rightTip.x, rightTip.y);
  ctx.lineTo(rightAttach.x, rightAttach.y);
  ctx.stroke();
  ctx.restore();
}
function drawBall(x, y) {
  const scale = fieldScale();
  ctx.beginPath(); ctx.arc(x, y, state.ball.r + CONFIG.drawing.ballShadowRadius * scale, 0, Math.PI * 2); ctx.fillStyle = COLORS.ballShadow; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, state.ball.r, 0, Math.PI * 2); ctx.fillStyle = COLORS.cream; ctx.fill(); ctx.strokeStyle = COLORS.ink; ctx.lineWidth = CONFIG.drawing.ballLineWidth * scale; ctx.stroke();
}

// Item visuals: colored disc + intuitive icon per type.
// - barrier: blue disc with a wall/brick icon (a segment the ball bounces off once)
// - turn: orange disc with a curved arrow (deflects the ball)
// - prediction: purple disc with an eye icon (shows the next shot's path)
// - erasor: legacy green disc with "-1" symbol
const ITEM_STYLES = {
  barrier: { color: COLORS.itemBarrier, halo: COLORS.itemBarrierHalo },
  turn: { color: COLORS.itemTurn, halo: COLORS.itemTurnHalo },
  prediction: { color: COLORS.itemPrediction, halo: COLORS.itemPredictionHalo },
  erasor: { color: COLORS.item, halo: COLORS.itemHalo }
};

function drawItem(item, scale) {
  const style = ITEM_STYLES[item.type] || { color: item.color || COLORS.item, halo: COLORS.itemHalo };
  if (item.type === 'barrier') {
    // Draw the barrier as a real wall segment (capsule) instead of a disc,
    // so it reads as a physical barrier the ball can bounce off.
    const angle = item.angle || 0;
    const length = item.length || CONFIG.item.barrier.length * scale;
    const thickness = item.thickness || CONFIG.item.barrier.thickness * scale;
    const half = length / 2;
    const x1 = item.x - Math.cos(angle) * half, y1 = item.y - Math.sin(angle) * half;
    const x2 = item.x + Math.cos(angle) * half, y2 = item.y + Math.sin(angle) * half;
    ctx.save();
    ctx.lineCap = 'round';
    // soft halo
    ctx.strokeStyle = style.halo;
    ctx.lineWidth = thickness + CONFIG.item.collisionHalo * 2 * scale;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // body
    ctx.strokeStyle = style.color;
    ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // brick notches for the "wall" look
    ctx.strokeStyle = COLORS.itemSymbol;
    ctx.lineWidth = Math.max(1.5, thickness * .18);
    const notches = 3;
    for (let i = 1; i <= notches; i++) {
      const t = i / (notches + 1);
      const nx = x1 + (x2 - x1) * t, ny = y1 + (y2 - y1) * t;
      const off = thickness * .32;
      ctx.beginPath();
      ctx.moveTo(nx - Math.sin(angle) * off, ny + Math.cos(angle) * off);
      ctx.lineTo(nx + Math.sin(angle) * off, ny - Math.cos(angle) * off);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.beginPath(); ctx.arc(item.x, item.y, item.r + CONFIG.item.collisionHalo * scale, 0, Math.PI * 2);
  ctx.fillStyle = style.halo; ctx.fill();
  ctx.beginPath(); ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
  ctx.fillStyle = style.color; ctx.fill();
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.strokeStyle = COLORS.itemSymbol;
  ctx.fillStyle = COLORS.itemSymbol;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = item.r / 20; // icon units relative to item radius
  if (item.type === 'barrier') {
    // Wall icon: a thick diagonal segment with brick notches.
    ctx.rotate(item.angle || 0);
    ctx.lineWidth = 3 * s;
    const half = 11 * s;
    ctx.beginPath();
    ctx.moveTo(-half, 0); ctx.lineTo(half, 0);
    ctx.stroke();
    ctx.lineWidth = 2 * s;
    for (let i = -1; i <= 1; i++) {
      const bx = i * 7 * s;
      ctx.beginPath();
      ctx.moveTo(bx, -5 * s); ctx.lineTo(bx, 5 * s);
      ctx.stroke();
    }
  } else if (item.type === 'turn') {
    // Straight arrow pointing in the deflection direction (360°).
    ctx.rotate(item.direction ?? 0);
    ctx.lineWidth = 3.5 * s;
    const shaft = 9 * s;
    ctx.beginPath();
    ctx.moveTo(-shaft, 0); ctx.lineTo(shaft, 0);
    ctx.stroke();
    // arrowhead
    ctx.beginPath();
    ctx.moveTo(shaft + 4 * s, 0);
    ctx.lineTo(shaft - 2 * s, -5 * s);
    ctx.lineTo(shaft - 2 * s, 5 * s);
    ctx.closePath();
    ctx.fill();
  } else if (item.type === 'prediction') {
    // Eye icon (see the future shot).
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // legacy symbol items (e.g. erasor "-1")
    ctx.font = `700 ${Math.max(12, item.r * 1.1)}px "DM Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.symbol || '', 0, 0);
  }
  ctx.restore();
}

// Dashed trajectory line from the prediction simulation, with a marker at the
// reflection point and a ghost ball at the end position.
function drawPredictionPath(prediction) {
  if (!prediction || prediction.points.length < 2) return;
  const scale = fieldScale();
  ctx.save();
  ctx.strokeStyle = COLORS.predictionLine;
  ctx.lineWidth = 2.5 * scale;
  ctx.setLineDash([8 * scale, 6 * scale]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(prediction.points[0].x, prediction.points[0].y);
  for (let i = 1; i < prediction.points.length; i++) {
    ctx.lineTo(prediction.points[i].x, prediction.points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // ghost ball at the predicted rest position
  const end = prediction.end;
  ctx.beginPath();
  ctx.arc(end.x, end.y, state.ball.r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.predictionImpact;
  ctx.fill();
  ctx.strokeStyle = COLORS.predictionLine;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  ctx.restore();
}
function drawX(x, y) {
  const scale = fieldScale();
  const markSize = CONFIG.drawing.restPointMarkSize;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, getTargetRadius(getLevel(), true) * scale, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.restPoint;
  ctx.lineWidth = CONFIG.drawing.restPointLineWidth * scale;
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = CONFIG.drawing.slingshotLineWidth * scale;
  ctx.beginPath();
  ctx.moveTo(x - markSize * scale, y - markSize * scale);
  ctx.lineTo(x + markSize * scale, y + markSize * scale);
  ctx.moveTo(x + markSize * scale, y - markSize * scale);
  ctx.lineTo(x - markSize * scale, y + markSize * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.target.restPointRadius * scale, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.restPoint;
  ctx.lineWidth = CONFIG.drawing.restPointLineWidth * scale;
  ctx.stroke();
  ctx.restore();
}
function updateUi() {
  const power = `${Math.round(state.power)}%`;
  const angle = `${Math.round(state.angle * 180 / Math.PI)}°`;
  ui.round.textContent = String(state.round).padStart(2, '0');
  const currentStars = getStarsForRounds(getLevel(), Math.max(1, state.round - 1));
  ui.roundStars.innerHTML = `<i class="star-filled">${'★'.repeat(currentStars)}</i><i class="star-empty">${'☆'.repeat(3 - currentStars)}</i>`;
  ui.roundStars.setAttribute('aria-label', t('level.currentStars', { n: currentStars }));
  ui.strokes.textContent = `${state.strokes} / ${getLevel().maxShots}`;
  ui.targets.textContent = getRemainingTargetCount();
  ui.power.textContent = power;
  ui.powerPanel.textContent = power;
  ui.powerBar.style.width = power;
  ui.angle.textContent = angle;
  ui.anglePanel.textContent = angle;
}
function loop(time) {
  const elapsed = (time - state.lastTime) / CONFIG.frame.millisecondsPerSecond;
  const dt = Math.min(elapsed || 0, CONFIG.frame.maxDelta);
  state.lastTime = time;
  update(dt);
  draw();
  updateUi();
  requestAnimationFrame(loop);
}
