function createState() {
  return {
    running: false,
    gameOver: false,
    round: CONFIG.round.first,
    levelId: LEVELS[0].id,
    tipIndex: 0,
    strokes: 0,
    angle: 0,
    power: 0,
    dragging: false,
    dragStart: null,
    dragCurrent: null,
    lastTime: 0,
    shotInMotion: false,
    targets: [],
    items: [],
    predictionCharges: 0,
    difficulty: localStorage.getItem(`${STORAGE_PREFIX}difficulty`) || CONFIG.difficulty.default,
    restPoints: [],
    history: [],
    roundTargetCounts: [],
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: CONFIG.ball.radius }
  };
}

const state = createState();
function fieldScale() {
  const board = getLevel().board;
  return Math.min(width() / board.width, height() / board.height) || 1;
}

// --- Matter.js physics ---
let engine = null;
let ballBody = null;
let wallBodies = [];
let barrierBodies = [];
const WALL_THICKNESS = 20;
// Matter.js Engine.update delta is in units where 16.666 = 1 second.
// Use a fixed 60Hz physics step: 16.666 / 60.
const PHYSICS_STEP = 16.666 / 60;
let physicsAccumulator = 0;

function buildRectangleWalls(w, h, t) {
  return [
    Matter.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, { isStatic: true }),
    Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, { isStatic: true }),
    Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, { isStatic: true }),
    Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, { isStatic: true })
  ];
}
function buildPolygonWalls(points, t) {
  const walls = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    const len = Math.hypot(ex, ey) || 1;
    // Outward normal (right of edge direction for CCW polygons).
    const nx = ey / len, ny = -ex / len;
    const mx = (a.x + b.x) / 2 + nx * t / 2;
    const my = (a.y + b.y) / 2 + ny * t / 2;
    const angle = Math.atan2(ey, ex);
    walls.push(Matter.Bodies.rectangle(mx, my, len, t, { isStatic: true, angle }));
  }
  return walls;
}
function buildCircleWalls(c, t) {
  const segments = 48;
  const walls = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const ax = c.x + Math.cos(a1) * c.r, ay = c.y + Math.sin(a1) * c.r;
    const bx = c.x + Math.cos(a2) * c.r, by = c.y + Math.sin(a2) * c.r;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const len = Math.hypot(bx - ax, by - ay);
    const angle = Math.atan2(by - ay, bx - ax);
    // Offset outward along the radial direction so the inner surface sits on the circle.
    const rx = mx - c.x, ry = my - c.y;
    const rlen = Math.hypot(rx, ry) || 1;
    const ox = rx / rlen * t / 2, oy = ry / rlen * t / 2;
    walls.push(Matter.Bodies.rectangle(mx + ox, my + oy, len, t, { isStatic: true, angle }));
  }
  return walls;
}
function buildArcWalls(cx, cy, r, startAngle, endAngle, segments, t, walls) {
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (i / segments) * (endAngle - startAngle);
    const a2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);
    const ax = cx + Math.cos(a1) * r, ay = cy + Math.sin(a1) * r;
    const bx = cx + Math.cos(a2) * r, by = cy + Math.sin(a2) * r;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const len = Math.hypot(bx - ax, by - ay);
    const angle = Math.atan2(by - ay, bx - ax);
    const rx = mx - cx, ry = my - cy;
    const rlen = Math.hypot(rx, ry) || 1;
    const ox = rx / rlen * t / 2, oy = ry / rlen * t / 2;
    walls.push(Matter.Bodies.rectangle(mx + ox, my + oy, len, t, { isStatic: true, angle }));
  }
}
function buildStadiumWalls(s, t) {
  const walls = [];
  const halfW = s.w / 2;
  const halfH = s.h / 2;
  const r = s.r;
  const straightHalf = halfW - r;
  const leftCx = s.x - straightHalf;
  const rightCx = s.x + straightHalf;
  // top and bottom straight edges
  walls.push(Matter.Bodies.rectangle(s.x, s.y - halfH, straightHalf * 2, t, { isStatic: true }));
  walls.push(Matter.Bodies.rectangle(s.x, s.y + halfH, straightHalf * 2, t, { isStatic: true }));
  // left semicircle (top -> left -> bottom)
  buildArcWalls(leftCx, s.y, r, Math.PI / 2, Math.PI * 3 / 2, 24, t, walls);
  // right semicircle (top -> right -> bottom)
  buildArcWalls(rightCx, s.y, r, -Math.PI / 2, Math.PI / 2, 24, t, walls);
  return walls;
}
function buildWalls(shape) {
  const t = WALL_THICKNESS;
  if (shape.type === 'polygon') return buildPolygonWalls(shapePoints(), t);
  if (shape.type === 'circle') return buildCircleWalls(shapeCircle(), t);
  if (shape.type === 'stadium') return buildStadiumWalls(shapeStadium(), t);
  return buildRectangleWalls(width(), height(), t);
}
function initPhysics() {
  engine = Matter.Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 0;
  engine.positionIterations = 8;
  engine.velocityIterations = 8;
  const r = CONFIG.ball.radius * fieldScale();
  ballBody = Matter.Bodies.circle(0, 0, r, {
    restitution: CONFIG.ball.wallBounceRetention,
    friction: 0,
    frictionAir: 1 - CONFIG.ball.rollDamping,
    density: 0.001
  });
  wallBodies = buildWalls(getShape());
  barrierBodies = [];
  Matter.Composite.add(engine.world, [ballBody, ...wallBodies]);
  // Detect ball-barrier collisions reliably via Matter events.
  Matter.Events.on(engine, 'collisionStart', handleBarrierCollision);
}

