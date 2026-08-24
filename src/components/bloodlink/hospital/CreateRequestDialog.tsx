"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BLOOD_GROUPS } from "@/lib/types";
import { apiCall } from "@/lib/api/hooks";
import { toast } from "sonner";
import { BloodGroupBadge } from "@/components/bloodlink/ui/badges";
import { MedicalDisclaimer } from "@/components/bloodlink/ui/disclaimer";
import { Zap, Loader2 } from "lucide-react";

export function CreateRequestDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (requestId: string) => void;
}) {
  const [bloodGroup, setBloodGroup] = useState("O-");
  const [units, setUnits] = useState("2");
  const [urgency, setUrgency] = useState("CRITICAL");
  const [requiredBy, setRequiredBy] = useState(() => {
    const d = new Date(Date.now() + 2 * 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [patientCondition, setPatientCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(runMatching: boolean) {
    if (!bloodGroup || !units || !urgency) {
      toast.error("Please provide a valid blood group and number of units.");
      return;
    }
    setLoading(true);
    try {
      const created = await apiCall<{ request: { id: string; requestId: string } }>("/api/blood-requests", {
        method: "POST",
        body: {
          bloodGroup,
          unitsRequired: parseInt(units, 10),
          urgency,
          requiredBy: new Date(requiredBy).toISOString(),
          patientCondition: patientCondition || undefined,
          notes: notes || undefined,
        },
      });
      toast.success(`Emergency request ${created.request.requestId} created`);
      if (runMatching) {
        try {
          await apiCall(`/api/matching/run`, {
            method: "POST",
            body: { requestId: created.request.id, notifyTopN: 5 },
          });
          toast.success("AI matching complete — top donors notified.");
        } catch (e) {
          toast.error("Matching failed: " + (e as Error).message);
        }
      }
      onCreated(created.request.id);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setBloodGroup("O-");
    setUnits("2");
    setUrgency("CRITICAL");
    setPatientCondition("");
    setNotes("");
    const d = new Date(Date.now() + 2 * 3600000);
    setRequiredBy(d.toISOString().slice(0, 16));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-600" /> Create Emergency Blood Request
          </DialogTitle>
          <DialogDescription>
            File a verified emergency request. BloodLink will find and rank compatible donors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Blood group required</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label htmlFor="units">Units required</Label>
              <Input id="units" type="number" min={1} max={20} value={units} onChange={(e) => setUnits(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Emergency level</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">🔴 CRITICAL</SelectItem>
                  <SelectItem value="HIGH">🟠 HIGH</SelectItem>
                  <SelectItem value="MEDIUM">🟡 MEDIUM</SelectItem>
                  <SelectItem value="NORMAL">⚪ NORMAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requiredBy">Required by</Label>
              <Input id="requiredBy" type="datetime-local" value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="condition">Patient condition (optional)</Label>
            <Input id="condition" value={patientCondition} onChange={(e) => setPatientCondition(e.target.value)} placeholder="e.g. Emergency surgery, trauma, postpartum hemorrhage" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any relevant details for the donor coordination team" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-medium">Request location</p>
            <p className="mt-0.5">Will use your verified hospital location automatically.</p>
          </div>

          <MedicalDisclaimer variant="compact" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="secondary" onClick={() => submit(false)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create only
          </Button>
          <Button onClick={() => submit(true)} disabled={loading} className="bg-red-600 hover:bg-red-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Create &amp; Run AI Matching
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
