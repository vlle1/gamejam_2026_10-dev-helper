// --- Localization ---
const STORAGE_PREFIX = 'hole-in-zero:';
const LANG = {
  de: {
    'scoreboard.round': 'Runde',
    'scoreboard.strokes': 'Schläge',
    'scoreboard.targets': 'Ziele',
    'scoreboard.power': 'Schlagstärke',
    'scoreboard.angle': 'Winkel',
    'difficulty.label': 'Schwierigkeit',
    'difficulty.easy': 'Leicht',
    'difficulty.normal': 'Normal',
    'difficulty.hard': 'Schwer',
    'menu': 'Menü',
    'pause.resume': 'Weiterspielen',
    'pause.title': 'Pause',
    'undo': 'Rückgängig',
    'phase.ready': 'Bereit zum Abschlag',
    'phase.drag': 'Ziehen für Stärke',
    'phase.release': 'Loslassen zum Abschlag',
    'phase.rolling': 'Ball rollt',
    'phase.won': 'Runde gewonnen',
    'phase.over': 'Runde beendet',
    'start.start': 'Spiel starten',
    'start.restart': 'Neu starten',
    'start.playAgain': 'Nochmal spielen',
    'start.ok': 'OK',
    'start.continue': "Los geht's",
    'tips.show': 'Tipps anzeigen',
    'tips.hide': 'Tipps ausblenden',
    'tips.next': 'Nächster Tipp',
    'tips.title': 'Tipp {n} / {total}',
    'levelMenu': 'Levelauswahl',
    'hint': 'Ziehe irgendwo auf dem Spielfeld zurück. Je weiter du ziehst, desto stärker der Schlag. Lass los, um den Ball zu schießen.',
    'message.default': 'Treffe alle roten Checkpoints mit maximal 6 Schlägen.',
    'message.rolling': 'Der Ball ist unterwegs ...',
    'message.targetsLeft': '{n} Ziel{e} übrig.',
    'message.nextRound': 'Ziele streifen, dann geht es in die nächste Runde.',
    'message.restTargets': 'Die Ruhepunkte der letzten Runde sind jetzt deine Ziele.',
    'message.itemBarrierUsed': 'Barriere aufgebraucht – der Ball ist abgeprallt.',
    'message.itemTurn': 'Der Ball wurde abgelenkt!',
    'message.itemPrediction': 'Vorhersage aktiv: Der nächste Schlag zeigt seine Flugbahn.',
    'message.itemSpawned': 'Neues Item auf dem Feld!',
    'message.won': '{level} geschafft.',
    'message.over': 'Nach {rounds} gewonnenen Runden ist Schluss.',
    'legend.open': 'offen',
    'legend.hit': 'getroffen',
    'legend.rest': 'letzter Ruhepunkt',
    'level.locked': 'Gesperrt',
    'level.best': 'Bestwert: {n} Runde{n2}',
    'level.unplayed': 'Noch nicht gespielt',
    'level.stars': '{n} / 3 Sterne',
    'level.currentStars': 'Prognose: {n} / 3 Sterne',
    'starRules.eyebrow': 'Sterneregeln',
    'starRules.title': 'Sterne in {level}',
    'starRules.one': 'Level abschließen → 1 Stern',
    'starRules.two': 'Max. {n} Runden → 2 Sterne',
    'starRules.three': 'Max. {n} Runden → 3 Sterne',
    'banner.win': 'You win! {level}',
    'banner.gameover': 'Game over',
    'highscore.eyebrow': 'NEUER BESTWERT',
    'highscore.completed': 'LEVEL GESCHAFFT',
    'highscore.failed': 'LEVEL NICHT GESCHAFFT',
    'highscore.failedCaption': 'Nach {rounds} gewonnenen Runden war Schluss.',
    'highscore.rounds': 'Runden',
    'highscore.targetsPerRound': 'Ziele pro Runde',
    'highscore.caption': 'Hole in 0 nach {rounds} Runden!',
    'highscore.share': 'Teilen',
    'highscore.shareText': 'Ich habe {level} in {rounds} Runden in hole in 0 geschafft! Spiel es auch: {url}',
    'highscore.shareTextNoUrl': 'Ich habe {level} in {rounds} Runden in hole in 0 geschafft!',
    'highscore.nextLevel': 'Nächstes Level',
    'highscore.replay': 'Nochmal spielen',
    'highscore.shared': 'Geteilt!',
    'highscore.copied': 'Text zum Teilen kopiert.',
    'highscore.downloaded': 'Bild heruntergeladen, Text kopiert.',
    'highscore.shareFailed': 'Teilen nicht möglich.',
    'score.eagle': 'Eagle',
    'score.birdie': 'Birdie',
    'score.par': 'Par',
    'score.bogey': 'Bogey',
    'score.doubleBogey': 'Double Bogey',
    'jamCredit': 'Das Spiel ist Teil des KIT GameJam <a href="https://itch.io/jam/dattel-kit-gamejam/results" target="_blank" rel="noreferrer"><code>DattelJam</code></a> – Thema: <code>you are your own enemy</code>.',
    'orientation.title': 'Bitte drehen',
    'orientation.text': 'Das Spielfeld funktioniert im Querformat.',
    'level.tutorial-1.name': 'Tutorial',
    'level.tutorial-1.description': 'Ziehe irgendwo auf dem Spielfeld zurück. Dein Ziel ist es, alle Ziele zu eliminieren.',
    'level.tutorial-1.tip1': 'Das Ziel erscheint immer an der Stelle, an der dein Ball zuletzt war.',
    'level.tutorial-1.tip2': 'Du kannst das Ziel eliminieren, wenn der Ball bereits an der Position des Ziels ist, wenn es erscheint.',
    'level.tutorial-1.tip3': 'Versuche, Ball und Ziel vertikal auszurichten.',
    'level.lush-planes.name': 'Lush Planes',
    'level.lush-planes.description': 'In diesem Level hast du maximal 6 Schläge pro Runde!',
    'level.lush-planes.tip1': 'Versuche, pro Schlag konsequent ein Ziel zu eliminieren, und zwei Ziele, wenn sie in einer Linie liegen.',
    'level.lush-planes.tip2': 'Gewinne mit einer ähnlichen Strategie wie in Tutorial 1.',
    'level.l-corner.name': 'L-Corner',
    'level.l-corner.description': 'Das Spielfeld ist L-förmig. Das grüne Item „-1“ löscht beim Berühren den letzten Ruhepunkt. Nutze die Wände zu deinem Vorteil!',
    'level.l-corner.tip1': 'Die L-Form hat eine Ecke – lass den Ball von den Wänden abprallen, um Ziele zu erreichen.',
    'level.l-corner.tip2': 'Plane deine Schläge, um die Ecke als natürliche Barriere zu nutzen.',
    'level.snake.name': 'Snake',
    'level.snake.description': 'Ein gewundener Korridor. Folge dem Pfad!',
    'level.snake.tip1': 'Der Schlangenkorridor windet sich hin und her.',
    'level.snake.tip2': 'Nutze die Wände, um den Ball entlang des Pfads zu führen.',
    'level.stadium.name': 'Stadium',
    'level.stadium.description': 'Du bist jetzt in der großen Liga, hier kommt das Stadion! Ziele sorgfältig!',
    'level.stadium.tip1': 'Die abgerundete Wand krümmt sich – der Ball prallt in einem Winkel ab.',
    'level.stadium.tip2': 'Versuche, Ziele zu treffen, die direkt gegenüberliegen.'
  },
  en: {
    'scoreboard.round': 'Round',
    'scoreboard.strokes': 'Strokes',
    'scoreboard.targets': 'Targets',
    'scoreboard.power': 'Power',
    'scoreboard.angle': 'Angle',
    'difficulty.label': 'Difficulty',
    'difficulty.easy': 'Easy',
    'difficulty.normal': 'Normal',
    'difficulty.hard': 'Hard',
    'menu': 'Menu',
    'pause.resume': 'Resume',
    'pause.title': 'Paused',
    'undo': 'Undo',
    'phase.ready': 'Ready to shoot',
    'phase.drag': 'Drag for power',
    'phase.release': 'Release to shoot',
    'phase.rolling': 'Ball rolling',
    'phase.won': 'Round won',
    'phase.over': 'Round over',
    'start.start': 'Start game',
    'start.restart': 'Restart',
    'start.playAgain': 'Play again',
    'start.ok': 'OK',
    'start.continue': "Let's go",
    'tips.show': 'Show tips',
    'tips.hide': 'Hide tips',
    'tips.next': 'Next tip',
    'tips.title': 'Tip {n} / {total}',
    'levelMenu': 'Level select',
    'hint': 'Drag and pull from anywhere to shoot. The further you pull, the stronger the shot. Release to shoot the ball.',
    'message.default': 'Hit all red checkpoints with a maximum of 6 strokes per round.',
    'message.rolling': 'The ball is on its way ...',
    'message.targetsLeft': '{n} target{e} left.',
    'message.nextRound': 'Touch the targets, then it goes to the next round.',
    'message.restTargets': 'The rest points of the last round are now your targets.',
    'message.itemBarrierUsed': 'Barrier used up – the ball bounced off it.',
    'message.itemTurn': 'The ball was deflected!',
    'message.itemPrediction': 'Prediction active: your next shot shows its trajectory.',
    'message.itemSpawned': 'A new item appeared on the field!',
    'message.won': '{level} completed.',
    'message.over': 'After {rounds} won rounds it is over.',
    'legend.open': 'open',
    'legend.hit': 'hit',
    'legend.rest': 'last rest point',
    'level.locked': 'Locked',
    'level.best': 'Best: {n} round{n2}',
    'level.unplayed': 'Not played yet',
    'level.stars': '{n} / 3 stars',
    'level.currentStars': 'Projection: {n} / 3 stars',
    'starRules.eyebrow': 'Star rules',
    'starRules.title': 'Stars in {level}',
    'starRules.one': 'Complete the level → 1 star',
    'starRules.two': 'Max. {n} rounds → 2 stars',
    'starRules.three': 'Max. {n} rounds → 3 stars',
    'banner.win': 'You win! {level}',
    'banner.gameover': 'Game over',
    'highscore.eyebrow': 'NEW PERSONAL BEST',
    'highscore.completed': 'LEVEL COMPLETE',
    'highscore.failed': 'LEVEL FAILED',
    'highscore.failedCaption': 'The run ended after {rounds} completed rounds.',
    'highscore.rounds': 'rounds',
    'highscore.targetsPerRound': 'targets per round',
    'highscore.caption': 'Hole in 0 after {rounds} rounds!',
    'highscore.share': 'Share',
    'highscore.shareText': 'I completed {level} in {rounds} rounds in hole in 0! Play it too: {url}',
    'highscore.shareTextNoUrl': 'I completed {level} in {rounds} rounds in hole in 0!',
    'highscore.nextLevel': 'Next level',
    'highscore.replay': 'Play again',
    'highscore.shared': 'Shared!',
    'highscore.copied': 'Share text copied.',
    'highscore.downloaded': 'Image downloaded, share text copied.',
    'highscore.shareFailed': 'Sharing is not available.',
    'score.eagle': 'Eagle',
    'score.birdie': 'Birdie',
    'score.par': 'Par',
    'score.bogey': 'Bogey',
    'score.doubleBogey': 'Double Bogey',
    'jamCredit': 'This game is part of the KIT GameJam <a href="https://itch.io/jam/dattel-kit-gamejam/results" target="_blank" rel="noreferrer"><code>you are your own enemy</code></a>.',
    'orientation.title': 'Please rotate',
    'orientation.text': 'The field works in landscape orientation.',
    'level.tutorial-1.name': 'Tutorial',
    'level.tutorial-1.description': 'To play, drag and pull from anywhere to shoot. Your goal is to eliminate all targets.',
    'level.tutorial-1.tip1': 'The target always appears at the place where your ball was last.',
    'level.tutorial-1.tip2': "You can eliminate the target if the ball already at the target's position when it spawns.",
    'level.tutorial-1.tip3': 'Try to align ball and target vertically.',
    'level.lush-planes.name': 'Lush Planes',
    'level.lush-planes.description': 'In this level, you have a maximum of 6 shots!',
    'level.lush-planes.tip1': 'Try to eliminate a target each shot consistently, and two targets, if they are in line.',
    'level.lush-planes.tip2': 'Win with a similar strategy to Tutorial 1.',
    'level.l-corner.name': 'L-Corner',
    'level.l-corner.description': 'The board is L-shaped. Touch the green “-1” item to erase the last rest point. Use the walls to your advantage!',
    'level.l-corner.tip1': 'The L-shape has a corner - bounce the ball off the walls to reach targets.',
    'level.l-corner.tip2': 'Plan your shots to use the corner as a natural barrier.',
    'level.snake.name': 'Snake',
    'level.snake.description': 'A winding corridor. Follow the path!',
    'level.snake.tip1': 'The snake corridor winds back and forth.',
    'level.snake.tip2': 'Use the walls to guide the ball along the path.',
    'level.stadium.name': 'Stadium',
    'level.stadium.description': 'You\'re in the big league now, here comes the stadium! Aim carefully!',
    'level.stadium.tip1': 'The rounded wall curves - the ball bounces off at an angle.',
    'level.stadium.tip2': 'Try to hit targets that are directly opposite each other.'
  }
};

