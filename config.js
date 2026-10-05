const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  round: document.getElementById('roundValue'),
  roundStars: document.getElementById('roundStarsValue'),
  starRulesModal: document.getElementById('starRulesModal'),
  starRulesTitle: document.getElementById('starRulesTitle'),
  starRulesList: document.getElementById('starRulesList'),
  starRulesCloseButton: document.getElementById('starRulesCloseButton'),
  strokes: document.getElementById('strokesValue'),
  targets: document.getElementById('targetsValue'),
  phase: document.getElementById('phaseLabel'),
  liveDot: document.querySelector('.live-dot'),
  power: document.getElementById('powerValue'),
  powerBar: document.getElementById('powerBar'),
  angle: document.getElementById('angleValue'),
  powerPanel: document.getElementById('powerValuePanel'),
  anglePanel: document.getElementById('angleValuePanel'),
  startButton: document.getElementById('startButton'),
  tipsButton: document.getElementById('tipsButton'),
  tipsPanel: document.getElementById('tipsPanel'),
  tipTitle: document.getElementById('tipTitle'),
  tipText: document.getElementById('tipText'),
  nextTipButton: document.getElementById('nextTipButton'),
  levelMenuButton: document.getElementById('levelMenuButton'),
  levelSelector: document.getElementById('levelSelector'),
  startScreen: document.getElementById('startScreen'),
  startCard: document.querySelector('.start-card'),
  levelIntro: document.getElementById('levelIntro'),
  levelIntroTitle: document.getElementById('levelIntroTitle'),
  levelIntroText: document.getElementById('levelIntroText'),
  levelIntroButton: document.getElementById('levelIntroButton'),
  hint: document.getElementById('hint'),
  mobileMenuButton: document.getElementById('mobileMenuButton'),
  langToggle: document.getElementById('langToggle'),
  appShell: document.getElementById('appShell'),
  controlPanel: document.querySelector('.control-panel'),
  message: document.getElementById('message'),
  roundBanner: document.getElementById('roundBanner')
};

const CONFIG = {
  designWidth: 960,
  designHeight: 540,
  round: {
    first: 1,
    maxStrokes: 6,
    bannerDuration: 950
  },
  ball: {
    radius: 10,
    startX: .21,
    startY: .5,
    baseShotSpeed: 1500,
    minimumStrength: .001,
    maximumPower: 100,
    minimumRollSpeed: 16,
    dragLimit: 130,
    wallPadding: 15,
    wallBounceRetention: .92,
    rollDamping: .3
  },
  target: {
    restPointRadius: 20,
    firstRoundRadius: 22,
    collisionHalo: 7
  },
  difficulty: {
    // Multiplier applied to the target circle radius. Higher = easier (bigger
    // targets), lower = harder (smaller targets).
    easy: 1.5,
    normal: 1,
    hard: .6,
    default: 'normal'
  },
  item: {
    collisionHalo: 7,
    // Random item spawning (after each round, 50% chance).
    spawnChance: 0.5,
    margin: 60,          // min distance from walls (px, board units)
    minDistance: 90,     // min distance between items / ball / targets
    maxAttempts: 60,
    maxPerRound: 2,
    barrier: {
      length: 110,       // barrier segment length (px)
      thickness: 10,     // barrier thickness (px)
      minAngle: 0,       // random orientation range (radians)
      maxAngle: Math.PI
    },
    turn: {
      radius: 26         // deflection zone radius (px)
    }
  },
  drawing: {
    stripeSpacing: 46,
    outerBorderWidth: 7,
    slingshotArmLength: 20,
    slingshotArmSpread: Math.PI / 2,
    ballShadowRadius: 4,
    restPointMarkSize: 7,
    restPointLineWidth: 2,
    slingshotLineWidth: 3,
    ballLineWidth: 2
  },
  frame: {
    maxDelta: .035,
    millisecondsPerSecond: 1000,
    dampingReferenceFps: 60
  }
};

const COLORS = {
  ink: '#17211f',
  red: '#e94b3c',
  grey: '#89918b',
  cream: '#fffdf7',
  outside: '#c7d2c5',
  field: '#dbe7da',
  stripe: 'rgba(255,255,255,.34)',
  restPoint: 'rgba(84, 82, 82, 0.35)',
  targetOpenHalo: 'rgba(233,75,60,.12)',
  targetHitHalo: 'rgba(137,145,139,.17)',
  item: '#55a868',
  itemHalo: 'rgba(85,168,104,.18)',
  itemSymbol: '#fffdf7',
  itemBarrier: '#4a90d9',
  itemBarrierHalo: 'rgba(74,144,217,.18)',
  itemTurn: '#e8a13c',
  itemTurnHalo: 'rgba(232,161,60,.18)',
  itemPrediction: '#9b59d0',
  itemPredictionHalo: 'rgba(155,89,208,.18)',
  predictionLine: 'rgba(155,89,208,.75)',
  predictionImpact: 'rgba(155,89,208,.35)',
  ballShadow: 'rgba(23,33,31,.12)',
  slingshot: 'rgba(84, 82, 82, 0.35)'
};

