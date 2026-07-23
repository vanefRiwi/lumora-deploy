// ─── Intro View ───────────────────────────────────────────────────────────────
// Animated landing screen shown before the login. It presents the Lumora brand
// with a lightweight canvas particle animation (a "constellation" effect in the
// brand greens) and a "Get Started" button that takes the user to /login.
//
// Design notes:
//   - No external library is used. The particle effect is implemented with the
//     native Canvas API so the project keeps zero extra dependencies and no
//     build changes (a self-contained alternative to particles.js).
//   - Colors, fonts and radius come from the existing design system (theme.css),
//     so the intro matches the rest of the app.
//   - The animation loop is cancelled on navigation to avoid leaks.
//   - NEW: particles now react to the mouse — they drift away from the cursor
//     and the cursor itself gets linked to nearby particles, like a "hub" node.

import { navigate } from "../../router/router.js";

// Inline SVG icons (same graduation cap used across the app, plus a mic for
// the lumiVoice mention).
const icon = {
  cap: `<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  mic: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  arrow: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
};

export function introView() {
  return `
    <div class="js-intro relative min-h-screen overflow-hidden flex items-center justify-center"
         style="background: var(--primary); font-family: var(--font-family-body)">

      <!-- Particle canvas sits behind the content -->
      <canvas class="js-intro-canvas absolute inset-0 w-full h-full"></canvas>

      <!-- Soft decorative circles (match the login panel style) -->
      <div class="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none"></div>
      <div class="absolute -left-16 -bottom-20 w-72 h-72 rounded-full bg-white/5 pointer-events-none"></div>

      <!-- Foreground content -->
      <div class="js-intro-content relative z-10 text-center px-6 max-w-2xl">

        <!-- Logo badge with a soft pulsing glow behind it -->
        <div class="js-intro-item flex items-center justify-center mb-6">
          <div class="relative">
            <div class="intro-glow absolute inset-0 rounded-2xl"></div>
            <div class="relative w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white">
              ${icon.cap}
            </div>
          </div>
        </div>

        <!-- Brand name (Lumora) -->
        <h1 class="js-intro-item text-6xl sm:text-7xl font-bold text-white mb-4 tracking-tight"
            style="font-family: var(--font-family-display)">Lumora</h1>

        <!-- Tagline -->
        <p class="js-intro-item text-xl sm:text-2xl text-green-50 mb-3 font-medium"
           style="font-family: var(--font-family-display)">
          An e-learning website for everyone.
        </p>
        <!-- lumiVoice "lesson board": styled like an actual whiteboard pinned
             to the wall (frame, grid lines, pins), with the text typed out
             letter by letter and a mini audio equalizer suggesting lumiVoice
             is reading the lesson out loud as it "writes" -->
        <div class="js-intro-item mb-10">
          <div class="intro-board relative mx-auto max-w-lg text-left rounded-lg bg-[#fbfaf6] shadow-2xl overflow-hidden border-[6px] border-[#d8cfb8]">
            <!-- faint grid lines, like a whiteboard/graph background -->
            <div class="intro-board-grid absolute inset-0 pointer-events-none"></div>

            <!-- pins holding the "note" to the board -->
            <span class="intro-pin absolute -top-2.5 left-7 w-4 h-4 rounded-full bg-red-400"></span>
            <span class="intro-pin absolute -top-2.5 right-7 w-4 h-4 rounded-full bg-green-500"></span>

            <!-- label row -->
            <div class="relative flex items-center gap-2 px-5 pt-5 pb-1">
              <div class="intro-board-mic shrink-0 w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white">
                ${icon.mic}
              </div>
              <span class="text-xs font-bold tracking-wider text-green-700 uppercase">lumiVoice · Live Lesson</span>
            </div>

            <!-- body: text gets typed in by JS, see initIntro() -->
            <div class="relative px-5 pb-5">
              <p class="js-intro-typed text-sm sm:text-[15px] text-gray-700 leading-relaxed min-h-[4.5rem]"></p>
              <!-- mini equalizer bars, animated to feel like audio playback -->
              <div class="intro-eq flex items-end gap-[3px] mt-3 h-4">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
        <div class="js-intro-item">
          <button class="js-intro-start intro-pulse group relative inline-flex items-center gap-2.5 bg-white text-green-700 font-semibold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-2xl cursor-pointer overflow-hidden"
                  style="font-family: var(--font-family-display)">
            <!-- sheen that sweeps across the button on hover -->
            <span class="intro-sheen"></span>
            <span class="relative flex items-center gap-2.5">
              Get Started
              <span class="transition-transform group-hover:translate-x-1">${icon.arrow}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Scoped animation styles for the intro (entrance + particles) -->
    <style>
      /* Staggered fade-in for each content item */
      .js-intro-item {
        opacity: 0;
        transform: translateY(16px);
        animation: introUp 0.7s ease forwards;
      }
      .js-intro-item:nth-child(1) { animation-delay: 0.10s; }
      .js-intro-item:nth-child(2) { animation-delay: 0.25s; }
      .js-intro-item:nth-child(3) { animation-delay: 0.40s; }
      .js-intro-item:nth-child(4) { animation-delay: 0.55s; }
      .js-intro-item:nth-child(5) { animation-delay: 0.70s; }
      .js-intro-item:nth-child(6) { animation-delay: 0.85s; }
      @keyframes introUp {
        to { opacity: 1; transform: translateY(0); }
      }

      /* Soft pulsing glow behind the logo badge, to draw the eye first */
      .intro-glow {
        background: rgba(255, 255, 255, 0.45);
        filter: blur(22px);
        animation: introGlow 2.8s ease-in-out infinite;
      }
      @keyframes introGlow {
        0%, 100% { opacity: 0.35; transform: scale(0.95); }
        50% { opacity: 0.8; transform: scale(1.15); }
      }

      /* lumiVoice lesson board: a gentle float so it feels alive, not static */
      .intro-board { animation: introBoardFloat 5s ease-in-out infinite; }
      @keyframes introBoardFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      /* Faint grid lines behind the text, like a whiteboard/graph surface */
      .intro-board-grid {
        background-image:
          linear-gradient(rgba(22, 163, 74, 0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(22, 163, 74, 0.07) 1px, transparent 1px);
        background-size: 18px 18px;
      }

      /* Little pins holding the note to the board, with a soft dangling shadow */
      .intro-pin {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
        animation: introPinSway 3.4s ease-in-out infinite;
      }
      .intro-pin:last-of-type { animation-delay: 0.4s; }
      @keyframes introPinSway {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(4deg); }
      }

      /* Blinking caret at the end of the typed text */
      .intro-caret {
        display: inline-block;
        width: 2px;
        height: 1em;
        background: #16a34a;
        margin-left: 2px;
        vertical-align: middle;
        animation: introCaretBlink 0.8s steps(1) infinite;
      }
      @keyframes introCaretBlink {
        50% { opacity: 0; }
      }

      /* Mic icon inside the board: a soft breathing pulse */
      .intro-board-mic { animation: introMicPulse 2.2s ease-in-out infinite; }
      @keyframes introMicPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
        50% { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(22,163,74,0); }
      }

      /* Mini audio equalizer: five bars bouncing at slightly different speeds,
         suggesting lumiVoice is actively reading the lesson out loud */
      .intro-eq span {
        width: 3px;
        background: #16a34a;
        border-radius: 2px;
        transform-origin: bottom;
        animation: introEq 1s ease-in-out infinite;
      }
      .intro-eq span:nth-child(1) { height: 30%; animation-delay: 0s;    animation-duration: 0.9s; }
      .intro-eq span:nth-child(2) { height: 60%; animation-delay: 0.15s; animation-duration: 1.1s; }
      .intro-eq span:nth-child(3) { height: 100%; animation-delay: 0.3s;  animation-duration: 0.8s; }
      .intro-eq span:nth-child(4) { height: 50%; animation-delay: 0.1s;  animation-duration: 1.2s; }
      .intro-eq span:nth-child(5) { height: 75%; animation-delay: 0.25s; animation-duration: 1s; }
      @keyframes introEq {
        0%, 100% { transform: scaleY(0.4); }
        50% { transform: scaleY(1); }
      }

      /* Get Started button: soft pulsing ring to invite the click,
         plus a light sheen that sweeps across on hover */
      .intro-pulse { animation: introPulse 2.6s ease-in-out infinite; }
      @keyframes introPulse {
        0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 0 0 0 rgba(255,255,255,0.5); }
        50% { box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 0 0 12px rgba(255,255,255,0); }
      }
      .intro-sheen {
        position: absolute;
        top: 0; left: -60%;
        width: 40%; height: 100%;
        background: linear-gradient(120deg, transparent, rgba(255,255,255,0.7), transparent);
        transform: skewX(-20deg);
      }
      .js-intro-start:hover .intro-sheen { animation: introSheen 0.8s ease; }
      @keyframes introSheen {
        to { left: 130%; }
      }

      /* Respect users who prefer reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .js-intro-item, .intro-pulse, .intro-glow, .intro-board, .intro-board-mic, .intro-eq span, .intro-pin, .intro-caret { animation: none; opacity: 1; transform: none; }
        .intro-eq span { transform: scaleY(0.6); }
      }
    </style>
  `;
}

export function initIntro() {
  const root = document.querySelector(".js-intro");
  if (!root) return;

  // ── Button: go to the login ──
  root.querySelector(".js-intro-start")?.addEventListener("click", () => {
    stopParticles();
    navigate("/login");
  });

  // ── Particle animation (native canvas, no library) ──
  startParticles(root.querySelector(".js-intro-canvas"));

  // ── Typewriter effect on the lesson board text ──
  const typedEl = root.querySelector(".js-intro-typed");
  if (typedEl) {
    // Split the sentence into segments so "lumiVoice" stays bold while it's
    // being typed, without needing any external typed.js-style library.
    const segments = [
      { text: "Learn without limits with courses across every discipline, powered by ", bold: false },
      { text: "lumiVoice", bold: true },
      { text: ", the AI voice assistant that reads and summarizes your lessons.", bold: false },
    ];

    // If the user prefers reduced motion, skip the animation and show the
    // full text right away instead of typing it out.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      typedEl.innerHTML = segments
        .map((seg) => (seg.bold ? `<strong class="text-green-700">${seg.text}</strong>` : seg.text))
        .join("");
    } else {
      // Wait until the board itself has faded in before starting to type.
      setTimeout(() => typeText(typedEl, segments, 22), 900);
    }
  }
}

// Types `segments` (an array of { text, bold }) into `el` one character at a
// time, keeping bold segments wrapped in <strong> as they're revealed, and
// leaves a blinking caret at the end once done.
function typeText(el, segments, speed) {
  // Flatten into a single list of characters tagged with whether they belong
  // to a bold segment, so we can open/close <strong> as we go.
  const chars = [];
  segments.forEach((seg) => {
    for (const ch of seg.text) chars.push({ ch, bold: seg.bold });
  });

  let i = 0;
  let html = "";
  let boldOpen = false;

  function step() {
    if (i >= chars.length) {
      if (boldOpen) html += "</strong>";
      el.innerHTML = html + '<span class="intro-caret"></span>';
      return;
    }
    const { ch, bold } = chars[i];
    if (bold && !boldOpen) {
      html += '<strong class="text-green-700">';
      boldOpen = true;
    } else if (!bold && boldOpen) {
      html += "</strong>";
      boldOpen = false;
    }
    html += ch;
    el.innerHTML = html + '<span class="intro-caret"></span>';
    i++;
    setTimeout(step, speed);
  }

  step();
}

// Keep handles so we can cancel the loop and listeners when leaving the view.
let rafId = null;
let onResize = null;
let onMouseMove = null;
let onMouseLeave = null;

function startParticles(canvas) {
  if (!canvas) return;

  // Skip the animation entirely if the user prefers reduced motion.
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let width, height, particles;
  const LINK_DIST = 130;          // max distance to draw a link between dots
  const COUNT_DIVISOR = 14000;    // fewer particles on small screens

  // Mouse state. x/y start off-screen (null) so nothing reacts until the
  // user actually moves the mouse over the canvas.
  const mouse = { x: null, y: null };
  const MOUSE_RADIUS = 150;   // how far the mouse "pushes" particles
  const MOUSE_LINK_DIST = 170; // how far we still draw a line to the mouse
  const PUSH_STRENGTH = 0.6;  // how hard particles get pushed away

  function resize() {
    // Safari sometimes reports offsetWidth/Height as 0 right after mount and
    // ignores devicePixelRatio, which makes the canvas look blurry or empty.
    // Use the bounding rect (with a window fallback) and scale by DPR.
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width) || window.innerWidth;
    height = Math.round(rect.height) || window.innerHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // Draw in CSS pixels; the backing store is scaled up for retina sharpness.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(90, Math.floor((width * height) / COUNT_DIVISOR));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);

    // Move and draw each particle
    for (const p of particles) {
      // Base drift
      p.x += p.vx;
      p.y += p.vy;

      // React to the mouse: push the particle away the closer it gets,
      // then let it drift back to its natural speed once it's clear.
      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * PUSH_STRENGTH;
          p.x += (dx / dist) * force * 10;
          p.y += (dy / dist) * force * 10;
        }
      }

      // Wrap around the edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0; // reset so the glow doesn't bleed into the link lines
    }

    // Draw links between nearby particles (the constellation effect)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.32 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Draw links from the mouse to nearby particles, so the cursor acts
    // like an extra "hub" node in the constellation.
    if (mouse.x !== null) {
      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * (1 - dist / MOUSE_LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  resize();
  onResize = resize;
  window.addEventListener("resize", onResize);

  // Safari can report a 0-size canvas on the first mount. If that happened,
  // re-measure once the layout has settled so particles fill the screen.
  if (!width || !height || !particles.length) {
    requestAnimationFrame(resize);
  }

  // ── Track the mouse position relative to the canvas ──
  onMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  };
  // ── Reset when the mouse leaves the canvas, so particles stop reacting ──
  onMouseLeave = () => {
    mouse.x = null;
    mouse.y = null;
  };
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  tick();
}

// Stops the animation loop and cleans up its listeners. Called when the user
// clicks "Get Started" so nothing keeps running after leaving the intro.
function stopParticles() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (onResize) window.removeEventListener("resize", onResize);
  onResize = null;
  onMouseMove = null;
  onMouseLeave = null;
}