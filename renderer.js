const MIN = 60_000;
const INTERVAL = 30 * MIN;
const SNOOZE = 5 * MIN;
const FRAME_MS = 100;

// Hojas de cuadros sacadas de los GIF. La de tipear está más cerca de cámara,
// por eso se achica más para que las tres tengan el mismo tamaño de persona.
const SHEETS = {
  typing: { w: 346, h: 332, cols: 6, count: 30, scale: 0.576 },
  stretch: { w: 189, h: 355, cols: 6, count: 30, scale: 0.8 },
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
    sprite: 'shrug', tips: [
      'Subí los hombros hasta las orejas, sostené 3 segundos y soltalos de golpe. 5 veces.',
      'Hombros arriba al inhalar, abajo al exhalar. Sentí cómo se aflojan.',
    ],
  },
  {
    sprite: 'neck', loopFrom: 0, tips: [
      'Oreja al hombro, despacio. 15 segundos de cada lado.',
      'Bajá los hombros lejos de las orejas e inclina la cabeza de lado a lado.',
      'Mentón hacia atrás, como haciendo papada, y después inclinaciones suaves.',
    ],
  },
  {
    sprite: 'heels', tips: [
      'Parate, subí en puntas de pie y bajá despacio. 10 repeticiones.',
      'Puntas de pie, sostené 2 segundos arriba y bajá lento. Ayuda a la circulación.',
    ],
  },
  {
    sprite: 'lateral', tips: [
      'Inclinate hacia un costado deslizando la mano por la pierna, y después al otro. 5 por lado.',
      'De pie, inclinación lateral suave. Respirá hondo en cada lado.',
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

// --- Marioneta: deforma la pose de pie pixel a pixel, así no hay uniones entre piezas ---
// Coordenadas de standing.png (104x313): hombros ~y60, cadera ~y150, tobillos ~y268, centro x52.
const PUP = { w: 104, h: 313, padX: 32, padTop: 10, scale: 0.8 };
const PW = PUP.w + 2 * PUP.padX, PH = PUP.h + PUP.padTop;
const puppet = document.getElementById('puppet');
const pctx = puppet.getContext('2d');
puppet.width = PW;
puppet.height = PH;
puppet.style.width = `${PW * PUP.scale}px`;
puppet.style.height = `${PH * PUP.scale}px`;
const pupOut = pctx.createImageData(PW, PH);
const basePoses = {};

for (const name of ['standing', 'standing_blink']) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = PUP.w;
    c.height = PUP.h;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, PUP.w, PUP.h).data;
    // premultiplicado, para interpolar sin bordes claros
    const p = new Float32Array(d.length);
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      p[i] = d[i] * a; p[i + 1] = d[i + 1] * a; p[i + 2] = d[i + 2] * a; p[i + 3] = d[i + 3];
    }
    basePoses[name] = p;
  };
  img.src = `assets/${name}.png`;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ramp = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
// columnas donde cuelgan los brazos, a los costados del torso
const armCol = (x) => Math.max(1 - ramp(x, 19, 23), ramp(x, 81, 85));
const P = { x: 0, y: 0 };

// Cada ejercicio recibe el tiempo y devuelve si cierra los ojos y cómo mapear
// cada pixel de salida (x, y) al pixel de origen de la pose de pie (en P).
const PUPPETS = {
  shrug(t) { // encoger hombros, sostener, soltar
    const p = t % 2.4;
    const s = 9 * (p < 0.5 ? ease(p / 0.5) : p < 1.3 ? 1 : 1 - ease((p - 1.3) / 0.25));
    return {
      blink: p > 0.6 && p < 1.3,
      map(x, y) {
        const torso = ramp(y, 44, 60) * (1 - ramp(y, 92, 145));
        const arm = armCol(x) * ramp(y, 44, 60) * (1 - ramp(y, 185, 198));
        P.x = x;
        P.y = y + s * Math.max(torso, arm);
      },
    };
  },
  heels(t) { // puntas de pie: sube todo y el pie se alarga desde la punta
    const p = t % 2;
    const s = 8 * (p < 0.55 ? ease(p / 0.55) : p < 1 ? 1 : 1 - ease((p - 1) / 0.55));
    return {
      blink: false,
      map(x, y) {
        P.x = x;
        P.y = y < 268 ? y + s : y + s * (312 - y) / 44;
      },
    };
  },
  lateral(t) { // el cuerpo se curva de a poco desde los muslos, brazos incluidos
    const k = Math.sin((2 * Math.PI * t) / 5);
    const theta = (9 * Math.PI / 180) * k;
    return {
      blink: Math.abs(k) > 0.75,
      map(x, y) {
        const a = theta * (1 - ramp(y, 130, 205));
        const c = Math.cos(a), s = Math.sin(a), dx = x - 52, dy = y - 205;
        P.x = 52 + c * dx + s * dy;
        P.y = 205 - s * dx + c * dy;
      },
    };
  },
};

