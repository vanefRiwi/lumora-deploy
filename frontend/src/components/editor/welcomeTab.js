// ─── Tab: Welcome ───────────────────────────────────────────────────────────────
// Welcome message + optional intro video for the selected section.

export function welcomeTab(item = {}) {
  return `
    <div class="space-y-4">
      <p class="text-sm" style="color: var(--muted-foreground)">
        The welcome item is shown to students when they first open a section.
        Write an intro message and optionally link a short video.
      </p>

      <div>
        <label class="block text-sm font-medium mb-1.5">Welcome message</label>
        <textarea rows="4" name="welcomeMessage"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style="background: var(--muted); border: 1px solid var(--border)"
          placeholder="Hi! Welcome to this section. Here you'll learn...">${item.message || ""}</textarea>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1.5">
          Intro video URL <span class="font-normal" style="color: var(--muted-foreground)">(optional)</span>
        </label>
        <input type="url" name="welcomeVideo" value="${item.videoUrl || ""}"
          class="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)"
          placeholder="https://youtu.be/..." />
      </div>
    </div>
  `;
}
