"use client";

import { useState, useCallback, type FormEvent } from "react";

interface SearchParams {
  keyword: string;
  theme: string;
  value: string;
}

interface ScrapedItem {
  title: string;
  url: string;
  description: string;
  status: string;
  theme: string;
  value: string;
  date: string;
}

interface SearchResponse {
  id: string;
  searchParams: SearchParams;
  results: ScrapedItem[];
  totalScraped: number;
}

export function useSearch() {
  const [params, setParams] = useState<SearchParams>({
    keyword: "",
    theme: "",
    value: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  const fetchJobs = useCallback(async (overrideParams?: SearchParams) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideParams ?? params),
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
  }, [params]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    fetchJobs();
  }

  function handleReset() {
    setParams({ keyword: "", theme: "", value: "" });
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
    fetchJobs,
  };
}
