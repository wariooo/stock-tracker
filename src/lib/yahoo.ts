import YahooFinance from "yahoo-finance2";
import type { PricePoint } from "./types";

const yahooFinance = new YahooFinance();

const tickerCache = new Map<string, string | null>();

// CUSIP-to-ticker lookup via OpenFIGI API
async function cusipToTicker(cusip: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ idType: "ID_CUSIP", idValue: cusip }]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const figi = data?.[0]?.data?.[0];
    if (figi?.ticker) return figi.ticker as string;
  } catch (e) {
    console.warn(`[openfigi] CUSIP lookup failed for ${cusip}:`, e);
  }
  return null;
}

// Manual overrides for 13F issuer names that Yahoo search can't resolve
const TICKER_OVERRIDES: Record<string, string> = {
  "BLOOM ENERGY CORP": "BE",
  "COREWEAVE INC": "CRWV",
  "CORE SCIENTIFIC INC NEW": "CORZ",
  "CORE SCIENTIFIC INC": "CORZ",
  "APPLIED DIGITAL CORP": "APLD",
  "ASTERA LABS INC": "ALAB",
  "MODULAR MEDICAL INC": "MODD",
  "NEBIUS GROUP N V": "NBIS",
  "NEBIUS GROUP NV": "NBIS",
  "VERTIV HLDGS CO": "VRT",
  "VERTIV HOLDINGS CO": "VRT",
  "CONSTELLATION ENERGY CORP": "CEG",
  "VISTRA CORP": "VST",
  "OKLO INC": "OKLO",
  "TALEN ENERGY CORP": "TLN",
  "CAMECO CORP": "CCJ",
  "NRG ENERGY INC": "NRG",
  "TWILIO INC": "TWLO",
  "COHERENT CORP": "COHR",
  "II VI INC": "COHR",
  "TEMPUS AI INC": "TEM",
  "SAMSUNG ELECTRONICS CO LTD": "005930.KS",
  "TAIWAN SEMICONDUCTOR MFG CO LTD": "TSM",
  "TAIWAN SEMICONDUCTOR MFG LTD": "TSM",
  "ALPHABET INC": "GOOGL",
  "META PLATFORMS INC": "META",
  "MICROSOFT CORP": "MSFT",
  "APPLE INC": "AAPL",
  "AMAZON COM INC": "AMZN",
  "NVIDIA CORP": "NVDA",
  "BROADCOM INC": "AVGO",
  "ELI LILLY & CO": "LLY",
  "ELI LILLY AND CO": "LLY",
  "JPMORGAN CHASE & CO": "JPM",
  "BERKSHIRE HATHAWAY INC": "BRK-B",
  "UNITEDHEALTH GROUP INC": "UNH",
  "JOHNSON & JOHNSON": "JNJ",
  "PROCTER & GAMBLE CO": "PG",
  "HOME DEPOT INC": "HD",
  "ABBVIE INC": "ABBV",
  "WELLS FARGO & CO NEW": "WFC",
  "WELLS FARGO & CO": "WFC",
  "BANK OF AMER CORP": "BAC",
  "BANK AMER CORP": "BAC",
  "COCA COLA CO": "KO",
  "CHEVRON CORP NEW": "CVX",
  "CHEVRON CORP": "CVX",
  "COSTCO WHOLESALE CORP NEW": "COST",
  "COSTCO WHOLESALE CORP": "COST",
  "WALMART INC": "WMT",
  "PEPSICO INC": "PEP",
  "EXXON MOBIL CORP": "XOM",
  "THERMO FISHER SCIENTIFIC INC": "TMO",
  "ABBOTT LABS": "ABT",
  "DANAHER CORP": "DHR",
  "PHILIP MORRIS INTL INC": "PM",
  "S&P GLOBAL INC": "SPGI",
  "INTUIT INC": "INTU",
  "SERVICENOW INC": "NOW",
  "HONEYWELL INTL INC": "HON",
  "AMGEN INC": "AMGN",
  "CATERPILLAR INC": "CAT",
  "LOCKHEED MARTIN CORP": "LMT",
  "DEERE & CO": "DE",
  "LINDE PLC": "LIN",
  "NEXTERA ENERGY INC": "NEE",
  "UNION PAC CORP": "UNP",
  "GOLDMAN SACHS GROUP INC": "GS",
  "MORGAN STANLEY": "MS",
  "BLACKROCK INC": "BLK",
  "CHARLES SCHWAB CORP": "SCHW",
  "AUTOMATIC DATA PROCESSING": "ADP",
  "AUTOMATIC DATA PROCESSING INC": "ADP",
  "PROGRESSIVE CORP OHIO": "PGR",
  "PROGRESSIVE CORP": "PGR",
  "MARSH & MCLENNAN COS INC": "MMC",
  "BECTON DICKINSON & CO": "BDX",
  "STRYKER CORP": "SYK",
  "INTUITIVE SURGICAL INC": "ISRG",
  "BOSTON SCIENTIFIC CORP": "BSX",
  "CIGNA GROUP": "CI",
  "ELEVANCE HEALTH INC": "ELV",
  "HUMANA INC": "HUM",
  "CENTENE CORP DEL": "CNC",
  "CENTENE CORP": "CNC",
  "MCDONALDS CORP": "MCD",
  "STARBUCKS CORP": "SBUX",
  "BOOKING HLDGS INC": "BKNG",
  "BOOKING HOLDINGS INC": "BKNG",
  "AIRBNB INC": "ABNB",
  "UBER TECHNOLOGIES INC": "UBER",
  "PALO ALTO NETWORKS INC": "PANW",
  "CROWDSTRIKE HLDGS INC": "CRWD",
  "CROWDSTRIKE HOLDINGS INC": "CRWD",
  "FORTINET INC": "FTNT",
  "PALANTIR TECHNOLOGIES INC": "PLTR",
  "SNOWFLAKE INC": "SNOW",
  "DATADOG INC": "DDOG",
  "CLOUDFLARE INC": "NET",
  "MONGODB INC": "MDB",
  "ARISTA NETWORKS INC": "ANET",
  "AMPHENOL CORP NEW": "APH",
  "AMPHENOL CORP": "APH",
  "ANALOG DEVICES INC": "ADI",
  "TEXAS INSTRS INC": "TXN",
  "TEXAS INSTRUMENTS INC": "TXN",
  "APPLIED MATLS INC": "AMAT",
  "APPLIED MATERIALS INC": "AMAT",
  "LAM RESEARCH CORP": "LRCX",
  "KLA CORP": "KLAC",
  "MICRON TECHNOLOGY INC": "MU",
  "QUALCOMM INC": "QCOM",
  "MARVELL TECHNOLOGY INC": "MRVL",
  "ADVANCED MICRO DEVICES INC": "AMD",
  "INTEL CORP": "INTC",
  "SALESFORCE INC": "CRM",
  "ADOBE INC": "ADBE",
  "ORACLE CORP": "ORCL",
  "INTERNATIONAL BUSINESS MACHS COR": "IBM",
  "INTERNATIONAL BUSINESS MACHS CORP": "IBM",
  "ACCENTURE PLC IRELAND": "ACN",
  "ACCENTURE PLC": "ACN",
  "VISA INC": "V",
  "MASTERCARD INC": "MA",
  "AMERICAN EXPRESS CO": "AXP",
  "PAYPAL HLDGS INC": "PYPL",
  "PAYPAL HOLDINGS INC": "PYPL",
  "BLOCK INC": "XYZ",
  "COINBASE GLOBAL INC": "COIN",
  "ROBINHOOD MKTS INC": "HOOD",
  "ROBINHOOD MARKETS INC": "HOOD",
  "TESLA INC": "TSLA",
  "RIVIAN AUTOMOTIVE INC": "RIVN",
  "LUCID GROUP INC": "LCID",
  "GENERAL MOTORS CO": "GM",
  "FORD MTR CO DEL": "F",
  "FORD MOTOR CO": "F",
  "WALT DISNEY CO": "DIS",
  "NETFLIX INC": "NFLX",
  "COMCAST CORP NEW": "CMCSA",
  "COMCAST CORP": "CMCSA",
  "AT&T INC": "T",
  "VERIZON COMMUNICATIONS INC": "VZ",
  "T MOBILE US INC": "TMUS",
  "PFIZER INC": "PFE",
  "MERCK & CO INC NEW": "MRK",
  "MERCK & CO INC": "MRK",
  "BRISTOL MYERS SQUIBB CO": "BMY",
  "REGENERON PHARMACEUTICALS INC": "REGN",
  "VERTEX PHARMACEUTICALS INC": "VRTX",
  "GILEAD SCIENCES INC": "GILD",
  "MODERNA INC": "MRNA",
  "BIONTECH SE": "BNTX",
  "TARGET CORP": "TGT",
  "DOLLAR GEN CORP NEW": "DG",
  "DOLLAR GENERAL CORP": "DG",
  "ROSS STORES INC": "ROST",
  "TJX COS INC NEW": "TJX",
  "TJX COMPANIES INC": "TJX",
  "NIKE INC": "NKE",
  "LOWES COS INC": "LOW",
  "SOUTHERN CO": "SO",
  "DUKE ENERGY CORP NEW": "DUK",
  "DUKE ENERGY CORP": "DUK",
  "DOMINION ENERGY INC": "D",
  "SEMPRA": "SRE",
  "SEMPRA ENERGY": "SRE",
  "PUBLIC SVC ENTERPRISE GRP INC": "PEG",
  "PUBLIC SERVICE ENTERPRISE GROUP": "PEG",
  "ENTERGY CORP NEW": "ETR",
  "ENTERGY CORP": "ETR",
  "EXELON CORP": "EXC",
  "AMERICAN ELEC PWR CO INC": "AEP",
  "AMERICAN ELECTRIC POWER CO INC": "AEP",
  "FIRSTENERGY CORP": "FE",
  "XCEL ENERGY INC": "XEL",
  "WEC ENERGY GROUP INC": "WEC",
  "EVERSOURCE ENERGY": "ES",
  "CMS ENERGY CORP": "CMS",
  "ALLIANT ENERGY CORP": "LNT",
  "PINNACLE WEST CAP CORP": "PNW",
  "ATMOS ENERGY CORP": "ATO",
  "SPIRE INC": "SR",
  "IDACORP INC": "IDA",
  "OGE ENERGY CORP": "OGE",
  "PORTLAND GEN ELEC CO": "POR",
  "AVANGRID INC": "AGR",
};

