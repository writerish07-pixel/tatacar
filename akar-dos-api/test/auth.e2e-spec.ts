import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end tests for the Milestone 1 foundation. Runs against the seeded
 * database (npm run db:seed). Covers: login for seed users, the unified
 * envelope, JWT-protected routes, RBAC denial, audit-on-login, My Work,
 * refresh rotation, and health.
 */
describe('AKAR DOS — M1 foundation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    // Bypass rate limiting in tests — the suite performs many logins, which
    // would otherwise trip the 10/15min login throttle (enforced in production).
    process.env.DISABLE_THROTTLE = '1';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    // The response interceptor, exception filter and request-context middleware
    // are registered globally inside AppModule; only the ValidationPipe and the
    // global prefix are applied in main.ts, so we mirror those two here.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    prisma = app.get(PrismaService);
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (userId: string, password: string) =>
    request(httpServer).post('/api/v1/auth/login').send({ userId, password });

  it('GET /health is public and reports database connected', async () => {
    const res = await request(httpServer).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ status: 'ok', database: 'connected' });
    expect(res.body.meta.requestId).toBeDefined();
  });

  it('logs in every seeded role', async () => {
    const creds: Array<[string, string]> = [
      ['GM_01', 'Gm@12345'],
      ['RECEPTION_01', 'Rec@12345'],
      ['SALES_01', 'Sales@123'],
      ['CASHIER_MANAGER_01', 'Cash@123'],
      ['PDI_MANAGER_01', 'Pdi@1234'],
    ];
    for (const [userId, password] of creds) {
      const res = await login(userId, password);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.salesTeamId).toBe(userId);
      // passwordHash must never leak.
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    }
  });

  it('rejects invalid credentials with a 401 envelope', async () => {
    const res = await login('SALES_01', 'wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('writes an audit log row on successful login', async () => {
    const before = await prisma.auditLog.count({ where: { event: 'auth.login' } });
    await login('SALES_01', 'Sales@123');
    const after = await prisma.auditLog.count({ where: { event: 'auth.login' } });
    expect(after).toBeGreaterThan(before);
  });

  it('blocks unauthenticated access to protected routes', async () => {
    const res = await request(httpServer).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the current user on GET /auth/me', async () => {
    const { body } = await login('GM_01', 'Gm@12345');
    const res = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('GM');
  });

  it('enforces RBAC: SALES cannot list users, GM can', async () => {
    const sales = await login('SALES_01', 'Sales@123');
    const denied = await request(httpServer)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${sales.body.data.accessToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    const gm = await login('GM_01', 'Gm@12345');
    const allowed = await request(httpServer)
      .get('/api/v1/users?page=1&pageSize=5')
      .set('Authorization', `Bearer ${gm.body.data.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body.data)).toBe(true);
    expect(allowed.body.meta.total).toBeGreaterThanOrEqual(11);
  });

  it('returns My Work buckets for an authenticated user', async () => {
    const { body } = await login('SALES_01', 'Sales@123');
    const res = await request(httpServer)
      .get('/api/v1/tasks/my-work')
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('actionRequired');
    expect(res.body.data).toHaveProperty('overdue');
    expect(res.body.data).toHaveProperty('dueToday');
    expect(res.body.data).toHaveProperty('completedToday');
  });

  it('rotates tokens on refresh and invalidates the old refresh token', async () => {
    const { body } = await login('TL_01', 'Tl@12345');
    const first = body.data.refreshToken;
    const refreshed = await request(httpServer).post('/api/v1/auth/refresh').send({ refreshToken: first });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    // Old refresh token is now revoked.
    const reuse = await request(httpServer).post('/api/v1/auth/refresh').send({ refreshToken: first });
    expect(reuse.status).toBe(401);
  });

  it('rejects unknown body fields (whitelist) on login', async () => {
    const res = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ userId: 'GM_01', password: 'Gm@12345', injected: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
