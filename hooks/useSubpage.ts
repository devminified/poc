"use client";

import { useState } from "react";

interface ProgramSection {
  heading: string;
  contentHtml: string;
}

interface SubpageData {
  html: string;
  loading: boolean;
  error: string | null;
}

export function useSubpage(url: string) {
  const [subpage, setSubpage] = useState<SubpageData>({
    html: "",
    loading: false,
    error: null,
  });

  async function fetchSubpage() {
    if (subpage.html) return;

    setSubpage({ html: "", loading: true, error: null });
    try {
      const res = await fetch("/api/scrape/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      let html = data.descriptionHtml || "";
      if (data.sections?.length) {
        html += data.sections
          .map(
            (s: ProgramSection) =>
              `<h3>${s.heading}</h3>${s.contentHtml}`
          )
          .join("");
      }
      setSubpage({ html, loading: false, error: null });
    } catch (err) {
      setSubpage({
        html: "",
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }

  return { subpage, fetchSubpage };
}