// Preferred US exchanges for filtering search results
const US_EXCHANGES = new Set(["NYQ", "NMS", "NGM", "PCX", "ASE", "NYS", "NAS", "BTS", "NCM"]);

// Common suffixes to strip for fallback search
const STRIP_SUFFIXES = [" NEW", " DEL", " CORP", " INC", " LTD", " CO", " HLDGS", " HOLDINGS", " ENTERPRISES", " PLC", " GROUP", " CL A", " CL B", " CL C"];

function stripSuffixes(name: string): string {
  let cleaned = name;
  for (const suffix of STRIP_SUFFIXES) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
    }
  }
  return cleaned.trim();
}

async function yahooSearch(query: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    const quotes = (result.quotes || []) as Record<string, unknown>[];
    const equities = quotes.filter(
      (q) => q.quoteType === "EQUITY" && typeof q.symbol === "string"
    );

    // Prefer US exchanges
    const usMatch = equities.find((q) => US_EXCHANGES.has(q.exchange as string));
    if (usMatch) return String(usMatch.symbol);

    // Fall back to any equity
    if (equities.length > 0) return String(equities[0].symbol);

    // Fall back to first result with a symbol
    const any = quotes.find((q) => typeof q.symbol === "string");
    return any ? String(any.symbol) : null;
  } catch {
    return null;
  }
}

