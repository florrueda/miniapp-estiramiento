const MIN = 60_000;
const INTERVAL = 30 * MIN;
const SNOOZE = 5 * MIN;

const TIPS = [
  'Brazos arriba, manos entrelazadas y estirate hacia el techo. Sostené 15 segundos.',
  'Bajá los hombros lejos de las orejas y hacé 5 círculos hacia atrás.',
  'Oreja al hombro, despacio. 15 segundos de cada lado.',
  'Mentón hacia atrás, como haciendo papada. 5 repeticiones.',
  'Manos detrás de la cabeza, abrí los codos y llevá el pecho hacia adelante.',
  'Parate, caminá un minuto y mirá algo lejos para descansar la vista.',
  'Sentada, girá el torso hacia un lado tomándote del respaldo. Después al otro.',
];

const scene = document.getElementById('scene');
const poses = document.querySelectorAll('.pose');
const bubble = document.getElementById('bubble');
const tip = document.getElementById('tip');
const hint = document.getElementById('hint');

let nextAt = 0, reminding = false, tipIndex = 0, dragging = false;

function schedule(ms) {
  nextAt = Date.now() + ms;
  reminding = false;
  scene.classList.remove('stretch');
  api.setNext(nextAt);
}

function remind() {
  if (reminding) return;
  reminding = true;
  tip.textContent = TIPS[tipIndex++ % TIPS.length];
  scene.classList.add('stretch');
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
for (const el of [...poses, bubble]) {
  el.addEventListener('mouseenter', () => {
    api.setIgnore(false);
    if (el !== bubble) scene.classList.add('hover');
  });
  el.addEventListener('mouseleave', () => {
    if (!dragging) api.setIgnore(true);
    if (el !== bubble) scene.classList.remove('hover');
  });
}

for (const pose of poses) {
  pose.addEventListener('pointerdown', (e) => {
    dragging = true;
    pose.setPointerCapture(e.pointerId);
    api.dragStart();
  });
  pose.addEventListener('pointermove', () => { if (dragging) api.dragMove(); });
  pose.addEventListener('pointerup', () => { dragging = false; api.dragEnd(); });
}

schedule(INTERVAL);
updateHint();
