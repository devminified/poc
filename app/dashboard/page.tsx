"use client";

import { useState } from "react";
import Link from "next/link";
import { useSavedSearches } from "@/hooks";

const PAGE_SIZE = 10;

function cleanValue(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/(?:up to\s+)?\$[\d,]+(?:\.\d{2})?(?:\s+(?:and a maximum of|to)\s+\$[\d,]+(?:\.\d{2})?)?(?:\s+per\s+\w+)?/i);
  return m ? m[0].trim() : raw;
}

function cleanStatus(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\s+(?:from|until|by)\s+.*/i, "").trim();
}

function extractDate(status: string, existingDate: string): string {
  if (existingDate) return existingDate;
  if (!status) return "";
  const m = status.match(/((?:from|until|by)\s.+)/i)
    || status.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}.*)/i);
  return m ? m[1].trim() : "";
}

function formatSearchLabel(params: { keyword: string; theme: string; value: string }): string {
  const parts: string[] = [];
  if (params.keyword) parts.push(`Keyword: ${params.keyword}`);
  if (params.theme) parts.push(`Type: ${params.theme}`);
  if (params.value) parts.push(`Value: ${params.value}`);
  return parts.length > 0 ? parts.join(" | ") : "All Programs";
}

interface FlatJob {
  searchLabel: string;
  title: string;
  url: string;
  description: string;
  status: string;
  value: string;
  date: string;
}

export default function Dashboard() {
  const { searches, loading, error } = useSavedSearches();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Flatten all jobs with their search label, deduplicate by URL
  const allJobs: FlatJob[] = (() => {
    const seen = new Set<string>();
    const jobs: FlatJob[] = [];
    for (const search of searches) {
      const label = formatSearchLabel(search.searchParams);
      for (const item of search.results) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          const date = extractDate(item.status, item.date);
          jobs.push({
            searchLabel: label,
            ...item,
            value: cleanValue(item.value),
            status: cleanStatus(item.status),
            date,
          });
        }
      }
    }
    return jobs;
  })();

  const visibleJobs = allJobs.slice(0, visibleCount);
  const hasMore = allJobs.length > visibleCount;

  return (
    <div className="px-4 pt-12 pb-12 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Listing
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Review your past search results.
          </p>
        </div>

        {loading && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && allJobs.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved searches yet. Run a search to get started.
            </p>
          </div>
        )}

        {!loading && !error && allJobs.length > 0 && (
          <div>
            <ul className="space-y-3">
              {visibleJobs.map((item, i) => {
                const prevLabel = i > 0 ? visibleJobs[i - 1].searchLabel : null;
                const showLabel = item.searchLabel !== prevLabel;

                return (
                  <li key={i}>
                    {showLabel && (
                      <p className={`${i > 0 ? "mt-6" : ""} mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300`}>
                        {item.searchLabel}
                      </p>
                    )}
                    <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Link
                              href={`/program?url=${encodeURIComponent(item.url)}`}
                              className="truncate text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-700 dark:hover:decoration-zinc-400"
                            >
                              {item.title}
                            </Link>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                              title="Open on Canada.ca"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                          {item.description && (
                            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                              {item.description}
                            </p>
                          )}
                          {item.value && (
                            <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">Amount:</span>{" "}
                              {item.value}
                            </p>
                          )}
                        </div>
                        {(item.date || item.status) && (
                          <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
                            {item.date ? (
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Due Date:</span>{" "}
                                {item.date}
                              </p>
                            ) : <span />}
                            {item.status && (
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Status:</span>{" "}
                                {item.status}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