export async function searchTicker(
  issuerName: string,
  cusip?: string
): Promise<string | null> {
  const cacheKey = cusip ? `${issuerName}|${cusip}` : issuerName;
  if (tickerCache.has(cacheKey)) {
    return tickerCache.get(cacheKey)!;
  }

  // Check manual overrides first
  const upper = issuerName.toUpperCase().trim();
  if (TICKER_OVERRIDES[upper]) {
    const ticker = TICKER_OVERRIDES[upper];
    tickerCache.set(cacheKey, ticker);
    return ticker;
  }

  // Try CUSIP lookup via OpenFIGI
  if (cusip) {
    const figiTicker = await cusipToTicker(cusip);
    if (figiTicker) {
      tickerCache.set(cacheKey, figiTicker);
      return figiTicker;
    }
  }

  // Try full name search
  let ticker = await yahooSearch(issuerName);

  // Fallback: try with suffixes stripped
  if (!ticker) {
    const stripped = stripSuffixes(upper);
    if (stripped !== upper) {
      ticker = await yahooSearch(stripped);
    }
  }

  // Fallback: try first 2 words of issuer name
  if (!ticker) {
    const words = upper.split(/\s+/).slice(0, 2).join(" ");
    if (words !== upper && words.length > 2) {
      ticker = await yahooSearch(words);
    }
  }

  if (!ticker) {
    console.warn(`[yahoo] Could not resolve ticker for: "${issuerName}" (cusip: ${cusip ?? "n/a"})`);
  }

  tickerCache.set(cacheKey, ticker);
  return ticker;
}

