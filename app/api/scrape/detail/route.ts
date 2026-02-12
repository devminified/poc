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
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Check Firestore cache
    const q = query(
      collection(db, "program_details"),
      where("url", "==", url)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cached = snapshot.docs[0].data();
      // Validate cache — if it has boilerplate headings, it was parsed incorrectly; delete and re-scrape
      const hasBoilerplate = (cached.sections || []).some(
        (s: { heading: string }) =>
          /^(language selection|search|menu|main menu|site footer)/i.test(s.heading)
      );
      // Also invalidate old cache entries that lack HTML fields
      const hasHtmlFields = "descriptionHtml" in cached;
      if (!hasBoilerplate && hasHtmlFields) {
        return NextResponse.json(cached);
      }
      // Delete stale cache entry
      await deleteDoc(snapshot.docs[0].ref);
    }

    // Scrape the program page via ScrapingBee
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

    // Cache in Firestore
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

  // Extract only the <main> content to avoid nav, header, footer, menus
  const mainMatch = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainContent = mainMatch ? mainMatch[1] : body;

  // Extract title from <h1>
  const h1Match = mainContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match
    ? h1Match[1].replace(/<[^>]*>/g, "").trim()
    : "Untitled Program";

  // Split by <h2 to get sections (only within main content)
  const h2Parts = mainContent.split(/<h2[\s>]/i);

  // The first part (before any <h2>) contains the overview/description
  const introPart = h2Parts[0] || "";
  // Keep the HTML for the description (everything after the h1)
  const afterH1 = introPart.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");
  const descriptionHtml = fixHtml(afterH1);

  // Each subsequent part is a section
  const sections: ProgramSection[] = [];

  // Headings to skip — boilerplate from Canada.ca templates
  const skipHeadings = new Set([
    "language selection",
    "search",
    "menu",
    "main menu",
    "site footer",
    "about this site",
    "government of canada footer",
  ]);

  for (let i = 1; i < h2Parts.length; i++) {
    const part = h2Parts[i];

    // Extract the heading text (everything before the closing </h2>)
    const headingEnd = part.indexOf("</h2>");
    if (headingEnd === -1) continue;

    const heading = part
      .substring(0, headingEnd)
      .replace(/<[^>]*>/g, "")
      .trim();

    if (!heading || skipHeadings.has(heading.toLowerCase())) continue;

    // Extract content after </h2> and keep as HTML
    const contentHtml = fixHtml(part.substring(headingEnd + 5));

    // Only include if there's meaningful text content
    const textContent = contentHtml.replace(/<[^>]*>/g, "").trim();
    if (textContent) {
      sections.push({ heading, contentHtml });
    }
  }

  return { url, title, descriptionHtml, sections };
}

/** Fix relative URLs to absolute and mark Canada.ca links for in-app navigation */
function fixHtml(html: string): string {
  return (
    html
      // Convert relative hrefs to absolute Canada.ca URLs
      .replace(
        /href=["'](?!https?:\/\/|mailto:|tel:)\/([^"']*?)["']/gi,
        'href="https://www.canada.ca/$1"'
      )
      // Mark Canada.ca links with a data attribute for in-app routing
      .replace(
        /<a\s+([^>]*?)href=["'](https?:\/\/[^"']*canada\.ca[^"']*)["']/gi,
        '<a $1href="$2" data-internal="true"'
      )
      // Non-Canada.ca links open in new tab
      .replace(
        /<a\s+(?![^>]*data-internal)(?![^>]*target=)/gi,
        '<a target="_blank" rel="noopener noreferrer" '
      )
      // Strip <script> and <style> tags for safety
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      // Remove inline event handlers (onclick, onerror, etc.)
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
      .trim()
  );
}
