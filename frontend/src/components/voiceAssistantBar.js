// ─── Voice Assistant Bar (LumiVoice) ──────────────────────────────────────────
// The "Listen to this section" bar opened by the navbar microphone.
//
// It is a FLOATING OVERLAY (position: fixed) with a translucent background:
// it sits on top of the view and does NOT disturb the course layout. It is
// anchored at the top, below the navbar, centered over the content.
//
// The UI only calls the service (ttsService.js). It never touches
// speechSynthesis directly.
//
//   navbar (mic) ──open/close──▶ voiceAssistantBar ──▶ ttsService ──▶ voice
//
// Content to read comes from window.__lumivoice, a small "bridge" the course
// view fills with the current section (see courseView).

import {
  speakText, pauseSpeech, resumeSpeech, stopSpeech, restartSpeech,
  setSpeechRate, setOnStateChange,
  extractSectionText, extractTextFromMarkdown,
  summarizeText, setApiKey, getApiKey, hasApiKey,
} from "../services/ttsService.js";

const RATES = [0.75, 1, 1.25];

const icon = {
  play:  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  // Restart: a circle with an arrow.
  restart:`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><polygon points="3 4 3 10 9 10" fill="currentColor" stroke="none"/></svg>`,
  close: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  doc:   `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
  spark: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/></svg>`,
  loader:`<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  gear:  `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  // Minimize: a single dash (collapses the bar to just the main controls).
  minimize:`<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
  // Expand: chevron down (restores the full bar).
  expand:`<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  back:  `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  eye:   `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  key:   `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>`,
};

// Bar internal state
let mounted = false;
let playing = false;   // is a reading in progress?
let paused  = false;
let loading = false;   // is the AI thinking?
let mode    = "original"; // "original" | "ai"
let minimized = false;  // collapsed to just the main controls?
let showSettings = false; // is the API-key panel open?

// ─── Bridge with the view ─────────────────────────────────────────────────────
// The course view publishes here what is being viewed. If there is nothing
// (e.g. the user opens the mic outside a course), the bar says so.
function getContext() {
  return window.__lumivoice || null; // { sectionTitle, section }
}

// Current speed (the bar remembers it between renders)
let _rate = 1;
function currentRate() { return _rate; }

