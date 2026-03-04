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
];

export const DEFAULT_CIK = ENTITIES[0].cik;

export function getEntity(cik: string): Entity | undefined {
  return ENTITIES.find((e) => e.cik === cik);
}

export function isValidCik(cik: string): boolean {
  return ENTITIES.some((e) => e.cik === cik);
}
