import { useEffect, useRef } from 'react';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  life: number;
  maxLife: number;
  color: string;
}

const POOL_SIZE = 72;
const COLORS = ['#F4D891', '#D4A243', '#2BB67E', '#FAF5EA', '#E8B84B'];

export function ParticleBurst({ triggerKey }: { triggerKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const pool: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 6,
        rot: 0,
        vrot: 0,
        life: 0,
        maxLife: 1,
        color: COLORS[i % COLORS.length],
      });
    }
    poolRef.current = pool;
  }, []);

  useEffect(() => {
    if (triggerKey <= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const originX = width * 0.5;
    const originY = height * 0.38;

    const pool = poolRef.current;
    for (let i = 0; i < 34; i++) {
      const p = pool[i % POOL_SIZE];
      const angle = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.35;
      const speed = 160 + Math.random() * 280;
      p.active = true;
      p.x = originX + (Math.random() - 0.5) * 40;
      p.y = originY + (Math.random() - 0.5) * 24;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 120;
      p.size = 5 + Math.random() * 5;
      p.rot = Math.random() * Math.PI * 2;
      p.vrot = (Math.random() - 0.5) * 9;
      p.life = 0;
      p.maxLife = 0.75 + Math.random() * 0.45;
      p.color = COLORS[i % COLORS.length];
    }

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);

      let anyActive = false;
      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        anyActive = true;
        p.vy += 520 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        ctx.restore();
      }

      if (anyActive) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, width, height);
        rafRef.current = null;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [triggerKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    />
  );
}
