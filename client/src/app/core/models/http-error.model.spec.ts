import { getErrorMessage } from './http-error.model';

describe('getErrorMessage', () => {
  it('returns the nested error.message string from an HttpErrorResponse-shaped object', () => {
    expect(getErrorMessage({ error: { message: 'Server error' } }, 'fallback')).toBe('Server error');
  });

  it('returns the fallback when the error object has no message', () => {
    expect(getErrorMessage({ error: {} }, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when error.message is not a string', () => {
    expect(getErrorMessage({ error: { message: 42 } }, 'fallback')).toBe('fallback');
  });

  it('returns the fallback for null input', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when the object has no "error" property', () => {
    expect(getErrorMessage({ message: 'raw message' }, 'fallback')).toBe('fallback');
  });
});
