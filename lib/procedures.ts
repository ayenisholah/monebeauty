export type Procedure = {
  group: string | null;
  title: string;
  description: string;
  price: string;
};

/**
 * Parses the approved procedure cards embedded in a service's localized Markdown body.
 * The returned array order is the public, one-based procedure identifier used by booking.
 */
export function parseProcedures(markdown: string): Procedure[] {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n## Media[\s\S]*$/i, "")
    .split("\n");
  const procedures: Procedure[] = [];
  let group: string | null = null;
  let current: { title: string; description: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const h4 = trimmed.match(/^####\s+(.+)$/);

    if (h3) {
      group = cleanInlineMarkdown(h3[1]);
      continue;
    }

    if (h4) {
      const heading = cleanInlineMarkdown(h4[1]);
      if (isPriceLine(heading)) {
        if (current) {
          const description = cleanDescription(current.description.join("\n"));
          if (description) {
            procedures.push({
              group,
              title: current.title,
              description,
              price: heading,
            });
          }
          current = null;
        }
      } else {
        current = { title: heading, description: [] };
      }
      continue;
    }

    if (current && !isBasketMarker(trimmed)) current.description.push(line);
  }

  return procedures;
}

/** Resolve a one-based public index without accepting coercions or partial numbers. */
export function resolveProcedure(
  markdown: string,
  index: unknown,
): { index: number; procedure: Procedure } | null {
  const parsedIndex =
    typeof index === "number"
      ? index
      : typeof index === "string" && /^\d+$/.test(index)
        ? Number(index)
        : Number.NaN;
  if (!Number.isSafeInteger(parsedIndex) || parsedIndex < 1) return null;
  const procedure = parseProcedures(markdown)[parsedIndex - 1];
  return procedure ? { index: parsedIndex, procedure } : null;
}

function isPriceLine(value: string) {
  return /(?:€|\beur\b|\d+\s*-\s*\d+|\d+\s*\/|\d+\s*min)/iu.test(value);
}

function isBasketMarker(value: string) {
  return /^(?:into a basket|koriin|в корзину)$/iu.test(value);
}

function cleanInlineMarkdown(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function cleanDescription(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
