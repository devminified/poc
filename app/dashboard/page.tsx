"use client";

import { useState } from "react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { useSavedSearches } from "@/hooks";

interface SavedSearch {
  id: string;
  searchParams: { type: string; keyword: string };
  results: Array<{
    title: string;
    url: string;
    description: string;
    status: string;
    theme: string;
  }>;
  totalScraped: number;
  createdAt: Timestamp | null;
}

function formatRelativeTime(timestamp: Timestamp | null): string {
  if (!timestamp) return "Just now";

  const now = Date.now();
  const then = timestamp.toMillis();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function Dashboard() {
  const { searches, loading, error } = useSavedSearches();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex items-start justify-center px-4 pt-12 pb-12 font-sans">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Saved Searches
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Review your past search results.
          </p>
        </div>

        {loading && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading saved searches...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && searches.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved searches yet. Run a search to get started.
            </p>
          </div>
        )}

        {!loading && !error && searches.length > 0 && (
          <div className="space-y-3">
            {searches.map((search) => {
              const isExpanded = expandedId === search.id;
              return (
                <div
                  key={search.id}
                  className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : search.id)
                    }
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {search.searchParams.keyword || "All programs"}
                        </span>
                        <span className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {search.searchParams.type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>
                          {search.results.length} of {search.totalScraped}{" "}
                          results
                        </span>
                        <span>{formatRelativeTime(search.createdAt)}</span>
                      </div>
                    </div>
                    <svg
                      className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                      {search.results.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No results found for this search.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {search.results.map((item, i) => (
                            <li
                              key={i}
                              className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
                            >
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/program?url=${encodeURIComponent(item.url)}`}
                                  className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-700 dark:hover:decoration-zinc-400"
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
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                  {item.description}
                                </p>
                              )}
                              {(item.status || item.theme) && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.status && (
                                    <span className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      {item.status}
                                    </span>
                                  )}
                                  {item.theme && (
                                    <span className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      {item.theme}
                                    </span>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
