import { NextResponse } from "next/server";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DetailSection {
  heading: string;
  contentHtml: string;
}

const PARSER_VERSION = 3;
const SCRAPE_CONCURRENCY = 5;

export async function POST() {
  try {
    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    const targetUrl = process.env.SCRAPINGBEE_TARGET_URL;

    if (!apiKey || !targetUrl) {
      return NextResponse.json(
        { error: "ScrapingBee configuration is missing" },
        { status: 500 },
      );
    }

    // 1. Scrape list page to get all program URLs
    const listUrl = new URL("https://app.scrapingbee.com/api/v1/");
    listUrl.searchParams.set("api_key", apiKey);
    listUrl.searchParams.set("url", targetUrl);
    listUrl.searchParams.set("render_js", "false");
    listUrl.searchParams.set("json_response", "true");
    listUrl.searchParams.set("forward_headers", "true");

    const listResponse = await fetch(listUrl.toString(), {
      headers: {
        "Spb-User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Spb-Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Spb-Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: "Failed to scrape list page" },
        { status: 502 },
      );
    }

    const listData = await listResponse.json();
    const allUrls = extractProgramUrls(listData);

    // 2. Load already-cached URLs
    const detailSnapshot = await getDocs(collection(db, "program_details"));
    const cachedUrls = new Set<string>();
    detailSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.url && data.parserVersion === PARSER_VERSION) {
        cachedUrls.add(data.url);
      }
    });

    // 3. Find uncached URLs
    const uncachedUrls = allUrls.filter((url) => !cachedUrls.has(url));

    if (uncachedUrls.length === 0) {
      return NextResponse.json({
        message: "Cache is already warm",
        total: allUrls.length,
        cached: cachedUrls.size,
        scraped: 0,
      });
    }

    // 4. Scrape uncached detail pages in parallel batches
    let scraped = 0;
    let failed = 0;

    for (let i = 0; i < uncachedUrls.length; i += SCRAPE_CONCURRENCY) {
      const batch = uncachedUrls.slice(i, i + SCRAPE_CONCURRENCY);
      const results = await Promise.all(
        batch.map((url) => scrapeAndCache(url, apiKey)),
      );
      for (const ok of results) {
        if (ok) scraped++;
        else failed++;
      }
    }

    return NextResponse.json({
      message: "Cache warmed",
      total: allUrls.length,
      alreadyCached: cachedUrls.size,
      scraped,
      failed,
    });
  } catch (error) {
    console.error("Warm cache error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function extractProgramUrls(data: Record<string, unknown>): string[] {
  const body = (data.body as string) || "";
  const urls: string[] = [];
  const blocks = body.split(/<h4[\s>]/i);

  for (let i = 1; i < blocks.length; i++) {
    const linkMatch = blocks[i].match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title) continue;

    if (url.startsWith("/")) {
      url = `https://www.canada.ca${url}`;
    }
    urls.push(url);
  }

  return urls;
}

async function scrapeAndCache(url: string, apiKey: string): Promise<boolean> {
  try {
    const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1/");
    scrapingBeeUrl.searchParams.set("api_key", apiKey);
    scrapingBeeUrl.searchParams.set("url", url);
    scrapingBeeUrl.searchParams.set("render_js", "false");
    scrapingBeeUrl.searchParams.set("json_response", "true");
    scrapingBeeUrl.searchParams.set("forward_headers", "true");

    const response = await fetch(scrapingBeeUrl.toString(), {
      headers: {
        "Spb-User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Spb-Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Spb-Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    const detail = parseDetailPage(data, url);

    await addDoc(collection(db, "program_details"), {
      ...detail,
      parserVersion: PARSER_VERSION,
      scrapedAt: serverTimestamp(),
    });

    return true;
  } catch {
    return false;
  }
}

function parseDetailPage(
  data: Record<string, unknown>,
  url: string,
): { url: string; title: string; descriptionHtml: string; sections: DetailSection[] } {
  const body = (data.body as string) || "";

  const mainMatch = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainContent = mainMatch ? mainMatch[1] : body;

  const h1Match = mainContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match
    ? h1Match[1].replace(/<[^>]*>/g, "").trim()
    : "Untitled Program";

  const h2Parts = mainContent.split(/<h2\b/i);

  const introPart = h2Parts[0] || "";
  const afterH1 = introPart.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");
  const descriptionHtml = fixHtml(afterH1);

  const sections: DetailSection[] = [];

  const skipHeadings = new Set([
    "language selection",
    "search",
    "menu",
    "main menu",
    "on this page",
    "site footer",
    "about this site",
    "government of canada footer",
    "page details",
  ]);

  for (let i = 1; i < h2Parts.length; i++) {
    const part = h2Parts[i];

    const tagClose = part.indexOf(">");
    if (tagClose === -1) continue;

    const afterTag = part.substring(tagClose + 1);
    const headingEnd = afterTag.indexOf("</h2>");
    if (headingEnd === -1) continue;

    const heading = afterTag
      .substring(0, headingEnd)
      .replace(/<[^>]*>/g, "")
      .trim();

    if (!heading || skipHeadings.has(heading.toLowerCase())) continue;

    const contentHtml = fixHtml(afterTag.substring(headingEnd + 5));

    const textContent = contentHtml.replace(/<[^>]*>/g, "").trim();
    if (textContent) {
      sections.push({ heading, contentHtml });
    }
  }

  return { url, title, descriptionHtml, sections };
}

function fixHtml(html: string): string {
  return html
    .replace(
      /\s+(?:class|id|role|style|aria-[\w-]+|data-(?!internal)[\w-]+)\s*=\s*["'][^"']*["']/gi,
      "",
    )
    .replace(/(?:^|(?<=>))\s*[\w-]+\s*=\s*["'][^"']*["']\s*>/g, "")
    .replace(
      /href=["'](?!https?:\/\/|mailto:|tel:)\/([^"']*?)["']/gi,
      'href="https://www.canada.ca/$1"',
    )
    .replace(
      /<a\s+([^>]*?)href=["'](https?:\/\/[^"']*canada\.ca[^"']*)["']/gi,
      '<a $1href="$2" data-internal="true"',
    )
    .replace(
      /<a\s+(?![^>]*data-internal)(?![^>]*target=)/gi,
      '<a target="_blank" rel="noopener noreferrer" ',
    )
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .trim();
}
