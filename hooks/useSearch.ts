"use client";

import { useState, type FormEvent } from "react";

interface SearchParams {
  type: string;
  keyword: string;
}

interface ScrapedItem {
  title: string;
  url: string;
  description: string;
  status: string;
  theme: string;
}

interface SearchResponse {
  id: string;
  searchParams: SearchParams;
  results: ScrapedItem[];
  totalScraped: number;
}

export function useSearch(initialType: string = "") {
  const [params, setParams] = useState<SearchParams>({
    type: initialType,
    keyword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset(resetType: string = initialType) {
    setParams({ type: resetType, keyword: "" });
    setResponse(null);
    setError(null);
  }

  return {
    params,
    setParams,
    loading,
    error,
    response,
    handleSubmit,
    handleReset,
  };
}

