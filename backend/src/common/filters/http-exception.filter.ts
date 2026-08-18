import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { localizeApiMessage, localizeValidationMessages, resolveApiLocale } from '../i18n/api-locale';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message || exception.message;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const locale = resolveApiLocale(request);
    const localizedMessage = Array.isArray(message)
      ? localizeValidationMessages(message, locale)
      : localizeApiMessage(message, locale);
    response.status(status).json({
      code: status,
      data: null,
      message: localizedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
