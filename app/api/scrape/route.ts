import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ScrapedItem {
  title: string;
  url: string;
  description: string;
  status: string;
  theme: string;
}

export async function POST(request: NextRequest) {
  try {
    const { type, keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "Search term is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    const targetUrl = process.env.SCRAPINGBEE_TARGET_URL;

    if (!apiKey || !targetUrl) {
      return NextResponse.json(
        { error: "ScrapingBee configuration is missing" },
        { status: 500 }
      );
    }

    // Call ScrapingBee API
    const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1/");
    scrapingBeeUrl.searchParams.set("api_key", apiKey);
    scrapingBeeUrl.searchParams.set("url", targetUrl);
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

    // Extract funding programs from the scraped HTML
    const allPrograms = parseScrapedData(scrapingData);

    // Filter results based on search params
    const searchTerm = keyword;
    const results = filterResults(allPrograms, searchTerm, type);

    // Save to Firestore
    const docRef = await addDoc(collection(db, "searches"), {
      searchParams: { type, keyword },
      results,
      totalScraped: allPrograms.length,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      searchParams: { type, keyword },
      results,
      totalScraped: allPrograms.length,
    });
  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseScrapedData(data: Record<string, unknown>): ScrapedItem[] {
  const body = (data.body as string) || "";
  const items: ScrapedItem[] = [];

  // Canada.ca funding page lists programs in sections with headings and links.
  // Each program block typically has:
  //   <h4>...<a href="URL">Title</a>...</h4>
  //   <p>Description text</p>
  //   <ul><li>Status: ...</li><li>Theme: ...</li></ul>

  // Split by h4 tags to isolate each program block
  const blocks = body.split(/<h4[\s>]/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Extract the link from the heading
    const linkMatch = block.match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title) continue;

    // Make relative URLs absolute
    if (url.startsWith("/")) {
      url = `https://www.canada.ca${url}`;
    }

    // Extract description from first <p> after the heading
    const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const description = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, "").trim()
      : "";

    // Extract status and theme from list items
    let status = "";
    let theme = "";
    const listItems = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of listItems) {
      const text = li.replace(/<[^>]*>/g, "").trim();
      if (/status/i.test(text) || /accept/i.test(text) || /closed/i.test(text) || /forecasted/i.test(text)) {
        status = text.replace(/^status\s*:\s*/i, "");
      } else if (/theme/i.test(text)) {
        theme = text.replace(/^theme\s*:\s*/i, "");
      }
    }

    items.push({ title, url, description, status, theme });
  }

  return items;
}

function filterResults(
  items: ScrapedItem[],
  searchTerm: string,
  matchType: string
): ScrapedItem[] {
  if (!searchTerm) return items;

  const term = searchTerm.toLowerCase();

  return items.filter((item) => {
    const haystack = `${item.title} ${item.description} ${item.theme}`.toLowerCase();

    switch (matchType) {
      case "Exact Match":
        return haystack.includes(term);
      case "Contains":
        return haystack.includes(term);
      case "Starts With":
        return item.title.toLowerCase().startsWith(term);
      case "Ends With":
        return item.title.toLowerCase().endsWith(term);
      default:
        return haystack.includes(term);
    }
  });
}
