#!/usr/bin/env bun
import { extractAlbumFromUrl } from "../shared/extractor";

const url = process.argv[2];
if (!url || url === "-h" || url === "--help") {
  console.error("usage: album-details-extractor <spotify-or-qobuz-album-url>");
  process.exit(url ? 0 : 64);
}

const result = await extractAlbumFromUrl(url);
if (!result.ok) {
  console.error(
    `error: ${result.reason}${result.detail ? ` (${result.detail})` : ""}`,
  );
  process.exit(1);
}
console.log(JSON.stringify(result.album, null, 2));
