import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { AccessTokenClaims } from '../auth/jwt.strategy';

/**
 * Real-time staff notifications over Socket.IO (ADR-002, docs/05 DEC-009).
 * Clients authenticate with their access token in the handshake and join their
 * personal room `user:{id}`. Staff notifications are in-app only — never
 * WhatsApp/Telegram.
 */
@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      await client.join(this.room(claims.sub));
      client.data.userId = claims.sub;
    } catch {
      client.disconnect(true);
    }
  }

  /** Push a notification to a specific user's room. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn('Socket server not ready; notification not pushed in real time');
      return;
    }
    this.server.to(this.room(userId)).emit(event, payload);
  }

  private room(userId: string): string {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }
}
