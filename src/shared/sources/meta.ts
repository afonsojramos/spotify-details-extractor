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
  // Order matters: numeric refs and multi-character replacements first,
  // named entities second, and `&amp;` last so we don't double-decode.
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(NAMED_ACCENTED, (m) => ACCENTED[m] ?? m)
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Lowercase + uppercase variants of the accented Latin characters we see
// in real artist/album names. Kept as a table so decodeEntities is O(1)
// per entity instead of O(n) chained replaces.
const ACCENTED: Record<string, string> = {
  "&aacute;": "á", "&Aacute;": "Á",
  "&eacute;": "é", "&Eacute;": "É",
  "&iacute;": "í", "&Iacute;": "Í",
  "&oacute;": "ó", "&Oacute;": "Ó",
  "&uacute;": "ú", "&Uacute;": "Ú",
  "&agrave;": "à", "&Agrave;": "À",
  "&egrave;": "è", "&Egrave;": "È",
  "&igrave;": "ì", "&Igrave;": "Ì",
  "&ograve;": "ò", "&Ograve;": "Ò",
  "&ugrave;": "ù", "&Ugrave;": "Ù",
  "&acirc;": "â", "&Acirc;": "Â",
  "&ecirc;": "ê", "&Ecirc;": "Ê",
  "&icirc;": "î", "&Icirc;": "Î",
  "&ocirc;": "ô", "&Ocirc;": "Ô",
  "&ucirc;": "û", "&Ucirc;": "Û",
  "&atilde;": "ã", "&Atilde;": "Ã",
  "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  "&otilde;": "õ", "&Otilde;": "Õ",
  "&auml;": "ä", "&Auml;": "Ä",
  "&euml;": "ë", "&Euml;": "Ë",
  "&iuml;": "ï", "&Iuml;": "Ï",
  "&ouml;": "ö", "&Ouml;": "Ö",
  "&uuml;": "ü", "&Uuml;": "Ü",
  "&ccedil;": "ç", "&Ccedil;": "Ç",
  "&aring;": "å", "&Aring;": "Å",
  "&oslash;": "ø", "&Oslash;": "Ø",
  "&szlig;": "ß",
};

const NAMED_ACCENTED = new RegExp(Object.keys(ACCENTED).join("|"), "g");
