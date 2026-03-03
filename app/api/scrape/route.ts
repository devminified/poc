import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
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

interface DetailSection {
  heading: string;
  contentHtml: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDetailText(data: {
  descriptionHtml?: string;
  sections?: DetailSection[];
}): string {
  return [
    htmlToText(data.descriptionHtml || ""),
    ...(data.sections || []).map(
      (s) => `${s.heading} ${htmlToText(s.contentHtml || "")}`,
    ),
  ].join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const { keyword, theme, amountMin, amountMax } = await request.json();

    // All filters are optional — empty request returns all programs

    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    const targetUrl = process.env.SCRAPINGBEE_TARGET_URL;

    if (!apiKey || !targetUrl) {
      return NextResponse.json(
        { error: "ScrapingBee configuration is missing" },
        { status: 500 },
      );
    }

    const scrapingBeeUrl = new URL("https://app.scrapingbee.com/api/v1/");
    scrapingBeeUrl.searchParams.set("api_key", apiKey);
    scrapingBeeUrl.searchParams.set("url", targetUrl);
    scrapingBeeUrl.searchParams.set("render_js", "true");
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
        { status: 502 },
      );
    }

    const scrapingData = await response.json();

    const allPrograms = parseScrapedData(scrapingData);

    const searchTerm = keyword;

    // Load cached detail page content for keyword matching
    const detailTexts = new Map<string, string>();
    if (searchTerm) {
      const detailSnapshot = await getDocs(collection(db, "program_details"));
      detailSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.url) {
          detailTexts.set(data.url, extractDetailText(data));
        }
      });
    }

    const results = filterResults(
      allPrograms,
      searchTerm,
      theme,
      amountMin,
      amountMax,
      detailTexts,
    );

    await addDoc(collection(db, "searches"), {
      searchParams: { keyword, theme, amountMin, amountMax },
      results,
      totalScraped: allPrograms.length,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      searchParams: { keyword, theme, amountMin, amountMax },
      results,
      totalScraped: allPrograms.length,
    });
  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const snapshot = await getDocs(collection(db, "searches"));
    const deletes = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletes);
    return NextResponse.json({ deleted: snapshot.size });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to clear searches" },
      { status: 500 },
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
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]*>/g, "").trim();
    if (!title) continue;

    if (url.startsWith("/")) {
      url = `https://www.canada.ca${url}`;
    }

    const descMatches = block.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const description = descMatches
      .map((p) => p.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
      .join(" ");

    let status = "";
    let theme = "";
    let itemValue = "";
    let date = "";
    const listItems = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of listItems) {
      const text = li.replace(/<[^>]*>/g, "").trim();
      if (
        /status/i.test(text) ||
        /accept/i.test(text) ||
        /closed/i.test(text) ||
        /forecasted/i.test(text)
      ) {
        status = text.replace(/^status\s*:\s*/i, "");
      } else if (
        /\$/.test(text) ||
        /funding amount/i.test(text) ||
        /value/i.test(text)
      ) {
        itemValue = text.replace(/^value\s*:\s*/i, "");
      } else if (
        /date/i.test(text) ||
        /deadline/i.test(text) ||
        /until/i.test(text)
      ) {
        date = text.replace(/^date\s*:\s*/i, "");
      } else if (/theme/i.test(text)) {
        theme = text.replace(/^theme\s*:\s*/i, "");
      } else if (!theme && text.length > 3 && text.length < 100) {
        // Unmatched list item is likely the type/theme category
        theme = text;
      }
    }

    // Extract date from status text if not found separately
    if (!date && status) {
      const dateMatch =
        status.match(/((?:from|until|by)\s.+)/i) ||
        status.match(
          /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}.*)/i,
        );
      if (dateMatch) {
        date = dateMatch[1].trim();
        // Strip the date portion from status
        status = status.replace(/\s+(?:from|until|by)\s+.*/i, "").trim();
      }
    }

    // Clean up value to only keep the dollar amount portion
    if (itemValue) {
      const valMatch = itemValue.match(
        /(?:up to\s+)?\$[\d,]+(?:\.\d{2})?(?:\s+(?:and a maximum of|to)\s+\$[\d,]+(?:\.\d{2})?)?(?:\s+per\s+\w+)?/i,
      );
      if (valMatch) {
        itemValue = valMatch[0].trim();
      }
    }

    // If no value found in <li> items, search the full block for dollar amounts
    if (!itemValue) {
      const blockText = block.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const dollarMatch = blockText.match(
        /(?:up to\s+)?\$[\d,]+(?:\.\d{2})?(?:\s+(?:and a maximum of|to)\s+\$[\d,]+(?:\.\d{2})?)?(?:\s+per\s+\w+)?/i,
      );
      if (dollarMatch) {
        itemValue = dollarMatch[0].trim();
      }
    }

    items.push({
      title,
      url,
      description,
      status,
      theme,
      value: itemValue,
      date,
    });
  }

  return items;
}

function parseDollarAmount(text: string): number | null {
  const match = text.match(/\$([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
}

function filterResults(
  items: ScrapedItem[],
  searchTerm: string,
  themeFilter?: string,
  amountMin?: string,
  amountMax?: string,
  detailTexts?: Map<string, string>,
): ScrapedItem[] {
  const minAmount = amountMin ? parseDollarAmount(amountMin) ?? parseFloat(amountMin.replace(/[,$]/g, "")) : null;
  const maxAmount = amountMax ? parseDollarAmount(amountMax) ?? parseFloat(amountMax.replace(/[,$]/g, "")) : null;

  return items.filter((item) => {
    if (
      themeFilter &&
      !item.theme.toLowerCase().includes(themeFilter.toLowerCase())
    ) {
      return false;
    }

    if ((minAmount !== null || maxAmount !== null) && item.value) {
      const itemAmount = parseDollarAmount(item.value);
      if (itemAmount !== null) {
        if (minAmount !== null && itemAmount < minAmount) return false;
        if (maxAmount !== null && itemAmount > maxAmount) return false;
      } else if (minAmount !== null || maxAmount !== null) {
        // Item has a value but it's not a parseable dollar amount — exclude
        return false;
      }
    } else if ((minAmount !== null || maxAmount !== null) && !item.value) {
      // No value on item but user specified an amount filter — exclude
      return false;
    }

    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const listingHaystack =
      `${item.title} ${item.description} ${item.theme} ${item.status} ${item.value} ${item.date}`.toLowerCase();
    if (listingHaystack.includes(term)) return true;

    // Also search in cached detail page content
    const detailText = detailTexts?.get(item.url);
    if (detailText && detailText.toLowerCase().includes(term)) return true;

    return false;
  });
}