// Called on every physics collision. If the ball hits a barrier segment, the
// barrier is consumed (removed from the world and marked inactive). Removal is
// deferred until after the physics step to avoid mutating the world mid-step.
function handleBarrierCollision(event) {
  if (!ballBody || barrierBodies.length === 0) return;
  event.pairs.forEach(pair => {
    const a = pair.bodyA, b = pair.bodyB;
    if (a !== ballBody && b !== ballBody) return;
    const barrierBody = a === ballBody ? b : a;
    const itemId = barrierBody.plugin && barrierBody.plugin.itemId;
    if (!itemId) return;
    const barrier = state.items.find(item => item.id === itemId && item.active);
    if (barrier) {
      barrier.active = false;
      barrier._consumed = true;
    }
  });
}

// --- Temporary barrier items ---
// A barrier is a static capsule-like segment the ball can bounce off once.
function addBarrierBody(barrier) {
  if (!engine) return null;
  const body = Matter.Bodies.rectangle(
    barrier.x, barrier.y,
    barrier.length, barrier.thickness,
    { isStatic: true, angle: barrier.angle, restitution: CONFIG.ball.wallBounceRetention }
  );
  body.plugin = { kind: 'barrier', itemId: barrier.id };
  Matter.Composite.add(engine.world, body);
  barrierBodies.push(body);
  return body;
}

function removeBarrierBody(barrier) {
  const index = barrierBodies.findIndex(body => body.plugin && body.plugin.itemId === barrier.id);
  if (index === -1) return;
  const body = barrierBodies[index];
  Matter.Composite.remove(engine.world, body);
  barrierBodies.splice(index, 1);
}

