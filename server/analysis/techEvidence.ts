import * as cheerio from "cheerio";

type H1Evidence = { text: string; selector: string; hidden?: boolean };

function isHidden($: cheerio.CheerioAPI, el: any) {
  const $el = $(el);
  const style = ($el.attr("style") || "").toLowerCase();
  if ($el.attr("hidden") !== undefined) return true;
  if ($el.attr("aria-hidden") === "true") return true;
  if (style.includes("display:none") || style.includes("visibility:hidden")) return true;
  return false;
}

function cssPath($: cheerio.CheerioAPI, el: any) {
  // readable + stable-enough selector
  const parts: string[] = [];
  let cur: any | undefined = el;
  for (let depth = 0; cur && depth < 6; depth++) {
    const $cur = $(cur);
    const tag = ($cur.prop("tagName") || "").toLowerCase();
    if (!tag) break;
    const id = $cur.attr("id");
    if (id) { parts.unshift(`${tag}#${id}`); break; }
    const cls = ($cur.attr("class") || "").trim().split(/\s+/).slice(0,2).filter(Boolean).join(".");
    const idx = $cur.parent().children(tag).index(cur) + 1; // nth-of-type
    parts.unshift(cls ? `${tag}.${cls}:nth-of-type(${idx})` : `${tag}:nth-of-type(${idx})`);
    cur = $cur.parent().get(0);
  }
  return parts.join(" > ");
}

export function extractH1Evidence(html: string) {
  const $ = cheerio.load(html);
  const h1s: H1Evidence[] = $("h1").map((_, el) => ({
    text: $(el).text().trim().replace(/\s+/g, " ").slice(0, 160),
    selector: cssPath($, el),
    hidden: isHidden($, el)
  })).get();
  // Ignore obviously hidden H1s for the count, but still return them for transparency
  const visibleCount = h1s.filter(h => !h.hidden).length;
  return { h1s, visibleCount };
}