export {};
type Rect = { x: number; y: number; width: number; height: number };
type Paint = { width: number; height: number; ratio: number; target: Rect; fill: string; stroke: string; animate: boolean };
type Message = { type: 'init'; canvas: OffscreenCanvas; paint: Paint } | { type: 'paint'; paint: Paint } | { type: 'pause' };
const endpoint = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage: (message: { type: 'painted' | 'settled' | 'failed'; animating?: boolean }) => void;
};
let canvas: OffscreenCanvas | undefined;
let context: OffscreenCanvasRenderingContext2D | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let current: Rect | undefined;
let options: Paint;
let started = 0;
let origin: Rect;

function stop() {
  clearTimeout(timer);
  timer = undefined;
}

function draw(rect: Rect) {
  if (!context || !canvas) return;
  const ratio = options.ratio;
  const width = Math.round(options.width * ratio);
  const height = Math.round(options.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, options.width, options.height);
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, Math.min(15, rect.height / 2));
  context.fillStyle = options.fill;
  context.fill();
  context.strokeStyle = options.stroke;
  context.lineWidth = 0.6;
  context.stroke();
  current = rect;
}

function tick() {
  const elapsed = performance.now() - started;
  const progress = Math.min(1, elapsed / 240);
  const eased = 1 - Math.pow(1 - progress, 3);
  const target = options.target;
  draw({
    x: origin.x + (target.x - origin.x) * eased,
    y: origin.y + (target.y - origin.y) * eased,
    width: origin.width + (target.width - origin.width) * eased,
    height: origin.height + (target.height - origin.height) * eased
  });
  if (progress === 1) {
    stop();
    endpoint.postMessage({ type: 'settled' });
    return;
  }
  // OffscreenCanvas presents independently of the DOM's animation-frame loop.
  // Only this short transition requests a 120 Hz drawing cadence.
  const deadline = started + (Math.floor(elapsed / (1000 / 120)) + 1) * (1000 / 120);
  timer = setTimeout(tick, Math.max(1, Math.ceil(deadline - performance.now())));
}

endpoint.onmessage = event => {
  try {
    const message = event.data;
    stop();
    if (message.type === 'pause') return;
    if (message.type === 'init') {
      canvas = message.canvas;
      context = canvas.getContext('2d', { alpha: true });
      if (!context || typeof context.roundRect !== 'function') throw new Error('Canvas unavailable');
    }
    options = message.paint;
    if (!context) throw new Error('Canvas unavailable');
    if (!current || !options.animate) {
      draw(options.target);
      endpoint.postMessage({ type: 'settled' });
    } else {
      origin = { ...current };
      started = performance.now();
      tick();
    }
    endpoint.postMessage({ type: 'painted', animating: options.animate });
  } catch {
    stop();
    endpoint.postMessage({ type: 'failed' });
  }
};
