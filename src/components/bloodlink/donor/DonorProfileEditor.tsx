"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BloodGroupBadge } from "@/components/bloodlink/ui/badges";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { apiCall } from "@/lib/api/hooks";
import { toast } from "sonner";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";
import LocationPickerLazy from "./LocationPickerLazy";
import {
  Droplet, MapPin, Heart, Save, X, User, Phone, Calendar,
  Activity, AlertCircle, CheckCircle2, Info, Loader2, Pencil,
} from "lucide-react";

export interface DonorProfileData {
  id?: string;
  bloodGroup: string;
  available: boolean;
  region: string;
  lat: number;
  lng: number;
  address?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  healthNotes?: string | null;
  lastDonationDate?: string | Date | null;
  donationCount?: number;
  responseRate?: number;
  verificationStatus?: string;
}

interface DonorProfileEditorProps {
  initial?: DonorProfileData | null;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  /** When true, shows the editor as a full setup card (first-time completion). */
  isSetup?: boolean;
  onSaved: (donor: DonorProfileData) => void;
  onCancel?: () => void;
}

export function DonorProfileEditor({
  initial,
  userName,
  userEmail,
  userPhone,
  isSetup = false,
  onSaved,
  onCancel,
}: DonorProfileEditorProps) {
  const regionCenter: Record<string, [number, number]> = {
    Thanjavur: [10.787, 79.1378],
    Tiruchirappalli: [10.7905, 78.7047],
    Chennai: [13.0827, 80.2707],
    Madurai: [9.9252, 78.1198],
    Coimbatore: [11.0168, 76.9558],
  };

  const [bloodGroup, setBloodGroup] = useState(initial?.bloodGroup ?? "O+");
  const [region, setRegion] = useState(initial?.region ?? "Thanjavur");
  const [lat, setLat] = useState(initial?.lat ?? regionCenter["Thanjavur"][0]);
  const [lng, setLng] = useState(initial?.lng ?? regionCenter["Thanjavur"][1]);
  const [address, setAddress] = useState(initial?.address ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    initial?.dateOfBirth ? new Date(initial.dateOfBirth).toISOString().slice(0, 10) : ""
  );
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [healthNotes, setHealthNotes] = useState(initial?.healthNotes ?? "");
  const [lastDonationDate, setLastDonationDate] = useState(
    initial?.lastDonationDate ? new Date(initial.lastDonationDate).toISOString().slice(0, 10) : ""
  );
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [saving, setSaving] = useState(false);
  const [hasPickedLocation, setHasPickedLocation] = useState(!!initial?.lat && !!initial?.lng);

  function handleLocationChange(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setHasPickedLocation(true);
  }

  function handleRegionChange(newRegion: string) {
    setRegion(newRegion);
    // If the user hasn't picked a location yet, move the map center to the new region
    if (!hasPickedLocation) {
      const c = regionCenter[newRegion];
      if (c) {
        setLat(c[0]);
        setLng(c[1]);
      }
    }
  }

  async function save() {
    if (!bloodGroup) {
      toast.error("Please select your blood group.");
      return;
    }
    if (!hasPickedLocation && isSetup) {
      toast.error("Location unavailable. Please set your approximate location on the map.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiCall<{ donor: DonorProfileData }>("/api/donors/profile", {
        method: "POST",
        body: {
          bloodGroup,
          lat,
          lng,
          region,
          address: address || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          healthNotes: healthNotes || undefined,
          lastDonationDate: lastDonationDate || undefined,
          available,
        },
      });
      toast.success(isSetup ? "Profile completed — you're ready to receive requests!" : "Profile updated successfully.");
      onSaved(res.donor);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={isSetup ? "border-red-200 ring-2 ring-red-100" : ""}>
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <motion.div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <Droplet className="h-5 w-5" />
          </motion.div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isSetup ? "Complete your donor profile" : "Edit donor profile"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isSetup
                ? "Set your blood group, location, and health details so hospitals can find you during emergencies."
                : "Update your medical details, location, or availability."}
            </p>
          </div>
        </div>

        {isSetup && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>Your profile is required before you can receive emergency requests. Your exact location is never shared — coordinates are rounded to ~100m for privacy.</span>
          </div>
        )}

        {/* Account info (read-only) */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <User className="h-3 w-3" /> Name
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-700">{userName}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <Phone className="h-3 w-3" /> Phone
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-700">{userPhone || userEmail}</p>
          </div>
        </div>

        {/* Blood group + region */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <Droplet className="h-3.5 w-3.5 text-red-500" /> Blood group <span className="text-red-500">*</span>
            </Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    <span className="flex items-center gap-2">
                      <BloodGroupBadge group={g} className="scale-90" /> {g}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-red-500" /> Region <span className="text-red-500">*</span>
            </Label>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location picker */}
        <div className="mt-4 space-y-1.5">
          <Label className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-red-500" /> Approximate location <span className="text-red-500">*</span>
          </Label>
          <LocationPickerLazy
            initialLat={initial?.lat}
            initialLng={initial?.lng}
            region={region}
            onChange={handleLocationChange}
          />
          {hasPickedLocation && (
            <p className="flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Location set: {lat.toFixed(3)}, {lng.toFixed(3)}
            </p>
          )}
        </div>

        {/* Address (optional) */}
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="address">Address (optional, city/area level only)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Thanjavur, Tamil Nadu"
          />
          <p className="text-[11px] text-slate-400">Never enter your exact street address — this is for reference only.</p>
        </div>

        {/* DOB + gender */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dob" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date of birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Last donation date */}
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="lastDonation" className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-slate-400" /> Last donation date (optional)
          </Label>
          <Input
            id="lastDonation"
            type="date"
            value={lastDonationDate}
            onChange={(e) => setLastDonationDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-[11px] text-slate-400">Used to check the 56-day deferral window between donations.</p>
        </div>

        {/* Health notes */}
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="healthNotes" className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-red-500" /> Medical details & health notes
          </Label>
          <Textarea
            id="healthNotes"
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            rows={4}
            placeholder="e.g. No known conditions, no current medications, no recent travel to malaria-endemic regions. Any allergies or relevant medical history that a blood bank should verify."
          />
          <p className="flex items-start gap-1 text-[11px] text-slate-400">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            This information is decision-support only and does not determine final donor eligibility. A qualified blood bank must perform the actual eligibility screening and compatibility testing.
          </p>
        </div>

        {/* Availability */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-900">Available for donation</p>
            <p className="text-[11px] text-slate-500">Toggle off if you're temporarily unavailable</p>
          </div>
          <button
            type="button"
            onClick={() => setAvailable(!available)}
            className={`relative h-6 w-11 rounded-full transition ${available ? "bg-emerald-500" : "bg-slate-300"}`}
            role="switch"
            aria-checked={available}
            aria-label="Toggle availability"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${available ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <MedicalDisclaimer variant="compact" className="mt-4" />

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : isSetup ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
            {saving ? "Saving…" : isSetup ? "Complete profile" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
