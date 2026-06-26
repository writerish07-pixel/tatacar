import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPaginatedResult } from '../dto/pagination';
import type { RequestWithContext } from '../types';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

/**
 * Wraps every successful response in the unified envelope
 * `{ success, data, meta }` (Master Spec §11). Paginated results contribute
 * their pagination fields to `meta`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<unknown>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const requestId = request.requestId;

    return next.handle().pipe(
      map((payload): SuccessEnvelope<unknown> => {
        const baseMeta: Record<string, unknown> = {
          requestId,
          timestamp: new Date().toISOString(),
        };

        if (isPaginatedResult(payload)) {
          return {
            success: true,
            data: payload.data,
            meta: { ...baseMeta, ...payload.meta },
          };
        }

        return { success: true, data: payload ?? null, meta: baseMeta };
      }),
    );
  }
}
