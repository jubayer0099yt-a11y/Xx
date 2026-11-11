import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Heart, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playKittySound, playTapSound } from '../utils/sound';

interface PlayfulCatProps {
  themeConfig: ThemeConfig;
  lang?: Language;
  soundEnabled: boolean;
}

// Particle for happy purr hearts & playful sparkles
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'heart' | 'sparkle';
}

type CatState =
  | 'idle_sit'
  | 'walk'
  | 'run'
  | 'pounce_prep'
  | 'hop'
  | 'bat'
  | 'roll_play'
  | 'rest';

export function PlayfulCat({ themeConfig, lang = 'bn', soundEnabled }: PlayfulCatProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const animFrameRef = useRef<number | null>(null);

  const [activeMood, setActiveMood] = useState<string>('খেলছে');
  const [internalSound, setInternalSound] = useState<boolean>(soundEnabled);

  // Sync sound prop
  useEffect(() => {
    setInternalSound(soundEnabled);
  }, [soundEnabled]);

  const isLight = themeConfig.isLight;

  // Cat & Ball Simulation State in Refs (for zero React re-render overhead at 60 FPS)
  const sim = useRef({
    // Virtual resolution (CSS scales this seamlessly)
    width: 560,
    height: 250,
    floorY: 200,

    // White Cat State
    cat: {
      x: 180,
      y: 200, // on floor
      facing: 1 as 1 | -1, // 1: facing right, -1: facing left
      state: 'idle_sit' as CatState,
      stateTime: 0,
      stateDuration: 3.5,

      // Articulation & Animation Parameters
      headTilt: 0,
      headTurn: 0, // looking angle
      blinkProgress: 0, // 0 = open, 1 = closed
      blinkTimer: 2.5,
      earTwitchL: 0,
      earTwitchR: 0,
      tailAngle: 0,
      tailSegments: [0, 0, 0, 0, 0], // harmonic wave
      pawLProgress: 0, // 0 = down, 1 = swiping
      pawRProgress: 0,
      legCycle: 0, // walking/running cycle
      hopY: 0, // height above floor during hops
      buttWiggle: 0, // wiggle before pounce
      rollAngle: 0, // when rolling on back
      breathePhase: 0,
      isHappyPurring: false,
      petCooldown: 0,
    },

    // Colorful Toy / Yarn Ball State
    ball: {
      x: 340,
      y: 200 - 15,
      radius: 15,
      vx: 0,
      vy: 0,
      angle: 0, // rotation as it rolls
      isDragging: false,
      yarnThread: [] as { x: number; y: number }[],
    },

    // Particles (hearts, sparkles)
    particles: [] as Particle[],

    // Pointer interaction
    dragStart: { x: 0, y: 0, time: 0 },
    lastFrameTime: performance.now(),
  });

  // Trigger playful interaction (fling ball or pet cat)
  const flingBall = useCallback((forceX?: number, forceY?: number) => {
    const s = sim.current;
    s.ball.vx = forceX !== undefined ? forceX : (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 4);
    s.ball.vy = forceY !== undefined ? forceY : -(3 + Math.random() * 3);
    s.cat.state = 'run';
    s.cat.stateTime = 0;
    s.cat.stateDuration = 3.0;
    playKittySound(internalSound);

    // Add sparkles
    for (let i = 0; i < 5; i++) {
      s.particles.push({
        x: s.ball.x,
        y: s.ball.y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        life: 0,
        maxLife: 35,
        size: 5 + Math.random() * 4,
        color: ['#EC4899', '#38BDF8', '#FACC15', '#A855F7'][Math.floor(Math.random() * 4)],
        type: 'sparkle',
      });
    }
  }, [internalSound]);

  const petCat = useCallback(() => {
    const s = sim.current;
    s.cat.state = 'rest';
    s.cat.stateTime = 0;
    s.cat.stateDuration = 4.0;
    s.cat.isHappyPurring = true;
    playKittySound(internalSound);

    // Add floating hearts
    for (let i = 0; i < 4; i++) {
      s.particles.push({
        x: s.cat.x + (Math.random() - 0.5) * 40,
        y: s.cat.y - 45 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.2 - Math.random() * 1.2,
        life: 0,
        maxLife: 45,
        size: 9 + Math.random() * 4,
        color: '#F43F5E',
        type: 'heart',
      });
    }
  }, [internalSound]);

  // Main Simulation & Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Resize canvas with devicePixelRatio for Retina crispness
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const displayWidth = rect.width;
      const displayHeight = Math.min(260, Math.max(220, rect.width * 0.44));

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      sim.current.width = displayWidth;
      sim.current.height = displayHeight;
      sim.current.floorY = displayHeight - 42;
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);

    // IntersectionObserver to pause loop when scrolled off-screen
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    }, { threshold: 0.1 });
    if (containerRef.current) observer.observe(containerRef.current);

    // Tab visibility listener to save battery
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Tick
    const render = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - sim.current.lastFrameTime) / 1000, 0.08); // clamped delta
      sim.current.lastFrameTime = now;

      if (isVisibleRef.current) {
        updateSimulation(dt);
        drawScene(ctx, canvas);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update physical positions & behaviors
  const updateSimulation = (dt: number) => {
    const s = sim.current;
    const cat = s.cat;
    const ball = s.ball;

    cat.stateTime += dt;
    cat.breathePhase += dt * 3.2;

    // 1. Blinking System
    cat.blinkTimer -= dt;
    if (cat.blinkTimer <= 0) {
      cat.blinkProgress = Math.sin((cat.blinkTimer / -0.2) * Math.PI);
      if (cat.blinkTimer < -0.2) {
        cat.blinkProgress = 0;
        cat.blinkTimer = 2.5 + Math.random() * 3.5;
      }
    }

    // 2. Ears Twitch Randomly
    if (Math.random() < 0.02) {
      cat.earTwitchL = (Math.random() - 0.5) * 0.28;
    } else {
      cat.earTwitchL *= 0.85;
    }
    if (Math.random() < 0.02) {
      cat.earTwitchR = (Math.random() - 0.5) * 0.28;
    } else {
      cat.earTwitchR *= 0.85;
    }

    // 3. Ball Physics (Friction, Rolling, Bouncing)
    if (!ball.isDragging) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Gravity if in air
      if (ball.y < s.floorY - ball.radius) {
        ball.vy += 0.35;
      } else {
        ball.y = s.floorY - ball.radius;
        if (Math.abs(ball.vy) > 1) {
          ball.vy = -ball.vy * 0.55;
        } else {
          ball.vy = 0;
        }
      }

      // Ground friction
      ball.vx *= 0.985;
      if (Math.abs(ball.vx) < 0.05) ball.vx = 0;

      // Wall bounce
      const minX = ball.radius + 15;
      const maxX = s.width - ball.radius - 15;
      if (ball.x < minX) {
        ball.x = minX;
        ball.vx = -ball.vx * 0.75;
      } else if (ball.x > maxX) {
        ball.x = maxX;
        ball.vx = -ball.vx * 0.75;
      }

      // Ball rotation angle based on rolling
      ball.angle += ball.vx / ball.radius;

      // Trailing yarn thread history
      if (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5) {
        ball.yarnThread.unshift({ x: ball.x, y: ball.y + 6 });
        if (ball.yarnThread.length > 14) ball.yarnThread.pop();
      } else if (ball.yarnThread.length > 6) {
        ball.yarnThread.pop();
      }
    }

    // Distance to ball
    const dx = ball.x - cat.x;
    const distToBall = Math.abs(dx);

    // Determine facing direction
    if (distToBall > 30 && cat.state !== 'roll_play' && cat.state !== 'rest') {
      cat.facing = dx > 0 ? 1 : -1;
    }

    // Head orientation tracks ball
    const lookAngle = Math.atan2(ball.y - (cat.y - 45), ball.x - cat.x);
    cat.headTurn = (lookAngle * 0.35) * cat.facing;
    cat.headTilt = Math.sin(cat.breathePhase * 0.5) * 0.06;

    // Tail waving harmonic wave
    const tailBaseWave = Math.sin(cat.breathePhase * 1.5) * 0.45;
    cat.tailAngle = tailBaseWave;
    for (let i = 0; i < cat.tailSegments.length; i++) {
      const delay = (i + 1) * 0.35;
      cat.tailSegments[i] = Math.sin(cat.breathePhase * 1.5 - delay) * (0.35 + i * 0.12);
    }

    // 4. Autonomous State Machine (Smooth transitions)
    switch (cat.state) {
      case 'idle_sit':
        cat.hopY = 0;
        cat.buttWiggle = 0;
        cat.rollAngle = 0;
        cat.pawLProgress = 0;
        cat.pawRProgress = 0;

        // Transition logic
        if (Math.abs(ball.vx) > 1.2) {
          cat.state = 'run';
          cat.stateTime = 0;
          cat.stateDuration = 2.5;
        } else if (cat.stateTime > cat.stateDuration) {
          const nextChoices: CatState[] = ['walk', 'pounce_prep', 'rest'];
          cat.state = nextChoices[Math.floor(Math.random() * nextChoices.length)];
          cat.stateTime = 0;
          cat.stateDuration = 2.5 + Math.random() * 3.5;
        }
        break;

      case 'walk':
        cat.hopY = 0;
        cat.legCycle += dt * 8;
        // Walk towards ball
        const walkSpeed = 55 * dt * cat.facing;
        cat.x += walkSpeed;

        if (distToBall < 65) {
          cat.state = 'bat';
          cat.stateTime = 0;
          cat.stateDuration = 1.0;
        } else if (Math.abs(ball.vx) > 2) {
          cat.state = 'run';
          cat.stateTime = 0;
          cat.stateDuration = 2.5;
        } else if (cat.stateTime > cat.stateDuration) {
          cat.state = 'idle_sit';
          cat.stateTime = 0;
          cat.stateDuration = 2.0;
        }
        break;

      case 'run':
        cat.legCycle += dt * 14;
        const runSpeed = 120 * dt * cat.facing;
        cat.x += runSpeed;

        if (distToBall < 55) {
          cat.state = 'bat';
          cat.stateTime = 0;
          cat.stateDuration = 0.9;
        } else if (cat.stateTime > cat.stateDuration) {
          cat.state = 'hop';
          cat.stateTime = 0;
          cat.stateDuration = 0.8;
        }
        break;

      case 'pounce_prep':
        // Classic cat butt-wiggle before jumping!
        cat.buttWiggle = Math.sin(cat.stateTime * 18) * 6;
        cat.headTilt = 0.15;
        if (cat.stateTime > 1.2) {
          cat.state = 'hop';
          cat.stateTime = 0;
          cat.stateDuration = 0.85;
          cat.buttWiggle = 0;
        }
        break;

      case 'hop':
        // Parabolic jump arc
        const hopProgress = Math.min(cat.stateTime / cat.stateDuration, 1);
        cat.hopY = -Math.sin(hopProgress * Math.PI) * 32;
        cat.x += cat.facing * 90 * dt;
        cat.pawLProgress = Math.sin(hopProgress * Math.PI);
        cat.pawRProgress = Math.sin(hopProgress * Math.PI);

        if (hopProgress >= 1) {
          cat.hopY = 0;
          if (distToBall < 50) {
            cat.state = 'bat';
          } else {
            cat.state = 'roll_play';
          }
          cat.stateTime = 0;
          cat.stateDuration = 1.6;
        }
        break;

      case 'bat':
        // Reaching out paw and swatting the ball!
        const batPhase = Math.sin((cat.stateTime / cat.stateDuration) * Math.PI);
        cat.pawRProgress = batPhase * 1.4;

        if (cat.stateTime > 0.35 && distToBall < 65 && Math.abs(ball.vx) < 1.0) {
          // Impact! Send ball flying!
          ball.vx = cat.facing * (4.5 + Math.random() * 4.5);
          ball.vy = -(2.5 + Math.random() * 2);
          playKittySound(internalSound);

          // Sparkles on hit
          for (let i = 0; i < 4; i++) {
            s.particles.push({
              x: ball.x,
              y: ball.y,
              vx: (Math.random() - 0.5) * 2.5 + cat.facing * 1.5,
              vy: -1 - Math.random() * 2,
              life: 0,
              maxLife: 30,
              size: 4 + Math.random() * 3,
              color: '#38BDF8',
              type: 'sparkle',
            });
          }
        }

        if (cat.stateTime > cat.stateDuration) {
          // Immediately chase the rolling ball!
          cat.state = 'run';
          cat.stateTime = 0;
          cat.stateDuration = 2.5;
        }
        break;

      case 'roll_play':
        // Rolling playfully on side/back
        cat.rollAngle = Math.sin(cat.stateTime * 4) * 0.45;
        cat.legCycle += dt * 6;
        cat.pawLProgress = 0.5 + Math.sin(cat.stateTime * 6) * 0.4;
        cat.pawRProgress = 0.5 + Math.cos(cat.stateTime * 6) * 0.4;

        if (distToBall < 45 && Math.random() < 0.08) {
          ball.vx = (Math.random() - 0.5) * 5;
          ball.vy = -2.5;
        }

        if (cat.stateTime > cat.stateDuration) {
          cat.rollAngle = 0;
          cat.state = 'rest';
          cat.stateTime = 0;
          cat.stateDuration = 4.0;
        }
        break;

      case 'rest':
        // Peaceful sit & purr with closed happy eyes
        cat.hopY = 0;
        cat.rollAngle = 0;
        cat.pawLProgress = 0;
        cat.pawRProgress = 0;
        cat.blinkProgress = 0.95; // peaceful closed eyes
        cat.tailAngle = Math.sin(cat.breathePhase * 0.8) * 0.25;

        // Emit gentle hearts while resting/purring
        if (Math.random() < 0.035) {
          s.particles.push({
            x: cat.x + (Math.random() - 0.5) * 35,
            y: cat.y - 45 - Math.random() * 15,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.9 - Math.random() * 0.8,
            life: 0,
            maxLife: 55,
            size: 8 + Math.random() * 3,
            color: '#FB7185',
            type: 'heart',
          });
        }

        // Auto restart playing after resting!
        if (cat.stateTime > cat.stateDuration) {
          cat.blinkProgress = 0;
          cat.state = 'walk';
          cat.stateTime = 0;
          cat.stateDuration = 3.0;
        }
        break;
    }

    // Keep cat on screen within bounds
    const minCatX = 65;
    const maxCatX = s.width - 65;
    if (cat.x < minCatX) {
      cat.x = minCatX;
      cat.facing = 1;
    } else if (cat.x > maxCatX) {
      cat.x = maxCatX;
      cat.facing = -1;
    }

    // Update Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        s.particles.splice(i, 1);
      }
    }

    // Keep mood text sync
    const moodMap: Record<CatState, { bn: string; en: string }> = {
      idle_sit: { bn: 'তাকিয়ে দেখছে', en: 'Watching' },
      walk: { bn: 'হেঁটে আসছে', en: 'Strolling' },
      run: { bn: 'বলের পেছনে ছুটছে', en: 'Chasing Ball' },
      pounce_prep: { bn: 'লাফ দেওয়ার প্রস্তুতি', en: 'Ready to Pounce' },
      hop: { bn: 'লাফ দিচ্ছে!', en: 'Pouncing!' },
      bat: { bn: 'বল ঠেলছে', en: 'Batting Ball' },
      roll_play: { bn: 'গড়িয়ে খেলছে', en: 'Rolling & Playing' },
      rest: { bn: 'শান্ত হয়ে বিশ্রাম নিচ্ছে', en: 'Resting & Purring' },
    };

    const currentText = lang === 'bn' ? moodMap[cat.state]?.bn : moodMap[cat.state]?.en;
    if (currentText && currentText !== activeMood) {
      setActiveMood(currentText);
    }
  };

  // Draw the entire scene with crisp vector 2D art on canvas
  const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const s = sim.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, s.width, s.height);

    // 1. Subtle floor shadow line
    const floorY = s.floorY;
    const isDark = !isLight;

    // Floor horizon gradient
    const floorGrad = ctx.createLinearGradient(0, floorY - 5, 0, s.height);
    if (isDark) {
      floorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
      floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    } else {
      floorGrad.addColorStop(0, 'rgba(0, 0, 0, 0.03)');
      floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0.07)');
    }
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, s.width, s.height - floorY);

    // Floor hairline accent
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, floorY);
    ctx.lineTo(s.width - 15, floorY);
    ctx.stroke();

    // 2. Draw Ball Shadow
    const ball = s.ball;
    const ballDistFromFloor = Math.max(0, floorY - (ball.y + ball.radius));
    const shadowScale = Math.max(0.3, 1 - ballDistFromFloor / 80);
    const shadowAlpha = (0.28 * shadowScale);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ball.x, floorY + 1, ball.radius * shadowScale, ball.radius * 0.35 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? `rgba(0, 0, 0, ${shadowAlpha * 1.5})` : `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.fill();
    ctx.restore();

    // 3. Draw Cat Shadow
    const cat = s.cat;
    const catHopOffset = -cat.hopY;
    const catShadowScale = Math.max(0.4, 1 - catHopOffset / 60);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cat.x, floorY + 2, 38 * catShadowScale, 12 * catShadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.16)';
    ctx.fill();
    ctx.restore();

    // 4. Draw Trailing Yarn String
    if (ball.yarnThread.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#EC4899';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ball.yarnThread[0].x, ball.yarnThread[0].y);
      for (let i = 1; i < ball.yarnThread.length; i++) {
        const pt = ball.yarnThread[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw the Colorful Ball
    drawToyBall(ctx, ball.x, ball.y, ball.radius, ball.angle);

    // 6. Draw Fluffy White Cat
    drawFluffyWhiteCat(ctx, cat, floorY);

    // 7. Draw Floating Particles (Hearts & Sparkles)
    for (const p of s.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;

      if (p.type === 'heart') {
        drawHeart(ctx, p.x, p.y, p.size);
      } else {
        drawStar(ctx, p.x, p.y, p.size * 0.6);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  // Draw Vibrant Striped Yarn / Toy Ball
  const drawToyBall = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Clip to ball sphere
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // Base bright background
    ctx.fillStyle = '#EC4899'; // vivid pink
    ctx.fill();

    // Striped ribbons: Cyan, Gold, Purple
    const colors = ['#38BDF8', '#FACC15', '#A855F7', '#10B981'];
    const stripeWidth = r * 0.55;
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = colors[(i + 4) % colors.length];
      ctx.beginPath();
      ctx.ellipse(i * stripeWidth, 0, stripeWidth * 0.45, r * 1.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Yarn texture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0.8, Math.PI * 2);
    ctx.stroke();

    // 3D Shading Spherical Highlight & Ambient Shadow
    const sphereGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    sphereGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw Fluffy White Cat with Articulated Limbs, Tail & Expressive Blue Eyes
  const drawFluffyWhiteCat = (
    ctx: CanvasRenderingContext2D,
    cat: typeof sim.current.cat,
    floorY: number
  ) => {
    ctx.save();

    // Cat center
    const posX = cat.x;
    const posY = floorY + cat.hopY;

    ctx.translate(posX, posY);
    ctx.scale(cat.facing, 1); // Flip horizontally when looking left

    if (cat.rollAngle !== 0) {
      ctx.rotate(cat.rollAngle);
    }

    // Colors
    const furWhite = '#FFFFFF';
    const furShade = '#E2E8F0';
    const furDarkShade = '#CBD5E1';
    const earPink = '#FDA4AF';
    const earDeepPink = '#F43F5E';
    const pawPadPink = '#FB7185';
    const nosePink = '#FB7185';
    const eyeSkyBlue = '#38BDF8';
    const eyeDeepBlue = '#0284C7';

    // 1. TAIL (multi-segment organic spline)
    ctx.save();
    ctx.translate(-26, -18); // Tail root at lower back
    ctx.strokeStyle = furWhite;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, 0);

    let curTailX = 0;
    let curTailY = 0;
    const segLength = 12;

    for (let i = 0; i < cat.tailSegments.length; i++) {
      const segAngle = Math.PI * 0.65 + cat.tailSegments[i] * 0.85;
      curTailX -= Math.cos(segAngle) * segLength;
      curTailY -= Math.sin(segAngle) * segLength;
      ctx.lineTo(curTailX, curTailY);
    }
    ctx.stroke();

    // Soft tail tip
    ctx.fillStyle = furShade;
    ctx.beginPath();
    ctx.arc(curTailX, curTailY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. HIND LEGS & HAUNCHES (when sitting vs walking/running)
    if (cat.state === 'idle_sit' || cat.state === 'rest') {
      // Sitting rounded haunch
      ctx.fillStyle = furWhite;
      ctx.beginPath();
      ctx.ellipse(-16, -12, 16, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Hind foot with toe beans
      ctx.fillStyle = furShade;
      ctx.beginPath();
      ctx.ellipse(-14, -2, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Active hind leg cycling
      const legSin = Math.sin(cat.legCycle);
      ctx.fillStyle = furWhite;
      ctx.beginPath();
      ctx.ellipse(-16 + legSin * 8, -6, 9, 13, legSin * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Hind paw pad
      ctx.fillStyle = pawPadPink;
      ctx.beginPath();
      ctx.arc(-16 + legSin * 8, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. FLUFFY BODY (with subtle breathing squash/stretch)
    const breathe = 1 + Math.sin(cat.breathePhase) * 0.035;
    ctx.save();
    ctx.translate(cat.buttWiggle, 0);
    ctx.scale(1, breathe);

    // Body Gradient
    const bodyGrad = ctx.createRadialGradient(2, -26, 8, -4, -20, 36);
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.75, '#F8FAFC');
    bodyGrad.addColorStop(1, furShade);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(-4, -24, 25, 20, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Soft side fur tufts
    ctx.fillStyle = furWhite;
    ctx.beginPath();
    ctx.moveTo(-24, -26);
    ctx.lineTo(-30, -22);
    ctx.lineTo(-24, -18);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // end body

    // 4. FRONT LEGS / PAWS (articulated)
    // Left Paw (background paw)
    ctx.save();
    ctx.fillStyle = furShade;
    const pawLOffset = cat.pawLProgress * 22;
    const walkL = cat.state === 'walk' || cat.state === 'run' ? Math.cos(cat.legCycle) * 10 : 0;
    ctx.beginPath();
    ctx.ellipse(8 + walkL, -10 - pawLOffset * 0.5, 7, 13, 0.15 - pawLOffset * 0.03, 0, Math.PI * 2);
    ctx.fill();
    // Paw foot
    ctx.beginPath();
    ctx.ellipse(10 + walkL, -1 - pawLOffset * 0.8, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Paw (foreground paw that swats and bats!)
    ctx.save();
    ctx.fillStyle = furWhite;
    const pawROffset = cat.pawRProgress * 26;
    const walkR = cat.state === 'walk' || cat.state === 'run' ? -Math.cos(cat.legCycle) * 10 : 0;
    ctx.beginPath();
    ctx.ellipse(18 + walkR + pawROffset * 0.7, -10 - pawROffset * 0.6, 7.5, 13, -0.15 + pawROffset * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Front paw foot with pink toe pads
    ctx.beginPath();
    ctx.ellipse(20 + walkR + pawROffset * 0.8, -1 - pawROffset * 0.9, 8.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute pink paw pad dots when raised
    if (pawROffset > 8) {
      ctx.fillStyle = pawPadPink;
      ctx.beginPath();
      ctx.ellipse(21 + walkR + pawROffset * 0.8, -1 - pawROffset * 0.9, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. CHEST FLUFF (sweet white ruff)
    ctx.fillStyle = furWhite;
    ctx.beginPath();
    ctx.moveTo(10, -42);
    ctx.quadraticCurveTo(24, -30, 16, -18);
    ctx.quadraticCurveTo(6, -26, 10, -42);
    ctx.fill();

    // 6. HEAD & EXPRESSION
    ctx.save();
    ctx.translate(14, -46); // Head anchor point
    ctx.rotate(cat.headTilt + cat.headTurn);

    // Head base circle
    const headGrad = ctx.createRadialGradient(2, -3, 6, 0, 0, 24);
    headGrad.addColorStop(0, '#FFFFFF');
    headGrad.addColorStop(0.8, '#F8FAFC');
    headGrad.addColorStop(1, furShade);

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy cheek fur spikes
    ctx.fillStyle = furWhite;
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-26, 9);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(26, 9);
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fill();

    // EARS
    // Left Ear
    ctx.save();
    ctx.translate(-11, -16);
    ctx.rotate(-0.25 + cat.earTwitchL);
    ctx.fillStyle = furWhite;
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(-2, -18);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();

    // Inner Left Ear Pink
    ctx.fillStyle = earPink;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-2, -14);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Ear
    ctx.save();
    ctx.translate(11, -16);
    ctx.rotate(0.25 + cat.earTwitchR);
    ctx.fillStyle = furWhite;
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(2, -18);
    ctx.lineTo(9, 4);
    ctx.closePath();
    ctx.fill();

    // Inner Right Ear Pink
    ctx.fillStyle = earPink;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(2, -14);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // EYES: Big, sparkling, crystal sky-blue!
    const drawEye = (centerX: number, isRight: boolean) => {
      ctx.save();
      const eyeH = 10 * (1 - cat.blinkProgress);

      if (cat.blinkProgress > 0.8) {
        // Closed sleepy/happy curved line (^_^)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, -1, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Open Eye Sclera & Iris
        ctx.beginPath();
        ctx.ellipse(centerX, -2, 6.5, eyeH, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Gorgeous Blue Iris Gradient
        const irisGrad = ctx.createRadialGradient(centerX, -2, 1, centerX, -2, 6);
        irisGrad.addColorStop(0, eyeSkyBlue);
        irisGrad.addColorStop(0.7, eyeDeepBlue);
        irisGrad.addColorStop(1, '#0369A1');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, -2, 5.2, eyeH * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark pupil
        const lookX = cat.facing * 1.2;
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(centerX + lookX, -2, 2.8, eyeH * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Sparkle Highlights (Anime eye shine!)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX + lookX - 1.8, -4, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX + lookX + 1.2, 0, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    drawEye(-7, false);
    drawEye(7, true);

    // NOSE: Cute soft pink triangle
    ctx.fillStyle = nosePink;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-2.8, 1.5);
    ctx.lineTo(2.8, 1.5);
    ctx.closePath();
    ctx.fill();

    // MOUTH: Classic sweet cat mouth (ω)
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-2.5, 6, 2.8, 0.1, Math.PI * 0.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(2.5, 6, 2.8, Math.PI * 0.15, Math.PI * 0.9);
    ctx.stroke();

    // WHISKERS: 3 graceful whisker lines on each side
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.0;

    // Left Whiskers
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-27, 2);
    ctx.moveTo(-10, 6);
    ctx.lineTo(-28, 6.5);
    ctx.moveTo(-10, 8);
    ctx.lineTo(-26, 11);
    ctx.stroke();

    // Right Whiskers
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(27, 2);
    ctx.moveTo(10, 6);
    ctx.lineTo(28, 6.5);
    ctx.moveTo(10, 8);
    ctx.lineTo(26, 11);
    ctx.stroke();

    // Soft Cheek Blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.22)';
    ctx.beginPath();
    ctx.ellipse(-12, 5, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(12, 5, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end head
    ctx.restore(); // end cat
  };

  // Helper: Draw vector heart
  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const d = size * 0.6;
    ctx.moveTo(0, d * 0.8);
    ctx.bezierCurveTo(-d * 1.2, -d * 0.4, -d * 0.8, -d * 1.2, 0, -d * 0.5);
    ctx.bezierCurveTo(d * 0.8, -d * 1.2, d * 1.2, -d * 0.4, 0, d * 0.8);
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw vector star/sparkle
  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();
    ctx.restore();
  };

  // Pointer / Touch Handlers for Interactive Play
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const s = sim.current;
    const distToBall = Math.hypot(clientX - s.ball.x, clientY - s.ball.y);
    const distToCat = Math.hypot(clientX - s.cat.x, clientY - (s.cat.y - 30));

    if (distToBall < s.ball.radius + 18) {
      // Pick up or fling ball
      s.ball.isDragging = true;
      s.dragStart = { x: clientX, y: clientY, time: performance.now() };
      s.ball.vx = 0;
      s.ball.vy = 0;
    } else if (distToCat < 45) {
      // Pet the cat!
      petCat();
    } else {
      // Click on floor: send ball rolling towards click
      const dir = clientX > s.ball.x ? 1 : -1;
      flingBall(dir * (4 + Math.random() * 4), -2);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.ball.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    s.ball.x = Math.max(s.ball.radius + 15, Math.min(s.width - s.ball.radius - 15, e.clientX - rect.left));
    s.ball.y = Math.min(s.floorY - s.ball.radius, e.clientY - rect.top);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.ball.isDragging) return;
    s.ball.isDragging = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const dt = Math.max(0.016, (now - s.dragStart.time) / 1000);
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Fling velocity
    const flingVx = (endX - s.dragStart.x) / (dt * 45);
    const flingVy = (endY - s.dragStart.y) / (dt * 45);

    s.ball.vx = Math.max(-12, Math.min(12, flingVx));
    s.ball.vy = Math.max(-10, Math.min(4, flingVy));

    // Cat gets excited and chases!
    s.cat.state = 'run';
    s.cat.stateTime = 0;
    s.cat.stateDuration = 3.0;
    playKittySound(internalSound);
  };

  return (
    <section
      aria-label="Playful Animated Cat Companion"
      className={`w-full rounded-3xl border p-4 sm:p-5 mt-6 shadow-xl backdrop-blur-md transition-all duration-300 relative overflow-hidden select-none ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50'
          : `${themeConfig.cardBg} ${themeConfig.cardBorder} text-neutral-200`
      }`}
    >
      {/* Top Header Bar: Title, Interactive Status & Control Shortcuts */}
      <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${
              isLight
                ? 'bg-rose-50 text-rose-500 border-rose-200'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-bold font-display tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'bn' ? 'জুবায়েরের আদুরে বিড়াল' : "Jubayer's Playful Cat"}
              </h3>
              {/* Animated Live Status Badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                {activeMood}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              {lang === 'bn'
                ? 'রঙিন বলে বা বিড়ালে ক্লিক করে খেলতে পারেন'
                : 'Tap or drag the colorful ball to play!'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Pet Cat & Toss Ball */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={petCat}
            title={lang === 'bn' ? 'বিড়ালকে আদর করুন' : 'Pet the cat'}
            className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 shadow-sm'
            }`}
          >
            <Heart className="w-3 h-3 fill-current text-rose-500" />
            <span className="hidden xs:inline">{lang === 'bn' ? 'আদর' : 'Pet'}</span>
          </button>

          <button
            type="button"
            onClick={() => flingBall()}
            title={lang === 'bn' ? 'বল ছুড়ে দিন' : 'Toss the ball'}
            className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden xs:inline">{lang === 'bn' ? 'বল ছুড়ুন' : 'Toss'}</span>
          </button>
        </div>
      </div>

      {/* 60 FPS Interactive Retina Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full relative rounded-2xl overflow-hidden border cursor-pointer ${
          isLight
            ? 'bg-gradient-to-b from-slate-50 to-slate-100/80 border-slate-200/80'
            : 'bg-gradient-to-b from-neutral-900/60 to-neutral-950/90 border-neutral-800/80'
        }`}
        style={{ minHeight: '220px' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none"
        />

        {/* Ambient bottom instructions */}
        <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-2 text-[10px] text-neutral-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            {lang === 'bn' ? 'তুলতুলে সাদা বিড়াল · নীল চোখ · রঙিন বল' : 'Fluffy White Cat · Blue Eyes · Colorful Ball'}
          </span>
        </div>
      </div>
    </section>
  );
}
