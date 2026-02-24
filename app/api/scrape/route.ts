import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ScrapedItem {
  title: string;
  url: string;
  description: string;
  status: string;
  theme: string;
  value: string;
  date: string;
}

export async function POST(request: NextRequest) {
  try {
    const { type, keyword, theme, value } = await request.json();

    // All filters are optional — empty request returns all programs

    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    const targetUrl = process.env.SCRAPINGBEE_TARGET_URL;

    if (!apiKey || !targetUrl) {
      return NextResponse.json(
        { error: "ScrapingBee configuration is missing" },
        { status: 500 }
      );
    }

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

    const allPrograms = parseScrapedData(scrapingData);

    const searchTerm = keyword;
    const results = filterResults(allPrograms, searchTerm, type, theme, value);

    const docRef = await addDoc(collection(db, "searches"), {
      searchParams: { type, keyword, theme, value },
      results,
      totalScraped: allPrograms.length,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      searchParams: { type, keyword, theme, value },
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

  const blocks = body.split(/<h4[\s>]/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const linkMatch = block.match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title) continue;

    if (url.startsWith("/")) {
      url = `https://www.canada.ca${url}`;
    }

    const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const description = descMatch
      ? descMatch[1].replace(/<[^>]*>/g, "").trim()
      : "";

    let status = "";
    let theme = "";
    let itemValue = "";
    let date = "";
    const listItems = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of listItems) {
      const text = li.replace(/<[^>]*>/g, "").trim();
      if (/status/i.test(text) || /accept/i.test(text) || /closed/i.test(text) || /forecasted/i.test(text)) {
        status = text.replace(/^status\s*:\s*/i, "");
      } else if (/theme/i.test(text)) {
        theme = text.replace(/^theme\s*:\s*/i, "");
      } else if (/\$/.test(text) || /funding amount/i.test(text) || /value/i.test(text)) {
        itemValue = text.replace(/^value\s*:\s*/i, "");
      } else if (/date/i.test(text) || /deadline/i.test(text) || /until/i.test(text)) {
        date = text.replace(/^date\s*:\s*/i, "");
      }
    }

    // Extract date from status text if not found separately
    if (!date && status) {
      const dateMatch = status.match(/((?:from|until|by)\s.+)/i)
        || status.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}.*)/i);
      if (dateMatch) {
        date = dateMatch[1].trim();
      }
    }

    // If no value found in <li> items, search the full block for dollar amounts
    if (!itemValue) {
      const blockText = block.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const dollarMatch = blockText.match(/[^.]*\$[\d,]+[^.]*/);
      if (dollarMatch) {
        itemValue = dollarMatch[0].trim();
      }
    }

    items.push({ title, url, description, status, theme, value: itemValue, date });
  }

  return items;
}

function filterResults(
  items: ScrapedItem[],
  searchTerm: string,
  matchType: string,
  themeFilter?: string,
  valueFilter?: string
): ScrapedItem[] {
  return items.filter((item) => {
    if (themeFilter && !item.theme.toLowerCase().includes(themeFilter.toLowerCase())) {
      return false;
    }

    if (valueFilter && !item.value.toLowerCase().includes(valueFilter.toLowerCase())) {
      return false;
    }

    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
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
