import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'SERVER_ERROR';
    let message = 'An unexpected error occurred.';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const r = exceptionResponse as Record<string, unknown>;
        code = (r['error'] as string) ?? 'HTTP_ERROR';
        message = Array.isArray(r['message'])
          ? 'Validation failed.'
          : (r['message'] as string) ?? message;
        details = Array.isArray(r['message']) ? (r['message'] as unknown[]) : [];
      }
    }

    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();

    response.status(status).json({
      success: false,
      error: { code, message, details, requestId },
    });
  }
}
