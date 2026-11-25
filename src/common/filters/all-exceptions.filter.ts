import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../../../generated/prisma';

/**
 * Last-resort handler for every error that reaches the HTTP layer.
 *
 * Keeps Nest's default body shape ({ statusCode, message, error }) so existing clients
 * keep working, adds path/timestamp, maps common Prisma errors to proper 4xx codes,
 * and never leaks internal error details on 5xx.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Only HTTP is served today (no gateways or microservices)
    if (host.getType() !== 'http') {
      this.logger.error('Unhandled non-HTTP exception', exception instanceof Error ? exception.stack : String(exception));
      return;
    }

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Handlers that write to the raw response (pixels, redirects) may already have replied
    if (response.headersSent) {
      return;
    }

    const { status, body } = this.toResponse(exception);
    const path = httpAdapter.getRequestUrl(request);

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${httpAdapter.getRequestMethod(request)} ${path} -> ${status}`, stack);
    }

    httpAdapter.reply(response, { ...body, path, timestamp: new Date().toISOString() }, status);
  }

  private toResponse(exception: unknown): { status: number; body: Record<string, unknown> } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body =
        typeof res === 'string' ? { statusCode: status, message: res } : { statusCode: status, ...(res as object) };
      return { status, body };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return this.simple(HttpStatus.CONFLICT, 'Resource already exists', 'Conflict');
        case 'P2025':
          return this.simple(HttpStatus.NOT_FOUND, 'Resource not found', 'Not Found');
        case 'P2003':
          return this.simple(HttpStatus.BAD_REQUEST, 'Related resource does not exist', 'Bad Request');
      }
    }

    return this.simple(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error', 'Internal Server Error');
  }

  private simple(status: number, message: string, error: string) {
    return { status, body: { statusCode: status, message, error } };
  }
}
