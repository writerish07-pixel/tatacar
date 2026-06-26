import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/types';

export interface AccessTokenClaims {
  sub: string;
  salesTeamId: string;
  role: string;
  branchId: string | null;
}

/**
 * Validates the access token and loads the current user. Claims carry no PII or
 * financial data (Master Spec §32). The user is re-loaded each request so a
 * deactivated account cannot continue with a still-valid token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(claims: AccessTokenClaims): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return {
      id: user.id,
      salesTeamId: user.salesTeamId,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };
  }
}
