// Content script that runs on open.spotify.com and injects an
// "Extract Album Info" entry into Spotify's native right-click menu
// whenever the menu relates to an album.
//
// This is deliberately fragile — Spotify's React DOM can change at any
// time. Graceful failure: if we can't find the menu element, an item
// template, or an album context, we silently do nothing and the user can
// still fall back on the browser context menu or the toolbar button.
export {};

let lastContextTarget: Element | null = null;

// Captured at capture-phase so we always see the real target even if
// Spotify stops propagation.
document.addEventListener(
  "contextmenu",
  (event) => {
    lastContextTarget = event.target as Element | null;
  },
  true,
);

const observer = new MutationObserver(() => {
  const menus = Array.from(
    document.querySelectorAll('[role="menu"]') as NodeListOf<HTMLElement>,
  );
  for (const menu of menus) {
    if (menu.dataset.sdeInjected === "1") continue;
    tryInject(menu);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function tryInject(menu: HTMLElement) {
  const albumUrl = resolveAlbumUrl();
  if (!albumUrl) return;

  const template = menu.querySelector('[role="menuitem"]') as HTMLElement | null;
  if (!template) return;

  const item = template.cloneNode(true) as HTMLElement;
  // Clone again to strip the original's event listeners
  const fresh = item.cloneNode(true) as HTMLElement;

  // Replace the visible label — Spotify menu items usually contain a <span>
  // with the label; fall back to setting text on the root.
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
  menu.dataset.sdeInjected = "1";
}

/**
 * Finds the album URL the menu was opened for.
 *
 * Priority:
 *   1. Tight ancestor anchor — the trigger sits inside an `<a href="/album/...">`
 *      (e.g. an album tile on Home). This is unambiguous.
 *   2. Current route — we're on `/album/{id}` and there's no tighter anchor
 *      (e.g. •••-click on the album header or a track row).
 *   3. Last-resort descendant scan — broad fallback for layouts where the
 *      trigger sits inside a small bounded container with the anchor as a
 *      sibling. Only used when neither 1 nor 2 fits.
 */
function resolveAlbumUrl(): string | null {
  const trigger =
    (document.querySelector('[aria-expanded="true"]') as HTMLElement | null) ??
    lastContextTarget;

  // 1. Tight ancestor anchor
  const ancestor = trigger?.closest('a[href^="/album/"]') as HTMLAnchorElement | null;
  if (ancestor) {
    const href = ancestor.getAttribute("href");
    if (href) return toAlbumUrl(href);
  }

  // 2. Current route — authoritative when we're on an album page and the
  // trigger isn't inside a tighter album anchor.
  if (/^\/album\/[A-Za-z0-9]+/.test(window.location.pathname)) {
    return `https://open.spotify.com${window.location.pathname}`;
  }

  // 3. Last resort: look within a small bounded ancestor for an album link.
  // Stops at the first ancestor that looks like a card/row container so we
  // don't pick up unrelated recommendations further up the tree.
  const container = trigger?.closest(
    '[data-testid*="card"], [data-testid*="row"], [data-testid*="entity"], li, [role="row"]',
  );
  const inside = container?.querySelector('a[href^="/album/"]') as HTMLAnchorElement | null;
  if (inside) {
    const href = inside.getAttribute("href");
    if (href) return toAlbumUrl(href);
  }

  return null;
}

function toAlbumUrl(href: string): string {
  return `https://open.spotify.com${href.split("?")[0]}`;
}

/**
 * Close Spotify's native menu. Tried in order until something works:
 *   1. Click the trigger again (toggles menus in most React libs).
 *   2. Dispatch pointerdown on document body (Radix-style outside-click).
 *   3. Dispatch Escape at document level.
 */
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
