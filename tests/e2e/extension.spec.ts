/**
 * End-to-end extension tests.
 *
 * Validates the full real-browser pipeline on **Chromium**:
 *   SW startup → fetch → `extractAlbumFromUrl` →
 *   `chrome.scripting.executeScript` clipboard write → notification.
 *
 * The unit + CLI integration suites can't cover this because they don't
 * exercise the MV3 manifest, service-worker wiring, `chrome.scripting`
 * API, or content-script injection paths.
 *
 * Triggers extraction via a hook that `background.ts` exposes on the
 * service worker's `globalThis` (there's no public way to click a
 * toolbar icon from Playwright). The hook calls the same `handleExtract`
 * function that the real toolbar button / context menu entries call.
 *
 * ## Why no Firefox tests?
 *
 * Playwright can't access a Firefox MV3 extension's background worker:
 * `context.backgroundPages()` and `context.serviceWorkers()` are both
 * empty even with `playwright-webextext` loading the extension via RDP.
 * Until that ecosystem matures, Firefox e2e is done manually via
 * `bun run firefox:dev`. The Chromium tests give us strong coverage
 * because the source code is shared (same background.ts, same content
 * scripts, same router) — Firefox's only delta is the manifest shape
 * and the `chrome.*` polyfill, both of which are very stable.
 *
 * Run: bun run test:e2e
 */
import { test, expect, chromium, type BrowserContext, type Worker } from "@playwright/test";
import path from "node:path";

const CHROMIUM_EXT = path.join(import.meta.dirname, "..", "..", "dist", "chromium");

interface Case {
  label: string;
  url: string;
  expected: { title: string; artist: string; urlPattern: RegExp };
}

// One canonical album per source — same fixtures the integration suite
// uses. The full matrix (commas, accents, multi-artist, rejection) lives
// in `bun run verify`; this suite proves the browser wiring works
// end-to-end on each source.
const CASES: Case[] = [
  {
    label: "Spotify / Nonagon Infinity",
    url: "https://open.spotify.com/album/4imRDpzmb4zwvxKhNzJhxr",
    expected: {
      title: "Nonagon Infinity",
      artist: "King Gizzard & The Lizard Wizard",
      urlPattern: /^https:\/\/open\.spotify\.com\/album\/4imRDpzmb4zwvxKhNzJhxr$/,
    },
  },
  {
    label: "Qobuz / Bandana",
    url: "https://play.qobuz.com/album/pl7hqkdosskmc",
    expected: {
      title: "Bandana",
      artist: "Freddie Gibbs & Madlib",
      urlPattern: /^https:\/\/play\.qobuz\.com\/album\/pl7hqkdosskmc$/,
    },
  },
  {
    label: "Tidal / Currents",
    url: "https://tidal.com/browse/album/47696788",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      urlPattern: /^https:\/\/tidal\.com\/album\/47696788$/,
    },
  },
  {
    label: "Apple Music / Currents",
    url: "https://music.apple.com/us/album/currents/1440838039",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      urlPattern: /^https:\/\/music\.apple\.com\/album\/1440838039$/,
    },
  },
  {
    label: "Deezer / Currents",
    url: "https://www.deezer.com/album/10709540",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      urlPattern: /^https:\/\/www\.deezer\.com\/album\/10709540$/,
    },
  },
  {
    label: "Bandcamp / Lift Your Skinny Fists",
    url: "https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven",
    expected: {
      title: "Lift Your Skinny Fists Like Antennas To Heaven",
      artist: "Godspeed You Black Emperor!",
      urlPattern:
        /^https:\/\/godspeedyoublackemperor\.bandcamp\.com\/album\/lift-your-skinny-fists-like-antennas-to-heaven$/,
    },
  },
];

interface ExtractResult {
  ok: boolean;
  album?: { title: string; artist: string; image: string; url: string };
  reason?: string;
  detail?: string;
}

let context: BrowserContext;
let worker: Worker;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext("", {
    headless: true,
    channel: "chromium",
    args: [`--disable-extensions-except=${CHROMIUM_EXT}`, `--load-extension=${CHROMIUM_EXT}`],
  });
  await context.grantPermissions(["clipboard-write"]);
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
});

test.afterAll(async () => {
  await context?.close();
});

for (const tc of CASES) {
  test(tc.label, async () => {
    const page = await context.newPage();
    await page.goto(tc.url, { waitUntil: "domcontentloaded" });

    const tabId = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0]?.id ?? null;
    });
    expect(tabId).not.toBeNull();

    // Triggers the same `handleExtract` path the toolbar button uses.
    // Returns the extraction result so we can assert on it directly —
    // reading the clipboard back is awkward across browsers.
    const result = (await worker.evaluate(
      async ([id, url]) => {
        // @ts-expect-error test hook from background.ts
        return globalThis.__adeExtract(id, url);
      },
      [tabId, tc.url] as const,
    )) as ExtractResult;

    await page.close();

    expect(result.ok).toBe(true);
    if (!result.album) throw new Error("no album in result");
    expect(result.album.title).toBe(tc.expected.title);
    expect(result.album.artist).toBe(tc.expected.artist);
    expect(result.album.url).toMatch(tc.expected.urlPattern);
    expect(result.album.image).toMatch(/^https:\/\/.+/);
  });
}
