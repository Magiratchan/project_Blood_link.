// bloodCompatibilityService — single source of truth for ABO/Rh compatibility.
// BloodLink does NOT duplicate compatibility logic across the application.
//
// IMPORTANT: This is a decision-support filter, not a medically validated
// compatibility test. Final donor eligibility and crossmatch testing must be
// performed by qualified healthcare professionals / authorized blood banks.

import type { BloodGroup } from "@/lib/types";

/**
 * Map of which blood groups a recipient of the given group can RECEIVE from.
 * Key = recipient blood group, Value = list of compatible donor groups.
 */
const CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

/**
 * Map of which blood groups a donor of the given group can DONATE to.
 * Key = donor blood group, Value = list of recipient groups that can receive.
 */
const CAN_DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export const bloodCompatibilityService = {
  /** Returns true if a donor with `donorGroup` can give to a recipient with `recipientGroup`. */
  isCompatible(recipientGroup: BloodGroup, donorGroup: BloodGroup): boolean {
    const compatible = CAN_RECEIVE_FROM[recipientGroup] ?? [];
    return compatible.includes(donorGroup);
  },

  /** List donor groups compatible with a recipient of `recipientGroup`. */
  compatibleDonorGroups(recipientGroup: BloodGroup): BloodGroup[] {
    return CAN_RECEIVE_FROM[recipientGroup] ?? [];
  },

  /** List recipient groups a donor of `donorGroup` may give to. */
  donationTargets(donorGroup: BloodGroup): BloodGroup[] {
    return CAN_DONATE_TO[donorGroup] ?? [];
  },

  /** True if the donor is an exact (identical) group match — preferred when available. */
  isExactMatch(recipientGroup: BloodGroup, donorGroup: BloodGroup): boolean {
    return recipientGroup === donorGroup;
  },

  /** Is the donor a universal donor (O-)? */
  isUniversalDonor(donorGroup: BloodGroup): boolean {
    return donorGroup === "O-";
  },

  /** Is the recipient a universal recipient (AB+)? */
  isUniversalRecipient(recipientGroup: BloodGroup): boolean {
    return recipientGroup === "AB+";
  },

  /**
   * Compatibility quality used in scoring (exact matches are preferred).
   * 1.0 = exact, 0.9 = O- universal donor, 0.75 = other compatible.
   */
  compatibilityQuality(recipientGroup: BloodGroup, donorGroup: BloodGroup): number {
    if (!this.isCompatible(recipientGroup, donorGroup)) return 0;
    if (this.isExactMatch(recipientGroup, donorGroup)) return 1.0;
    if (this.isUniversalDonor(donorGroup)) return 0.9;
    return 0.75;
  },
};

export { CAN_RECEIVE_FROM, CAN_DONATE_TO };
