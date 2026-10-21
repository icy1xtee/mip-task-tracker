/*
 * Питомец, который гуляет по низу экрана: его можно схватить, подбросить и бросить —
 * он падает с инерцией, приземляется и идёт дальше. Порт «гуляющего» режима
 * desksprite (MIT, https://github.com/welltilln/desksprite) без React: canvas и
 * пузырь с репликой — собственные DOM-узлы внутри контейнера (.shell).
 */

type NonEmpty<T> = readonly [T, ...T[]];

export type PetFrame = string[];

export type PetSkin = {
  palette: Record<string, string | null>;
  size: { w: number; h: number };
  frames: { idle: NonEmpty<PetFrame>; walk: NonEmpty<PetFrame>; held: PetFrame; happy: PetFrame };
  messages: { tap: NonEmpty<string>; cheer: NonEmpty<string> };
};

export type PetOptions = {
  /** Линия пола (px от верха контейнера) — на телефоне это верх нижней навигации. */
  floor: () => number;
  /** Левая стена (px от левого края контейнера) — на десктопе это правый край сайдбара. */
  left: () => number;
  reduceMotion: boolean;
};

export type PetController = {
  say: (text: string) => void;
  /** Подпрыгнуть от радости и сказать что-нибудь из `messages.cheer`. */
  cheer: (text?: string) => void;
  destroy: () => void;
};

type Loc = 'floor' | 'held' | 'falling';

const PX = 4;
const GRAVITY = 0.9;
const THROW_CAP = 22;
const WALK_SPEED = 0.9;
const WALK_FRAME_TICKS = 8;
const WAG_TICKS = 14;
const DRAG_SLOP = 5;
const HAPPY_TICKS = 70;
const BUBBLE_MS = 2600;

/** Страх высоты: 0 на полу, 1 под потолком. */
export function fearAt(y: number, floorTop: number): number {
  return Math.max(0, Math.min(1, (floorTop - y) / Math.max(1, floorTop)));
}

export function pick<T>(items: NonEmpty<T>, rnd = Math.random): T {
  return items[Math.floor(rnd() * items.length)] ?? items[0];
}

function cycle<T>(items: NonEmpty<T>, n: number): T {
  return items[n % items.length] ?? items[0];
}

