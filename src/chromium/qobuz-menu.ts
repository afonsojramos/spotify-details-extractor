// Content script that runs on play.qobuz.com and tries to inject an
// "Extract Album Info" entry into Qobuz's native right-click menu when
// the menu relates to an album.
//
// Qobuz's menu DOM structure is unknown to us, so we mirror the defensive
// pattern from `spotify-menu.ts`: try common menu selectors, bail silently
// when none match. Users still have three fallbacks — toolbar, browser
// link context menu, browser page context menu.
export {};

let lastContextTarget: Element | null = null;

document.addEventListener(
  "contextmenu",
  (event) => {
    lastContextTarget = event.target as Element | null;
  },
  true,
);

const observer = new MutationObserver(() => {
  const menus = Array.from(
    document.querySelectorAll('[role="menu"], .contextual-menu, .context-menu, [class*="contextMenu"]') as NodeListOf<HTMLElement>,
  );
  for (const menu of menus) {
    if (menu.dataset.adeInjected === "1") continue;
    tryInject(menu);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function tryInject(menu: HTMLElement) {
  const albumUrl = resolveAlbumUrl();
  if (!albumUrl) return;

  const template =
    (menu.querySelector('[role="menuitem"]') as HTMLElement | null) ??
    (menu.querySelector('li, button') as HTMLElement | null);
  if (!template) return;

  const item = template.cloneNode(true) as HTMLElement;
  const fresh = item.cloneNode(true) as HTMLElement;

  const labelHost = fresh.querySelector("span") ?? fresh;
  labelHost.textContent = "Extract Album Info";

  fresh.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ kind: "sde:extract", url: albumUrl });
      dismissMenu();
    },
    true,
  );

  menu.appendChild(fresh);
  menu.dataset.adeInjected = "1";
}

/**
 * Resolves an album URL for the currently-open menu. Priority:
 *   1. Tight ancestor album anchor.
 *   2. Current route if we're on `/album/{id}`.
 *   3. Bounded descendant scan inside the nearest card/row container.
 *
 * Always returns a URL pointing at `www.qobuz.com/us-en/album/-/{id}` so
 * the background worker's extractor can bridge via redirect.
 */
function resolveAlbumUrl(): string | null {
  const trigger =
    (document.querySelector('[aria-expanded="true"]') as HTMLElement | null) ??
    lastContextTarget;

  // 1. Tight ancestor anchor.
  const ancestor = trigger?.closest('a[href*="/album/"]') as HTMLAnchorElement | null;
  if (ancestor) {
    const id = extractId(ancestor.getAttribute("href") ?? "");
    if (id) return toCanonical(id);
  }

  // 2. Current route.
  const pathId = extractId(window.location.pathname);
  if (pathId) return toCanonical(pathId);

  // 3. Bounded descendant scan.
  const container = trigger?.closest(
    '[class*="card"], [class*="row"], [class*="Card"], [class*="Row"], li',
  );
  const inside = container?.querySelector('a[href*="/album/"]') as HTMLAnchorElement | null;
  if (inside) {
    const id = extractId(inside.getAttribute("href") ?? "");
    if (id) return toCanonical(id);
  }

  return null;
}

function extractId(pathOrHref: string): string | null {
  const match = /\/album\/(?:[^/]+\/)?([A-Za-z0-9]{8,})(?:[/?#]|$)/.exec(pathOrHref);
  return match?.[1] ?? null;
}

function toCanonical(id: string): string {
  return `https://www.qobuz.com/us-en/album/-/${id}`;
}

/** Close Qobuz's native menu via trigger toggle / pointerdown / Escape. */
function dismissMenu() {
  const trigger = document.querySelector('[aria-expanded="true"]') as HTMLElement | null;
  if (trigger) {
    trigger.click();
    return;
  }
  document.body.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
  );
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}
