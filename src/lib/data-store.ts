import fs from "fs/promises";
import path from "path";
import type { FilingMeta, Position } from "./types";
import { isValidAccession, isValidCacheKey, sanitizePath } from "./validate";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function entityDir(cik: string) {
  return path.join(DATA_DIR, sanitizePath(cik));
}

function filingsPath(cik: string) {
  return path.join(entityDir(cik), "filings.json");
}

function positionsDir(cik: string) {
  return path.join(entityDir(cik), "positions");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function isEnoent(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT";
}

// --- Filings ---

export async function readFilings(cik: string): Promise<FilingMeta[]> {
  try {
    const raw = await fs.readFile(filingsPath(cik), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[data-store] filings.json for ${cik} is not an array`);
      return [];
    }
    return parsed as FilingMeta[];
  } catch (err) {
    if (isEnoent(err)) return [];
    console.error(`[data-store] Failed to read filings for ${cik}:`, err);
    throw err;
  }
}

export async function writeFilings(cik: string, filings: FilingMeta[]) {
  await ensureDir(entityDir(cik));
  await fs.writeFile(filingsPath(cik), JSON.stringify(filings, null, 2));
}

// --- Positions ---

function positionFile(cik: string, accession: string) {
  if (!isValidAccession(accession)) {
    throw new Error(`Invalid accession number: ${accession}`);
  }
  const safe = accession.replace(/-/g, "_");
  return path.join(positionsDir(cik), `${safe}.json`);
}

export async function readPositions(cik: string, accession: string): Promise<Position[]> {
  try {
    const raw = await fs.readFile(positionFile(cik, accession), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[data-store] positions for ${accession} is not an array`);
      return [];
    }
    return parsed as Position[];
  } catch (err) {
    if (isEnoent(err)) return [];
    console.error(`[data-store] Failed to read positions for ${cik}/${accession}:`, err);
    throw err;
  }
}

export async function writePositions(cik: string, accession: string, positions: Position[]) {
  await ensureDir(positionsDir(cik));
  await fs.writeFile(positionFile(cik, accession), JSON.stringify(positions, null, 2));
}

// --- Cache ---

export async function readCache<T>(key: string): Promise<T | null> {
  if (!isValidCacheKey(key)) {
    console.warn(`[data-store] Invalid cache key: ${key}`);
    return null;
  }
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const stat = await fs.stat(filePath);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
      return null;
    }
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if (isEnoent(err)) return null;
    console.error(`[data-store] Failed to read cache for ${key}:`, err);
    return null;
  }
}

export async function writeCache(key: string, data: unknown) {
  if (!isValidCacheKey(key)) {
    console.warn(`[data-store] Invalid cache key, skipping write: ${key}`);
    return;
  }
  await ensureDir(CACHE_DIR);
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
