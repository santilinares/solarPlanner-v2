/**
 * Interface for components that track unsaved work.
 * Implement this in components that need to warn users before navigating away.
 */
export interface HasUnsavedWork {
  hasUnsavedWork(): boolean;
}
