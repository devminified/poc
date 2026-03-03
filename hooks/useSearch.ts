"use client";

import { useState, useCallback, type FormEvent } from "react";

interface SearchParams {
  keyword: string;
  theme: string;
  amountMin: string;
  amountMax: string;
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

function parseAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  const num = parseFloat(raw.replace(/[,$\s]/g, ""));
  return isNaN(num) ? null : num;
}

export function useSearch() {
  const [params, setParams] = useState<SearchParams>({
    keyword: "",
    theme: "",
    amountMin: "",
    amountMax: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  const fetchJobs = useCallback(async (overrideParams?: SearchParams) => {
    setLoading(true);
    setError(null);
    setAmountError(null);
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
    setAmountError(null);

    const min = parseAmount(params.amountMin);
    const max = parseAmount(params.amountMax);

    if (min !== null && max !== null && max < min) {
      setAmountError("Max amount cannot be less than min amount.");
      return;
    }

    fetchJobs();
  }

  function handleReset() {
    setParams({ keyword: "", theme: "", amountMin: "", amountMax: "" });
    setResponse(null);
    setError(null);
    setAmountError(null);
  }

  return {
    params,
    setParams,
    loading,
    error,
    amountError,
    response,
    handleSubmit,
    handleReset,
    fetchJobs,
  };
}
