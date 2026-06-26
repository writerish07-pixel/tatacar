import type { UserRole } from '@prisma/client';

/** Authenticated principal attached to the request by the JWT strategy. */
export interface AuthenticatedUser {
  id: string;
  salesTeamId: string;
  name: string;
  role: UserRole;
  branchId: string | null;
}

/** Express request augmented with the authenticated user and a request id. */
export interface RequestWithContext {
  requestId: string;
  user?: AuthenticatedUser;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}
