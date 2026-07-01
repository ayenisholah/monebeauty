// Generates committed content registries from the scraped live site.
// Source: ../scraped_content/{en,fi,ru}/*.md  (git-ignored reference)
// Output: ../content/generated/{pages,products,assets}.json  (committed)
// Image srcs are rewritten /files -> /media/files and /images -> /media/images.
//
// Run: node scripts/gen-content.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCRAPED = path.join(ROOT, "scraped_content");
const OUT = path.join(ROOT, "content", "generated");
const LOCALES = ["en", "fi", "ru"];

const PAGES = [
  { slug: "about", file: "about" },
  { slug: "instrumental/endosphere", file: "instrumental-endosphere" },
  { slug: "instrumental/laser", file: "instrumental-laser" },
  { slug: "instrumental/mikroneulanrf", file: "instrumental-mikroneulanrf" },
  { slug: "trichology", file: "trichology" },
  { slug: "arosha", file: "arosha" },
  { slug: "services", file: "services-index" },
  { slug: "services/face", file: "services-face" },
  { slug: "services/body", file: "services-body" },
  { slug: "services/tricho", file: "services-tricho" },
  { slug: "services/laser", file: "services-laser" },
  { slug: "services/mikroneulanrf", file: "services-mikroneulanrf" },
  { slug: "services/eyebrows", file: "services-eyebrows" },
  { slug: "services/packages", file: "services-packages" },
  { slug: "services/gift-cards", file: "services-gift-cards" },
];

const assets = new Set();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readMd(file) {
  return fs.readFileSync(file, "utf8");
}

// SCOPE.md: brand renamed "Mone Beauty Club" -> "Mone Beauty Clinic". Applied to all
// generated copy. Finnish inflected forms present in the scrape (Clubiin/Clubin) are
// mapped first so the bare "Club" rule doesn't mangle them.
function renameBrand(text) {
  if (!text) return text;
  return text
    .replace(/Beauty Clubiin/g, "Beauty Cliniciin")
    .replace(/Beauty Clubin/g, "Beauty Clinicin")
    .replace(/Beauty Clubilla/g, "Beauty Clinicillä")
    .replace(/Beauty Club/g, "Beauty Clinic");
}

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const fm = {};
  let body = md;
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2];
    }
    body = md.slice(m[0].length);
  }
  return { fm, body };
}

function collectAssets(text) {
  for (const m of text.matchAll(/\((\/(?:files|images)\/[^)\s]+)\)/g)) {
    assets.add(m[1].replace(/^\//, "")); // e.g. files/land/78/x.jpg
  }
}

function rewriteImages(text) {
  return text
    .replace(/\(\/files\//g, "(/media/files/")
    .replace(/\(\/images\//g, "(/media/images/");
}

function firstImage(text) {
  const m = text.match(/!\[[^\]]*\]\((\/media\/[^)\s]+)\)/);
  return m ? m[1] : null;
}

function cleanBody(body, title) {
  // Cut trailing "## Media" section.
  const mediaIdx = body.indexOf("\n## Media");
  if (mediaIdx !== -1) body = body.slice(0, mediaIdx);
  body = body.trim();
  // Drop a leading duplicate H1 equal to the frontmatter title.
  if (title) {
    body = body.replace(
      new RegExp("^#\\s+" + escapeRegex(title) + "\\s*\\n+"),
      "",
    );
  }
  return body.trim();
}

// ---- Pages ----
const pages = {};
for (const { slug, file } of PAGES) {
  pages[slug] = {};
  for (const loc of LOCALES) {
    const p = path.join(SCRAPED, loc, `${file}.md`);
    if (!fs.existsSync(p)) continue;
    const { fm, body: raw } = parseFrontmatter(readMd(p));
    collectAssets(raw.split("\n## Media")[0]);
    const body = rewriteImages(renameBrand(cleanBody(raw, fm.title)));
    pages[slug][loc] = {
      title: renameBrand(fm.title ?? ""),
      hero: firstImage(body),
      body,
    };
  }
}

// ---- Products ----
function classify(slug) {
  return /dixidox|crexepil|fresh-cells|science-7/.test(slug)
    ? "DIXIDOX_TRICHO"
    : "AROSHA_BODY";
}

const productFiles = fs
  .readdirSync(path.join(SCRAPED, "en", "catalog"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

const products = [];
for (const slug of productFiles) {
  const entry = {
    slug,
    category: classify(slug),
    image: null,
    price: null,
    size: null,
    i18n: {},
  };
  for (const loc of LOCALES) {
    const p = path.join(SCRAPED, loc, "catalog", `${slug}.md`);
    if (!fs.existsSync(p)) continue;
    const { fm, body } = parseFrontmatter(readMd(p));
    const main = body.split("\n## See also")[0].split("\n## Media")[0];
    collectAssets(main);
    // image (first /images/photo)
    const img = main.match(/\((\/images\/[^)\s]+)\)/);
    if (img && !entry.image)
      entry.image = img[1].replace(/^\/images\//, "/media/images/");
    // price + size (from the hero block)
    const price = main.match(/([\d]+[.,]\d{2})\s*€/);
    if (price && !entry.price)
      entry.price = parseFloat(price[1].replace(",", "."));
    const size = main.match(
      /\n\s*(\d+(?:[.,]\d+)?\s*ml|\d+\s*(?:phials|pcs)?)\s*\n/i,
    );
    if (size && !entry.size) entry.size = size[1].trim();
    // description: the first "## <heading>" block (Description / Kuvaus / Описание),
    // language-agnostic. Structure: [hero] ## <Description> \n <desc> ## <See also>
    let desc = "";
    const parts = main.split(/\n##\s+/);
    if (parts.length >= 2) {
      const block = parts[1];
      const nl = block.indexOf("\n");
      desc = (nl === -1 ? "" : block.slice(nl + 1)).trim();
    }
    entry.i18n[loc] = {
      name: renameBrand(fm.title ?? slug),
      description: renameBrand(desc),
    };
  }
  products.push(entry);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(
  path.join(OUT, "products.json"),
  JSON.stringify(products, null, 2),
);
fs.writeFileSync(
  path.join(OUT, "assets.json"),
  JSON.stringify([...assets].sort(), null, 2),
);

console.log(
  `pages: ${Object.keys(pages).length}, products: ${products.length}, assets referenced: ${assets.size}`,
);
