import type { UserRole } from '@prisma/client';

/**
 * Action authorization matrix (Master Spec §9 / docs/04 §3). Maps each workflow
 * `actionType` to the roles permitted to run it. This is the legacy/static
 * policy referenced by ADR-005: in V1 it is the source of truth; the Rules
 * Engine (later milestone) runs in shadow mode against it.
 *
 * The full set of workflow actions is declared here as the foundation; the
 * corresponding handlers are implemented in their milestones (WorkflowService).
 */
export const ACTION_ROLES: Record<string, UserRole[]> = {
  TESTDRIVE_REQUEST: ['SALES', 'TL', 'GM', 'OWNER'],
  QUOTATION_CREATE: ['SALES', 'TL', 'GM', 'OWNER'],
  QUOTATION_APPROVE: ['EV_MANAGER', 'PV_MANAGER', 'GM', 'OWNER'],
  BOOKING_INITIATED: ['SALES', 'TL', 'GM', 'OWNER'],
  BOOKING_PAYMENT_APPROVED: ['CASHIER_MANAGER', 'ACCOUNTS_MANAGER', 'GM', 'OWNER'],
  BOOKING_CANCELLED: ['SALES', 'TL', 'GM', 'OWNER', 'ACCOUNTS_MANAGER'],
  ACCESSORY_SELECTION_SUBMITTED: ['ACCESSORIES_MANAGER', 'GM', 'OWNER'],
  ACCESSORY_PAYMENT_CLEARED: ['CASHIER_MANAGER', 'ACCOUNTS_MANAGER', 'GM', 'OWNER'],
  NOC_APPROVAL: [
    'SALES',
    'FINANCE_MANAGER',
    'CASHIER_MANAGER',
    'ACCOUNTS_MANAGER',
    'ACCESSORIES_MANAGER',
    'PDI_MANAGER',
    'GM',
    'OWNER',
  ],
  PDI_PASS: ['PDI_MANAGER', 'GM', 'OWNER'],
  DELIVERY_CONFIRM: ['GM', 'OWNER'],
};

/** Returns true if the role may run the given workflow action. */
export function canRunAction(role: UserRole, actionType: string): boolean {
  const allowed = ACTION_ROLES[actionType];
  return allowed !== undefined && allowed.includes(role);
}

/** All known workflow action types. */
export function knownActionTypes(): string[] {
  return Object.keys(ACTION_ROLES);
}
