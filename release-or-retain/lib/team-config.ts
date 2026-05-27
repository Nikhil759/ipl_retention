export interface TeamConfig {
  primary: string;
  secondary: string;
  text: string;
}

export const TEAM_COLORS: Record<string, TeamConfig> = {
  RCB: { primary: "#CC0000", secondary: "#1a1a1a", text: "#ffffff" },
  MI:  { primary: "#004BA0", secondary: "#62CADC", text: "#ffffff" },
  CSK: { primary: "#F9CD05", secondary: "#1E4E9E", text: "#1E4E9E" },
  RR:  { primary: "#E8457C", secondary: "#2563A4", text: "#ffffff" },
  SRH: { primary: "#F26522", secondary: "#111111", text: "#ffffff" },
  GT:  { primary: "#1B3A6B", secondary: "#D4AF37", text: "#ffffff" },
  KKR: { primary: "#3A225D", secondary: "#D4AF37", text: "#ffffff" },
  PBKS:{ primary: "#D71920", secondary: "#FBBF3A", text: "#ffffff" },
  DC:  { primary: "#0078BC", secondary: "#EF1C25", text: "#ffffff" },
  LSG: { primary: "#A72B2A", secondary: "#FFD700", text: "#ffffff" },
};

export const SWIPE_THRESHOLD = 100; // px before a swipe is registered (desktop)
export const SWIPE_THRESHOLD_MOBILE = 65; // lower threshold for touch devices

export function getSwipeThreshold(): number {
  if (typeof window === "undefined") return SWIPE_THRESHOLD;
  return window.matchMedia("(pointer: coarse)").matches
    ? SWIPE_THRESHOLD_MOBILE
    : SWIPE_THRESHOLD;
}

export const CARD_BASE_WIDTH = 340;
export const CARD_BASE_HEIGHT = 490;
export const CARD_ALLROUNDER_HEIGHT = 560;

export const TEAM_NAMES: Record<string, string> = {
  CSK: "Chennai Super Kings",
  DC: "Delhi Capitals",
  GT: "Gujarat Titans",
  KKR: "Kolkata Knight Riders",
  LSG: "Lucknow Super Giants",
  MI: "Mumbai Indians",
  PBKS: "Punjab Kings",
  RR: "Rajasthan Royals",
  RCB: "Royal Challengers Bengaluru",
  SRH: "Sunrisers Hyderabad",
};

export const TEAM_CODES = Object.keys(TEAM_COLORS) as Array<keyof typeof TEAM_COLORS>;
