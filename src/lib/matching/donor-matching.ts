// donorMatchingService — AI-assisted donor ranking engine.
//
// This is a transparent, explainable scoring engine (NOT a medically validated
// AI model). It is labelled throughout the UI as "AI-assisted donor matching
// score". The architecture is modular so an external ML model can be wired in
// later by replacing the scoring function.
//
// Scoring (configurable weights, total = 100):
//   - Distance Score        : 0–30   (closer donors rank higher)
//   - Availability Score     : 0–25   (available + ready = higher)
//   - Urgency Score          : 0–20   (readiness for the request's urgency)
//   - Response Reliability   : 0–25   (historical response behaviour)
//
// Compatibility (ABO/Rh) is a MANDATORY eligibility filter — incompatible donors
// are removed before scoring and never ranked.

import type { BloodGroup, Urgency } from "@/lib/types";
import { MATCH_WEIGHTS } from "@/lib/types";
import { bloodCompatibilityService } from "@/lib/blood/compatibility";
import { haversineKm, distanceScore as distanceQuality } from "@/lib/matching/distance";

export interface DonorCandidate {
  id: string;
  userId: string;
  name: string;
  bloodGroup: BloodGroup;
  lat: number;
  lng: number;
  region: string;
  available: boolean;
  lastDonationDate: Date | null;
  donationCount: number;
  responseRate: number;
  totalRequests: number;
  acceptedCount: number;
  declinedCount: number;
  noResponseCount: number;
  verificationStatus: string;
}

export interface ScoreBreakdown {
  distanceKm: number;
  distanceScore: number;
  availabilityScore: number;
  urgencyScore: number;
  responseScore: number;
  matchScore: number;
  compatible: boolean;
  compatibilityQuality: number;
}

export interface MatchResult extends ScoreBreakdown {
  donor: DonorCandidate;
  rank: number;
  recommendationReason: string;
}

export interface MatchingConfig {
  weights: { distance: number; availability: number; urgency: number; response: number };
  maxRadiusKm: number;
  deferralDays: number; // min days since last donation to be eligible
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: { ...MATCH_WEIGHTS },
  maxRadiusKm: 30,
  deferralDays: 56, // standard whole-blood donation deferral
};

