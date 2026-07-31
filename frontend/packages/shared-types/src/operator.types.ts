import { OperatorStatus, OperatorUserRole, StaffStatus } from './enums';

export interface Operator {
  id: string;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  ntcLicenceNumber: string | null;
  registrationNumber: string | null;
  contactEmail: string;
  contactPhone: string | null;
  addressText: string | null;
  status: OperatorStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OperatorUser {
  id: string;
  userId: string;
  operatorId: string;
  operatorRole: OperatorUserRole;
  invitedBy: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  operatorId: string;
  licenceNumber: string;
  licenceExpiry: string | null;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Conductor {
  id: string;
  userId: string;
  operatorId: string;
  badgeNumber: string | null;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ApiCredential {
  id: string;
  operatorId: string;
  label: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}
