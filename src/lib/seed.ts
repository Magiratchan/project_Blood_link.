// BloodLink — database seeding (demo mode).
// Generates realistic synthetic data for the hackathon. Clearly labelled as
// synthetic in the DB (isSynthetic = true on demand/predictions).
//
// Idempotent: wipes existing data before re-seeding.
// Used by `prisma/seed.ts` and the `/api/demo/seed` endpoint.

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { BloodGroup, Urgency } from "@/lib/types";
import { BLOOD_GROUPS, REGIONS } from "@/lib/types";
import { predictShortage } from "@/lib/ai/prediction";

// ---- Seeded RNG (mulberry32) for reproducible synthetic data ----
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20240617);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => rand() * (max - min) + min;

// Geographic center: Thanjavur, Tamil Nadu, India
const THANJAVUR = { lat: 10.787, lng: 79.1378 };

/** Generate a random point ~`radiusKm` around a center (approx). */
function around(lat: number, lng: number, radiusKm: number) {
  const bearing = rand() * 2 * Math.PI;
  const r = Math.sqrt(rand()) * radiusKm; // uniform area distribution
  const dLat = (r * Math.cos(bearing)) / 111;
  const dLng = (r * Math.sin(bearing)) / (111 * Math.cos((lat * Math.PI) / 180));
  return { lat: +(lat + dLat).toFixed(5), lng: +(lng + dLng).toFixed(5) };
}

const FIRST_NAMES = [
  "Aarav", "Priya", "Karthik", "Ananya", "Vikram", "Meera", "Arjun", "Divya",
  "Rahul", "Sneha", "Kumar", "Lakshmi", "Surya", "Kavya", "Rajesh", "Deepa",
  "Vignesh", "Nithya", "Gokul", "Bhavya", "Senthil", "Ishaan", "Anjali", "Ravi",
  "Keerthana", "Mohan", "Reshma", "Dinesh", "Farhana", "Imran", "Joseph", "Mary",
];
const LAST_NAMES = [
  "Kumar", "Rajan", "Iyer", "Nair", "Reddy", "Subramanian", "Krishnan", "Menon",
  "Pillai", "Sharma", "Natarajan", "Chandran", "Mahadevan", "Venkatesan", "Anand",
  "Ramesh", "Suresh", "Devi", "Lakshmanan", "Gopal",
];

function name() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

const BLOOD_WEIGHTS: Record<BloodGroup, number> = {
  "O+": 35, "A+": 28, "B+": 22, "AB+": 5,
  "O-": 7, "A-": 5, "B-": 4, "AB-": 1,
};
function weightedBloodGroup(): BloodGroup {
  const total = Object.values(BLOOD_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const g of BLOOD_GROUPS) {
    r -= BLOOD_WEIGHTS[g];
    if (r <= 0) return g;
  }
  return "O+";
}

const DEMO_PASSWORD = "demo1234";

// Defined demo accounts (judge-friendly)
const DEMO_ACCOUNTS = [
  { email: "admin@bloodlink.app", name: "System Administrator", role: "ADMIN", region: "Thanjavur" },
  { email: "hospital@bloodlink.app", name: "Thanjavur Medical College Hospital", role: "HOSPITAL", region: "Thanjavur" },
  { email: "hospital2@bloodlink.app", name: "K.A.P. Viswanatham Medical College", role: "HOSPITAL", region: "Tiruchirappalli" },
  { email: "bloodbank@bloodlink.app", name: "Thanjavur Government Blood Bank", role: "BLOOD_BANK", region: "Thanjavur" },
  { email: "donor@bloodlink.app", name: "Demo Donor One", role: "DONOR", region: "Thanjavur", bloodGroup: "O-" as BloodGroup },
  { email: "donor2@bloodlink.app", name: "Demo Donor Two", role: "DONOR", region: "Thanjavur", bloodGroup: "O-" as BloodGroup },
];

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#84cc16",
];

