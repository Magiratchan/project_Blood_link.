// BloodLink — shared types & constants (string enums used in DB)

export const ROLES = {
  DONOR: "DONOR",
  HOSPITAL: "HOSPITAL",
  BLOOD_BANK: "BLOOD_BANK",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const URGENCY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  NORMAL: "NORMAL",
} as const;
export type Urgency = (typeof URGENCY)[keyof typeof URGENCY];

export const REQUEST_STATUS = {
  PENDING: "PENDING",
  MATCHING: "MATCHING",
  DONOR_FOUND: "DONOR_FOUND",
  PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  FULFILLED: "FULFILLED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const RESPONSE_STATUS = {
  SENT: "SENT",
  VIEWED: "VIEWED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const;
export type ResponseStatus = (typeof RESPONSE_STATUS)[keyof typeof RESPONSE_STATUS];

export const VERIFICATION = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type Verification = (typeof VERIFICATION)[keyof typeof VERIFICATION];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const REGIONS = [
  "Thanjavur",
  "Tiruchirappalli",
  "Chennai",
  "Madurai",
  "Coimbatore",
] as const;
export type Region = (typeof REGIONS)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verificationStatus: string;
  isActive: boolean;
}

// Match scoring weights — configurable, total must be 100
export const MATCH_WEIGHTS = {
  distance: 30,
  availability: 25,
  urgency: 20,
  response: 25,
} as const;

export const MEDICAL_DISCLAIMER =
  "BloodLink is an AI-assisted coordination and decision-support platform. It does not diagnose patients, determine final donor eligibility, guarantee blood compatibility, or replace qualified healthcare professionals or authorized blood banks. All transfusion decisions and compatibility testing must be performed by qualified professionals.";
