// --- Random item spawning ---
// Items spawn randomly inside the playable field after a round (50% chance).
// The field shape can be a rectangle, polygon (L-shape, snake), circle or
// stadium, so spawning uses rejection sampling against the actual shape.

const ITEM_TYPES = ['barrier', 'turn', 'prediction', 'erasor'];

// Point-in-shape test with a safety margin so items never touch a wall.
function isPointInField(x, y, margin) {
  const shape = getShape();
  if (shape.type === 'polygon') {
    const points = shapePoints();
    if (!pointInPolygon(x, y, points)) return false;
    // Also require distance from every edge >= margin.
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (distanceToSegment(x, y, a, b) < margin) return false;
    }
    return true;
  }
  if (shape.type === 'circle') {
    const c = shapeCircle();
    return Math.hypot(x - c.x, y - c.y) <= c.r - margin;
  }
  if (shape.type === 'stadium') {
    const s = shapeStadium();
    // Stadium = rectangle with semicircular caps. Distance to the two cap
    // centers must be <= r - margin, and y within the straight band.
    const halfW = s.w / 2;
    const straightHalf = halfW - s.r;
    const leftCx = s.x - straightHalf;
    const rightCx = s.x + straightHalf;
    if (Math.abs(y - s.y) > s.h / 2 - margin) return false;
    if (x >= leftCx && x <= rightCx) return true;
    return Math.hypot(x - leftCx, y - s.y) <= s.r - margin
      || Math.hypot(x - rightCx, y - s.y) <= s.r - margin;
  }
  // rectangle
  return x >= margin && x <= width() - margin && y >= margin && y <= height() - margin;
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersects = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - a.x, py - a.y);
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function randomItemPosition(margin, occupied) {
  const cfg = CONFIG.item;
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const x = margin + Math.random() * (width() - margin * 2);
    const y = margin + Math.random() * (height() - margin * 2);
    if (!isPointInField(x, y, margin)) continue;
    // Keep distance from the ball, targets and other items.
    const tooClose = occupied.some(point =>
      Math.hypot(x - point.x, y - point.y) < cfg.minDistance);
    if (tooClose) continue;
    return { x, y };
  }
  return null;
}

function makeRandomItem(occupied) {
  const cfg = CONFIG.item;
  const margin = cfg.margin + getTargetRadius(getLevel(), true);
  const position = randomItemPosition(margin, occupied);
  if (!position) return null;
  // The erasor ("-1") item only spawns when there are more than 3 targets,
  // since it removes a rest point and is only useful with many targets.
  const targetCount = state.targets.filter(target => !target.hit).length;
  const availableTypes = targetCount > 3
    ? ITEM_TYPES
    : ITEM_TYPES.filter(type => type !== 'erasor');
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  const item = {
    type,
    x: position.x,
    y: position.y,
    r: getTargetRadius(getLevel(), true),
    active: true,
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  };
  if (type === 'erasor') {
    item.symbol = '-1';
    item.color = COLORS.item;
  }
  if (type === 'barrier') {
    const angle = cfg.barrier.minAngle + Math.random() * (cfg.barrier.maxAngle - cfg.barrier.minAngle);
    item.angle = angle;
    item.length = cfg.barrier.length * fieldScale();
    item.thickness = cfg.barrier.thickness * fieldScale();
    // The barrier segment must fully fit inside the field.
    const half = item.length / 2;
    const ends = [
      { x: position.x + Math.cos(angle) * half, y: position.y + Math.sin(angle) * half },
      { x: position.x - Math.cos(angle) * half, y: position.y - Math.sin(angle) * half }
    ];
    const fits = ends.every(end => isPointInField(end.x, end.y, cfg.margin));
    if (!fits) return null;
  }
  if (type === 'turn') {
    // Random deflection direction in 360° (radians). The arrow icon shows it.
    item.direction = Math.random() * Math.PI * 2;
  }
  return item;
}

// Called after a round: Spawn up to maxPerRound random items with a certain spawn chance.
function spawnRandomItems() {
  const occupied = [
    { x: state.ball.x, y: state.ball.y },
    ...state.targets.map(target => ({ x: target.x, y: target.y })),
    ...state.items.filter(item => item.active).map(item => ({ x: item.x, y: item.y }))
  ];
  const maxPerRound = CONFIG.item.maxPerRound || 1;
  for (let i = 0; i < maxPerRound; i++) {
    if (Math.random() >= CONFIG.item.spawnChance) continue;
    const item = makeRandomItem(occupied);
    if (!item) break;
    state.items.push(item);
    if (item.type === 'barrier') addBarrierBody(item);
    // Keep newly spawned items apart from each other.
    occupied.push({ x: item.x, y: item.y });
  }
}