function clearBarrierBodies() {
  if (!engine) return;
  barrierBodies.forEach(body => Matter.Composite.remove(engine.world, body));
  barrierBodies = [];
}
function setBallPosition(x, y) {
  if (ballBody) Matter.Body.setPosition(ballBody, { x, y });
  state.ball.x = x;
  state.ball.y = y;
}
function setBallVelocity(vx, vy) {
  if (ballBody) Matter.Body.setVelocity(ballBody, { x: vx, y: vy });
  state.ball.vx = vx;
  state.ball.vy = vy;
}
function stopBallBody() {
  if (ballBody) Matter.Body.setVelocity(ballBody, { x: 0, y: 0 });
  state.ball.vx = 0;
  state.ball.vy = 0;
}
function syncBallFromPhysics() {
  if (!ballBody) return;
  state.ball.x = ballBody.position.x;
  state.ball.y = ballBody.position.y;
  state.ball.vx = ballBody.velocity.x;
  state.ball.vy = ballBody.velocity.y;
}
function stepPhysics(dt) {
  if (!engine) return;
  // Fixed-timestep accumulator. dt is in seconds; Matter delta uses 16.666 = 1s.
  physicsAccumulator += dt * 16.666;
  let guard = 0;
  while (physicsAccumulator >= PHYSICS_STEP && guard < 8) {
    Matter.Engine.update(engine, PHYSICS_STEP);
    physicsAccumulator -= PHYSICS_STEP;
    guard++;
  }
  if (guard >= 8) physicsAccumulator = 0;
  syncBallFromPhysics();
  // Remove barriers that were consumed during this step (deferred so we don't
  // mutate the world while Matter is iterating collisions).
  state.items.forEach(item => {
    if (item.type === 'barrier' && item._consumed) {
      removeBarrierBody(item);
      delete item._consumed;
      ui.message.textContent = t('message.itemBarrierUsed');
    }
  });
}

// --- Shot prediction (Prediction item) ---
// Simulates the upcoming shot with a lightweight offline Matter engine that
// mirrors the real one (same walls, same barrier bodies, same ball settings),
// so the preview line matches the actual trajectory including one reflection.
// The real wall/barrier bodies are CLONED so the simulation never mutates the
// live physics world (Matter bodies can only belong to one engine).
function cloneStaticBodies(bodies) {
  return bodies.map(body => {
    // Compute the true (unrotated) width/height from the rectangle's vertices.
    // Using the axis-aligned bounding box would over-size rotated bodies
    // (walls, barriers), making the preview inaccurate.
    const v = body.vertices;
    const d1 = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y);
    const d2 = Math.hypot(v[2].x - v[1].x, v[2].y - v[1].y);
    const w = Math.max(d1, d2);
    const h = Math.min(d1, d2);
    return Matter.Bodies.rectangle(
      body.position.x, body.position.y,
      w, h,
      { isStatic: true, angle: body.angle, restitution: body.restitution }
    );
  });
}

function simulateShot(startX, startY, vx, vy) {
  if (!engine) return null;
  const sim = Matter.Engine.create();
  sim.gravity.x = 0;
  sim.gravity.y = 0;
  sim.positionIterations = 8;
  sim.velocityIterations = 8;
  const r = CONFIG.ball.radius * fieldScale();
  const simBall = Matter.Bodies.circle(startX, startY, r, {
    restitution: CONFIG.ball.wallBounceRetention,
    friction: 0,
    frictionAir: 1 - CONFIG.ball.rollDamping,
    density: 0.001
  });
  const simWalls = cloneStaticBodies(wallBodies);
  const simBarriers = cloneStaticBodies(barrierBodies);
  Matter.Composite.add(sim.world, [simBall, ...simWalls, ...simBarriers]);
  Matter.Body.setVelocity(simBall, { x: vx, y: vy });
  const points = [{ x: startX, y: startY }];
  // Simulate the full trajectory with no reflection limit: the ball keeps
  // bouncing off walls and barriers until it rolls to a stop (matching the
  // real physics), so the preview shows every reflection.
  const maxSteps = 1200;
  for (let step = 0; step < maxSteps; step++) {
    Matter.Engine.update(sim, PHYSICS_STEP);
    const p = simBall.position;
    const last = points[points.length - 1];
    // Sample every few steps to keep the polyline light but smooth.
    if (Math.hypot(p.x - last.x, p.y - last.y) > 6) points.push({ x: p.x, y: p.y });
    const speed = Math.hypot(simBall.velocity.x, simBall.velocity.y);
    if (speed < CONFIG.ball.minimumRollSpeed * fieldScale()) break;
  }
  points.push({ x: simBall.position.x, y: simBall.position.y });
  return { points, end: { x: simBall.position.x, y: simBall.position.y } };
}