// ─── Markup ───────────────────────────────────────────────────────────────────
function template() {
  const ctx = getContext();
  const title = ctx?.sectionTitle || "No section open";

  // ── Minimized: only the essential controls in a compact pill ──
  if (minimized) {
    return `
      <div class="js-va-panel mx-auto rounded-full overflow-hidden inline-flex items-center gap-2 px-2 py-1.5"
           style="background: rgba(220, 252, 231, 0.85);
                  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                  border: 1px solid var(--border);
                  box-shadow: 0 8px 30px rgba(22,163,74,0.15)">
        <button class="js-va-play w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer transition-transform hover:scale-105"
                style="background: var(--primary)" title="${playing && !paused ? "Pause" : "Play"}">
          ${loading ? icon.loader : (playing && !paused ? icon.pause : icon.play)}
        </button>
        <button class="js-va-restart w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105"
                style="background: #fff; color: var(--primary); border: 1.5px solid var(--primary)" title="Restart">
          ${icon.restart}
        </button>
        <button class="js-va-expand w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/50"
                style="color: var(--primary)" title="Expand">
          ${icon.expand}
        </button>
      </div>`;
  }

  const rateBtns = RATES.map((r) => `
    <button data-rate="${r}"
      class="js-rate px-2 py-0.5 rounded-md text-xs font-semibold transition-all"
      style="background: ${r === currentRate() ? "var(--primary)" : "transparent"};
             color: ${r === currentRate() ? "#fff" : "var(--primary)"}">
      ${r}×
    </button>`).join("");

  // ── Settings panel (API key) replaces the bottom row when open ──
  const bottomRow = showSettings ? `
      <div class="flex flex-col gap-2 px-3 sm:px-5 py-3">
        <div class="flex items-center gap-2">
          <button class="js-va-settings-back p-1 rounded-lg cursor-pointer hover:bg-white/40" style="color: var(--primary)" title="Back">
            ${icon.back}
          </button>
          <span style="color: var(--primary)">${icon.key}</span>
          <span class="text-sm font-bold" style="color: var(--primary); font-family: var(--font-family-display)">AI settings</span>
        </div>
        <label class="text-xs" style="color: var(--muted-foreground)">Your Gemini API key</label>
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0 flex items-center rounded-lg px-3" style="background:#fff; border:1px solid var(--border); height:38px">
            <input class="js-va-key flex-1 min-w-0 bg-transparent outline-none text-sm" type="password"
                   placeholder="Paste your key here" value="${getApiKey()}"
                   style="font-family: var(--font-mono, monospace); color:#374151" />
            <button class="js-va-key-toggle p-1 cursor-pointer shrink-0" style="color: var(--muted-foreground)" title="Show / hide">
              ${icon.eye}
            </button>
          </div>
          <button class="js-va-key-save px-4 rounded-lg text-sm font-medium text-white cursor-pointer shrink-0"
                  style="background: var(--primary); height:38px">Save</button>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full shrink-0" style="background:${hasApiKey() ? "var(--primary)" : "#cbd5e1"}"></span>
          <span class="text-xs" style="color: var(--muted-foreground)">
            ${hasApiKey() ? "Key saved on this device. Using your key." : "No key saved. Using the server default."}
          </span>
        </div>
        <p class="text-xs leading-relaxed rounded-lg px-3 py-2" style="color: var(--muted-foreground); background: rgba(255,255,255,0.5)">
          Stored only in your browser. Swap it here when it expires, no code changes. Get a key at aistudio.google.com/apikey
        </p>
      </div>
  ` : `
      <div class="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-3">
        <button class="js-va-original flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer shrink-0"
                style="background: ${mode === "original" ? "#fff" : "rgba(255,255,255,0.55)"};
                       color: var(--primary);
                       border: 1.5px solid ${mode === "original" ? "var(--primary)" : "transparent"}">
          ${icon.doc} Original
        </button>

        <button class="js-va-ai flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-white transition-all cursor-pointer shrink-0"
                style="background: ${loading ? "#8b83e6" : "#6d5ce7"}; opacity: ${loading ? ".85" : "1"}">
          ${loading ? icon.loader : icon.spark}
          <span class="hidden sm:inline">${loading ? "Summarizing…" : "Summarize with AI"}</span>
          <span class="sm:hidden">${loading ? "…" : "AI"}</span>
        </button>

        <div class="flex-1 min-w-0"></div>

        <!-- Speed selector -->
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg shrink-0" style="background: rgba(255,255,255,0.55)">
          ${rateBtns}
        </div>
      </div>
  `;

  // ── Full bar ──
  return `
    <div class="js-va-panel max-w-4xl mx-auto rounded-2xl overflow-hidden"
         style="background: rgba(220, 252, 231, 0.72);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid var(--border);
                box-shadow: 0 8px 30px rgba(22,163,74,0.15)">

      <!-- Top row: play + restart + title + settings + minimize + close -->
      <div class="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3">
        <button class="js-va-play w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer transition-transform hover:scale-105"
                style="background: var(--primary)"
                title="${playing && !paused ? "Pause" : "Play"}">
          ${loading ? icon.loader : (playing && !paused ? icon.pause : icon.play)}
        </button>

        <!-- Restart button (square inside a circle) -->
        <button class="js-va-restart w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105"
                style="background: #fff; color: var(--primary); border: 1.5px solid var(--primary)"
                title="Restart from the beginning">
          ${icon.restart}
        </button>

        <div class="flex-1 min-w-0">
           <p class="text-sm font-bold leading-tight" style="color: var(--primary); font-family: var(--font-family-display)">
            LumiVoice <span class="hidden sm:inline font-normal" style="color: var(--muted-foreground)">· Listen to this section</span>
          </p>
          <p class="text-sm truncate" style="color: var(--muted-foreground)">${title}</p>
        </div>

        <button class="js-va-settings p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/40 shrink-0"
                style="color: ${showSettings ? "#6d5ce7" : "var(--primary)"}" title="AI settings">
          ${icon.gear}
        </button>

        <button class="js-va-minimize p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/40 shrink-0"
                style="color: var(--primary)" title="Minimize">
          ${icon.minimize}
        </button>

        <button class="js-va-close p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/40 shrink-0"
                style="color: var(--primary)" title="Close">
          ${icon.close}
        </button>
      </div>

      <!-- Subtle divider -->
      <div style="height:1px; background: var(--border)"></div>

      ${bottomRow}
    </div>`;
}

// ─── Mount / unmount ──────────────────────────────────────────────────────────
function hostEl() {
  let el = document.getElementById("lumivoice-host");
  if (!el) {
    el = document.createElement("div");
    el.id = "lumivoice-host";
    // Floating overlay: fixed below the navbar, takes no space in the flow.
    // Tighter side padding on phones so the bar gets the full usable width.
    el.style.cssText =
      "position:fixed; top:76px; left:0; right:0; z-index:60;" +
      "padding:0 0.5rem; pointer-events:none;";
    document.body.appendChild(el);
  }
  return el;
}

function render() {
  const el = hostEl();
  // When minimized we center the compact pill.
  const align = minimized ? "text-align:center;" : "";
  el.innerHTML = `<div style="pointer-events:auto; ${align}">${template()}</div>`;
  attach(el);
}

