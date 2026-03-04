"use client";

import { useRouter } from "next/navigation";
import type { Entity } from "@/lib/entities";

interface EntitySelectorProps {
  entities: Entity[];
  selectedCik: string;
}

export function EntitySelector({ entities, selectedCik }: EntitySelectorProps) {
  const router = useRouter();

  function handleChange(cik: string) {
    router.push(`/?cik=${cik}`);
  }

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm text-muted font-medium">Tracking:</span>
      <select
        value={selectedCik}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm bg-card-bg border border-border rounded px-3 py-1.5 cursor-pointer hover:border-accent focus:outline-none focus:border-accent"
      >
        {entities.map((entity) => (
          <option key={entity.cik} value={entity.cik}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}
