export interface Entity {
  cik: string;
  name: string;
  shortName: string;
}

export const ENTITIES: Entity[] = [
  {
    cik: "0002045724",
    name: "Situational Awareness LP",
    shortName: "Situational Awareness",
  },
  {
    cik: "0001067983",
    name: "Berkshire Hathaway Inc",
    shortName: "Berkshire Hathaway",
  },
  {
    cik: "0001649339",
    name: "Scion Asset Management (Michael Burry)",
    shortName: "Scion (Burry)",
  },
  {
    cik: "0001336528",
    name: "Pershing Square Capital (Bill Ackman)",
    shortName: "Pershing Square",
  },
  {
    cik: "0001350694",
    name: "Bridgewater Associates",
    shortName: "Bridgewater",
  },
  {
    cik: "0001423053",
    name: "Citadel Advisors",
    shortName: "Citadel",
  },
  {
    cik: "0001037389",
    name: "Renaissance Technologies",
    shortName: "Renaissance",
  },
  {
    cik: "0001167483",
    name: "Tiger Global Management",
    shortName: "Tiger Global",
  },
];

export const DEFAULT_CIK = ENTITIES[0].cik;

export function getEntity(cik: string): Entity | undefined {
  return ENTITIES.find((e) => e.cik === cik);
}

export function isValidCik(cik: string): boolean {
  return ENTITIES.some((e) => e.cik === cik);
}
