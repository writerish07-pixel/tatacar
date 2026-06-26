/**
 * AKAR DOS — database seed (Milestone 1 foundation).
 *
 * Creates: organization, branch, departments, the 11 seed staff users
 * (passwords bcrypt cost 12), the RBAC permission matrix, and config settings
 * including `rules_engine.mode = shadow` (docs/04 §13, docs/05 DEC-008).
 *
 * Idempotent: re-running upserts by natural key (salesTeamId, branch code,
 * config key) so it is safe in dev and CI.
 */
import 'dotenv/config';
import { PrismaClient, UserRole, VehicleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface SeedUser {
  salesTeamId: string;
  password: string;
  name: string;
  role: UserRole;
  vehicleType?: VehicleType;
  hierarchyLevel: number;
}

const SEED_USERS: SeedUser[] = [
  { salesTeamId: 'GM_01', password: 'Gm@12345', name: 'General Manager', role: UserRole.GM, hierarchyLevel: 1 },
  { salesTeamId: 'RECEPTION_01', password: 'Rec@12345', name: 'Reception Desk', role: UserRole.RECEPTION, hierarchyLevel: 4 },
  { salesTeamId: 'EV_MANAGER_01', password: 'Ev@123456', name: 'EV Manager', role: UserRole.EV_MANAGER, vehicleType: VehicleType.EV, hierarchyLevel: 2 },
  { salesTeamId: 'TL_01', password: 'Tl@12345', name: 'Team Leader', role: UserRole.TL, hierarchyLevel: 3 },
  { salesTeamId: 'SALES_01', password: 'Sales@123', name: 'Sales Consultant', role: UserRole.SALES, hierarchyLevel: 5 },
  { salesTeamId: 'CASHIER_MANAGER_01', password: 'Cash@123', name: 'Cashier Manager', role: UserRole.CASHIER_MANAGER, hierarchyLevel: 3 },
  { salesTeamId: 'ACCOUNTS_MANAGER_01', password: 'Acct@123', name: 'Accounts Manager', role: UserRole.ACCOUNTS_MANAGER, hierarchyLevel: 3 },
  { salesTeamId: 'FIN_MANAGER_01', password: 'Fin@1234', name: 'Finance Manager', role: UserRole.FINANCE_MANAGER, hierarchyLevel: 3 },
  { salesTeamId: 'ACCESSORIES_MANAGER_01', password: 'Accs@123', name: 'Accessories Manager', role: UserRole.ACCESSORIES_MANAGER, hierarchyLevel: 3 },
  { salesTeamId: 'PDI_MANAGER_01', password: 'Pdi@1234', name: 'PDI Manager', role: UserRole.PDI_MANAGER, hierarchyLevel: 3 },
  { salesTeamId: 'TD_COORDINATOR_01', password: 'Td@12345', name: 'Test Drive Coordinator', role: UserRole.TD_COORDINATOR, hierarchyLevel: 4 },
];

// Resource-level RBAC matrix (docs/03 §6.2, docs/04 §3). Action-level
// authorization for workflow commands lives in common/action-policy.ts.
type Scope = 'ALL' | 'BRANCH' | 'TEAM' | 'OWN' | 'NONE';
interface PermSpec {
  resource: string;
  action: string;
  roles: Partial<Record<UserRole, Scope>>;
}

const PERMISSIONS: PermSpec[] = [
  {
    resource: 'user',
    action: 'READ',
    roles: { OWNER: 'ALL', GM: 'ALL', EV_MANAGER: 'BRANCH', PV_MANAGER: 'BRANCH', TL: 'TEAM', SALES: 'OWN' },
  },
  {
    resource: 'user',
    action: 'CREATE',
    roles: { OWNER: 'ALL', GM: 'ALL' },
  },
  {
    resource: 'user',
    action: 'UPDATE',
    roles: { OWNER: 'ALL', GM: 'ALL' },
  },
  {
    resource: 'permission',
    action: 'READ',
    roles: { OWNER: 'ALL', GM: 'ALL' },
  },
  {
    resource: 'audit',
    action: 'READ',
    roles: { OWNER: 'ALL', GM: 'ALL' },
  },
  {
    resource: 'task',
    action: 'READ',
    roles: {
      OWNER: 'ALL', GM: 'ALL', EV_MANAGER: 'BRANCH', PV_MANAGER: 'BRANCH', TL: 'TEAM',
      SALES: 'OWN', RECEPTION: 'OWN', FINANCE_MANAGER: 'OWN', CASHIER_MANAGER: 'OWN',
      ACCOUNTS_MANAGER: 'OWN', ACCESSORIES_MANAGER: 'OWN', PDI_MANAGER: 'OWN', TD_COORDINATOR: 'OWN',
    },
  },
  {
    resource: 'notification',
    action: 'READ',
    roles: {
      OWNER: 'OWN', GM: 'OWN', EV_MANAGER: 'OWN', PV_MANAGER: 'OWN', TL: 'OWN',
      SALES: 'OWN', RECEPTION: 'OWN', FINANCE_MANAGER: 'OWN', CASHIER_MANAGER: 'OWN',
      ACCOUNTS_MANAGER: 'OWN', ACCESSORIES_MANAGER: 'OWN', PDI_MANAGER: 'OWN', TD_COORDINATOR: 'OWN',
    },
  },
];

async function main(): Promise<void> {
  console.log('Seeding AKAR DOS (Milestone 1 foundation)…');

  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'AKAR Motors', gstin: process.env.DEALER_GSTIN || null, address: 'Jaipur, Rajasthan, India' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'AKAR Motors',
      gstin: process.env.DEALER_GSTIN || null,
      address: 'Jaipur, Rajasthan, India',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { code: 'JAIPUR_MAIN' },
    update: { name: 'Jaipur Main', organizationId: org.id },
    create: { name: 'Jaipur Main', code: 'JAIPUR_MAIN', organizationId: org.id, address: 'Jaipur, Rajasthan' },
  });

  const departmentCodes = ['SALES', 'FINANCE', 'CASHIER', 'ACCOUNTS', 'ACCESSORIES', 'PDI', 'RECEPTION'];
  for (const code of departmentCodes) {
    await prisma.department.upsert({
      where: { branchId_code: { branchId: branch.id, code } },
      update: { name: code },
      create: { branchId: branch.id, code, name: code },
    });
  }

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_COST);
    await prisma.user.upsert({
      where: { salesTeamId: u.salesTeamId },
      update: {
        name: u.name,
        role: u.role,
        branchId: branch.id,
        vehicleType: u.vehicleType ?? VehicleType.ALL,
        hierarchyLevel: u.hierarchyLevel,
      },
      create: {
        salesTeamId: u.salesTeamId,
        passwordHash,
        name: u.name,
        role: u.role,
        branchId: branch.id,
        vehicleType: u.vehicleType ?? VehicleType.ALL,
        hierarchyLevel: u.hierarchyLevel,
      },
    });
  }

  let permCount = 0;
  for (const spec of PERMISSIONS) {
    for (const [role, scope] of Object.entries(spec.roles)) {
      await prisma.permission.upsert({
        where: { role_resource_action: { role: role as UserRole, resource: spec.resource, action: spec.action } },
        update: { scope: scope as Scope },
        create: { role: role as UserRole, resource: spec.resource, action: spec.action, scope: scope as Scope },
      });
      permCount++;
    }
  }

  await prisma.configSetting.upsert({
    where: { key: 'rules_engine.mode' },
    update: { value: { mode: 'shadow' } },
    create: { key: 'rules_engine.mode', value: { mode: 'shadow' } },
  });
  await prisma.configSetting.upsert({
    where: { key: 'sla.lead_first_contact_minutes' },
    update: { value: { minutes: 30 } },
    create: { key: 'sla.lead_first_contact_minutes', value: { minutes: 30 } },
  });

  console.log(`Seed complete: 1 org, 1 branch, ${departmentCodes.length} departments, ${SEED_USERS.length} users, ${permCount} permissions, 2 config keys.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
