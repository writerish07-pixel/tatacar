import { ACTION_ROLES, canRunAction, knownActionTypes } from './action-policy';

describe('action-policy (RBAC action matrix)', () => {
  it('allows SALES to create a quotation', () => {
    expect(canRunAction('SALES', 'QUOTATION_CREATE')).toBe(true);
  });

  it('forbids SALES from approving a quotation', () => {
    expect(canRunAction('SALES', 'QUOTATION_APPROVE')).toBe(false);
  });

  it('restricts delivery confirmation to GM and OWNER', () => {
    expect(canRunAction('GM', 'DELIVERY_CONFIRM')).toBe(true);
    expect(canRunAction('OWNER', 'DELIVERY_CONFIRM')).toBe(true);
    expect(canRunAction('SALES', 'DELIVERY_CONFIRM')).toBe(false);
    expect(canRunAction('PDI_MANAGER', 'DELIVERY_CONFIRM')).toBe(false);
  });

  it('only cashier/accounts (and GM/OWNER) may approve booking payment', () => {
    expect(canRunAction('CASHIER_MANAGER', 'BOOKING_PAYMENT_APPROVED')).toBe(true);
    expect(canRunAction('ACCOUNTS_MANAGER', 'BOOKING_PAYMENT_APPROVED')).toBe(true);
    expect(canRunAction('SALES', 'BOOKING_PAYMENT_APPROVED')).toBe(false);
  });

  it('returns false for unknown actions', () => {
    expect(canRunAction('GM', 'NOT_A_REAL_ACTION')).toBe(false);
  });

  it('declares all 11 workflow action types from the spec', () => {
    expect(knownActionTypes()).toHaveLength(11);
    expect(Object.keys(ACTION_ROLES)).toContain('NOC_APPROVAL');
  });
});
