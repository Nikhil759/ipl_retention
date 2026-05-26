import { VoteResult } from "@/types/player";

export function formatSalaryCr(amount: number): string {
  if (amount >= 1) {
    const value = amount.toFixed(2).replace(/\.?0+$/, "");
    return `₹${value} Cr`;
  }
  return `₹${Math.round(amount * 100)} L`;
}

export function sumSalaries(results: VoteResult[]): number {
  return results.reduce((sum, { player }) => sum + (player.salaryCr ?? 0), 0);
}

export interface PurseSummary {
  freed: number;
  retained: number;
  total: number;
  freedDisplay: string;
  retainedDisplay: string;
}

export function computePurseSummary(results: VoteResult[]): PurseSummary {
  const retainedResults = results.filter((r) => r.decision === "retain");
  const releasedResults = results.filter((r) => r.decision === "release");

  const retained = sumSalaries(retainedResults);
  const freed = sumSalaries(releasedResults);

  return {
    freed,
    retained,
    total: retained + freed,
    freedDisplay: formatSalaryCr(freed),
    retainedDisplay: formatSalaryCr(retained),
  };
}
