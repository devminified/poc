"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

interface SubpageData {
  html: string;
  loading: boolean;
  error: string | null;
}

/** Extract internal links from HTML content as structured items */
function extractInternalLinks(
  html: string,
): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  const regex =
    /<a\s+[^>]*data-internal="true"[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const label = match[2].replace(/<[^>]*>/g, "").trim();
    if (href && label) {
      links.push({ label, href });
    }
  }
  // Also try href before data-internal
  const regex2 =
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*data-internal="true"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = regex2.exec(html)) !== null) {
    const href = match[1];
    const label = match[2].replace(/<[^>]*>/g, "").trim();
    if (href && label && !links.some((l) => l.href === href)) {
      links.push({ label, href });
    }
  }
  return links;
}

/** Remove internal links from HTML, returning the remaining content */
function stripInternalLinks(html: string): string {
  // Remove <a> tags with data-internal but keep their text content
  return html.replace(
    /<a\s+[^>]*data-internal="true"[^>]*>([\s\S]*?)<\/a>/gi,
    "$1",
  );
}

/** Check if a section's content is primarily a list of internal links */
function isSectionLinkList(section: ProgramSection): boolean {
  const links = extractInternalLinks(section.contentHtml);
  if (links.length === 0) return false;
  // If the non-link text is minimal compared to links, treat as a link list
  const stripped = section.contentHtml
    .replace(/<a\s+[^>]*data-internal="true"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  // A section is a "link list" if it has 2+ internal links
  return links.length >= 2 || stripped.length < 100;
}

function SectionAccordion({
  link,
}: {
  link: { label: string; href: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const [subpage, setSubpage] = useState<SubpageData>({
    html: "",
    loading: false,
    error: null,
  });

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    // Already fetched
    if (subpage.html) return;

    setSubpage({ html: "", loading: true, error: null });
    try {
      const res = await fetch("/api/scrape/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.href }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      // Combine description and sections into a single HTML block
      let html = data.descriptionHtml || "";
      if (data.sections?.length) {
        html += data.sections
          .map(
            (s: ProgramSection) =>
              `<h3>${s.heading}</h3>${s.contentHtml}`,
          )
          .join("");
      }
      setSubpage({ html, loading: false, error: null });
    } catch (err) {
      setSubpage({
        html: "",
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }

  return (
    <div className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        {link.label}
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
            expanded ? "rotate-180" : ""
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

      {expanded && (
        <div className="pb-4">
          {subpage.loading && (
            <div className="flex items-center gap-2 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading...
              </span>
            </div>
          )}
          {subpage.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-400">
                {subpage.error}
              </p>
            </div>
          )}
          {subpage.html && (
            <div
              className="prose prose-sm prose-zinc max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: subpage.html }}
            />
          )}
        </div>
      )}
    </div>
  );
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
            {detail.descriptionHtml && (
              <div
                className="prose prose-sm prose-zinc mt-6 max-w-none rounded-lg border border-zinc-200 bg-white p-5 dark:prose-invert dark:border-zinc-800 dark:bg-zinc-900"
                dangerouslySetInnerHTML={{
                  __html: stripInternalLinks(detail.descriptionHtml),
                }}
              />
            )}

            {/* Sections */}
            {detail.sections.length > 0 && (
              <div className="mt-4 space-y-4">
                {detail.sections.map((section, i) => {
                  const links = extractInternalLinks(section.contentHtml);
                  const isLinkList = isSectionLinkList(section);

                  if (isLinkList && links.length > 0) {
                    // Render as expandable accordion items
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {section.heading}
                        </h2>
                        <div>
                          {links.map((link) => (
                            <SectionAccordion key={link.href} link={link} />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Regular section — render HTML with internal links stripped
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {section.heading}
                      </h2>
                      <div
                        className="prose prose-sm prose-zinc max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: stripInternalLinks(section.contentHtml),
                        }}
                      />
                    </div>
                  );
                })}
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
