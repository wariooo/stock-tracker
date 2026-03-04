import fs from "fs/promises";
import path from "path";
import type { FilingMeta, Position } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILINGS_PATH = path.join(DATA_DIR, "filings.json");
const POSITIONS_DIR = path.join(DATA_DIR, "positions");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// --- Filings ---

export async function readFilings(): Promise<FilingMeta[]> {
  try {
    const raw = await fs.readFile(FILINGS_PATH, "utf-8");
    return JSON.parse(raw) as FilingMeta[];
  } catch {
    return [];
  }
}

export async function writeFilings(filings: FilingMeta[]) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(FILINGS_PATH, JSON.stringify(filings, null, 2));
}

// --- Positions ---

function positionFile(accession: string) {
  const safe = accession.replace(/-/g, "_");
  return path.join(POSITIONS_DIR, `${safe}.json`);
}

export async function readPositions(accession: string): Promise<Position[]> {
  try {
    const raw = await fs.readFile(positionFile(accession), "utf-8");
    return JSON.parse(raw) as Position[];
  } catch {
    return [];
  }
}

export async function writePositions(accession: string, positions: Position[]) {
  await ensureDir(POSITIONS_DIR);
  await fs.writeFile(positionFile(accession), JSON.stringify(positions, null, 2));
}

// --- Cache ---

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const stat = await fs.stat(filePath);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
      return null;
    }
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, data: unknown) {
  await ensureDir(CACHE_DIR);
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
