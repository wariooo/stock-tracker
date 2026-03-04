import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { FilingMeta, Position } from "./types";
import {
  readFilings,
  writeFilings,
  readCache,
  writeCache,
  writePositions,
} from "./data-store";

const SEC_BASE = "https://data.sec.gov";
const SEC_ARCHIVES = "https://www.sec.gov/Archives/edgar/data";

function getUserAgent(): string {
  const ua = process.env.SEC_USER_AGENT;
  if (!ua) throw new Error("SEC_USER_AGENT env var is required");
  return ua;
}

async function fetchWithUA(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": getUserAgent(),
      Accept: "application/json, text/html, application/xml, */*",
    },
  });
  if (!res.ok) {
    throw new Error(`SEC fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

function padCik(cik: string): string {
  return cik.replace(/^0*/, "").padStart(10, "0");
}

function cikInt(cik: string): string {
  return cik.replace(/^0+/, "");
}

export async function getFilings(
  cik: string,
  limit = 20
): Promise<FilingMeta[]> {
  const cacheKey = `filings_${cik}`;
  const cached = await readCache<FilingMeta[]>(cacheKey);
  if (cached) return cached;

  const url = `${SEC_BASE}/submissions/CIK${padCik(cik)}.json`;
  const res = await fetchWithUA(url);
  const data = await res.json();

  const recent = data.filings?.recentFilings || data.filings?.recent;
  if (!recent) return [];

  const forms: string[] = recent.form || [];
  const accessions: string[] = recent.accessionNumber || [];
  const filingDates: string[] = recent.filingDate || [];
  const reportDates: string[] = recent.reportDate || [];
  const primaryDocs: string[] = recent.primaryDocument || [];

  const filings: FilingMeta[] = [];
  for (let i = 0; i < forms.length && filings.length < limit; i++) {
    if (forms[i] === "13F-HR") {
      filings.push({
        accession: accessions[i],
        filingDate: filingDates[i],
        reportDate: reportDates[i],
        primaryDocument: primaryDocs[i],
      });
    }
  }

  await writeCache(cacheKey, filings);
  return filings;
}

export async function getInfoTableUrl(
  cik: string,
  accession: string
): Promise<string | null> {
  const accNoDash = accession.replace(/-/g, "");
  const indexUrl = `${SEC_ARCHIVES}/${cikInt(cik)}/${accNoDash}/${accession}-index.html`;

  const res = await fetchWithUA(indexUrl);
  const html = await res.text();
  const $ = cheerio.load(html);

  let xmlUrl: string | null = null;
  $("table.tableFile a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().toLowerCase();
    if (
      href.endsWith(".xml") &&
      !href.includes("primary_doc") &&
      (text.includes("infotable") ||
        text.includes("information table") ||
        href.toLowerCase().includes("infotable"))
    ) {
      xmlUrl = href.startsWith("http")
        ? href
        : `https://www.sec.gov${href}`;
    }
  });

  // Fallback: look for any XML that's not the primary doc
  if (!xmlUrl) {
    $("table.tableFile a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.endsWith(".xml") && !href.includes("primary_doc")) {
        xmlUrl = href.startsWith("http")
          ? href
          : `https://www.sec.gov${href}`;
      }
    });
  }

  return xmlUrl;
}

export function parseInfoTableXml(
  xml: string,
  filing: FilingMeta
): Position[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const doc = parser.parse(xml);

  // The info table can be at different paths depending on namespace
  let entries =
    doc.informationTable?.infoTable ||
    doc.informationTable?.InfoTable ||
    [];

  if (!Array.isArray(entries)) entries = [entries];

  return entries.map(
    (e: Record<string, unknown>): Position => {
      const shrsOrPrn = e.shrsOrPrnAmt as Record<string, unknown> | undefined;
      const putCall = (e.putCall as string) || null;
      return {
        issuer: (e.nameOfIssuer as string) || "",
        cusip: (e.cusip as string) || "",
        valueUsd: (Number(e.value) || 0) * 1000,
        shares: Number(shrsOrPrn?.sshPrnamt) || 0,
        putCall,
        reportDate: filing.reportDate,
        filingDate: filing.filingDate,
        accession: filing.accession,
      };
    }
  );
}

export async function pollFilings(cik: string): Promise<{
  newFilings: number;
  totalPositions: number;
}> {
  const remoteFilings = await getFilings(cik, 20);
  const existing = await readFilings();
  const existingAccessions = new Set(existing.map((f) => f.accession));

  let newCount = 0;
  let totalPos = 0;

  for (const filing of remoteFilings) {
    if (existingAccessions.has(filing.accession)) continue;

    const xmlUrl = await getInfoTableUrl(cik, filing.accession);
    if (!xmlUrl) continue;

    const res = await fetchWithUA(xmlUrl);
    const xml = await res.text();
    const positions = parseInfoTableXml(xml, filing);

    await writePositions(filing.accession, positions);
    existing.push(filing);
    newCount++;
    totalPos += positions.length;

    // SEC rate limit: ~10 req/sec
    await new Promise((r) => setTimeout(r, 150));
  }

  // Sort by reportDate descending
  existing.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  await writeFilings(existing);

  return { newFilings: newCount, totalPositions: totalPos };
}