export interface QuoteData {
  price: number | null;
  priceChange1M: number | null;
  priceChange6M: number | null;
  priceChange1Y: number | null;
  industry: string | null;
}

export async function getQuote(ticker: string): Promise<QuoteData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(ticker);
    const price = result?.regularMarketPrice ?? null;
    const prevClose = result?.regularMarketPreviousClose;

    // Compute price changes for multiple periods
    let priceChange1M: number | null = null;
    let priceChange6M: number | null = null;
    let priceChange1Y: number | null = null;

    async function fetchPriceChange(daysAgo: number): Promise<number | null> {
      try {
        const start = new Date(Date.now() - daysAgo * 86400000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hist: any = await yahooFinance.chart(ticker, {
          period1: start,
          interval: "1d",
        });
        const quotes = hist?.quotes || [];
        if (quotes.length > 0 && price != null) {
          const oldPrice = quotes[0].close as number;
          if (oldPrice > 0) {
            return (price - oldPrice) / oldPrice;
          }
        }
      } catch {
        // no data for this period
      }
      return null;
    }

    const [c1m, c6m, c1y] = await Promise.all([
      fetchPriceChange(30),
      fetchPriceChange(180),
      fetchPriceChange(365),
    ]);
    priceChange1M = c1m;
    priceChange6M = c6m;
    priceChange1Y = c1y;

    // Fetch industry from asset profile
    let industry: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary: any = await yahooFinance.quoteSummary(ticker, {
        modules: ["assetProfile"],
      });
      industry = summary?.assetProfile?.industry ?? null;
    } catch {
      // Industry data not available for all tickers
    }

    return { price, priceChange1M, priceChange6M, priceChange1Y, industry };
  } catch (e) {
    console.warn(`[yahoo] getQuote failed for ${ticker}:`, e);
    return { price: null, priceChange1M: null, priceChange6M: null, priceChange1Y: null, industry: null };
  }
}

type Period = "1w" | "1m" | "6m" | "1y";

function periodToDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "1w":
      return new Date(now.getTime() - 7 * 86400000);
    case "1m":
      return new Date(now.getTime() - 30 * 86400000);
    case "6m":
      return new Date(now.getTime() - 180 * 86400000);
    case "1y":
      return new Date(now.getTime() - 365 * 86400000);
  }
}

export async function getPriceHistory(
  ticker: string,
  period: Period = "1m"
): Promise<PricePoint[]> {
  try {
    const startDate = periodToDate(period);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.chart(ticker, {
      period1: startDate,
      interval: period === "1w" ? "1h" : "1d",
    });

    return (result.quotes || []).map((q: Record<string, unknown>) => ({
      date: new Date(q.date as string).toISOString().split("T")[0],
      close: (q.close as number) ?? 0,
    }));
  } catch {
    return [];
  }
}