let currentLang = localStorage.getItem(`${STORAGE_PREFIX}lang`) || 'de';
function t(key, vars = {}) {
  let str = (LANG[currentLang] && LANG[currentLang][key]) || (LANG.de[key]) || key;
  Object.keys(vars).forEach(k => {
    str = str.split(`{${k}}`).join(String(vars[k]));
  });
  return str;
}
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.documentElement.lang = currentLang;
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.textContent = currentLang === 'de' ? 'EN' : 'DE';
  const pauseToggle = document.getElementById('pauseLangToggle');
  if (pauseToggle) pauseToggle.textContent = currentLang === 'de' ? 'EN' : 'DE';
  // Start button text depends on game state (not a static data-i18n element).
  if (ui.startButton) {
    if (state.running) {
      ui.startButton.textContent = state.gameOver ? t('start.playAgain') : t('start.restart');
    } else {
      ui.startButton.textContent = t('start.start');
    }
  }
}
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(`${STORAGE_PREFIX}lang`, lang);
  applyStaticTranslations();
  updateLevelContent();
  updateUi();
  if (!ui.starRulesModal.hidden) showStarRules();
  // Refresh dynamic UI texts
  if (state.running) {
    if (state.shotInMotion) {
      setPhase('phase.rolling');
      ui.message.textContent = t('message.rolling');
    } else if (state.gameOver) {
      setPhase('phase.over');
      ui.startButton.textContent = t('start.playAgain');
    } else {
      setPhase('phase.ready');
      ui.startButton.textContent = t('start.restart');
    }
  } else {
    ui.startButton.textContent = t('start.start');
  }
  ui.tipsButton.textContent = ui.tipsPanel.hidden ? t('tips.show') : t('tips.hide');
}
