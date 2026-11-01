const MIN = 60_000;
const INTERVAL = 30 * MIN;
const SNOOZE = 5 * MIN;
const FRAME_MS = 100;

// Hojas de cuadros sacadas de los GIF. La de tipear está más cerca de cámara,
// por eso se achica más para que las tres tengan el mismo tamaño de persona.
const SHEETS = {
  typing: { w: 346, h: 332, cols: 6, count: 30, scale: 0.576 },
  stretch: { w: 193, h: 358, cols: 6, count: 30, scale: 0.8 },
  neck: { w: 104, h: 313, cols: 6, count: 30, scale: 0.8 },
};

// Se alternan en cada recordatorio. loopFrom: desde qué cuadro repite mientras espera.
const EXERCISES = [
  {
    sprite: 'stretch', loopFrom: 14, tips: [
      'Brazos arriba, manos entrelazadas y estirate hacia el techo. Sostené 15 segundos.',
      'Parate, estirá los brazos bien arriba y respirá hondo tres veces.',
      'Brazos arriba y llevá el torso suave hacia un lado y después al otro.',
    ],
  },
  {
    sprite: 'neck', loopFrom: 0, tips: [
      'Oreja al hombro, despacio. 15 segundos de cada lado.',
      'Bajá los hombros lejos de las orejas e inclina la cabeza de lado a lado.',
      'Mentón hacia atrás, como haciendo papada, y después inclinaciones suaves.',
    ],
  },
];

const scene = document.getElementById('scene');
const bubble = document.getElementById('bubble');
const tip = document.getElementById('tip');
const hint = document.getElementById('hint');
const sprites = {};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const [name, s] of Object.entries(SHEETS)) {
  const el = document.getElementById(name);
  el.style.width = `${s.w * s.scale}px`;
  el.style.height = `${s.h * s.scale}px`;
  el.style.backgroundSize = `${s.cols * s.w * s.scale}px auto`;
  sprites[name] = el;
}

let anim = { sprite: 'typing', frame: 0, dir: 1, loopFrom: 0 };

function play(sprite, loopFrom = 0) {
  anim = { sprite, frame: 0, dir: 1, loopFrom };
  for (const [name, el] of Object.entries(sprites)) el.classList.toggle('active', name === sprite);
  draw();
}

function draw() {
  const s = SHEETS[anim.sprite];
  const i = reduced ? (anim.sprite === 'typing' ? 0 : s.count - 1) : anim.frame;
  sprites[anim.sprite].style.backgroundPosition =
    `-${(i % s.cols) * s.w * s.scale}px -${Math.floor(i / s.cols) * s.h * s.scale}px`;
}

// Ida y vuelta para que el loop no salte del último cuadro al primero
setInterval(() => {
  const n = SHEETS[anim.sprite].count;
  let f = anim.frame + anim.dir;
  if (f >= n) { anim.dir = -1; f = n - 2; }
  else if (f < anim.loopFrom) { anim.dir = 1; f = anim.loopFrom + 1; }
  anim.frame = f;
  draw();
}, FRAME_MS);

let nextAt = 0, reminding = false, round = 0, dragging = false;

function schedule(ms) {
  nextAt = Date.now() + ms;
  reminding = false;
  scene.classList.remove('stretch');
  play('typing');
  api.setNext(nextAt);
}

function remind() {
  if (reminding) return;
  reminding = true;
  const ex = EXERCISES[round % EXERCISES.length];
  tip.textContent = ex.tips[Math.floor(round / EXERCISES.length) % ex.tips.length];
  round++;
  scene.classList.add('stretch');
  play(ex.sprite, ex.loopFrom);
  api.setNext(null);
}

function updateHint() {
  const mins = Math.max(1, Math.ceil((nextAt - Date.now()) / MIN));
  hint.textContent = `Próxima pausa en ${mins} min`;
}

setInterval(() => {
  if (!reminding && Date.now() >= nextAt) remind();
  updateHint();
}, 1000);

document.getElementById('done').addEventListener('click', () => {
  schedule(INTERVAL);
  scene.classList.remove('happy');
  void scene.offsetWidth;
  scene.classList.add('happy');
});
document.getElementById('snooze').addEventListener('click', () => schedule(SNOOZE));

api.on('stretch-now', remind);
// Si la PC estuvo inactiva un rato, eso ya fue una pausa
api.on('idle', () => { if (!reminding) schedule(INTERVAL); });

// Solo el personaje y el globito capturan el mouse; el resto deja pasar clicks
for (const el of [...Object.values(sprites), bubble]) {
  el.addEventListener('mouseenter', () => {
    api.setIgnore(false);
    if (el !== bubble) scene.classList.add('hover');
  });
  el.addEventListener('mouseleave', () => {
    if (!dragging) api.setIgnore(true);
    if (el !== bubble) scene.classList.remove('hover');
  });
}

for (const el of Object.values(sprites)) {
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    api.dragStart();
  });
  el.addEventListener('pointermove', () => { if (dragging) api.dragMove(); });
  el.addEventListener('pointerup', () => { dragging = false; api.dragEnd(); });
}

schedule(INTERVAL);
updateHint();
