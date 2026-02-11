"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ProgramSection {
  heading: string;
  content: string;
}

interface ProgramDetail {
  url: string;
  title: string;
  description: string;
  sections: ProgramSection[];
}

function ProgramContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

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

  return (
    <div className="flex items-start justify-center px-4 pt-12 pb-12 font-sans">
      <div className="w-full max-w-2xl">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Loading State */}
        {loading && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading program details...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Detail Content */}
        {detail && (
          <div>
            {/* Title */}
            <h1 className="mb-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {detail.title}
            </h1>

            {/* External link */}
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-700 hover:decoration-zinc-500 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-zinc-200 dark:hover:decoration-zinc-400"
            >
              View on Canada.ca
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

            {/* Description */}
            {detail.description && (
              <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {detail.description}
                </p>
              </div>
            )}

            {/* Sections */}
            {detail.sections.length > 0 && (
              <div className="mt-4 space-y-4">
                {detail.sections.map((section, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {section.heading}
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProgramPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-start justify-center px-4 pt-12 font-sans">
          <div className="w-full max-w-2xl">
            <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <ProgramContent />
    </Suspense>
  );
}