export function createPet(container: HTMLElement, skin: PetSkin, opts: PetOptions): PetController {
  const W = skin.size.w * PX;
  // Строка запаса сверху — под «подпрыгивание» шага.
  const H = (skin.size.h + 1) * PX;

  const canvas = document.createElement('canvas');
  canvas.className = 'pet';
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute('aria-hidden', 'true');
  const bubble = document.createElement('div');
  bubble.className = 'pet-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  container.append(canvas, bubble);
  const ctx = canvas.getContext('2d');

  const pet = {
    loc: 'floor' as Loc,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    dir: 1,
    t: 0,
    frame: 0,
    pauseFor: 120,
    happyFor: 0,
    squash: 0,
    fear: 0,
    grabDX: W / 2,
    grabDY: H / 2,
  };
  let raf = 0;
  let last = 0;
  let destroyed = false;
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  let press: { x: number; y: number; id: number } | null = null;
  let lastPX = 0;
  let lastPY = 0;

  const floorTop = () => opts.floor() - H;
  const minX = () => opts.left();
  const maxX = () => Math.max(minX(), container.clientWidth - W);
  // Появляется в случайной точке пола и смотрит в случайную сторону.
  pet.x = minX() + Math.random() * (maxX() - minX());
  pet.y = floorTop();
  pet.dir = Math.random() < 0.5 ? -1 : 1;

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const scared = pet.loc === 'held' || (pet.loc === 'falling' && pet.fear > 0.15);
    const walking = pet.loc === 'floor' && pet.pauseFor <= 0 && !opts.reduceMotion;
    const rows = scared
      ? skin.frames.held
      : pet.happyFor > 0
        ? skin.frames.happy
        : walking
          ? cycle(skin.frames.walk, pet.frame)
          : cycle(skin.frames.idle, opts.reduceMotion ? 0 : Math.floor(pet.t / WAG_TICKS));
    const jit = scared && !opts.reduceMotion ? pet.fear * 2.2 : 0;
    const jx = jit ? Math.round((Math.random() * 2 - 1) * jit) : 0;
    const jy = jit ? Math.round((Math.random() * 2 - 1) * jit) : 0;
    const bob = walking && pet.frame % 2 ? 1 : 0;

    ctx.save();
    ctx.translate(W / 2 + jx, jy);
    if (pet.dir < 0) ctx.scale(-1, 1);
    ctx.translate(-W / 2, 0);
    if (pet.squash > 0) {
      ctx.translate(W / 2, H);
      ctx.scale(1 + pet.squash * 0.3, 1 - pet.squash * 0.3);
      ctx.translate(-W / 2, -H);
    }
    const top = (1 - bob) * PX;
    rows.forEach((row, y) => {
      Array.from(row).forEach((ch, x) => {
        const color = skin.palette[ch];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x * PX, top + y * PX, PX, PX);
      });
    });
    // Капля пота — когда высоко.
    if (scared && pet.fear > 0.45) {
      ctx.fillStyle = '#9FE0FF';
      ctx.fillRect(7 * PX, 2 * PX, 2, 4);
    }
    ctx.restore();
  }

  function place() {
    canvas.style.transform = `translate(${Math.round(pet.x)}px, ${Math.round(pet.y)}px)`;
    if (bubble.classList.contains('is-shown')) placeBubble();
  }

  function placeBubble() {
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const left = Math.min(container.clientWidth - bw - 8, Math.max(8, pet.x + W / 2 - bw / 2));
    const top = Math.max(6, pet.y - bh + PX);
    bubble.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function render() {
    place();
    draw();
  }

  function say(text: string) {
    if (destroyed || !text) return;
    bubble.textContent = text;
    bubble.classList.add('is-shown');
    placeBubble();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-shown'), BUBBLE_MS);
  }

  function hop(vy: number) {
    if (pet.loc !== 'floor') return;
    if (opts.reduceMotion) return;
    pet.vx = 0;
    pet.vy = vy;
    setLoc('falling');
  }

  function cheer(text?: string) {
    say(text ?? pick(skin.messages.cheer));
    pet.happyFor = HAPPY_TICKS;
    pet.pauseFor = Math.max(pet.pauseFor, HAPPY_TICKS);
    hop(-7);
    render();
    start();
  }

  function setLoc(loc: Loc) {
    pet.loc = loc;
    canvas.classList.toggle('is-held', loc === 'held');
    start();
  }

  function land() {
    pet.y = floorTop();
    pet.vx = 0;
    pet.vy = 0;
    pet.squash = opts.reduceMotion ? 0 : 1;
    pet.fear = 0;
    pet.pauseFor = Math.max(pet.pauseFor, 30);
    setLoc('floor');
  }

  function stepFloor(dt: number) {
    if (pet.pauseFor > 0) {
      pet.pauseFor -= dt;
      // После паузы иногда разворачивается.
      if (pet.pauseFor <= 0 && pet.happyFor <= 0 && Math.random() < 0.3) pet.dir = -pet.dir;
      return;
    }
    pet.x += pet.dir * WALK_SPEED * dt;
    if (pet.x >= maxX()) {
      pet.x = maxX();
      pet.dir = -1;
      pet.pauseFor = 40;
    } else if (pet.x <= minX()) {
      pet.x = minX();
      pet.dir = 1;
      pet.pauseFor = 40;
    } else if (Math.random() < 0.0025 * dt) {
      pet.pauseFor = 90 + Math.random() * 180;
    }
    const before = Math.floor((pet.t - dt) / WALK_FRAME_TICKS);
    if (Math.floor(pet.t / WALK_FRAME_TICKS) !== before) pet.frame++;
  }

  function stepFalling(dt: number) {
    pet.vy += GRAVITY * dt;
    pet.x += pet.vx * dt;
    pet.y += pet.vy * dt;
    pet.vx *= Math.pow(0.985, dt);
    if (pet.x < minX()) {
      pet.x = minX();
      pet.vx = Math.abs(pet.vx) * 0.5;
    }
    if (pet.x > maxX()) {
      pet.x = maxX();
      pet.vx = -Math.abs(pet.vx) * 0.5;
    }
    if (pet.vx) pet.dir = pet.vx > 0 ? 1 : -1;
    pet.fear = fearAt(pet.y, floorTop());
    if (pet.y >= floorTop()) land();
  }

  function loop(now: number) {
    raf = 0;
    if (destroyed || document.hidden) return;
    // dt в «кадрах 60 fps»: на 120 Гц экране собака не бегает вдвое быстрее.
    const dt = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
    last = now;
    pet.t += dt;
    if (pet.squash > 0) pet.squash = Math.max(0, pet.squash - 0.08 * dt);
    if (pet.happyFor > 0) pet.happyFor -= dt;
    if (pet.loc === 'falling') stepFalling(dt);
    else if (pet.loc === 'floor' && pet.happyFor <= 0) stepFloor(dt);
    render();
    // С reduced motion на полу анимировать нечего — кадр перерисуется по событию.
    if (opts.reduceMotion && pet.loc === 'floor' && pet.squash <= 0) return;
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (raf || destroyed || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  // ── схватить / бросить / погладить ─────────────────────────────────────────
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || press) return;
    e.preventDefault();
    press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function grab(e: PointerEvent, from: { x: number; y: number }) {
    const r = container.getBoundingClientRect();
    pet.grabDX = from.x - r.left - pet.x;
    pet.grabDY = from.y - r.top - pet.y;
    pet.vx = 0;
    pet.vy = 0;
    pet.happyFor = 0;
    lastPX = e.clientX;
    lastPY = e.clientY;
    setLoc('held');
  }

  function onPointerMove(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    if (pet.loc !== 'held') {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_SLOP) return;
      grab(e, press);
    }
    const r = container.getBoundingClientRect();
    // Сайдбар — стена: туда собачку не утащить.
    pet.x = Math.max(minX(), e.clientX - r.left - pet.grabDX);
    pet.y = Math.min(floorTop(), e.clientY - r.top - pet.grabDY);
    pet.vx = Math.max(-THROW_CAP, Math.min(THROW_CAP, (e.clientX - lastPX) * 0.6 + pet.vx * 0.4));
    pet.vy = Math.max(-THROW_CAP, Math.min(THROW_CAP, (e.clientY - lastPY) * 0.6 + pet.vy * 0.4));
    lastPX = e.clientX;
    lastPY = e.clientY;
    pet.fear = fearAt(pet.y, floorTop());
    render();
  }

  function onPointerUp(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    press = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    if (pet.loc === 'held') {
      if (opts.reduceMotion) land();
      else setLoc('falling');
      return;
    }
    // Короткое нажатие без перетаскивания — погладили.
    say(pick(skin.messages.tap));
    pet.pauseFor = Math.max(pet.pauseFor, 60);
    hop(-5);
    render();
  }

  const onResize = () => {
    pet.x = Math.max(minX(), Math.min(pet.x, maxX()));
    if (pet.loc === 'floor' || pet.y > floorTop()) pet.y = floorTop();
    render();
  };
  const onVisibility = () => {
    if (!document.hidden) start();
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  canvas.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('visibilitychange', onVisibility);

  render();
  start();

  return {
    say,
    cheer,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(bubbleTimer);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.remove();
      bubble.remove();
    },
  };
}
