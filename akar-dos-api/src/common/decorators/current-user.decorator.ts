import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser, RequestWithContext } from '../types';

/** Injects the authenticated user (set by the JWT strategy) into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithContext>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without authentication');
    }
    return request.user;
  },
);
