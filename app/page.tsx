"use client";

import Link from "next/link";
import { useSearch } from "@/hooks";

export default function Home() {
  const {
    params,
    setParams,
    loading,
    error,
    amountError,
    response,
    handleSubmit,
    handleReset,
  } = useSearch();

  return (
    <div className="px-4 pt-20 pb-12 font-sans sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Search
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Set your search parameters below.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative">
              <label
                htmlFor="keyword"
                className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              >
                Keyword
              </label>
              <input
                id="keyword"
                type="text"
                placeholder="Enter Search Term"
                value={params.keyword}
                onChange={(e) =>
                  setParams((p) => ({ ...p, keyword: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition
                focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-300
                disabled:opacity-50
                dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
              />
            </div>

            <div className="relative">
              <label
                htmlFor="theme"
                className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              >
                Type
              </label>
              <input
                id="theme"
                type="text"
                placeholder="e.g. Jobs, training and education"
                value={params.theme}
                onChange={(e) =>
                  setParams((p) => ({ ...p, theme: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition
                focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-300
                disabled:opacity-50
                dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
              />
            </div>

            <div className="relative">
              <label
                htmlFor="amountMin"
                className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              >
                Min Amount
              </label>
              <input
                id="amountMin"
                type="text"
                placeholder="e.g. $1,000"
                value={params.amountMin}
                onChange={(e) =>
                  setParams((p) => ({ ...p, amountMin: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition
                focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-300
                disabled:opacity-50
                dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900" />
            </div>

            <div className="relative">
              <label
                htmlFor="amountMax"
                className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              >
                Max Amount
              </label>
              <input
                id="amountMax"
                type="text"
                placeholder="e.g. $500,000"
                value={params.amountMax}
                onChange={(e) =>
                  setParams((p) => ({ ...p, amountMax: e.target.value }))
                }
                disabled={loading}
                className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition
                focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-300
                disabled:opacity-50
                dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
              />
            </div>
          </div>

          {amountError && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {amountError}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-teal-700 cursor-pointer px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700/80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={() => handleReset()}
              disabled={loading}
              className="rounded-lg border cursor-pointer border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
            <div className="mb-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {response.results.length} of {response.totalScraped} programs
              </p>
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
