"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SOURCES, Source } from "@/lib/sources";

const STORAGE_KEY = "agentic_sources_v1";

export function SourceManager(props: {
  value?: Source[];
  onChange?: (sources: Source[]) => void;
}) {
  const { value, onChange } = props;
  const [sources, setSources] = useState<Source[]>(value ?? DEFAULT_SOURCES);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Source[];
        setSources(parsed);
        onChange?.(parsed);
      } catch {}
    } else {
      onChange?.(sources);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    onChange?.(sources);
  }, [sources, onChange]);

  function toggle(id: string) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function remove(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  function addNew() {
    const id = `custom_${Date.now()}`;
    setSources((prev) => [
      ...prev,
      {
        id,
        name: "Custom RSS",
        type: "rss",
        url: "https://example.com/feed",
        enabled: true,
      },
    ]);
  }

  function updateField(id: string, field: keyof Source, value: any) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  const visible = useMemo(() => sources, [sources]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sources</h3>
        <button
          className="rounded bg-black px-3 py-1.5 text-white hover:opacity-90"
          onClick={addNew}
        >
          Add Source
        </button>
      </div>
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="rounded border p-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.id)} />
              <input
                className="flex-1 rounded border px-2 py-1"
                value={s.name}
                onChange={(e) => updateField(s.id, "name", e.target.value)}
              />
              <select
                className="rounded border px-2 py-1"
                value={s.type}
                onChange={(e) => updateField(s.id, "type", e.target.value as any)}
              >
                <option value="rss">RSS</option>
                <option value="google_news">Google News</option>
              </select>
              <button className="text-red-600" onClick={() => remove(s.id)}>
                Remove
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {s.type === "rss" ? (
                <input
                  className="rounded border px-2 py-1"
                  placeholder="RSS URL"
                  value={s.url || ""}
                  onChange={(e) => updateField(s.id, "url", e.target.value)}
                />
              ) : (
                <input
                  className="rounded border px-2 py-1"
                  placeholder="Google News query (e.g. site:techinasia.com startup)"
                  value={s.query || ""}
                  onChange={(e) => updateField(s.id, "query", e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
