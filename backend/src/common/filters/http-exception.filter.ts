import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { friendlyStatusMessage, localizeApiMessage, localizeValidationMessages, resolveApiLocale } from '../i18n/api-locale';
import { publicErrorCodeFor } from '../errors/public-error-code';

const publicAccessErrorCodes = new Set(['SITE_PLAN_EXPIRED', 'SITE_PUBLISH_PERMISSION_REQUIRED']);

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let declaredErrorCode: string | undefined;
    let safeData: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const structuredResponse = typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse as { message?: string | string[]; errorCode?: string; data?: unknown }
        : undefined;
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : structuredResponse?.message || exception.message;
      if (request.url.startsWith('/api/v1/public/') && structuredResponse?.errorCode) {
        declaredErrorCode = structuredResponse.errorCode;
        if (publicAccessErrorCodes.has(declaredErrorCode)) safeData = structuredResponse.data || null;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const locale = resolveApiLocale(request);
    const localizedMessage = status >= 500
      ? friendlyStatusMessage(status, locale)
      : Array.isArray(message)
        ? localizeValidationMessages(message, locale)
        : localizeApiMessage(message, locale);
    const rawMessages = Array.isArray(message) ? message : [message];
    const errorCode = declaredErrorCode || publicErrorCodeFor(request.url, status, rawMessages);
    response.status(status).json({
      code: status,
      ...(errorCode ? { errorCode } : {}),
      data: safeData,
      message: localizedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
