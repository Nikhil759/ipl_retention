import { AcquisitionType } from "@/types/player";

export function acquisitionLabel(type: AcquisitionType | null): string | null {
  if (!type) return null;
  return {
    retained: "Retained",
    auction: "Auction",
    replacement: "Replacement",
    trade: "Trade",
  }[type];
}