const URGENCY_MULTIPLIER: Record<Urgency, number> = {
  CRITICAL: 1.0,
  HIGH: 0.92,
  MEDIUM: 0.82,
  NORMAL: 0.7,
};

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function freshnessBonus(days: number | null): number {
  if (days === null) return 10; // never donated — fully ready
  if (days >= 120) return 10;
  if (days >= 90) return 8;
  if (days >= 56) return 5;
  return 0; // too recent — would normally be filtered
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Score a single donor candidate against a blood request.
 * Returns null if the donor is ineligible (incompatible / unavailable / deferred).
 */
export function scoreDonor(
  donor: DonorCandidate,
  recipientGroup: BloodGroup,
  urgency: Urgency,
  hospitalLat: number,
  hospitalLng: number,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchResult | null {
  // ---- Mandatory eligibility filters ----
  // 1. Blood compatibility
  const compatible = bloodCompatibilityService.isCompatible(recipientGroup, donor.bloodGroup);
  if (!compatible) {
    // Return an incompatible result so the UI can show "filtered out" reasons.
    return buildIncompatibleResult(donor, hospitalLat, hospitalLng, config);
  }
  // 2. Availability
  if (!donor.available) return buildIncompatibleResult(donor, hospitalLat, hospitalLng, config);
  // 3. Donation deferral window
  const sinceLast = daysSince(donor.lastDonationDate);
  if (sinceLast !== null && sinceLast < config.deferralDays) {
    return buildIncompatibleResult(donor, hospitalLat, hospitalLng, config);
  }

  // ---- Scoring ----
  const distanceKm = haversineKm(hospitalLat, hospitalLng, donor.lat, donor.lng);
  const dQuality = distanceQuality(distanceKm, config.maxRadiusKm);

  const w = config.weights;
  const distanceScore = Math.round(dQuality * w.distance);

  const availabilityScore = Math.round(
    (15 + freshnessBonus(sinceLast)) * (w.availability / 25)
  );

  const responseQuality = clamp(donor.responseRate, 0, 100) / 100;
  const urgencyMult = URGENCY_MULTIPLIER[urgency];
  const urgencyScore = Math.round(
    (dQuality * 0.6 + responseQuality * 0.4) * w.urgency * urgencyMult
  );

  const responseScore = Math.round(responseQuality * w.response);

  const matchScore = clamp(
    distanceScore + availabilityScore + urgencyScore + responseScore
  );

  const compatibilityQuality = bloodCompatibilityService.compatibilityQuality(
    recipientGroup,
    donor.bloodGroup
  );

  const reason = buildRecommendationReason({
    donor,
    distanceKm,
    matchScore,
    responseQuality,
    urgency,
    compatibilityQuality,
    recipientGroup,
  });

  return {
    donor,
    rank: 0, // assigned after sorting
    distanceKm,
    distanceScore,
    availabilityScore,
    urgencyScore,
    responseScore,
    matchScore,
    compatible: true,
    compatibilityQuality,
    recommendationReason: reason,
  };
}

function buildIncompatibleResult(
  donor: DonorCandidate,
  hospitalLat: number,
  hospitalLng: number,
  config: MatchingConfig
): MatchResult {
  const distanceKm = haversineKm(hospitalLat, hospitalLng, donor.lat, donor.lng);
  return {
    donor,
    rank: 0,
    distanceKm,
    distanceScore: 0,
    availabilityScore: 0,
    urgencyScore: 0,
    responseScore: 0,
    matchScore: 0,
    compatible: false,
    compatibilityQuality: 0,
    recommendationReason: "Not eligible — filtered out by compatibility, availability, or deferral rules.",
  };
}

function buildRecommendationReason(ctx: {
  donor: DonorCandidate;
  distanceKm: number;
  matchScore: number;
  responseQuality: number;
  urgency: Urgency;
  compatibilityQuality: number;
  recipientGroup: BloodGroup;
}): string {
  const { donor, distanceKm, matchScore, responseQuality, urgency, compatibilityQuality } = ctx;
  const parts: string[] = [];

  if (compatibilityQuality >= 1) {
    parts.push("exact blood-group match");
  } else if (bloodCompatibilityService.isUniversalDonor(donor.bloodGroup)) {
    parts.push("universal O− donor compatible with the requested group");
  } else {
    parts.push("compatible donor for the requested blood group");
  }

  if (distanceKm <= 2) parts.push("located very close to the hospital");
  else if (distanceKm <= 5) parts.push("located nearby");
  else if (distanceKm <= 15) parts.push("within reasonable transport range");
  else parts.push("within the search radius");

  if (responseQuality >= 0.85) parts.push("strong historical response rate");
  else if (responseQuality >= 0.6) parts.push("moderate response reliability");
  else parts.push("limited response history");

  if (urgency === "CRITICAL" || urgency === "HIGH") {
    parts.push(`well-suited for ${urgency.toLowerCase()} urgency`);
  }

  const summary =
    matchScore >= 85
      ? "Highly suitable"
      : matchScore >= 70
      ? "Good candidate"
      : matchScore >= 50
      ? "Acceptable candidate"
      : "Backup candidate";

  return `${summary} — ${parts.join(", ")}.`;
}

/**
 * Run matching across a candidate pool. Returns ranked compatible donors,
 * plus an `excluded` list of ineligible donors with reasons (for transparency).
 */
export function runMatching(
  recipientGroup: BloodGroup,
  urgency: Urgency,
  hospitalLat: number,
  hospitalLng: number,
  candidates: DonorCandidate[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): { ranked: MatchResult[]; excluded: MatchResult[] } {
  const scored: MatchResult[] = [];
  const excluded: MatchResult[] = [];

  for (const donor of candidates) {
    const result = scoreDonor(donor, recipientGroup, urgency, hospitalLat, hospitalLng, config);
    if (!result) continue;
    if (result.compatible) scored.push(result);
    else excluded.push(result);
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  scored.forEach((r, i) => (r.rank = i + 1));

  return { ranked: scored, excluded };
}

/**
 * Map a Prisma Donor (with user) to a DonorCandidate for matching.
 */
export function toDonorCandidate(donor: {
  id: string;
  userId: string;
  bloodGroup: string;
  lat: number;
  lng: number;
  region: string;
  available: boolean;
  lastDonationDate: Date | null;
  donationCount: number;
  responseRate: number;
  totalRequests: number;
  acceptedCount: number;
  declinedCount: number;
  noResponseCount: number;
  verificationStatus: string;
  user?: { name: string } | null;
}): DonorCandidate {
  return {
    id: donor.id,
    userId: donor.userId,
    name: donor.user?.name ?? "Anonymous Donor",
    bloodGroup: donor.bloodGroup as BloodGroup,
    lat: donor.lat,
    lng: donor.lng,
    region: donor.region,
    available: donor.available,
    lastDonationDate: donor.lastDonationDate,
    donationCount: donor.donationCount,
    responseRate: donor.responseRate,
    totalRequests: donor.totalRequests,
    acceptedCount: donor.acceptedCount,
    declinedCount: donor.declinedCount,
    noResponseCount: donor.noResponseCount,
    verificationStatus: donor.verificationStatus,
  };
}
