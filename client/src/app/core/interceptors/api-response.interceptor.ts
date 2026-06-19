import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * API Response Interceptor
 * Unwraps the standard server response envelope { success, data, message }
 * and returns only the data field to simplify client code
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      // Only process HTTP responses
      if (!(event instanceof HttpResponse)) {
        return event;
      }

      const body = event.body;

      // Check if response follows our standard envelope format
      if (
        body &&
        typeof body === 'object' &&
        'success' in body &&
        'data' in body
      ) {
        // Unwrap: return only the data field
        return event.clone({ body: body.data });
      }

      // Pass through as-is if not our envelope format
      return event;
    })
  );
};