function attach(root) {
  root.querySelector(".js-va-close")?.addEventListener("click", closeBar);

  // Play / Pause / Resume
  root.querySelector(".js-va-play")?.addEventListener("click", () => {
    if (loading) return;
    if (!playing) return start();             // nothing playing → start
    if (paused)   { resumeSpeech(); return; } // paused → resume
    pauseSpeech();                            // playing → pause
  });

  // Restart from the beginning
  root.querySelector(".js-va-restart")?.addEventListener("click", () => {
    if (loading) return;
    if (playing) restartSpeech();  // something loaded → replay from start
    else start();                  // nothing yet → start
  });

  // Minimize / expand
  root.querySelector(".js-va-minimize")?.addEventListener("click", () => {
    minimized = true; showSettings = false; render();
  });
  root.querySelector(".js-va-expand")?.addEventListener("click", () => {
    minimized = false; render();
  });

  // Settings (API key) open / close
  root.querySelector(".js-va-settings")?.addEventListener("click", () => {
    showSettings = !showSettings; render();
  });
  root.querySelector(".js-va-settings-back")?.addEventListener("click", () => {
    showSettings = false; render();
  });

  // Settings: show / hide the key
  root.querySelector(".js-va-key-toggle")?.addEventListener("click", () => {
    const input = root.querySelector(".js-va-key");
    if (input) input.type = input.type === "password" ? "text" : "password";
  });

  // Settings: save the key
  root.querySelector(".js-va-key-save")?.addEventListener("click", () => {
    const input = root.querySelector(".js-va-key");
    setApiKey(input?.value || "");
    render(); // refresh the "using your key" indicator
  });

  // Original mode
  root.querySelector(".js-va-original")?.addEventListener("click", () => {
    mode = "original";
    start();
  });

  // AI mode
  root.querySelector(".js-va-ai")?.addEventListener("click", () => {
    mode = "ai";
    startAI();
  });

  // Speed. Changing the rate now resumes from the current position instead
  // of restarting the audio (handled inside setSpeechRate in the service).
  root.querySelectorAll(".js-rate").forEach((btn) =>
    btn.addEventListener("click", () => {
      _rate = Number(btn.dataset.rate);
      setSpeechRate(_rate); // applies live, from where the voice is
      render();
    })
  );
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function textToRead() {
  const ctx = getContext();
  if (!ctx?.section) return "";
  return extractSectionText(ctx.section); // welcome + section readmes
}

// Reads the original section content
function start() {
  const text = textToRead();
  if (!text) { flashEmpty(); return; }
  mode = "original";
  speakText(text);
}

// Asks the AI for a summary and reads it (with loading + fallback)
async function startAI() {
  const ctx = getContext();
  const raw = ctx?.section
    ? (ctx.section.contents || [])
        .filter((c) => c.tipo === "readme")
        .map((c) => c.datos).join("\n\n")
    : "";

  if (!raw.trim()) { flashEmpty(); return; }

  loading = true;
  render();

  try {
    const summary = await summarizeText(raw);
    loading = false;
    render();
    speakText(summary);
  } catch (err) {
    console.error("[LumiVoice] summary failed, fallback to original:", err);
    loading = false;
    render();
    speakText(extractTextFromMarkdown(raw)); // silent fallback
  }
}

// Brief notice when there is nothing to read
function flashEmpty() {
  const p = hostEl().querySelector(".js-va-panel p.truncate");
  if (!p) return;
  const prev = p.textContent;
  p.textContent = "Nothing to read on this screen.";
  setTimeout(() => { if (p) p.textContent = prev; }, 1800);
}

// ─── Public API (used by the navbar) ──────────────────────────────────────────
export function openVoiceAssistant() {
  if (mounted) return closeBar(); // toggle: a second click closes it
  mounted = true;
  minimized = false;
  showSettings = false;

  // Expose closeBar globally so other parts of the app (for example the
  // logout helper) can dismiss the bar without importing this module, which
  // would risk a circular dependency. Cleared again in closeBar().
  window.__lumivoiceClose = closeBar;

  // The bar reacts to the service state changes
  setOnStateChange((state) => {
    playing = state === "playing" || state === "paused";
    paused  = state === "paused";
    if (state === "stopped") { playing = false; paused = false; }
    if (mounted) render();
  });

  setSpeechRate(_rate);
  render();
}

export function closeBar() {
  stopSpeech();
  mounted = false;
  playing = false;
  paused = false;
  loading = false;
  minimized = false;
  showSettings = false;
  const el = document.getElementById("lumivoice-host");
  if (el) el.innerHTML = "";
  window.__lumivoiceClose = null;
}

export function isVoiceAssistantOpen() {
  return mounted;
}
