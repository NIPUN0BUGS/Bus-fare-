import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const requestId = uuidv4();
    const start = Date.now();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: { requestId, executionMs: Date.now() - start },
      })),
    );
  }
}
