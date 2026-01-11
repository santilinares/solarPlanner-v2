/**
 * HTTP Error response structure
 */
export interface HttpErrorResponse {
  error?: {
    message?: string;
    details?: unknown;
  };
  status?: number;
  statusText?: string;
}

/**
 * Type guard and helper to safely extract error message
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const httpErr = err as HttpErrorResponse;
    if (httpErr.error?.message && typeof httpErr.error.message === 'string') {
      return httpErr.error.message;
    }
  }
  return fallback;
}
