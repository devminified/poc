"use client";

import Link from "next/link";
import { useSearch } from "@/hooks";

const SEARCH_TYPES = ["Exact Match", "Contains", "Starts With", "Ends With"];

export default function Home() {
  const {
    params,
    setParams,
    loading,
    error,
    response,
    handleSubmit,
    handleReset,
  } = useSearch(SEARCH_TYPES[0]);

  return (
    <div className="px-4 pt-12 pb-12 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Search Configuration
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Set your search parameters below.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="keyword"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Search
              </label>
              <input
                id="keyword"
                type="text"
                required
                placeholder="Enter search term"
                value={params.keyword}
                onChange={(e) =>
                  setParams((p) => ({ ...p, keyword: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Type
              </label>
              <select
                id="type"
                value={params.type}
                onChange={(e) =>
                  setParams((p) => ({ ...p, type: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              >
                {SEARCH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={() => handleReset(SEARCH_TYPES[0])}
              disabled={loading}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {response && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Results ({response.results.length} of {response.totalScraped}{" "}
                programs)
              </h2>
            </div>

            {response.results.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No results found for this search.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {response.results.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900"
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
    </div>
  );
}
