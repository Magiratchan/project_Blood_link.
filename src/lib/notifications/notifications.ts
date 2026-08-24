// Notification service — in-app notifications with NotificationEvent tracking.
// Architecture supports adding Firebase Cloud Messaging later (the transport
// layer is isolated in `dispatchNotification`). The basic hackathon version
// works without any FCM credentials.

import { db } from "@/lib/db";
import type { BloodGroup, Urgency } from "@/lib/types";

export interface EmergencyNotificationPayload {
  requestId: string;
  requestIdFriendly: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  distanceKm: number;
  urgency: Urgency;
  hospitalName: string;
  requiredBy: string;
}

/**
 * Create an in-app notification + a NotificationEvent (SENT) for a donor.
 */
export async function notifyDonorOfRequest(
  donorUserId: string,
  donorId: string,
  requestId: string,
  payload: EmergencyNotificationPayload,
  chainOrder: number
) {
  const title = "🔴 Emergency Blood Request";
  const message =
    `${payload.bloodGroup} required — ${payload.unitsRequired} unit(s). ` +
    `${payload.distanceKm.toFixed(1)} km away · ${payload.urgency.toLowerCase()} urgency. ` +
    `Hospital: ${payload.hospitalName}.`;

  const notification = await db.notification.create({
    data: {
      userId: donorUserId,
      type: "EMERGENCY_REQUEST",
      title,
      message,
      requestId,
      data: JSON.stringify(payload),
      read: false,
    },
  });

  const event = await db.notificationEvent.create({
    data: {
      requestId,
      donorId,
      status: "SENT",
      chainOrder,
      sentAt: new Date(),
    },
  });

  // Transport stub — FCM integration point. Currently no-op (in-app only).
  await dispatchNotification(notification.id, donorUserId, { title, message, payload });

  return { notification, event };
}

/**
 * Transport dispatcher. Replace body with FCM admin.messaging().send() when
 * configured. Returns silently when no transport is available.
 */
async function dispatchNotification(
  _notificationId: string,
  _userId: string,
  _payload: { title: string; message: string; payload?: unknown }
) {
  // In-app only for the hackathon. FCM integration point.
}

export async function markNotificationViewed(notificationEventId: string) {
  return db.notificationEvent.update({
    where: { id: notificationEventId },
    data: { status: "VIEWED", viewedAt: new Date() },
  });
}

export async function respondToNotificationEvent(
  notificationEventId: string,
  status: "ACCEPTED" | "DECLINED" | "EXPIRED",
  note?: string
) {
  return db.notificationEvent.update({
    where: { id: notificationEventId },
    data: { status, respondedAt: new Date(), note },
  });
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  message: string,
  requestId?: string
) {
  return db.notification.create({
    data: { userId, type, title, message, requestId, read: false },
  });
}
