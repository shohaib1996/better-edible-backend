import { CannabinoidName } from "../models/Label";

// -------------------
// Types
// -------------------
export interface IGummyConfig {
  size: "standard" | "xl";
  oilType: "biomax" | "rosin";
  effect: "hybrid" | "indica" | "sativa";
  flavorMode: "single" | "mix";
  cannabinoids: { name: CannabinoidName; mg: number }[];
  unitsOrdered: number;
}

export interface IPricingResult {
  unitCost: number;
  totalCost: number;
  isRatio: boolean;
  testingFee: number;
  testingFeeWaived: boolean;
  breakdown: {
    base: number;
    size: number;
    effect: number;
    flavorMode: number;
    cannabinoids: { name: CannabinoidName; mg: number; priceAdd: number }[];
  };
}

// -------------------
// Cannabinoid price table
// -------------------
const CANNABINOID_PRICES: Record<CannabinoidName, Record<number, number>> = {
  CBD: { 100: 0.25, 200: 0.5, 300: 0.75, 400: 1.0 },
  CBG: { 100: 0.5, 200: 1.0 },
  CBN: { 50: 0.6, 100: 1.0 },
  CBC: { 25: 0.6, 50: 1.0, 75: 1.5, 100: 2.0 },
  THCv: { 25: 0.6, 50: 1.0, 75: 1.5, 100: 2.0 },
};

const TESTING_FEE = 250;
const POOL_THRESHOLD = 3000;

// -------------------
// Main pricing function
// -------------------
export function calculateGummyPrice(config: IGummyConfig): IPricingResult {
  const base = config.oilType === "rosin" ? 2.5 : 1.75;
  const size = config.size === "xl" ? 0.05 : 0;
  const effect = config.effect === "hybrid" ? 0 : 0.05;
  const flavorMode = config.flavorMode === "mix" ? 0.05 : 0;

  const cannabinoidBreakdown = config.cannabinoids.map((c) => {
    const priceAdd = CANNABINOID_PRICES[c.name]?.[c.mg] ?? 0;
    return { name: c.name, mg: c.mg, priceAdd };
  });

  const cannabinoidTotal = cannabinoidBreakdown.reduce((sum, c) => sum + c.priceAdd, 0);

  const unitCost = parseFloat((base + size + effect + flavorMode + cannabinoidTotal).toFixed(4));
  const totalCost = parseFloat((unitCost * config.unitsOrdered).toFixed(2));

  const isRatio = config.cannabinoids.length > 0;
  const testingFeeWaived = isRatio && config.unitsOrdered >= POOL_THRESHOLD;
  const testingFee = isRatio && !testingFeeWaived ? TESTING_FEE : 0;

  return {
    unitCost,
    totalCost,
    isRatio,
    testingFee,
    testingFeeWaived,
    breakdown: {
      base,
      size,
      effect,
      flavorMode,
      cannabinoids: cannabinoidBreakdown,
    },
  };
}

// -------------------
// Pool key generator
// Builds a deterministic string from cannabinoid config for pool matching
// e.g. [{ name: "CBD", mg: 200 }, { name: "CBG", mg: 100 }] → "CBC-50_CBD-200"
// -------------------
export function buildCannabinoidKey(cannabinoids: { name: CannabinoidName; mg: number }[]): string {
  return cannabinoids
    .map((c) => `${c.name}-${c.mg}`)
    .sort()
    .join("_");
}
