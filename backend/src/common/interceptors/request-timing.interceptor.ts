import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS || 250);

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ApiTiming');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(finalize(() => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const route = (request.originalUrl || request.url || '').split('?')[0];
      const record = {
        method: request.method,
        route,
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        slow: durationMs >= SLOW_REQUEST_MS,
      };
      const message = JSON.stringify(record);
      if (record.slow) this.logger.warn(message);
      else this.logger.log(message);
    }));
  }
}
