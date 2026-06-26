import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode, errorCodeForStatus } from '../constants/error-codes';
import type { RequestWithContext } from '../types';

interface ErrorDetail {
  field: string;
  message: string;
}

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  meta: Record<string, unknown>;
}

/**
 * Maps all thrown exceptions to the unified error envelope (Master Spec §11).
 * Never leaks stack traces to clients; logs server-side for 5xx.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, details, code } = this.extract(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`[${request.requestId}] ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    const envelope: ErrorEnvelope = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: { requestId: request.requestId, timestamp: new Date().toISOString() },
    };

    response.status(status).json(envelope);
  }

  private extract(
    exception: unknown,
    status: number,
  ): { message: string; details?: ErrorDetail[]; code: string } {
    const code = errorCodeForStatus(status);

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { message: res, code };
      }
      if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string; code?: string };
        // class-validator produces an array of messages on 400.
        if (Array.isArray(body.message)) {
          return {
            message: 'Validation failed',
            details: body.message.map((m) => ({ field: 'body', message: m })),
            code: ErrorCode.VALIDATION_ERROR,
          };
        }
        return { message: body.message ?? exception.message, code: body.code ?? code };
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { message: 'Internal server error', code: ErrorCode.INTERNAL_ERROR };
    }
    return { message: exception instanceof Error ? exception.message : 'Unexpected error', code };
  }
}
