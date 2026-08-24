// BloodLink — shared frontend types (mirror of backend shapes)

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "DONOR" | "HOSPITAL" | "BLOOD_BANK" | "ADMIN";
  phone?: string;
  verificationStatus: string;
  isActive: boolean;
  avatarColor?: string | null;
  donor?: {
    id: string;
    bloodGroup: string;
    available: boolean;
    region: string;
    lat: number;
    lng: number;
    responseRate: number;
    donationCount: number;
    verificationStatus: string;
    lastDonationDate: string | null;
  } | null;
  hospital?: {
    id: string;
    name: string;
    region: string;
    lat: number;
    lng: number;
    verificationStatus: string;
    address: string;
  } | null;
  bloodBank?: {
    id: string;
    name: string;
    region: string;
    lat: number;
    lng: number;
    verificationStatus: string;
    address: string;
  } | null;
}

export interface BloodRequestSummary {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  urgency: string;
  requiredBy: string;
  status: string;
  hospitalName?: string;
  address?: string;
  lat: number;
  lng: number;
  region: string;
  notes?: string | null;
  matchedDonorId?: string | null;
  createdAt: string;
  distanceKm?: number;
}

export interface MatchingResultItem {
  id: string;
  rank: number;
  matchScore: number;
  distanceKm: number;
  distanceScore: number;
  availabilityScore: number;
  urgencyScore: number;
  responseScore: number;
  recommendationReason: string;
  donor: {
    id: string;
    name: string;
    bloodGroup: string;
    region: string;
    available: boolean;
    responseRate: number;
    donationCount: number;
    verificationStatus: string;
    lat?: number;
    lng?: number;
  };
}

export interface ChainEvent {
  id: string;
  chainOrder: number;
  status: string;
  sentAt: string;
  viewedAt?: string | null;
  respondedAt?: string | null;
  note?: string | null;
  donor: {
    id: string;
    name: string;
    bloodGroup: string;
    responseRate: number;
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId?: string | null;
  data?: string | null;
  read: boolean;
  createdAt: string;
}

export const MEDICAL_DISCLAIMER =
  "BloodLink is an AI-assisted coordination and decision-support platform. It does not diagnose patients, determine final donor eligibility, guarantee blood compatibility, or replace qualified healthcare professionals or authorized blood banks. All transfusion decisions and compatibility testing must be performed by qualified professionals.";

export const COMPATIBILITY_NOTE =
  "BloodLink does not replace professional blood-bank compatibility testing or medical decisions.";

export const DEMO_ACCOUNTS = [
  { role: "HOSPITAL", email: "hospital@bloodlink.app", password: "demo1234", label: "Thanjavur Medical College Hospital" },
  { role: "DONOR", email: "donor@bloodlink.app", password: "demo1234", label: "Demo Donor One (O−)" },
  { role: "BLOOD_BANK", email: "bloodbank@bloodlink.app", password: "demo1234", label: "Thanjavur Govt Blood Bank" },
  { role: "ADMIN", email: "admin@bloodlink.app", password: "demo1234", label: "System Administrator" },
] as const;