export async function seedDatabase() {
  // ---- Wipe (order respects FK constraints) ----
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.notificationEvent.deleteMany();
  await db.matchingResult.deleteMany();
  await db.donation.deleteMany();
  await db.bloodRequest.deleteMany();
  await db.bloodInventory.deleteMany();
  await db.demandHistory.deleteMany();
  await db.shortagePrediction.deleteMany();
  await db.donor.deleteMany();
  await db.hospital.deleteMany();
  await db.bloodBank.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- Users + profiles for demo accounts ----
  const ctx: {
    admin: { user: string };
    hospitals: { user: string; hospital: string; lat: number; lng: number }[];
    bloodBanks: { user: string; bloodBank: string; lat: number; lng: number; region: string }[];
    demoDonors: { user: string; donor: string; bloodGroup: BloodGroup }[];
  } = { admin: { user: "" }, hospitals: [], bloodBanks: [], demoDonors: [] };

  for (const acc of DEMO_ACCOUNTS) {
    const user = await db.user.create({
      data: {
        email: acc.email,
        passwordHash,
        name: acc.name,
        role: acc.role,
        phone: `+91 9${randInt(100000000, 999999999)}`,
        verificationStatus: "VERIFIED",
        avatarColor: pick(AVATAR_COLORS),
      },
    });

    if (acc.role === "ADMIN") {
      ctx.admin.user = user.id;
    } else if (acc.role === "HOSPITAL") {
      const loc = acc.region === "Thanjavur" ? THANJAVUR : around(THANJAVUR.lat, THANJAVUR.lng, 40);
      const hospital = await db.hospital.create({
        data: {
          userId: user.id,
          name: acc.name,
          licenseNumber: `HSP-${randInt(1000, 9999)}`,
          lat: loc.lat,
          lng: loc.lng,
          address: `${acc.region}, Tamil Nadu`,
          region: acc.region,
          phone: `+91 4362 ${randInt(200000, 299999)}`,
          verificationStatus: "VERIFIED",
        },
      });
      ctx.hospitals.push({ user: user.id, hospital: hospital.id, lat: loc.lat, lng: loc.lng });
    } else if (acc.role === "BLOOD_BANK") {
      const loc = around(THANJAVUR.lat, THANJAVUR.lng, 6);
      const bloodBank = await db.bloodBank.create({
        data: {
          userId: user.id,
          name: acc.name,
          licenseNumber: `BB-${randInt(1000, 9999)}`,
          lat: loc.lat,
          lng: loc.lng,
          address: `${acc.region}, Tamil Nadu`,
          region: acc.region,
          phone: `+91 4362 ${randInt(300000, 399999)}`,
          verificationStatus: "VERIFIED",
        },
      });
      ctx.bloodBanks.push({ user: user.id, bloodBank: bloodBank.id, lat: loc.lat, lng: loc.lng, region: acc.region });
    } else if (acc.role === "DONOR") {
      const loc = around(THANJAVUR.lat, THANJAVUR.lng, 4);
      const totalReq = randInt(3, 20);
      const rate = randInt(80, 98);
      const accepted = Math.round(totalReq * rate / 100);
      const donor = await db.donor.create({
        data: {
          userId: user.id,
          bloodGroup: acc.bloodGroup,
          lat: loc.lat,
          lng: loc.lng,
          address: "Thanjavur, Tamil Nadu",
          region: "Thanjavur",
          dateOfBirth: new Date(1990 + randInt(0, 15), randInt(0, 11), randInt(1, 28)),
          gender: pick(["male", "female"]),
          available: true,
          lastDonationDate: rand() < 0.4 ? new Date(Date.now() - randInt(20, 200) * 86400000) : null,
          donationCount: randInt(1, 12),
          totalRequests: totalReq,
          acceptedCount: accepted,
          declinedCount: Math.min(randInt(0, 4), Math.max(0, totalReq - accepted)),
          noResponseCount: Math.min(randInt(0, 2), Math.max(0, totalReq - accepted)),
          responseRate: rate,
          verificationStatus: "VERIFIED",
        },
      });
      ctx.demoDonors.push({ user: user.id, donor: donor.id, bloodGroup: acc.bloodGroup });
    }
  }

  // ---- Extra hospitals for admin dashboard realism ----
  for (const region of REGIONS) {
    if (ctx.hospitals.some((h) => false)) { /* noop */ }
  }

  // ---- 100+ additional donors ----
  const allDonorIds: { id: string; userId: string; bloodGroup: BloodGroup; lat: number; lng: number; available: boolean }[] = [];
  // add the two demo donors first (already created)
  const donorRows = await db.donor.findMany({ include: { user: true } });
  for (const d of donorRows) {
    allDonorIds.push({ id: d.id, userId: d.userId, bloodGroup: d.bloodGroup as BloodGroup, lat: d.lat, lng: d.lng, available: d.available });
  }

  const DONOR_COUNT = 108;
  for (let i = 0; i < DONOR_COUNT; i++) {
    const bg = weightedBloodGroup();
    // Spread donors across regions but concentrate near Thanjavur
    const region = pick(REGIONS);
    const center =
      region === "Thanjavur" ? THANJAVUR :
      region === "Tiruchirappalli" ? { lat: 10.7905, lng: 78.7047 } :
      region === "Chennai" ? { lat: 13.0827, lng: 80.2707 } :
      region === "Madurai" ? { lat: 9.9252, lng: 78.1198 } :
      { lat: 11.0168, lng: 76.9558 }; // Coimbatore
    const loc = around(center.lat, center.lng, 18);

    const fname = name();
    const email = `${fname.toLowerCase().replace(/\s/g, ".")}${randInt(1, 999)}@donor.bloodlink.app`;
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: fname,
        role: "DONOR",
        phone: `+91 9${randInt(100000000, 999999999)}`,
        verificationStatus: rand() < 0.85 ? "VERIFIED" : "PENDING",
        avatarColor: pick(AVATAR_COLORS),
      },
    });
    const donor = await db.donor.create({
      data: (() => {
        const totalReq = randInt(0, 40);
        const rate = randInt(40, 99);
        const accepted = Math.round(totalReq * (rate / 100));
        return {
          userId: user.id,
          bloodGroup: bg,
          lat: loc.lat,
          lng: loc.lng,
          address: `${region}, Tamil Nadu`,
          region,
          dateOfBirth: new Date(1975 + randInt(0, 30), randInt(0, 11), randInt(1, 28)),
          gender: pick(["male", "female"]),
          available: rand() < 0.72,
          lastDonationDate: rand() < 0.45 ? new Date(Date.now() - randInt(15, 300) * 86400000) : null,
          donationCount: randInt(0, 25),
          totalRequests: totalReq,
          acceptedCount: accepted,
          declinedCount: Math.min(randInt(0, 10), Math.max(0, totalReq - accepted)),
          noResponseCount: Math.min(randInt(0, 6), Math.max(0, totalReq - accepted)),
          responseRate: rate,
          verificationStatus: rand() < 0.8 ? "VERIFIED" : "PENDING",
        };
      })(),
    });
    allDonorIds.push({ id: donor.id, userId: user.id, bloodGroup: bg, lat: loc.lat, lng: loc.lng, available: donor.available });
  }

  // ---- Blood inventory ----
  for (const bb of ctx.bloodBanks) {
    for (const bg of BLOOD_GROUPS) {
      await db.bloodInventory.create({
        data: {
          bloodBankId: bb.bloodBank,
          bloodGroup: bg,
          units: randInt(4, 60),
          lowThreshold: 10,
          region: bb.region,
          lastUpdated: new Date(Date.now() - randInt(0, 48) * 3600000),
        },
      });
    }
  }
  // Make O- intentionally low at the Thanjavur bank for the shortage demo
  const thanjavurBB = ctx.bloodBanks[0];
  if (thanjavurBB) {
    await db.bloodInventory.updateMany({
      where: { bloodBankId: thanjavurBB.bloodBank, bloodGroup: "O-" },
      data: { units: 6 },
    });
  }

  // ---- Demand history (synthetic, ~90 days per region/bloodGroup) ----
  const days = 90;
  const now = new Date();
  for (const region of REGIONS) {
    for (const bg of BLOOD_GROUPS) {
      // each series has its own baseline + weekly seasonality + mild trend
      const baseline = randInt(2, 8) + (bg === "O+" || bg === "A+" ? 3 : 0) + (region === "Thanjavur" ? 2 : 0);
      const trendSlope = randFloat(-0.04, 0.08);
      for (let d = days; d >= 0; d--) {
        const date = new Date(now.getTime() - d * 86400000);
        const weekday = date.getDay();
        const weekendBoost = weekday === 0 || weekday === 6 ? 1.3 : 1;
        const noise = randFloat(0.5, 1.5);
        const trendFactor = 1 + trendSlope * (days - d);
        const unitsRequested = Math.max(0, Math.round(baseline * weekendBoost * noise * trendFactor));
        const fulfillmentRate = randFloat(0.6, 0.95);
        const unitsFulfilled = Math.round(unitsRequested * fulfillmentRate);
        const emergencyLevel: Urgency =
          unitsRequested >= 12 ? "CRITICAL" :
          unitsRequested >= 8 ? "HIGH" :
          unitsRequested >= 4 ? "MEDIUM" : "NORMAL";
        await db.demandHistory.create({
          data: {
            date,
            region,
            bloodGroup: bg,
            unitsRequested,
            unitsFulfilled,
            emergencyLevel,
            isSynthetic: true,
          },
        });
      }
    }
  }

  // ---- Shortage predictions (computed from demand + inventory) ----
  for (const region of REGIONS) {
    for (const bg of BLOOD_GROUPS) {
      const history = await db.demandHistory.findMany({
        where: { region, bloodGroup: bg },
        orderBy: { date: "asc" },
        take: 30,
      });
      const inventory = await db.bloodInventory.findMany({
        where: { region, bloodGroup: bg },
      });
      const result = predictShortage(
        region,
        bg,
        history.map((h) => ({ date: h.date, unitsRequested: h.unitsRequested, unitsFulfilled: h.unitsFulfilled })),
        inventory.map((i) => ({ bloodGroup: i.bloodGroup as BloodGroup, units: i.units, region: i.region }))
      );
      await db.shortagePrediction.create({
        data: {
          region,
          bloodGroup: bg,
          predictedDate: result.predictedDate,
          shortageRisk: result.shortageRisk,
          expectedDemand: result.expectedDemand,
          expectedUnits: result.expectedUnits,
          recommendation: result.recommendation,
          confidence: result.confidence,
          method: result.method,
          isSynthetic: true,
        },
      });
    }
  }

  // ---- A few emergency blood requests in varied states ----
  const demoHospital = ctx.hospitals[0]; // Thanjavur
  if (demoHospital) {
    const samples: { bg: BloodGroup; units: number; urgency: Urgency; status: string; daysAgo: number; region: string }[] = [
      { bg: "O-", units: 2, urgency: "CRITICAL", status: "PENDING", daysAgo: 0, region: "Thanjavur" },
      { bg: "A+", units: 3, urgency: "HIGH", status: "FULFILLED", daysAgo: 6, region: "Thanjavur" },
      { bg: "B+", units: 1, urgency: "MEDIUM", status: "DONOR_FOUND", daysAgo: 2, region: "Thanjavur" },
      { bg: "AB+", units: 4, urgency: "NORMAL", status: "PARTIALLY_FULFILLED", daysAgo: 3, region: "Thanjavur" },
    ];
    for (const s of samples) {
      // Use the hospital's exact location so donor distances are computed from the hospital.
      const created = new Date(now.getTime() - s.daysAgo * 86400000);
      await db.bloodRequest.create({
        data: {
          requestId: `BL-REQ-${String(randInt(1000, 9999))}`,
          hospitalId: demoHospital.hospital,
          bloodGroup: s.bg,
          unitsRequired: s.units,
          unitsFulfilled: s.status === "FULFILLED" ? s.units : s.status === "PARTIALLY_FULFILLED" ? Math.ceil(s.units / 2) : 0,
          urgency: s.urgency,
          requiredBy: new Date(created.getTime() + 6 * 3600000),
          notes: "Emergency request — decision support only.",
          lat: demoHospital.lat,
          lng: demoHospital.lng,
          address: "Thanjavur, Tamil Nadu",
          region: s.region,
          status: s.status,
          createdAt: created,
          updatedAt: created,
        },
      });
    }
  }

  // ---- Showcase O- donors near the Thanjavur demo hospital ----
  // Placed at controlled distances (1.2 / 2.7 / 4.1 / 6.3 / 9.0 km) with varied
  // response rates so the AI-matching demo produces a rich, ranked list.
  if (demoHospital) {
    const showcase: { distKm: number; bearingDeg: number; responseRate: number; available: boolean; donationCount: number; lastDonationDaysAgo: number | null; name: string }[] = [
      { distKm: 1.2, bearingDeg: 30, responseRate: 96, available: true, donationCount: 8, lastDonationDaysAgo: 95, name: "Arun Kumar S" },
      { distKm: 2.7, bearingDeg: 110, responseRate: 88, available: true, donationCount: 5, lastDonationDaysAgo: 140, name: "Deepa Ramesh" },
      { distKm: 4.1, bearingDeg: 200, responseRate: 79, available: true, donationCount: 3, lastDonationDaysAgo: 60, name: "Vikram Senthil" },
      { distKm: 6.3, bearingDeg: 280, responseRate: 91, available: false, donationCount: 6, lastDonationDaysAgo: 20, name: "Meena Gopal" },
      { distKm: 9.0, bearingDeg: 340, responseRate: 72, available: true, donationCount: 2, lastDonationDaysAgo: 200, name: "Joseph Anand" },
    ];
    for (const s of showcase) {
      const bearing = (s.bearingDeg * Math.PI) / 180;
      const dLat = (s.distKm * Math.cos(bearing)) / 111;
      const dLng = (s.distKm * Math.sin(bearing)) / (111 * Math.cos((demoHospital.lat * Math.PI) / 180));
      const lat = +(demoHospital.lat + dLat).toFixed(5);
      const lng = +(demoHospital.lng + dLng).toFixed(5);
      const user = await db.user.create({
        data: {
          email: `${s.name.toLowerCase().replace(/\s+/g, ".")}.${randInt(10, 99)}@donor.bloodlink.app`,
          passwordHash,
          name: s.name,
          role: "DONOR",
          phone: `+91 9${randInt(100000000, 999999999)}`,
          verificationStatus: "VERIFIED",
          avatarColor: pick(AVATAR_COLORS),
        },
      });
      const totalReq = randInt(8, 30);
      const accepted = Math.round(totalReq * (s.responseRate / 100));
      const donor = await db.donor.create({
        data: {
          userId: user.id,
          bloodGroup: "O-",
          lat,
          lng,
          address: "Thanjavur, Tamil Nadu",
          region: "Thanjavur",
          dateOfBirth: new Date(1985 + randInt(0, 12), randInt(0, 11), randInt(1, 28)),
          gender: pick(["male", "female"]),
          available: s.available,
          lastDonationDate: s.lastDonationDaysAgo ? new Date(Date.now() - s.lastDonationDaysAgo * 86400000) : null,
          donationCount: s.donationCount,
          totalRequests: totalReq,
          acceptedCount: accepted,
          declinedCount: Math.min(randInt(0, 3), Math.max(0, totalReq - accepted)),
          noResponseCount: Math.min(randInt(0, 2), Math.max(0, totalReq - accepted)),
          responseRate: s.responseRate,
          verificationStatus: "VERIFIED",
        },
      });
      allDonorIds.push({ id: donor.id, userId: user.id, bloodGroup: "O-", lat, lng, available: donor.available });
    }
  }

  // ---- Audit logs ----
  await db.auditLog.createMany({
    data: [
      { action: "SEED", resource: "System", details: "Database seeded with demo data", severity: "INFO" },
    ],
  });

  return {
    users: await db.user.count(),
    donors: await db.donor.count(),
    hospitals: await db.hospital.count(),
    bloodBanks: await db.bloodBank.count(),
    inventory: await db.bloodInventory.count(),
    demand: await db.demandHistory.count(),
    predictions: await db.shortagePrediction.count(),
    requests: await db.bloodRequest.count(),
    demoPassword: DEMO_PASSWORD,
  };
}
