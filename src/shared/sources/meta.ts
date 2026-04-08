/**
 * Regex-based meta-tag extraction shared by every source that reads from
 * server-rendered HTML. Regex (rather than DOMParser) so the same code
 * runs in browser content scripts, the Bun CLI, and the bookmarklet IIFE.
 *
 * Two passes handle both attribute orders — `property` before `content`
 * and vice versa — because sites aren't consistent about which comes first.
 */

/**
 * Returns every `content` value for meta tags matching `property=X` or
 * `name=X`, in document order, with HTML entities decoded.
 */
export function allMetas(html: string, property: string): string[] {
  const esc = escapeRegex(property);
  const propFirst = new RegExp(
    `<meta\\b[^>]*?(?:property|name)=["']${esc}["'][^>]*?content=["']([^"']*)["']`,
    "gi",
  );
  const contentFirst = new RegExp(
    `<meta\\b[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${esc}["']`,
    "gi",
  );
  const values: string[] = [];
  for (const re of [propFirst, contentFirst]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      if (match[1]) values.push(decodeEntities(match[1].trim()));
    }
  }
  return values;
}

export function firstMeta(html: string, property: string): string | null {
  return allMetas(html, property)[0] ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Minimal HTML-entity decoder covering the set that realistically appears
 * in album/artist metadata: quotes, apostrophes, ampersands, dashes, and
 * the common accented Latin characters from European artist names. The
 * numeric-ref escape hatch catches anything else.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&acirc;/g, "â")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&ocirc;/g, "ô")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&ccedil;/g, "ç")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