// Build a polygon band around a centerline path (normalized points) with a given width (normalized).
function buildBand(points, width) {
  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * width / 2, ny = dx / len * width / 2;
    left.push({ x: p.x + nx, y: p.y + ny });
    right.push({ x: p.x - nx, y: p.y - ny });
  }
  return left.concat(right.reverse());
}

function buildSnakeShape() {
  const barHeight = .22;
  const connectorWidth = .3;
  const top = .15;
  const middle = .5;
  const bottom = .85;
  const left = .05;
  const right = .9;
  const leftConnectorRight = left + connectorWidth;
  const rightConnectorLeft = right - connectorWidth;
  const halfBar = barHeight / 2;

  return [
    { x: left, y: top - halfBar },
    { x: right, y: top - halfBar },
    { x: right, y: middle + halfBar },
    { x: leftConnectorRight, y: middle + halfBar },
    { x: leftConnectorRight, y: bottom - halfBar },
    { x: right, y: bottom - halfBar },
    { x: right, y: bottom + halfBar },
    { x: left, y: bottom + halfBar },
    { x: left, y: middle - halfBar },
    { x: rightConnectorLeft, y: middle - halfBar },
    { x: rightConnectorLeft, y: top + halfBar },
    { x: left, y: top + halfBar }
  ];
}

const SHAPES = {
  lShape: {
    type: 'polygon',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: .55 },
      { x: .45, y: .55 },
      { x: .45, y: 1 },
      { x: 0, y: 1 }
    ]
  },
  snake: {
    type: 'polygon',
    points: buildSnakeShape()
  },
  stadium: {
    type: 'stadium',
    center: { x: .5, y: .5 },
    width: .9,
    height: .8,
    radius: .375
  }
};

const LEVELS = [
  {
    id: 'tutorial-1',
    nameKey: 'level.tutorial-1.name',
    descriptionKey: 'level.tutorial-1.description',
    tipKeys: ['level.tutorial-1.tip1', 'level.tutorial-1.tip2', 'level.tutorial-1.tip3'],
    maxShots: 2,
    twoStarRounds: 10,
    threeStarRounds: 3,
    targetRadiusMultiplier: 4,
    board: { width: 960, height: 540 },
    ball: { x: .5, y: .3, normalized: true },
    targets: [{ x: .5, y: .7, normalized: true }],
    items: []
  },
  {
    id: 'lush-planes',
    nameKey: 'level.lush-planes.name',
    descriptionKey: 'level.lush-planes.description',
    tipKeys: ['level.lush-planes.tip1', 'level.lush-planes.tip2'],
    maxShots: 6,
    twoStarRounds: 10,
    threeStarRounds: 3,
    board: { width: 960, height: 540 },
    ball: { x: .21, y: .5, normalized: true },
    targets: [
      { x: .72, y: .31, normalized: true },
      { x: .72, y: .5, normalized: true },
      { x: .72, y: .69, normalized: true }
    ],
    items: []
  },
  {
    id: 'l-corner',
    nameKey: 'level.l-corner.name',
    descriptionKey: 'level.l-corner.description',
    tipKeys: ['level.l-corner.tip1', 'level.l-corner.tip2'],
    maxShots: 6,
    twoStarRounds: 10,
    threeStarRounds: 2,
    board: { width: 960, height: 540 },
    shape: SHAPES.lShape,
    ball: { x: .2, y: .8, normalized: true },
    targets: [
      { x: .2, y: .2, normalized: true },
      { x: .8, y: .2, normalized: true }
    ],
    items: [
      { type: 'erasor', color: '#55a868', symbol: '-1', x: .25, y: .5, normalized: true }
    ]
  },
  {
    id: 'snake',
    nameKey: 'level.snake.name',
    descriptionKey: 'level.snake.description',
    tipKeys: ['level.snake.tip1', 'level.snake.tip2'],
    maxShots: 6,
    twoStarRounds: 10,
    threeStarRounds: 3,
    board: { width: 960, height: 540 },
    shape: SHAPES.snake,
    ball: { x: .1, y: .15, normalized: true },
    targets: [
      { x: .5, y: .15, normalized: true },
      { x: .5, y: .5, normalized: true },
      { x: .5, y: .85, normalized: true }
    ],
    items: []
  },
  // {
  //   id: 'stadium',
  //   nameKey: 'level.stadium.name',
  //   descriptionKey: 'level.stadium.description',
  //   tipKeys: ['level.stadium.tip1', 'level.stadium.tip2'],
  //   maxShots: 6,
  //   twoStarRounds: 10,
  //   threeStarRounds: 3,
  //   board: { width: 960, height: 540 },
  //   shape: SHAPES.stadium,
  //   ball: { x: .5, y: .15, normalized: true },
  //   targets: [
  //     { x: .5, y: .85, normalized: true },
  //     { x: .15, y: .5, normalized: true },
  //     { x: .85, y: .5, normalized: true }
  //   ],
  //   items: []
  // }
];
