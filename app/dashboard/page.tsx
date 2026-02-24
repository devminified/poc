"use client";

import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { useSavedSearches } from "@/hooks";

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

        {!loading && !error && searches.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved searches yet. Run a search to get started.
            </p>
          </div>
        )}

        {!loading && !error && searches.length > 0 && (
          <div className="space-y-8">
            {searches.map((search) => (
              <div key={search.id}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {search.searchParams.keyword || "All programs"}
                  </h2>
                  <span className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {search.searchParams.type}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {search.results.length} of {search.totalScraped} results
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatRelativeTime(search.createdAt)}
                  </span>
                </div>

                {search.results.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No results found for this search.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {search.results.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                      >
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
                            {item.value && (
                              <p className="mt-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {item.value}
                              </p>
                            )}
                            {item.description && (
                              <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {(item.date || item.status) && (
                            <div className="w-1/3 shrink-0 text-right">
                              {item.date && (
                                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                  {item.date}
                                </p>
                              )}
                              {item.status && (
                                <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                                  {item.status}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
