// CU halls + delivery pricing
export const MALE_HALLS = [
  "Alaol Hall",
  "A.F. Rahman Hall",
  "Shahjalal Hall",
  "Suhrawardy Hall",
  "Shah Amanat Hall",
  "Shaheed Abdur Rab Hall",
  "Masterda Surya Sen Hall",
  "Forhad Hossain Hall",
  "Atish Dipankar Hall",
] as const;

export const FEMALE_HALLS = [
  "Shamsun Nahar Hall",
  "Pritilata Hall",
  "Deshnetri Begum Khaleda Zia Hall",
  "Bijoy 24 Hall",
] as const;

export const OTHER_LOCATIONS = [
  "Science Faculty",
  "Library",
  "Academic Building",
  "Gate-1",
  "Gate-2",
  "Station",
  "Other",
] as const;

export const ALL_LOCATIONS = [
  ...MALE_HALLS,
  ...FEMALE_HALLS,
  ...OTHER_LOCATIONS,
] as const;

export type Location = (typeof ALL_LOCATIONS)[number];

// Simple zoning — good-enough distance model
const ZONE_A = new Set<string>([
  "Alaol Hall",
  "A.F. Rahman Hall",
  "Shahjalal Hall",
  "Shah Amanat Hall",
  "Suhrawardy Hall",
]);
const ZONE_B = new Set<string>([
  "Shaheed Abdur Rab Hall",
  "Masterda Surya Sen Hall",
  "Forhad Hossain Hall",
  "Atish Dipankar Hall",
]);
const ZONE_C = new Set<string>([
  "Shamsun Nahar Hall",
  "Pritilata Hall",
  "Deshnetri Begum Khaleda Zia Hall",
  "Bijoy 24 Hall",
]);
const ZONE_D = new Set<string>([
  "Science Faculty",
  "Library",
  "Academic Building",
]);
const OUTSIDE = new Set<string>(["Gate-1", "Gate-2", "Station", "Other"]);

function zone(loc: string): "A" | "B" | "C" | "D" | "X" {
  if (ZONE_A.has(loc)) return "A";
  if (ZONE_B.has(loc)) return "B";
  if (ZONE_C.has(loc)) return "C";
  if (ZONE_D.has(loc)) return "D";
  if (OUTSIDE.has(loc)) return "X";
  return "D";
}

export function calculateDeliveryCharge(
  from: string,
  to: string,
  size: "small" | "medium" | "large" = "small",
): number {
  if (!from || !to) return 0;
  const a = zone(from);
  const b = zone(to);
  let base: number;
  if (from === to) base = 20;
  else if (a === b) base = 30;
  else if (a === "X" || b === "X") base = 60;
  else if ((a === "A" && b === "C") || (a === "C" && b === "A")) base = 50;
  else base = 40;
  const sizeAdd = size === "medium" ? 10 : size === "large" ? 20 : 0;
  return base + sizeAdd;
}
