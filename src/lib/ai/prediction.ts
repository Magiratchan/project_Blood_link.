// shortagePredictionService — lightweight statistical demand forecasting.
//
// This is NOT a medically validated model. It uses historical demand + current
// inventory to estimate near-term shortage risk. The module is structured so an
// external ML model can be plugged in later by replacing the `forecast()` impl.
//
// Method (statistical-v1):
//   1. Pull last N days of demand (unitsRequested) for region + bloodGroup.
//   2. Compute a rolling 7-day mean + linear trend slope.
//   3. Forecast next 7 days expected demand (mean * (1 + trend) + weekday jitter).
//   4. Compare expected demand vs available inventory → shortageRisk (0-100).
//   5. Emit expectedDemand bucket + recommendation + confidence.

import type { BloodGroup } from "@/lib/types";

export interface DemandPoint {
  date: Date;
  unitsRequested: number;
  unitsFulfilled: number;
}

export interface InventoryPoint {
  bloodGroup: BloodGroup;
  units: number;
  region: string;
}

export interface ShortagePredictionResult {
  region: string;
  bloodGroup: BloodGroup;
  predictedDate: Date;
  shortageRisk: number; // 0-100
  expectedDemand: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  expectedUnits: number;
  availableUnits: number;
  recommendation: string;
  confidence: number; // 0-100
  method: string;
  isSynthetic: boolean;
}

const HORIZON_DAYS = 7;
const MIN_DATA_CONFIDENCE = 35;

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Simple least-squares slope over an index → value series. */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function demandBucket(units: number): ShortagePredictionResult["expectedDemand"] {
  if (units >= 40) return "CRITICAL";
  if (units >= 20) return "HIGH";
  if (units >= 8) return "MODERATE";
  return "LOW";
}

function buildRecommendation(risk: number, expectedDemand: string, trend: number): string {
  if (risk >= 75) {
    return "Critical shortage risk — launch emergency donor outreach and coordinate cross-region transfers immediately.";
  }
  if (risk >= 50) {
    return "High shortage risk — accelerate donor outreach campaigns and pre-stage inventory for the predicted demand spike.";
  }
  if (risk >= 30) {
    return "Moderate risk — monitor closely and alert nearby blood banks to prepare backup supply.";
  }
  if (trend > 0.3) {
    return "Demand trending upward — schedule proactive donor drives to stay ahead of demand.";
  }
  return "Supply is healthy for the forecast horizon — maintain routine donor engagement.";
}

/**
 * Forecast expected demand (units) for the next horizon days from history.
 */
export function forecast(history: DemandPoint[], horizonDays = HORIZON_DAYS): {
  expectedUnits: number;
  trend: number;
  rollingMean: number;
} {
  if (history.length === 0) {
    // No history → use a synthetic baseline so the demo always shows a number.
    return { expectedUnits: horizonDays * 3, trend: 0, rollingMean: 3 };
  }
  const recent = history.slice(-14).map((h) => h.unitsRequested);
  const rollingMean = mean(recent);
  const slope = linearSlope(recent);
  // projected mean over horizon = base * (1 + normalized slope)
  const trend = slope / (rollingMean || 1);
  const projectedDaily = rollingMean * (1 + Math.min(Math.max(trend, -0.4), 0.6));
  const expectedUnits = Math.round(projectedDaily * horizonDays);
  return { expectedUnits, trend, rollingMean };
}

/**
 * Compute shortage risk for a region + blood group.
 */
export function predictShortage(
  region: string,
  bloodGroup: BloodGroup,
  history: DemandPoint[],
  inventory: InventoryPoint[],
  predictedDate = new Date(Date.now() + HORIZON_DAYS * 24 * 60 * 60 * 1000)
): ShortagePredictionResult {
  const { expectedUnits, trend, rollingMean } = forecast(history);
  const availableUnits =
    inventory.find((i) => i.region === region && i.bloodGroup === bloodGroup)?.units ?? 0;

  // Shortage risk: how far short the inventory falls relative to expected demand,
  // amplified by a rising demand trend.
  const coverage = expectedUnits > 0 ? availableUnits / expectedUnits : 1;
  const baseRisk = clamp((1 - coverage) * 100);
  const trendBoost = trend > 0 ? clamp(trend * 60) : 0;
  const shortageRisk = clamp(baseRisk + trendBoost);

  const expectedDemand = demandBucket(expectedUnits);

  // Confidence: more historical data points → higher confidence
  const dataPoints = history.length;
  const confidence = clamp(
    MIN_DATA_CONFIDENCE + Math.min(dataPoints, 30) * 2 + (trend !== 0 ? 5 : 0)
  );

  const recommendation = buildRecommendation(shortageRisk, expectedDemand, trend);

  return {
    region,
    bloodGroup,
    predictedDate,
    shortageRisk,
    expectedDemand,
    expectedUnits,
    availableUnits,
    recommendation,
    confidence,
    method: "statistical-v1",
    isSynthetic: true,
  };
}
