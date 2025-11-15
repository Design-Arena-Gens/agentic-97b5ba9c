"use client";

import { useMemo } from "react";
import type { StartupResult } from "@/app/api/scrape/route";

export function ResultsTable({ results }: { results: StartupResult[] }) {
  const csv = useMemo(() => toCsv(results), [results]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `startups_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Results ({results.length})</h3>
        <button
          className="rounded bg-black px-3 py-1.5 text-white hover:opacity-90 disabled:opacity-50"
          onClick={downloadCsv}
          disabled={results.length === 0}
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="border px-3 py-2 text-left">Article</th>
              <th className="border px-3 py-2 text-left">Source</th>
              <th className="border px-3 py-2 text-left">Published</th>
              <th className="border px-3 py-2 text-left">Startup</th>
              <th className="border px-3 py-2 text-left">Website</th>
              <th className="border px-3 py-2 text-left">Founder LinkedIn Search</th>
              <th className="border px-3 py-2 text-left">Emails</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.articleUrl} className="odd:bg-white even:bg-zinc-50">
                <td className="border px-3 py-2 align-top">
                  <a className="text-blue-600 hover:underline" href={r.articleUrl} target="_blank" rel="noreferrer">
                    {r.articleTitle}
                  </a>
                </td>
                <td className="border px-3 py-2 align-top">{r.sourceName}</td>
                <td className="border px-3 py-2 align-top">{r.publishedAt?.slice(0, 10) || ""}</td>
                <td className="border px-3 py-2 align-top">{r.companyName || ""}</td>
                <td className="border px-3 py-2 align-top">
                  {r.website ? (
                    <a className="text-blue-600 hover:underline" href={r.website} target="_blank" rel="noreferrer">
                      {r.website}
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border px-3 py-2 align-top">
                  {r.founderLinkedinSearch ? (
                    <a
                      className="text-blue-600 hover:underline"
                      href={r.founderLinkedinSearch}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open search
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td className="border px-3 py-2 align-top">{(r.emails || []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toCsv(rows: StartupResult[]): string {
  const header = [
    "article_title",
    "article_url",
    "source",
    "published_at",
    "startup_name",
    "website",
    "founder_linkedin_search",
    "emails",
  ];
  const data = rows.map((r) => [
    sanitize(r.articleTitle),
    sanitize(r.articleUrl),
    sanitize(r.sourceName),
    sanitize(r.publishedAt || ""),
    sanitize(r.companyName || ""),
    sanitize(r.website || ""),
    sanitize(r.founderLinkedinSearch || ""),
    sanitize((r.emails || []).join("; ")),
  ]);
  return [header.join(","), ...data.map((row) => row.join(","))].join("\n");
}

function sanitize(s: string): string {
  if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
    return `"${s.replace(/\"/g, '"').replace(/"/g, '""')}` + `"`;
  }
  return s;
}
