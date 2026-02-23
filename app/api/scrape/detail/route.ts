import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProgramSection {
  heading: string;
  contentHtml: string;
}

interface ProgramDetail {
  url: string;
  title: string;
  descriptionHtml: string;
  sections: ProgramSection[];
  parserVersion: number;
}

const PARSER_VERSION = 3;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const q = query(
      collection(db, "program_details"),
      where("url", "==", url)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cached = snapshot.docs[0].data();
      if (cached.parserVersion === PARSER_VERSION) {
        return NextResponse.json(cached);
      }
      await deleteDoc(snapshot.docs[0].ref);
    }

    const apiKey = process.env.SCRAPINGBEE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ScrapingBee configuration is missing" },
        { status: 500 }
      );
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ScrapingBee error:", response.status, errorText);
      return NextResponse.json(
        { error: `ScrapingBee request failed: ${response.status}` },
        { status: 502 }
      );
    }

    const scrapingData = await response.json();
    const detail = parseProgramPage(scrapingData, url);

    await addDoc(collection(db, "program_details"), {
      ...detail,
      scrapedAt: serverTimestamp(),
    });

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Detail scrape API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseProgramPage(
  data: Record<string, unknown>,
  url: string
): ProgramDetail {
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

  const sections: ProgramSection[] = [];

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

  return { url, title, descriptionHtml, sections, parserVersion: PARSER_VERSION };
}

function fixHtml(html: string): string {
  return (
    html
      .replace(
        /\s+(?:class|id|role|style|aria-[\w-]+|data-(?!internal)[\w-]+)\s*=\s*["'][^"']*["']/gi,
        ""
      )
      .replace(/(?:^|(?<=>))\s*[\w-]+\s*=\s*["'][^"']*["']\s*>/g, "")
      .replace(
        /href=["'](?!https?:\/\/|mailto:|tel:)\/([^"']*?)["']/gi,
        'href="https://www.canada.ca/$1"'
      )
      .replace(
        /<a\s+([^>]*?)href=["'](https?:\/\/[^"']*canada\.ca[^"']*)["']/gi,
        '<a $1href="$2" data-internal="true"'
      )
      .replace(
        /<a\s+(?![^>]*data-internal)(?![^>]*target=)/gi,
        '<a target="_blank" rel="noopener noreferrer" '
      )
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
      .trim()
  );
}
