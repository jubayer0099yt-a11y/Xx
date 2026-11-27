import React, { useEffect, useRef, useState } from 'react';
import scenicVistaImg from '../assets/images/mosque_pond_sunset_clean_1795742934385.jpg';
import woodTextureImg from '../assets/images/wooden_carved_grain_1795742654807.jpg';
import { playWindowToggleSound } from '../utils/sound';

interface MagicWoodenWindowProps {
  soundEnabled: boolean;
}

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  speed: number;
  size: number;
  phase: number;
  depth: number; // 0 = deeper underwater, 1 = surfacing
  depthDir: number;
  palette: {
    body: string;
    belly: string;
    spot: string;
    fin: string;
  };
  rippleCooldown: number;
}

interface Bird {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  scale: number;
  flapPhase: number;
  flapSpeed: number;
  glideTimer: number;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface FloatingMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  puffs: Array<{ dx: number; dy: number; rx: number; ry: number }>;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  tint: string;
}

interface GardenFirefly {
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
  radius: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Smooth 28s cycle: Golden Sunset Day -> Dusk -> Starry Moonlit Night -> Dawn
function getNightFactor(timeSec: number): number {
  const cycle = (timeSec % 28) / 28;
  if (cycle < 0.28) return 0;
  if (cycle < 0.46) return smoothstep(0.28, 0.46, cycle);
  if (cycle < 0.80) return 1;
  return 1 - smoothstep(0.80, 1.0, cycle);
}

// Shoreline boundaries matching mosque_pond_sunset_clean_1795742934385.jpg
function getPondBounds(ny: number): { minX: number; maxX: number } {
  const t = Math.max(0, Math.min(1, (ny - 0.57) / 0.41));
  const minX = 0.24 - t * 0.08 + Math.sin(t * Math.PI) * 0.03;
  const maxX = 0.72 + t * 0.21 - Math.sin(t * Math.PI * 0.85) * 0.04;
  return { minX, maxX };
}

function LivingNatureCanvas({
  isOpen,
  imgRef,
  sunRaysRef,
}: {
  isOpen: boolean;
  imgRef: React.RefObject<HTMLImageElement | null>;
  sunRaysRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const palettes = [
      { body: '#ea580c', belly: '#fed7aa', spot: '#ffffff', fin: 'rgba(254, 215, 170, 0.7)' },
      { body: '#f59e0b', belly: '#fef3c7', spot: '#7c2d12', fin: 'rgba(253, 230, 138, 0.72)' },
      { body: '#f8fafc', belly: '#e2e8f0', spot: '#dc2626', fin: 'rgba(255, 255, 255, 0.72)' },
      { body: '#fb7185', belly: '#ffe4e6', spot: '#fef08a', fin: 'rgba(254, 205, 211, 0.68)' },
      { body: '#d97706', belly: '#fde68a', spot: '#ffffff', fin: 'rgba(252, 211, 77, 0.7)' },
    ];

    const fishes: Fish[] = Array.from({ length: 7 }, (_, i) => {
      const ny = 0.63 + (i / 7) * 0.28 + Math.random() * 0.03;
      const bounds = getPondBounds(ny);
      const nx = bounds.minX + 0.1 + Math.random() * (bounds.maxX - bounds.minX - 0.2);
      const angle = Math.random() * Math.PI * 2;
      return {
        x: nx,
        y: ny,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        angle,
        targetAngle: angle,
        speed: 0.016 + Math.random() * 0.014,
        size: 0.014 + (ny - 0.58) * 0.032, // Perspective: foreground fish slightly larger
        phase: Math.random() * Math.PI * 2,
        depth: 0.25 + Math.random() * 0.55,
        depthDir: Math.random() > 0.5 ? 1 : -1,
        palette: palettes[i % palettes.length],
        rippleCooldown: 1 + Math.random() * 3,
      };
    });

    const birds: Bird[] = [
      { x: 0.08, y: 0.14, dir: 1, speed: 0.022, scale: 0.76, flapPhase: 0.2, flapSpeed: 7.4, glideTimer: 1.8 },
      { x: 0.13, y: 0.17, dir: 1, speed: 0.021, scale: 0.64, flapPhase: 1.5, flapSpeed: 7.7, glideTimer: 0.9 },
      { x: 0.04, y: 0.19, dir: 1, speed: 0.02, scale: 0.56, flapPhase: 2.8, flapSpeed: 8.0, glideTimer: 2.4 },
      { x: 0.86, y: 0.11, dir: -1, speed: 0.018, scale: 0.54, flapPhase: 0.9, flapSpeed: 8.2, glideTimer: 1.2 },
      { x: 0.92, y: 0.135, dir: -1, speed: 0.017, scale: 0.46, flapPhase: 2.1, flapSpeed: 8.5, glideTimer: 2.0 },
      { x: 0.42, y: 0.09, dir: 1, speed: 0.014, scale: 0.42, flapPhase: 3.4, flapSpeed: 8.9, glideTimer: 1.5 },
    ];

    const ripples: WaterRipple[] = [
      { x: 0.48, y: 0.74, radius: 0.01, maxRadius: 0.055, alpha: 0.42 },
      { x: 0.62, y: 0.83, radius: 0.02, maxRadius: 0.07, alpha: 0.35 },
    ];

    const motes: FloatingMote[] = Array.from({ length: 14 }, () => ({
      x: 0.06 + Math.random() * 0.88,
      y: 0.15 + Math.random() * 0.75,
      vx: (Math.random() - 0.5) * 0.008,
      vy: -0.006 - Math.random() * 0.008,
      size: 1.2 + Math.random() * 1.8,
      alpha: 0.25 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const clouds: Cloud[] = [
      {
        x: 0.12,
        y: 0.09,
        width: 0.24,
        height: 0.055,
        speed: 0.008,
        opacity: 0.62,
        puffs: [
          { dx: -0.34, dy: 0.18, rx: 0.28, ry: 0.58 },
          { dx: -0.1, dy: -0.1, rx: 0.34, ry: 0.78 },
          { dx: 0.18, dy: 0.02, rx: 0.32, ry: 0.68 },
          { dx: 0.38, dy: 0.22, rx: 0.24, ry: 0.52 },
        ],
      },
      {
        x: 0.56,
        y: 0.065,
        width: 0.28,
        height: 0.048,
        speed: 0.0055,
        opacity: 0.5,
        puffs: [
          { dx: -0.38, dy: 0.16, rx: 0.26, ry: 0.55 },
          { dx: -0.08, dy: -0.08, rx: 0.38, ry: 0.72 },
          { dx: 0.22, dy: 0.05, rx: 0.32, ry: 0.64 },
          { dx: 0.44, dy: 0.2, rx: 0.22, ry: 0.48 },
        ],
      },
      {
        x: 0.85,
        y: 0.15,
        width: 0.21,
        height: 0.045,
        speed: 0.01,
        opacity: 0.56,
        puffs: [
          { dx: -0.3, dy: 0.15, rx: 0.28, ry: 0.58 },
          { dx: 0.0, dy: -0.12, rx: 0.36, ry: 0.78 },
          { dx: 0.3, dy: 0.12, rx: 0.28, ry: 0.56 },
        ],
      },
      {
        x: -0.14,
        y: 0.21,
        width: 0.26,
        height: 0.042,
        speed: 0.007,
        opacity: 0.44,
        puffs: [
          { dx: -0.36, dy: 0.12, rx: 0.3, ry: 0.54 },
          { dx: -0.05, dy: -0.06, rx: 0.38, ry: 0.72 },
          { dx: 0.28, dy: 0.1, rx: 0.3, ry: 0.56 },
        ],
      },
      {
        x: 0.36,
        y: 0.135,
        width: 0.18,
        height: 0.036,
        speed: 0.0115,
        opacity: 0.42,
        puffs: [
          { dx: -0.26, dy: 0.14, rx: 0.3, ry: 0.56 },
          { dx: 0.04, dy: -0.08, rx: 0.38, ry: 0.75 },
          { dx: 0.32, dy: 0.14, rx: 0.26, ry: 0.52 },
        ],
      },
    ];

    const stars: Star[] = Array.from({ length: 76 }, () => ({
      x: 0.02 + Math.random() * 0.96,
      y: 0.02 + Math.random() * 0.38,
      size: 0.55 + Math.random() * 1.15,
      speed: 1.5 + Math.random() * 3.0,
      phase: Math.random() * Math.PI * 2,
      tint:
        Math.random() > 0.72
          ? '254, 243, 199'
          : Math.random() > 0.45
            ? '224, 242, 254'
            : '255, 255, 255',
    }));

    const gardenFireflies: GardenFirefly[] = [
      { baseX: 0.08, baseY: 0.62, phase: 0.2, speed: 0.85, radius: 0.03 },
      { baseX: 0.14, baseY: 0.73, phase: 1.4, speed: 0.72, radius: 0.035 },
      { baseX: 0.19, baseY: 0.54, phase: 2.6, speed: 0.92, radius: 0.025 },
      { baseX: 0.11, baseY: 0.84, phase: 3.8, speed: 0.68, radius: 0.04 },
      { baseX: 0.23, baseY: 0.66, phase: 5.1, speed: 0.78, radius: 0.028 },
      { baseX: 0.78, baseY: 0.56, phase: 0.9, speed: 0.8, radius: 0.03 },
      { baseX: 0.85, baseY: 0.64, phase: 2.1, speed: 0.9, radius: 0.032 },
      { baseX: 0.91, baseY: 0.76, phase: 3.4, speed: 0.74, radius: 0.034 },
      { baseX: 0.81, baseY: 0.82, phase: 4.7, speed: 0.82, radius: 0.028 },
      { baseX: 0.93, baseY: 0.59, phase: 5.8, speed: 0.88, radius: 0.026 },
    ];

    let isVisible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    let rafId = 0;
    let lastTime = performance.now();
    let ambientRippleTimer = 0;
    let openBlend = isOpenRef.current ? 1 : 0;

    const drawFish = (fish: Fish, w: number, h: number, time: number) => {
      const px = fish.x * w;
      const py = fish.y * h;
      const len = fish.size * w;
      const wid = len * 0.3;

      const surfaceFactor = Math.max(0, Math.min(1, fish.depth));
      // Deeper fish appear slightly softer & tinted by clear pond water
      const opacity = 0.52 + surfaceFactor * 0.46;
      const wave = Math.sin(time * 6.5 + fish.phase);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(fish.angle);

      // Subtle underwater shadow underneath fish
      ctx.save();
      ctx.translate(2, 4 + (1 - surfaceFactor) * 4);
      ctx.fillStyle = `rgba(6, 20, 24, ${0.18 * opacity})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.52, wid * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalAlpha = opacity;

      // Flowing tail fin
      const tailWag = wave * wid * 0.85;
      ctx.fillStyle = fish.palette.fin;
      ctx.beginPath();
      ctx.moveTo(-len * 0.42, 0);
      ctx.quadraticCurveTo(-len * 0.65, tailWag - wid * 0.75, -len * 0.85, tailWag - wid * 0.55);
      ctx.quadraticCurveTo(-len * 0.7, tailWag * 0.5, -len * 0.85, tailWag + wid * 0.55);
      ctx.quadraticCurveTo(-len * 0.65, tailWag + wid * 0.75, -len * 0.42, 0);
      ctx.fill();

      // Pectoral side fins
      const finFlutter = Math.sin(time * 5 + fish.phase) * 0.22;
      ctx.fillStyle = fish.palette.fin;
      ctx.beginPath();
      ctx.ellipse(len * 0.08, -wid * 0.75, len * 0.16, wid * 0.34, -0.5 + finFlutter, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(len * 0.08, wid * 0.75, len * 0.16, wid * 0.34, 0.5 - finFlutter, 0, Math.PI * 2);
      ctx.fill();

      // Curved organic fish body
      const bodyCurve = wave * wid * 0.25;
      const bodyGrad = ctx.createLinearGradient(len * 0.45, -wid, -len * 0.45, wid);
      bodyGrad.addColorStop(0, fish.palette.body);
      bodyGrad.addColorStop(0.55, fish.palette.belly);
      bodyGrad.addColorStop(1, fish.palette.body);

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(len * 0.5, 0);
      ctx.bezierCurveTo(
        len * 0.35,
        -wid * 0.95,
        -len * 0.15,
        -wid * 0.75 + bodyCurve * 0.5,
        -len * 0.46,
        bodyCurve
      );
      ctx.bezierCurveTo(
        -len * 0.15,
        wid * 0.75 + bodyCurve * 0.5,
        len * 0.35,
        wid * 0.95,
        len * 0.5,
        0
      );
      ctx.fill();

      // Koi decorative color patch
      ctx.fillStyle = fish.palette.spot;
      ctx.beginPath();
      ctx.ellipse(len * 0.08, bodyCurve * 0.2, len * 0.17, wid * 0.42, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Subtle dorsal shimmer when surfacing near sunlight
      if (surfaceFactor > 0.68) {
        ctx.fillStyle = `rgba(254, 240, 138, ${(surfaceFactor - 0.68) * 1.4})`;
        ctx.beginPath();
        ctx.ellipse(len * 0.12, -wid * 0.15, len * 0.22, wid * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawBird = (bird: Bird, w: number, h: number) => {
      const bx = bird.x * w;
      const by = bird.y * h;
      const span = 12 * bird.scale * dpr * (w / (490 * dpr));

      // Wingbeat alternates smoothly between active flapping and brief serene glide
      const isGliding = bird.glideTimer > 2.2;
      const wingLift = isGliding
        ? Math.sin(bird.flapPhase * 0.2) * 0.15 - 0.2
        : Math.sin(bird.flapPhase);

      const yOffset = wingLift * span * 0.16;

      ctx.save();
      ctx.translate(bx, by + yOffset);
      ctx.scale(bird.dir, 1);

      ctx.strokeStyle = 'rgba(54, 29, 16, 0.82)';
      ctx.lineWidth = Math.max(1.2, 1.8 * bird.scale * (w / (490 * dpr)));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left & right articulated wings
      const tipY = -wingLift * span * 0.58;
      const midY = -wingLift * span * 0.42 - span * 0.12;

      ctx.beginPath();
      ctx.moveTo(-span * 0.85, tipY);
      ctx.quadraticCurveTo(-span * 0.35, midY, 0, 0);
      ctx.quadraticCurveTo(span * 0.35, midY, span * 0.85, tipY);
      ctx.stroke();

      // Tiny bird body silhouette
      ctx.fillStyle = 'rgba(54, 29, 16, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, span * 0.16, span * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawNightSkyAndMoon = (w: number, h: number, timeSec: number, night: number) => {
      if (night <= 0.01) return;

      // Deep indigo-navy twilight wash over upper sky
      ctx.save();
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.56);
      skyGrad.addColorStop(0, `rgba(4, 10, 28, ${night * 0.78})`);
      skyGrad.addColorStop(0.55, `rgba(11, 23, 52, ${night * 0.64})`);
      skyGrad.addColorStop(1, `rgba(18, 32, 62, ${night * 0.25})`);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.56);

      // Deep nocturnal mirror tint over pond
      const pondGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
      pondGrad.addColorStop(0, `rgba(8, 17, 42, ${night * 0.45})`);
      pondGrad.addColorStop(1, `rgba(4, 10, 26, ${night * 0.65})`);
      ctx.fillStyle = pondGrad;
      ctx.fillRect(0, h * 0.56, w, h * 0.44);

      // Twinkling stars
      const starVisibility = Math.pow(night, 1.45);
      for (const s of stars) {
        const twinkle = 0.45 + 0.55 * Math.sin(timeSec * s.speed + s.phase);
        const alpha = starVisibility * twinkle * 0.9;
        const sx = s.x * w;
        const sy = s.y * h;
        const sr = s.size * dpr * 0.85;

        ctx.fillStyle = `rgba(${s.tint}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();

        if (s.size > 1.3 && twinkle > 0.75) {
          ctx.fillStyle = `rgba(${s.tint}, ${alpha * 0.28})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Luminous Moon in upper-right sky
      const moonX = 0.79 * w;
      const moonY = (0.175 - night * 0.025) * h;
      const moonR = 0.036 * w;

      const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 4.2);
      moonHalo.addColorStop(0, `rgba(241, 245, 249, ${night * 0.42})`);
      moonHalo.addColorStop(0.35, `rgba(191, 219, 254, ${night * 0.16})`);
      moonHalo.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 4.2, 0, Math.PI * 2);
      ctx.fill();

      const moonDisc = ctx.createRadialGradient(
        moonX - moonR * 0.25,
        moonY - moonR * 0.25,
        moonR * 0.1,
        moonX,
        moonY,
        moonR
      );
      moonDisc.addColorStop(0, `rgba(255, 255, 250, ${night * 0.98})`);
      moonDisc.addColorStop(0.75, `rgba(241, 245, 249, ${night * 0.95})`);
      moonDisc.addColorStop(1, `rgba(203, 213, 225, ${night * 0.9})`);
      ctx.fillStyle = moonDisc;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle natural lunar maria shading
      ctx.fillStyle = `rgba(148, 163, 184, ${night * 0.18})`;
      ctx.beginPath();
      ctx.arc(moonX + moonR * 0.22, moonY - moonR * 0.12, moonR * 0.28, 0, Math.PI * 2);
      ctx.arc(moonX - moonR * 0.26, moonY + moonR * 0.24, moonR * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Moon & Starlight Reflection on the Pond Water
      const reflectAlpha = night * 0.65;
      for (let i = 0; i < 16; i++) {
        const ny = 0.63 + (i / 16) * 0.31;
        const waveShift = Math.sin(timeSec * 1.9 + i * 1.3) * 0.012 * w;
        const streakW = (0.014 + Math.sin(timeSec * 1.4 + i) * 0.008 + (i / 16) * 0.018) * w;
        const a = reflectAlpha * (0.28 + 0.35 * (1 - i / 16)) * (0.7 + 0.3 * Math.sin(timeSec * 2.2 + i));
        ctx.fillStyle = `rgba(226, 232, 240, ${a})`;
        ctx.beginPath();
        ctx.ellipse(moonX + waveShift, ny * h, streakW, (1.1 + i * 0.08) * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scattered twinkling star reflections in the pond
      for (let i = 0; i < 18; i++) {
        const ny = 0.62 + ((i * 37) % 34) / 100;
        const b = getPondBounds(ny);
        const nx = b.minX + 0.06 + (((i * 53) % 80) / 100) * (b.maxX - b.minX - 0.12);
        const glint = 0.3 + 0.7 * Math.max(0, Math.sin(timeSec * 2.4 + i * 1.9));
        ctx.fillStyle = `rgba(224, 242, 254, ${night * glint * 0.42})`;
        ctx.beginPath();
        ctx.ellipse(nx * w, ny * h, 1.4 * dpr, 0.8 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawClouds = (w: number, h: number, dt: number, night: number) => {
      ctx.save();
      for (const cloud of clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.x > 1.25) {
          cloud.x = -0.25;
        }

        const cx = cloud.x * w;
        const cy = cloud.y * h;
        const cw = cloud.width * w;
        const ch = cloud.height * h;

        // Smooth blend between sunlit white/warm-gray (Day) and moonlit silver/slate-gray (Night)
        const topR = Math.round(255 - night * 92);
        const topG = Math.round(251 - night * 76);
        const topB = Math.round(244 - night * 40);
        const botR = Math.round(205 - night * 145);
        const botG = Math.round(192 - night * 117);
        const botB = Math.round(192 - night * 96);

        const baseAlpha = cloud.opacity * (1 - night * 0.46);

        // Soft light-gray underside first for realistic depth
        for (const p of cloud.puffs) {
          const px = cx + p.dx * cw;
          const py = cy + (p.dy + 0.14) * ch;
          const pr = p.rx * cw;
          const grad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
          grad.addColorStop(0, `rgba(${botR}, ${botG}, ${botB}, ${baseAlpha * 0.42})`);
          grad.addColorStop(0.65, `rgba(${botR}, ${botG}, ${botB}, ${baseAlpha * 0.18})`);
          grad.addColorStop(1, `rgba(${botR}, ${botG}, ${botB}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(px, py, pr, p.ry * ch, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Soft bright white/moonlit top puffs
        for (const p of cloud.puffs) {
          const px = cx + p.dx * cw;
          const py = cy + p.dy * ch;
          const pr = p.rx * cw;
          const grad = ctx.createRadialGradient(px, py - ch * 0.1, pr * 0.08, px, py, pr);
          grad.addColorStop(0, `rgba(${topR}, ${topG}, ${topB}, ${baseAlpha * 0.65})`);
          grad.addColorStop(0.55, `rgba(${topR}, ${topG}, ${topB}, ${baseAlpha * 0.3})`);
          grad.addColorStop(1, `rgba(${topR}, ${topG}, ${topB}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(px, py, pr, p.ry * ch, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawMosqueNightLights = (w: number, h: number, timeSec: number, night: number) => {
      if (night <= 0.12) return;
      const glowStrength = smoothstep(0.12, 0.75, night);

      ctx.save();
      // Subtle warm golden glow on minaret balconies & spires
      const minaretLights = [
        { x: 0.342, y: 0.285, r: 0.018 },
        { x: 0.342, y: 0.355, r: 0.015 },
        { x: 0.386, y: 0.33, r: 0.014 },
        { x: 0.619, y: 0.33, r: 0.014 },
        { x: 0.665, y: 0.285, r: 0.018 },
        { x: 0.665, y: 0.355, r: 0.015 },
      ];

      for (const m of minaretLights) {
        const pulse = 0.88 + 0.12 * Math.sin(timeSec * 2.1 + m.x * 18);
        const mx = m.x * w;
        const my = m.y * h;
        const mr = m.r * w;
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        g.addColorStop(0, `rgba(254, 240, 138, ${glowStrength * 0.75 * pulse})`);
        g.addColorStop(0.4, `rgba(245, 158, 11, ${glowStrength * 0.35 * pulse})`);
        g.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Warm golden arched facade & colonnade glow + soft pond reflection
      const facadeGlow = ctx.createRadialGradient(0.5 * w, 0.49 * h, 0.01 * w, 0.5 * w, 0.49 * h, 0.13 * w);
      facadeGlow.addColorStop(0, `rgba(253, 224, 71, ${glowStrength * 0.38})`);
      facadeGlow.addColorStop(0.5, `rgba(245, 158, 11, ${glowStrength * 0.16})`);
      facadeGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = facadeGlow;
      ctx.beginPath();
      ctx.ellipse(0.5 * w, 0.49 * h, 0.13 * w, 0.045 * h, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle warm golden facade reflection shimmering in the pond
      const reflectGlow = ctx.createRadialGradient(0.5 * w, 0.62 * h, 0.01 * w, 0.5 * w, 0.62 * h, 0.11 * w);
      reflectGlow.addColorStop(0, `rgba(251, 191, 36, ${glowStrength * 0.22})`);
      reflectGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = reflectGlow;
      ctx.beginPath();
      ctx.ellipse(0.5 * w, 0.62 * h, 0.11 * w, 0.04 * h, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      if (!isVisible) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const timeSec = now / 1000;
      const nightFactor = getNightFactor(timeSec);

      // Smoothly interpolate window open/close lighting factor
      const targetOpen = isOpenRef.current ? 1 : 0;
      openBlend += (targetOpen - openBlend) * Math.min(1, dt * 3.2);

      // Sync base photograph lighting smoothly with Day/Night cycle
      if (imgRef.current) {
        const dayBright = 0.62 + openBlend * 0.38;
        const nightBright = 0.25 + openBlend * 0.15;
        const b = dayBright + (nightBright - dayBright) * nightFactor;
        const sat = 1.04 - nightFactor * 0.42;
        const con = 0.96 + openBlend * 0.06 + nightFactor * 0.1;
        imgRef.current.style.filter = `brightness(${b.toFixed(3)}) saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)})`;
      }
      if (sunRaysRef.current) {
        const sunVis = (0.25 + openBlend * 0.75) * (1 - nightFactor * 0.92);
        sunRaysRef.current.style.opacity = sunVis.toFixed(3);
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);

      // 0. Day/Night Sky Wash, Moon, Stars & Reflections
      drawNightSkyAndMoon(w, h, timeSec, nightFactor);

      // 0b. Moving Realistic Clouds (Day & Night dynamic coloring)
      drawClouds(w, h, dt, nightFactor);

      // 0c. Soft Mosque & Minaret Lights at Night
      drawMosqueNightLights(w, h, timeSec, nightFactor);

      // 1. Subtle Pond Wave Shimmer & Realistic Mosque/Sky Reflection Ripples
      ctx.save();
      for (let i = 0; i < 24; i++) {
        const ny = 0.58 + (i / 24) * 0.38;
        const bounds = getPondBounds(ny);
        const cx =
          (bounds.minX + bounds.maxX) * 0.5 +
          Math.sin(timeSec * 0.55 + i * 1.45) * 0.15 +
          Math.cos(timeSec * 0.35 + i) * 0.04;
        const streakW = (0.032 + Math.sin(timeSec * 1.2 + i) * 0.018) * w;
        const shimmerAlpha = 0.03 + 0.048 * (0.5 + 0.5 * Math.sin(timeSec * 1.65 + i * 2.1));
        ctx.fillStyle =
          nightFactor > 0.5
            ? `rgba(203, 213, 225, ${shimmerAlpha * 1.15})`
            : i % 3 === 0
              ? `rgba(254, 240, 138, ${shimmerAlpha * 1.3})`
              : `rgba(255, 255, 255, ${shimmerAlpha})`;
        ctx.beginPath();
        ctx.ellipse(cx * w, ny * h, streakW, (0.85 + (ny - 0.58) * 1.1) * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Update & Draw Colorful Fish in the Pond
      for (const fish of fishes) {
        // Gentle random heading wander
        if (Math.random() < dt * 0.9) {
          fish.targetAngle += (Math.random() - 0.5) * 1.1;
        }

        // Steer softly back inside shoreline bounds
        const bounds = getPondBounds(fish.y);
        if (fish.x < bounds.minX + 0.05) {
          fish.targetAngle = (Math.random() - 0.5) * 0.9;
        } else if (fish.x > bounds.maxX - 0.05) {
          fish.targetAngle = Math.PI + (Math.random() - 0.5) * 0.9;
        }
        if (fish.y < 0.61) {
          fish.targetAngle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
        } else if (fish.y > 0.93) {
          fish.targetAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
        }

        // Smooth shortest-angle interpolation
        let diff = fish.targetAngle - fish.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        fish.angle += diff * dt * 1.8;

        fish.x += Math.cos(fish.angle) * fish.speed * dt;
        fish.y += Math.sin(fish.angle) * fish.speed * dt * 0.55; // Foreshortened water plane
        fish.size = 0.013 + Math.max(0, fish.y - 0.58) * 0.032;

        // Vertical depth oscillation (underwater <-> surfacing)
        fish.depth += fish.depthDir * dt * 0.14;
        if (fish.depth > 0.95) {
          fish.depth = 0.95;
          fish.depthDir = -1;
        } else if (fish.depth < 0.15) {
          fish.depth = 0.15;
          fish.depthDir = 1;
        }

        // Spawn natural water ripple when fish surfaces
        fish.rippleCooldown -= dt;
        if (fish.depth > 0.78 && fish.rippleCooldown <= 0) {
          ripples.push({
            x: fish.x,
            y: fish.y,
            radius: 0.005,
            maxRadius: 0.045 + Math.random() * 0.025,
            alpha: 0.5,
          });
          fish.rippleCooldown = 2.8 + Math.random() * 3.5;
        }

        drawFish(fish, w, h, timeSec);
      }

      // 3. Expanding Water Ripples (foreshortened ellipses on pond plane)
      ambientRippleTimer += dt;
      if (ambientRippleTimer > 2.6) {
        ambientRippleTimer = 0;
        const ny = 0.63 + Math.random() * 0.28;
        const b = getPondBounds(ny);
        ripples.push({
          x: b.minX + 0.08 + Math.random() * (b.maxX - b.minX - 0.16),
          y: ny,
          radius: 0.004,
          maxRadius: 0.04 + Math.random() * 0.03,
          alpha: 0.35,
        });
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += dt * 0.022;
        const progress = r.radius / r.maxRadius;
        const fade = (1 - progress) * r.alpha;

        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = `rgba(254, 243, 199, ${fade})`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.ellipse(r.x * w, r.y * h, r.radius * w, r.radius * w * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (r.radius > 0.015) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${fade * 0.55})`;
          ctx.beginPath();
          ctx.ellipse(r.x * w, r.y * h, r.radius * w * 0.62, r.radius * w * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 4. Flying Birds gliding from one side of the sky to the other
      for (const bird of birds) {
        bird.x += bird.dir * bird.speed * dt;
        bird.flapPhase += bird.flapSpeed * dt;
        bird.glideTimer = (bird.glideTimer + dt) % 3.2;

        if (bird.dir === 1 && bird.x > 1.08) {
          bird.x = -0.08;
          bird.y = 0.08 + Math.random() * 0.16;
        } else if (bird.dir === -1 && bird.x < -0.08) {
          bird.x = 1.08;
          bird.y = 0.08 + Math.random() * 0.16;
        }

        drawBird(bird, w, h);
      }

      // 5. Daytime Sunset Pollen Motes & Nighttime Garden Fireflies
      const moteBoost = (isOpenRef.current ? 1 : 0.35) * (1 - nightFactor * 0.85);
      if (moteBoost > 0.04) {
        for (const m of motes) {
          m.x += m.vx * dt + Math.sin(timeSec + m.phase) * 0.002 * dt;
          m.y += m.vy * dt;
          if (m.y < 0.05) {
            m.y = 0.92;
            m.x = 0.08 + Math.random() * 0.84;
          }

          ctx.fillStyle = `rgba(254, 240, 138, ${m.alpha * moteBoost * (0.65 + 0.35 * Math.sin(timeSec * 2 + m.phase))})`;
          ctx.beginPath();
          ctx.arc(m.x * w, m.y * h, m.size * dpr * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (nightFactor > 0.2) {
        const ffVisibility = smoothstep(0.2, 0.75, nightFactor);
        for (const ff of gardenFireflies) {
          const pulse = Math.max(0, Math.sin(timeSec * 1.6 + ff.phase * 2.1));
          if (pulse < 0.08) continue;
          const fx = (ff.baseX + Math.sin(timeSec * ff.speed + ff.phase) * ff.radius) * w;
          const fy = (ff.baseY + Math.cos(timeSec * ff.speed * 0.8 + ff.phase) * ff.radius * 0.7) * h;
          const alpha = ffVisibility * pulse;

          const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5.5 * dpr);
          halo.addColorStop(0, `rgba(254, 249, 195, ${alpha * 0.95})`);
          halo.addColorStop(0.45, `rgba(250, 204, 21, ${alpha * 0.45})`);
          halo.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(fx, fy, 5.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-10"
      aria-hidden="true"
    />
  );
}

function WarmGoldenLantern({ side, isOpen }: { side: 'left' | 'right'; isOpen: boolean }) {
  const isLeft = side === 'left';
  return (
    <div
      className={`pointer-events-none absolute top-[18%] sm:top-[20%] z-40 flex flex-col items-center ${
        isLeft ? '-left-5 sm:-left-9' : '-right-5 sm:-right-9'
      }`}
    >
      {/* Forged Bronze & Gold Wall Bracket */}
      <svg
        viewBox="0 0 48 40"
        className={`w-9 h-7 sm:w-12 sm:h-10 drop-shadow-[0_6px_10px_rgba(0,0,0,0.85)] ${
          isLeft ? '' : '-scale-x-100'
        }`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`bracket-gold-${side}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect x="40" y="4" width="6" height="28" rx="2" fill={`url(#bracket-gold-${side})`} />
        <path
          d="M 41 11 C 26 4, 15 14, 11 24"
          fill="none"
          stroke={`url(#bracket-gold-${side})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 41 25 C 28 24, 20 19, 14 20"
          fill="none"
          stroke={`url(#bracket-gold-${side})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="11" cy="26" r="2.6" fill="#fbbf24" />
      </svg>

      {/* Hanging Ornate Brass Lantern */}
      <div
        className="relative -mt-2 flex flex-col items-center origin-top animate-vine-sway"
        style={{ animationDelay: isLeft ? '0s' : '1.8s' }}
      >
        {/* Soft Radial Golden Ambient Light Spill with Subtle Flicker */}
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-700 animate-lantern-flicker ${
            isOpen ? 'w-36 h-36 sm:w-48 sm:h-48 opacity-95' : 'w-32 h-32 sm:w-40 sm:h-40 opacity-85'
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.48) 0%, rgba(245,158,11,0.18) 40%, rgba(30,58,138,0.06) 70%, transparent 100%)',
            filter: 'blur(8px)',
            animationDelay: isLeft ? '0.2s' : '1.6s',
          }}
        />

        <svg
          viewBox="0 0 68 104"
          className="relative w-12 h-18 sm:w-15 sm:h-23 drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`metal-gold-${side}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="30%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <radialGradient id={`amber-glass-${side}`} cx="50%" cy="52%" r="55%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="28%" stopColor="#fef08a" />
              <stop offset="68%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>

          <line x1="34" y1="0" x2="34" y2="11" stroke="#fbbf24" strokeWidth="2.4" />
          <circle cx="34" cy="12" r="3.2" fill="none" stroke="#fde68a" strokeWidth="2" />

          {/* Dome & Collar */}
          <path
            d="M 34 15 L 37.5 21 L 50 28 L 18 28 L 30.5 21 Z"
            fill={`url(#metal-gold-${side})`}
            stroke="#fde68a"
            strokeWidth="0.6"
          />
          <rect x="15" y="27.5" width="38" height="4.5" rx="2" fill={`url(#metal-gold-${side})`} />

          {/* Glowing Warm Glass Body */}
          <polygon
            points="19,32 49,32 45,76 23,76"
            fill={`url(#amber-glass-${side})`}
            stroke="#92400e"
            strokeWidth="1.4"
          />

          {/* Candle & Flickering Warm Flame */}
          <g className="origin-center animate-lantern-flicker">
            <ellipse cx="34" cy="56" rx="8" ry="13" fill="#fffbeb" opacity="0.65" />
            <path d="M 34 44 C 38.5 51, 38.5 58, 34 62 C 29.5 58, 29.5 51, 34 44 Z" fill="#ffffff" />
            <rect x="31.5" y="62" width="5" height="10" rx="1" fill="#fef3c7" opacity="0.92" />
          </g>

          {/* Diagonal Glass Reflection + Mullions */}
          <polygon points="22,34 29,34 25,74 22,74" fill="#ffffff" opacity="0.16" />
          <line x1="34" y1="32" x2="34" y2="76" stroke="#451a03" strokeWidth="1.8" />
          <line x1="26" y1="32" x2="27.5" y2="76" stroke="#78350f" strokeWidth="1.1" />
          <line x1="42" y1="32" x2="40.5" y2="76" stroke="#78350f" strokeWidth="1.1" />

          {/* Base & Finial */}
          <rect x="20" y="76" width="28" height="4.5" rx="1.8" fill={`url(#metal-gold-${side})`} />
          <path d="M 24 80.5 L 44 80.5 L 36 90 L 32 90 Z" fill={`url(#metal-gold-${side})`} />
          <circle cx="34" cy="93" r="2.8" fill="#fbbf24" />
        </svg>
      </div>
    </div>
  );
}

function RealisticFlower({
  cx,
  cy,
  scale = 1,
  tone = 'gold',
}: {
  cx: number;
  cy: number;
  scale?: number;
  tone?: 'gold' | 'rose' | 'ivory';
}) {
  const colors =
    tone === 'gold'
      ? { base: '#b45309', mid: '#f59e0b', tip: '#fef08a', core: '#451a03' }
      : tone === 'rose'
        ? { base: '#9f1239', mid: '#e11d48', tip: '#fda4af', core: '#fbbf24' }
        : { base: '#d6d3d1', mid: '#fafaf9', tip: '#ffffff', core: '#d97706' };

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {/* Soft ambient petal shadow */}
      <circle cx="1" cy="2" r="9.5" fill="rgba(0,0,0,0.45)" />
      {[0, 52, 104, 156, 208, 260, 312].map((deg) => (
        <path
          key={`p1-${deg}`}
          d="M 0 0 C -4 -5, -4 -10, 0 -10.5 C 4 -10, 4 -5, 0 0 Z"
          fill={colors.base}
          transform={`rotate(${deg})`}
        />
      ))}
      {[24, 76, 128, 180, 232, 284, 336].map((deg) => (
        <path
          key={`p2-${deg}`}
          d="M 0 0 C -3.4 -4.5, -3.2 -8.8, 0 -9.2 C 3.2 -8.8, 3.4 -4.5, 0 0 Z"
          fill={colors.mid}
          transform={`rotate(${deg})`}
        />
      ))}
      {[12, 84, 156, 228, 300].map((deg) => (
        <path
          key={`p3-${deg}`}
          d="M 0 0 C -2.2 -3, -2 -5.8, 0 -6.2 C 2 -5.8, 2.2 -3, 0 0 Z"
          fill={colors.tip}
          transform={`rotate(${deg})`}
          opacity="0.9"
        />
      ))}
      <circle cx="0" cy="0" r="2.3" fill={colors.core} />
      <circle cx="-0.6" cy="-0.6" r="0.9" fill="#fef3c7" opacity="0.7" />
    </g>
  );
}

function NaturalBotanicalSurround() {
  return (
    <>
      {/* Top Cascading Ivy & Flowers over Window Cornice */}
      <svg
        viewBox="0 0 620 135"
        className="pointer-events-none absolute -top-7 sm:-top-9 left-1/2 -translate-x-1/2 w-[108%] h-24 sm:h-28 z-40 drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ivy-deep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3f6212" />
            <stop offset="55%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="ivy-sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
        </defs>

        <path
          d="M 26 88 Q 145 24, 310 28 Q 475 24, 594 88"
          fill="none"
          stroke="#2d1a0d"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M 52 52 Q 180 42, 310 18 Q 440 42, 568 52"
          fill="none"
          stroke="#1e3a1e"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Gently swaying left trailing vine tendril */}
        <g className="animate-vine-sway-soft" style={{ transformOrigin: '48px 68px' }}>
          <path d="M 48 68 Q 26 96, 36 126" fill="none" stroke="#1e3a1e" strokeWidth="2.4" strokeLinecap="round" />
          <g transform="translate(34, 102) rotate(-58) scale(0.95)">
            <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill="url(#ivy-deep)" />
          </g>
          <g transform="translate(42, 120) rotate(-24) scale(0.8)">
            <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill="url(#ivy-sun)" />
          </g>
          <RealisticFlower cx={40} cy={96} scale={0.82} tone="gold" />
        </g>

        {/* Gently swaying right trailing vine tendril */}
        <g
          className="animate-vine-sway-soft"
          style={{ transformOrigin: '572px 68px', animationDelay: '1.9s' }}
        >
          <path d="M 572 68 Q 594 96, 584 126" fill="none" stroke="#1e3a1e" strokeWidth="2.4" strokeLinecap="round" />
          <g transform="translate(586, 102) rotate(238) scale(0.95)">
            <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill="url(#ivy-deep)" />
          </g>
          <g transform="translate(578, 120) rotate(204) scale(0.8)">
            <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill="url(#ivy-sun)" />
          </g>
          <RealisticFlower cx={580} cy={96} scale={0.82} tone="gold" />
        </g>

        {/* Top Leaf & Flower Garland with Subtle Breeze */}
        <g className="animate-vine-sway-soft" style={{ transformOrigin: '310px 24px', animationDelay: '0.8s' }}>
          {[
            { x: 38, y: 78, r: -40, s: 1.05 },
            { x: 64, y: 60, r: -18, s: 1.15 },
            { x: 92, y: 48, r: 16, s: 1.1 },
            { x: 124, y: 38, r: -24, s: 1.0 },
            { x: 158, y: 31, r: 22, s: 1.05 },
            { x: 196, y: 26, r: -16, s: 0.95 },
            { x: 236, y: 23, r: 18, s: 0.95 },
            { x: 278, y: 21, r: -20, s: 0.9 },
            { x: 582, y: 78, r: 220, s: 1.05 },
            { x: 556, y: 60, r: 198, s: 1.15 },
            { x: 528, y: 48, r: 164, s: 1.1 },
            { x: 496, y: 38, r: 204, s: 1.0 },
            { x: 462, y: 31, r: 158, s: 1.05 },
            { x: 424, y: 26, r: 196, s: 0.95 },
            { x: 384, y: 23, r: 162, s: 0.95 },
            { x: 342, y: 21, r: 200, s: 0.9 },
          ].map((l, idx) => (
            <g key={idx} transform={`translate(${l.x}, ${l.y}) rotate(${l.r}) scale(${l.s})`}>
              <path
                d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z"
                fill={idx % 2 === 0 ? 'url(#ivy-deep)' : 'url(#ivy-sun)'}
              />
              <line x1="2" y1="0" x2="19" y2="0" stroke="#bef264" strokeWidth="0.5" opacity="0.38" />
            </g>
          ))}

          <RealisticFlower cx={72} cy={58} scale={1.1} tone="rose" />
          <RealisticFlower cx={132} cy={38} scale={0.95} tone="gold" />
          <RealisticFlower cx={194} cy={30} scale={0.82} tone="ivory" />
          <RealisticFlower cx={310} cy={22} scale={1.1} tone="gold" />
          <RealisticFlower cx={426} cy={30} scale={0.82} tone="ivory" />
          <RealisticFlower cx={488} cy={38} scale={0.95} tone="gold" />
          <RealisticFlower cx={548} cy={58} scale={1.1} tone="rose" />
        </g>
      </svg>

      {/* Sill Left & Right Blooming Flower Clusters */}
      <svg
        viewBox="0 0 185 110"
        className="pointer-events-none absolute -bottom-3 -left-3 sm:-left-6 w-28 h-18 sm:w-36 sm:h-22 z-40 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] origin-bottom animate-vine-sway"
        aria-hidden="true"
      >
        <path d="M 16 94 Q 48 64, 96 78" fill="none" stroke="#14532d" strokeWidth="3" />
        <path d="M 34 90 Q 32 52, 60 36" fill="none" stroke="#166534" strokeWidth="2.5" />
        {[
          { x: 24, y: 82, r: -45, s: 1.1 },
          { x: 44, y: 66, r: -72, s: 1.15 },
          { x: 64, y: 74, r: -24, s: 1.05 },
          { x: 86, y: 78, r: -8, s: 0.95 },
          { x: 46, y: 46, r: -58, s: 1 },
          { x: 16, y: 92, r: -25, s: 0.95 },
        ].map((l, i) => (
          <g key={`bl-${i}`} transform={`translate(${l.x}, ${l.y}) rotate(${l.r}) scale(${l.s})`}>
            <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill={i % 2 === 0 ? '#14532d' : '#3f6212'} />
          </g>
        ))}
        <RealisticFlower cx={46} cy={48} scale={1.1} tone="rose" />
        <RealisticFlower cx={74} cy={68} scale={1.0} tone="gold" />
        <RealisticFlower cx={28} cy={74} scale={0.9} tone="ivory" />
      </svg>

      <svg
        viewBox="0 0 185 110"
        className="pointer-events-none absolute -bottom-3 -right-3 sm:-right-6 w-28 h-18 sm:w-36 sm:h-22 z-40 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] origin-bottom animate-vine-sway"
        style={{ animationDelay: '2.4s' }}
        aria-hidden="true"
      >
        <g transform="translate(185, 0) scale(-1, 1)">
          <path d="M 16 94 Q 48 64, 96 78" fill="none" stroke="#14532d" strokeWidth="3" />
          <path d="M 34 90 Q 32 52, 60 36" fill="none" stroke="#166534" strokeWidth="2.5" />
          {[
            { x: 24, y: 82, r: -45, s: 1.1 },
            { x: 44, y: 66, r: -72, s: 1.15 },
            { x: 64, y: 74, r: -24, s: 1.05 },
            { x: 86, y: 78, r: -8, s: 0.95 },
            { x: 46, y: 46, r: -58, s: 1 },
            { x: 16, y: 92, r: -25, s: 0.95 },
          ].map((l, i) => (
            <g key={`br-${i}`} transform={`translate(${l.x}, ${l.y}) rotate(${l.r}) scale(${l.s})`}>
              <path d="M 0 0 C 7 -9, 19 -8, 24 0 C 19 8, 7 9, 0 0 Z" fill={i % 2 === 0 ? '#14532d' : '#3f6212'} />
            </g>
          ))}
          <RealisticFlower cx={46} cy={48} scale={1.1} tone="gold" />
          <RealisticFlower cx={74} cy={68} scale={1.0} tone="rose" />
          <RealisticFlower cx={28} cy={74} scale={0.9} tone="ivory" />
        </g>
      </svg>
    </>
  );
}

function GlassPane({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-[2px] border border-amber-400/20"
      style={{
        background:
          side === 'left'
            ? 'linear-gradient(135deg, rgba(15, 29, 62, 0.56) 0%, rgba(10, 22, 48, 0.42) 55%, rgba(251, 191, 36, 0.14) 100%)'
            : 'linear-gradient(225deg, rgba(15, 29, 62, 0.56) 0%, rgba(10, 22, 48, 0.42) 55%, rgba(251, 191, 36, 0.14) 100%)',
        backdropFilter: 'blur(2.5px)',
        WebkitBackdropFilter: 'blur(2.5px)',
        boxShadow:
          'inset 0 1px 2px rgba(255,255,255,0.22), inset 0 -2px 6px rgba(6, 14, 34, 0.65)',
      }}
    >
      {/* Realistic Diagonal Window Glass Specular Sheen */}
      <div
        className="pointer-events-none absolute -inset-4"
        style={{
          background:
            'linear-gradient(122deg, transparent 22%, rgba(255,255,255,0.16) 36%, rgba(191,219,254,0.08) 44%, transparent 56%)',
        }}
      />
      {/* Warm Golden Lantern Catchlight along outer glass edge */}
      <div
        className={`pointer-events-none absolute inset-y-0 w-1/2 ${
          side === 'left' ? 'left-0' : 'right-0'
        }`}
        style={{
          background:
            side === 'left'
              ? 'radial-gradient(circle at 0% 45%, rgba(251,191,36,0.16), transparent 72%)'
              : 'radial-gradient(circle at 100% 45%, rgba(251,191,36,0.16), transparent 72%)',
        }}
      />
    </div>
  );
}

function CasementWindowSash({
  side,
  isOpen,
}: {
  side: 'left' | 'right';
  isOpen: boolean;
}) {
  const isLeft = side === 'left';

  const woodRailStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(165deg, rgba(36, 22, 14, 0.72) 0%, rgba(15, 23, 42, 0.35) 100%), url(${woodTextureImg})`,
    backgroundSize: 'cover',
    backgroundPosition: isLeft ? 'left center' : 'right center',
  };

  const renderMuntinGrid = () => (
    <div className="relative flex-1 grid grid-cols-2 grid-rows-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[#1e120a]/90 border border-amber-950/90 shadow-[inset_0_3px_8px_rgba(0,0,0,0.85)]">
      {/* 6 Individual Beveled Glass Panes per Casement Sash */}
      {Array.from({ length: 6 }).map((_, idx) => (
        <GlassPane key={idx} side={side} />
      ))}
    </div>
  );

  return (
    <div
      className="relative w-1/2 h-full"
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: isLeft ? 'left center' : 'right center',
        transform: isOpen
          ? isLeft
            ? 'rotateY(-108deg)'
            : 'rotateY(108deg)'
          : 'rotateY(0deg)',
        transition: 'transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* FRONT WOOD & GLASS CASEMENT SASH */}
      <div
        className="absolute inset-0 flex flex-col p-2 sm:p-2.5 border border-amber-500/25 select-none"
        style={{
          ...woodRailStyle,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          boxShadow: isLeft
            ? 'inset -2px 0 8px rgba(0,0,0,0.8), inset 1px 1px 4px rgba(251,191,36,0.16)'
            : 'inset 2px 0 8px rgba(0,0,0,0.8), inset -1px 1px 4px rgba(251,191,36,0.16)',
        }}
      >
        {/* Top & Bottom Brass Window Hinges */}
        {[16, 78].map((topPct) => (
          <div
            key={topPct}
            style={{ top: `${topPct}%` }}
            className={`absolute ${
              isLeft ? 'left-0 rounded-r-sm' : 'right-0 rounded-l-sm'
            } w-2.5 sm:w-3 h-6 sm:h-8 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-950 border border-amber-300/50 shadow-md z-20 flex flex-col justify-around items-center py-1`}
          >
            <span className="w-1 h-1 rounded-full bg-amber-950/90" />
            <span className="w-1 h-1 rounded-full bg-amber-950/90" />
          </div>
        ))}

        {/* Divided-Light 6-Pane Glass Window Grid */}
        {renderMuntinGrid()}

        {/* Bottom Solid Carved Window Kick-Rail */}
        <div
          className="mt-1.5 sm:mt-2 h-[15%] rounded-[2px] border border-amber-500/25 flex items-center justify-center px-2"
          style={{
            ...woodRailStyle,
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(251,191,36,0.14)',
          }}
        >
          <div className="w-full h-1/2 border border-amber-400/20 rounded-[1px]" />
        </div>

        {/* Center Astragal Wood Strip */}
        {isLeft && (
          <div className="absolute top-0 bottom-0 -right-1 w-2 bg-gradient-to-r from-[#1e120a] via-[#4a2b16] to-[#1a0f08] border-x border-amber-500/25 z-20 shadow-md" />
        )}

        {/* Realistic Brass Window Casement Latch & Handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center ${
            isLeft ? 'right-1 sm:right-1.5' : 'left-1 sm:left-1.5'
          }`}
        >
          <div className="w-2 sm:w-2.5 h-8 sm:h-10 rounded-full bg-gradient-to-b from-amber-200 via-amber-500 to-amber-900 border border-amber-300/60 shadow-[0_2px_8px_rgba(0,0,0,0.85)] flex items-center justify-center">
            <div
              className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-full bg-gradient-to-b from-amber-100 to-amber-500 border border-amber-900/50 shadow-sm transition-transform duration-300 origin-top"
              style={{
                transform: isOpen ? 'rotate(-55deg) translateY(2px)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>
      </div>

      {/* BACK FACE OF WOOD & GLASS SASH (Visible when swung > 90deg) */}
      <div
        className="absolute inset-0 flex flex-col p-2 sm:p-2.5 border border-amber-500/25"
        style={{
          ...woodRailStyle,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg) translateZ(7px)',
          boxShadow: 'inset 0 0 14px rgba(0,0,0,0.7)',
        }}
      >
        {renderMuntinGrid()}
        <div className="mt-1.5 sm:mt-2 h-[15%] border border-amber-950/90 bg-black/30 rounded-[2px]" />
      </div>

      {/* 3D WOOD THICKNESS EDGE */}
      <div
        className="absolute top-0 bottom-0 w-[7px]"
        style={{
          background: 'linear-gradient(to right, #26140a, #4e2d18, #1c0e06)',
          right: isLeft ? 0 : undefined,
          left: isLeft ? undefined : 0,
          transformOrigin: isLeft ? 'right center' : 'left center',
          transform: isLeft ? 'rotateY(-90deg)' : 'rotateY(90deg)',
        }}
      />
    </div>
  );
}

export function MagicWoodenWindow({ soundEnabled }: MagicWoodenWindowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scenicImgRef = useRef<HTMLImageElement | null>(null);
  const sunRaysRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    playWindowToggleSound(next, soundEnabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  // Rich Dark Espresso-Walnut Wood harmonized with Dark Navy & Golden Accents
  const frameWoodStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, rgba(32, 20, 14, 0.72) 0%, rgba(12, 18, 36, 0.55) 100%), url(${woodTextureImg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <section className="w-full mt-12 mb-10 px-5 sm:px-10 flex justify-center relative">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Interactive Wooden Window"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-[500px] cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-xl select-none"
      >
        {/* Subtle Warm Golden Rim Halo */}
        <div
          className={`pointer-events-none absolute -inset-6 sm:-inset-10 rounded-full transition-opacity duration-1000 -z-10 ${
            isOpen ? 'opacity-90' : 'opacity-55'
          }`}
          style={{
            background: isOpen
              ? 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(245,158,11,0.08) 46%, transparent 74%)'
              : 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 72%)',
            filter: 'blur(24px)',
          }}
        />

        {/* Climbing Botanical Vines & Realistic Flowers */}
        <NaturalBotanicalSurround />

        {/* Subtle Glowing & Fading Fireflies around the Window Vines & Lanterns */}
        <div className="pointer-events-none absolute -inset-6 sm:-inset-10 z-50" aria-hidden="true">
          {[
            { top: '8%', left: '12%', delay: '0s', duration: '5.8s' },
            { top: '16%', right: '14%', delay: '1.4s', duration: '6.6s' },
            { top: '34%', left: '2%', delay: '2.7s', duration: '7.1s' },
            { top: '42%', right: '3%', delay: '0.8s', duration: '6.2s' },
            { top: '64%', left: '5%', delay: '3.6s', duration: '5.9s' },
            { top: '70%', right: '6%', delay: '2.1s', duration: '6.8s' },
            { bottom: '10%', left: '18%', delay: '1.1s', duration: '6.4s' },
            { bottom: '12%', right: '19%', delay: '4.0s', duration: '7.0s' },
            { top: '4%', left: '48%', delay: '2.9s', duration: '6.1s' },
          ].map((f, idx) => (
            <span
              key={idx}
              style={{
                top: f.top,
                bottom: f.bottom,
                left: f.left,
                right: f.right,
                animationDelay: f.delay,
                animationDuration: f.duration,
              }}
              className="absolute w-2 h-2 rounded-full bg-amber-300 ring-1 ring-amber-400/50 shadow-[0_0_10px_3px_rgba(245,158,11,0.65)] animate-firefly"
            />
          ))}
        </div>

        {/* Two Warm Golden Lanterns */}
        <WarmGoldenLantern side="left" isOpen={isOpen} />
        <WarmGoldenLantern side="right" isOpen={isOpen} />

        {/* TOP CARVED ARCHITECTURAL WINDOW CORNICE */}
        <div className="relative mx-auto w-[104%] -ml-[2%] z-20">
          <div
            className="h-5 sm:h-6 rounded-t-md border-t border-x border-amber-400/35 shadow-[0_-6px_20px_rgba(6,12,28,0.85)] relative overflow-hidden"
            style={frameWoodStyle}
          >
            <div className="absolute inset-x-3 top-1.5 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
          </div>
          <div
            className="h-2.5 sm:h-3 mx-1.5 border-x border-b border-amber-950/90 shadow-lg"
            style={frameWoodStyle}
          />
        </div>

        {/* MAIN OUTER WOODEN WINDOW FRAME */}
        <div
          className="relative p-3 sm:p-4.5 rounded-b-sm border-x-2 border-b-2 border-amber-500/25"
          style={{
            ...frameWoodStyle,
            boxShadow:
              '0 26px 56px rgba(4, 9, 24, 0.92), inset 0 2px 6px rgba(251,191,36,0.18), inset 0 -6px 14px rgba(0,0,0,0.8)',
          }}
        >
          {/* Inner Navy-Trimmed Brass Glazing Frame */}
          <div className="p-1 sm:p-1.5 bg-[#0c1324] rounded-[2px] border border-amber-400/30 shadow-[inset_0_4px_14px_rgba(0,0,0,0.92)]">
            {/* WINDOW APERTURE WITH 3D PERSPECTIVE */}
            <div
              className="relative w-full aspect-[4/3] bg-[#080f20] overflow-visible"
              style={{ perspective: '1700px' }}
            >
              {/* LIVING NATURE SCENERY (VISIBLE BEHIND GLASS & REVEALED WHEN OPEN) */}
              <div className="absolute inset-0 overflow-hidden rounded-[2px]">
                <img
                  ref={scenicImgRef}
                  src={scenicVistaImg}
                  alt="White marble mosque, minarets, clear pond with reflections, flower gardens, and golden sunset"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover object-center transition-transform duration-[1300ms] ease-out ${
                    isOpen ? 'scale-[1.02]' : 'scale-100'
                  }`}
                />

                {/* Live 60fps Canvas: Day/Night Sky, Moving Clouds, Fish, Birds, Water Ripples, Fireflies */}
                <LivingNatureCanvas
                  isOpen={isOpen}
                  imgRef={scenicImgRef}
                  sunRaysRef={sunRaysRef}
                />

                {/* Cinematic Sunset Rays & Inner Shadow Depth */}
                <div
                  ref={sunRaysRef}
                  className="pointer-events-none absolute inset-0 z-20"
                >
                  <div
                    className="absolute inset-0 animate-sunbeam-pulse"
                    style={{
                      background:
                        'linear-gradient(235deg, rgba(253,224,71,0.18) 0%, rgba(245,158,11,0.06) 40%, transparent 66%)',
                    }}
                  />
                </div>

                {/* Recessed Architectural Window Frame Shadow */}
                <div
                  className="pointer-events-none absolute inset-0 z-20"
                  style={{
                    boxShadow:
                      'inset 0 12px 24px rgba(5,10,24,0.72), inset 0 -10px 20px rgba(5,10,24,0.5), inset 10px 0 20px rgba(5,10,24,0.5), inset -10px 0 20px rgba(5,10,24,0.5)',
                  }}
                />
              </div>

              {/* TWO 3D HINGED WOOD-AND-GLASS CASEMENT SASHES */}
              <div
                className="absolute inset-0 z-30 flex"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <CasementWindowSash side="left" isOpen={isOpen} />
                <CasementWindowSash side="right" isOpen={isOpen} />
              </div>
            </div>
          </div>
        </div>

        {/* PROTRUDING 3D ARCHITECTURAL WOODEN WINDOW SILL */}
        <div className="relative mx-auto w-[107%] -ml-[3.5%] z-30">
          {/* Golden Sunset Light Spill onto Window Sill when Open */}
          <div
            className={`pointer-events-none absolute inset-x-10 -top-1.5 h-4 rounded-full transition-opacity duration-1000 ${
              isOpen ? 'opacity-85' : 'opacity-0'
            }`}
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(251,191,36,0.5) 0%, transparent 75%)',
              filter: 'blur(5px)',
            }}
          />
          <div
            className="h-4 sm:h-5 rounded-b-md border-x border-b border-t border-t-amber-300/35 border-amber-950/90 shadow-[0_16px_32px_rgba(4,8,22,0.95)] relative overflow-hidden"
            style={frameWoodStyle}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
          </div>
          <div
            className="h-2 sm:h-2.5 mx-3 rounded-b-md border-x border-b border-slate-900/90 shadow-lg opacity-95"
            style={frameWoodStyle}
          />
        </div>
      </div>
    </section>
  );
}
