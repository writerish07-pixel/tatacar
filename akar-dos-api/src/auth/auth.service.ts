import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';
import { PasswordService } from './password.service';
import type { AccessTokenClaims } from './jwt.strategy';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    salesTeamId: string;
    name: string;
    role: string;
  };
}

interface RefreshClaims {
  sub: string;
  sid: string;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  async login(salesTeamId: string, password: string, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { salesTeamId } });
    // Uniform failure to avoid account enumeration.
    if (!user || user.status !== 'ACTIVE' || !(await this.passwords.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = await this.issueSession(user, meta);

    await this.audit.record({
      entityType: 'user',
      entityId: user.id,
      event: 'auth.login',
      actorId: user.id,
      ipAddress: meta.ipAddress ?? null,
    });
    await this.events.emit({
      eventType: 'auth.login',
      aggregate: 'user',
      aggregateId: user.id,
      payload: { salesTeamId: user.salesTeamId, role: user.role },
      actorId: user.id,
    });

    return result;
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    let claims: RefreshClaims;
    try {
      claims = await this.jwt.verifyAsync<RefreshClaims>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: claims.sid } });
    const tokenHash = this.hashToken(refreshToken);
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt < new Date() ||
      session.refreshTokenHash !== tokenHash ||
      session.userId !== claims.sub
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate: revoke the presented session, issue a fresh one.
    await this.prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.issueSession(user, meta);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.userSession.updateMany({
        where: { userId, refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.record({ entityType: 'user', entityId: userId, event: 'auth.logout', actorId: userId });
  }

  private async issueSession(user: User, meta: RequestMeta): Promise<AuthResult> {
    const sessionId = randomUUID();

    const accessClaims: AccessTokenClaims = {
      sub: user.id,
      salesTeamId: user.salesTeamId,
      role: user.role,
      branchId: user.branchId,
    };
    const accessToken = await this.jwt.signAsync(accessClaims, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.expiresIn('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId } satisfies RefreshClaims,
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.expiresIn('JWT_REFRESH_EXPIRES', '7d'),
      },
    );

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: this.refreshExpiry(),
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, salesTeamId: user.salesTeamId, name: user.name, role: user.role },
    };
  }

  /**
   * Returns the configured expiry as the type the JWT signer expects. The value
   * is a duration string like "15m" / "7d" (validated by config), narrowed here
   * to the signer's `expiresIn` type.
   */
  private expiresIn(key: string, fallback: string): JwtSignOptions['expiresIn'] {
    return this.config.get<string>(key, fallback) as JwtSignOptions['expiresIn'];
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry(): Date {
    const days = 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
