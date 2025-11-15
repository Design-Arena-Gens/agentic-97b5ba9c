"use client";

import { useEffect, useMemo, useState } from "react";
import { SourceManager } from "@/components/SourceManager";
import { ResultsTable } from "@/components/ResultsTable";
import { DEFAULT_SOURCES, REGION_KEYWORDS, type Source } from "@/lib/sources";
import type { StartupResult } from "./api/scrape/route";

export default function Home() {
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [regions, setRegions] = useState<string[]>(["singapore", "thailand", "malaysia", "philippines"]);
  const [sources, setSources] = useState<Source[]>(DEFAULT_SOURCES);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StartupResult[]>([]);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          fromDateISO: new Date(fromDate).toISOString(),
          regions,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  function toggleRegion(r: string) {
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  const selectedCount = useMemo(() => sources.filter((s) => s.enabled).length, [sources]);

  useEffect(() => {
    // Default run for last 7 days
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFromDate(d.toISOString().slice(0, 10));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">SEA Startup Finder Agent</h1>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded border bg-white p-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">Published on or after</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-3 py-2"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Regions</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {REGION_KEYWORDS.slice(0, 4).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={regions.includes(r)} onChange={() => toggleRegion(r)} />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded border bg-white p-4">
          <SourceManager value={sources} onChange={setSources} />
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-zinc-600">{selectedCount} sources selected</div>
            <button
              onClick={run}
              disabled={loading || selectedCount === 0}
              className="rounded bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Agent"}
            </button>
          </div>
        </div>

        <ResultsTable results={results} />
      </div>
    </div>
  );
}
