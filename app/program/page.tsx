"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProgramDetail, useSubpage } from "@/hooks";

interface ProgramSection {
  heading: string;
  contentHtml: string;
}

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

function stripInternalLinks(html: string): string {
  return html.replace(
    /<a\s+[^>]*data-internal="true"[^>]*>([\s\S]*?)<\/a>/gi,
    "$1",
  );
}

function isSectionLinkList(section: ProgramSection): boolean {
  const links = extractInternalLinks(section.contentHtml);
  if (links.length === 0) return false;
  const stripped = section.contentHtml
    .replace(/<a\s+[^>]*data-internal="true"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
  return links.length >= 2 || stripped.length < 100;
}

function isPdfLink(link: { label: string; href: string }): boolean {
  return /\.pdf(\?|#|$)/i.test(link.href) || /\[PDF/i.test(link.label);
}

function PdfLink({ link }: { link: { label: string; href: string } }) {
  return (
    <div className="border-b border-zinc-200 bg-gray-200/50 last:border-b-0 dark:border-zinc-700">
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        <span>{link.label}</span>
        <svg
          className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </a>
    </div>
  );
}

function SectionAccordion({
  link,
}: {
  link: { label: string; href: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const { subpage, fetchSubpage } = useSubpage(link.href);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (!subpage.html) {
      await fetchSubpage();
    }
  }

  return (
    <div className="border-b border-zinc-200 bg-gray-200/50 last:border-b-0 dark:border-zinc-700">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left text-lg font-semibold cursor-pointer text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        {link.label}
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${expanded ? "rotate-180" : ""
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
            <div className="flex items-center justify-center gap-2 py-3">
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
              className="prose prose-sm prose-zinc max-w-none break-words dark:prose-invert [&>div]:p-5"
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
  const { detail, loading, error } = useProgramDetail(url);

  return (
    <div className="flex items-start justify-center px-4 lg:px-8 pt-28 pb-12 font-sans">
      <div className="w-full relative">
        <div className="fixed top-0 h-20 flex items-center md:items-end left-0 pl-20 md:pl-0 md:left-72 right-0 z-10 bg-zinc-50">
          <button
            type="button"
            onClick={() => router.back()}
            className="md:mb-6 m-0 inline-flex items-center gap-1.5 cursor-pointer text-base text-black transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
        </div>

        {loading && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading program details...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {detail && (
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {detail.title}
            </h1>

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

            {detail.descriptionHtml &&
              detail.descriptionHtml.replace(/<[^>]*>/g, "").trim() && (() => {
                const descLinks = extractInternalLinks(detail.descriptionHtml);
                const strippedText = detail.descriptionHtml
                  .replace(/<a\s+[^>]*data-internal="true"[^>]*>[\s\S]*?<\/a>/gi, "")
                  .replace(/<[^>]*>/g, "")
                  .trim();
                const isDescLinkList = descLinks.length >= 2 || (descLinks.length > 0 && strippedText.length < 100);

                if (isDescLinkList && descLinks.length > 0) {
                  return (
                    <div className="mt-6 rounded-lg border border-zinc-200 bg-neutral-100/80 dark:border-zinc-800 dark:bg-zinc-900">
                      {strippedText && (
                        <div
                          className="prose prose-sm prose-zinc mb-3 max-w-none dark:prose-invert [&>div]:!p-5"
                          dangerouslySetInnerHTML={{ __html: stripInternalLinks(detail.descriptionHtml) }}
                        />
                      )}
                      <div>
                        {descLinks.map((link) =>
                          isPdfLink(link) ? (
                            <PdfLink key={link.href} link={link} />
                          ) : (
                            <SectionAccordion key={link.href} link={link} />
                          )
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className="prose prose-sm prose-zinc mt-6 max-w-none rounded-lg border border-zinc-200 bg-gray-200/50 p-5 dark:prose-invert dark:border-zinc-800 dark:bg-zinc-900"
                    dangerouslySetInnerHTML={{
                      __html: stripInternalLinks(detail.descriptionHtml),
                    }}
                  />
                );
              })()}

            {detail.sections.length > 0 && (
              <div className="mt-4 space-y-4">
                {detail.sections.map((section, i) => {
                  const links = extractInternalLinks(section.contentHtml);
                  const isLinkList = isSectionLinkList(section);

                  if (isLinkList && links.length > 0) {
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-zinc-200 bg-gray-200/50 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <h2 className="mb-3 pt-5 px-3 pb-0 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {section.heading}
                        </h2>
                        <div>
                          {links.map((link) =>
                            isPdfLink(link) ? (
                              <PdfLink key={link.href} link={link} />
                            ) : (
                              <SectionAccordion key={link.href} link={link} />
                            )
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-200 bg-gray-200/50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-100">
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
