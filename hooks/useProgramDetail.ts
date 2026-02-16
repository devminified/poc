"use client";

import { useEffect, useState } from "react";

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

export function useProgramDetail(url: string | null) {
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("No program URL provided");
      setLoading(false);
      return;
    }

    async function fetchDetail() {
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

        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [url]);

  return { detail, loading, error };
}

