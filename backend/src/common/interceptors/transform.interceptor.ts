import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { resolveApiLocale } from '../i18n/api-locale';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const locale = resolveApiLocale(context.switchToHttp().getRequest());
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        data,
        message: locale === 'en-US' ? 'Success' : '成功',
      })),
    );
  }
}