let pupStart = 0, pupRaf = 0, pupLast = 0;

function renderPuppet(now) {
  pupRaf = requestAnimationFrame(renderPuppet);
  if (now - pupLast < 33 || !basePoses.standing) return;
  pupLast = now;
  const { blink, map } = PUPPETS[anim.puppet](reduced ? 1 : (now - pupStart) / 1000);
  const src = (blink && basePoses.standing_blink) || basePoses.standing;
  const o = pupOut.data, W = PUP.w, H = PUP.h;
  for (let cy = 0, i = 0; cy < PH; cy++) {
    for (let cx = 0; cx < PW; cx++, i += 4) {
      map(cx - PUP.padX, cy - PUP.padTop);
      const x0 = Math.floor(P.x), y0 = Math.floor(P.y), fx = P.x - x0, fy = P.y - y0;
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < 4; k++) {
        const xx = x0 + (k & 1), yy = y0 + (k >> 1);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const wt = ((k & 1) ? fx : 1 - fx) * ((k >> 1) ? fy : 1 - fy);
        const j = (yy * W + xx) * 4;
        r += src[j] * wt; g += src[j + 1] * wt; b += src[j + 2] * wt; a += src[j + 3] * wt;
      }
      const inv = a > 0.5 ? 255 / a : 0;
      o[i] = r * inv; o[i + 1] = g * inv; o[i + 2] = b * inv; o[i + 3] = a;
    }
  }
  pctx.putImageData(pupOut, 0, 0);
  if (reduced) cancelAnimationFrame(pupRaf);
}

let anim = { sprite: 'typing', puppet: null, frame: 0, dir: 1, loopFrom: 0 };

function play(name, loopFrom = 0) {
  const isPuppet = name in PUPPETS;
  anim = { sprite: isPuppet ? null : name, puppet: isPuppet ? name : null, frame: 0, dir: 1, loopFrom };
  for (const [n, el] of Object.entries(sprites)) el.classList.toggle('active', n === name);
  puppet.classList.toggle('active', isPuppet);
  cancelAnimationFrame(pupRaf);
  if (isPuppet) {
    pupStart = performance.now();
    pupLast = 0;
    pupRaf = requestAnimationFrame(renderPuppet);
  } else {
    draw();
  }
}

function draw() {
  const s = SHEETS[anim.sprite];
  const i = reduced ? (anim.sprite === 'typing' ? 0 : s.count - 1) : anim.frame;
  sprites[anim.sprite].style.backgroundPosition =
    `-${(i % s.cols) * s.w * s.scale}px -${Math.floor(i / s.cols) * s.h * s.scale}px`;
}

// Ida y vuelta para que el loop no salte del último cuadro al primero
setInterval(() => {
  if (!anim.sprite) return;
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
for (const el of [...Object.values(sprites), puppet, bubble]) {
  el.addEventListener('mouseenter', () => {
    api.setIgnore(false);
    if (el !== bubble) scene.classList.add('hover');
  });
  el.addEventListener('mouseleave', () => {
    if (!dragging) api.setIgnore(true);
    if (el !== bubble) scene.classList.remove('hover');
  });
}

for (const el of [...Object.values(sprites), puppet]) {
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
