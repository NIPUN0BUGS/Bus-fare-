import { Locale, PassengerType, UserRole, UserStatus } from './enums';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: UserRole;
  status: UserStatus;
  locale: Locale;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PassengerProfile {
  id: string;
  userId: string;
  displayName: string | null;
  dateOfBirth: string | null;
  passengerType: PassengerType;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  userId: string;
  busApproaching: boolean;
  departureReminder: boolean;
  delays: boolean;
  cancellations: boolean;
  fareChanges: boolean;
  bookingUpdates: boolean;
  serviceDisruptions: boolean;
  channelPush: boolean;
  channelSms: boolean;
  channelEmail: boolean;
  updatedAt: string;
}

export interface SavedRoute {
  id: string;
  userId: string;
  routeId: string;
  fromStopId: string;
  toStopId: string;
  label: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: string;
  status: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}
