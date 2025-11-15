import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { DEFAULT_SOURCES, Source } from "@/lib/sources";
import {
  googleNewsRssUrl,
  fetchRssArticles,
  fetchHtml,
  extractLikelyCompanyNames,
  extractFirstUrl,
  extractEmails,
  buildFounderSearchUrl,
} from "@/lib/fetchers";

export const runtime = "nodejs"; // use Node runtime for cheerio compatibility

export type ScrapeRequest = {
  sources?: Source[];
  fromDateISO: string; // inclusive
  regions?: string[]; // lowercase keywords
};

export type StartupResult = {
  articleTitle: string;
  articleUrl: string;
  sourceName: string;
  publishedAt?: string;
  companyName?: string;
  website?: string;
  founderLinkedinSearch?: string;
  emails?: string[];
};

function isAfter(dateIso?: string, boundaryIso?: string): boolean {
  if (!dateIso || !boundaryIso) return true;
  return new Date(dateIso).getTime() >= new Date(boundaryIso).getTime();
}

function matchesRegions(text: string, regions: string[]): boolean {
  if (!regions || regions.length === 0) return true;
  const t = text.toLowerCase();
  return regions.some((r) => t.includes(r));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ScrapeRequest;
  const sources = (body.sources && body.sources.length > 0 ? body.sources : DEFAULT_SOURCES).filter(
    (s) => s.enabled
  );
  const fromDateISO = body.fromDateISO;
  const regions = (body.regions || []).map((r) => r.toLowerCase());

  const limit = pLimit(5);

  async function collectFromSource(source: Source): Promise<StartupResult[]> {
    try {
      const rssUrl =
        source.type === "rss"
          ? source.url!
          : source.type === "google_news"
          ? googleNewsRssUrl(source.query || "startup")
          : undefined;

      if (!rssUrl) return [];

      const articles = await fetchRssArticles(rssUrl, source.name);
      const filtered = articles.filter(
        (a) => isAfter(a.isoDate, fromDateISO) && matchesRegions(`${a.title} ${a.contentSnippet || ""}`, regions)
      );

      const results = await Promise.all(
        filtered.map((a) =>
          limit(async () => {
            // Fetch article HTML to attempt extraction
            let html = "";
            try {
              html = await fetchHtml(a.link);
            } catch {}

            const companyCandidates = extractLikelyCompanyNames(`${a.title}. ${a.contentSnippet || ""}`);
            const companyName = companyCandidates[0];

            // Try to resolve website: prefer og:url or canonical in article
            let website: string | undefined;
            try {
              if (html) {
                website = extractFirstUrl(html);
              }
            } catch {}

            // If website still points back to publisher, ignore
            if (website && website.includes("news.google.com")) website = undefined;

            // If still missing, try the article link itself
            if (!website) website = a.link;

            // Try to fetch website homepage and find emails
            let emails: string[] = [];
            try {
              if (website) {
                const homepageHtml = await fetchHtml(website);
                emails = extractEmails(homepageHtml);
              }
            } catch {}

            const founderLinkedinSearch = companyName ? buildFounderSearchUrl(companyName) : undefined;

            const res: StartupResult = {
              articleTitle: a.title,
              articleUrl: a.link,
              sourceName: a.sourceName,
              publishedAt: a.isoDate,
              companyName,
              website,
              founderLinkedinSearch,
              emails,
            };
            return res;
          })
        )
      );

      return results;
    } catch (e) {
      return [];
    }
  }

  const allResultsNested = await Promise.all(sources.map((s) => collectFromSource(s)));
  const all = allResultsNested.flat();

  // Deduplicate by articleUrl
  const uniqueMap = new Map<string, StartupResult>();
  for (const r of all) {
    if (!uniqueMap.has(r.articleUrl)) uniqueMap.set(r.articleUrl, r);
  }

  return NextResponse.json({ results: Array.from(uniqueMap.values()) });
}
