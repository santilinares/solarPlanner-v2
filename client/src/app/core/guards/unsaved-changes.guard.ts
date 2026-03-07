import { CanDeactivateFn } from '@angular/router';

/**
 * Interface for components that track unsaved work
 */
export interface HasUnsavedWork {
  hasUnsavedWork(): boolean;
}

/**
 * Guard that warns users about unsaved changes before navigating away
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedWork> = (component) => {
  if (component.hasUnsavedWork()) {
    return window.confirm('Your progress will not be saved. Are you sure you want to exit?');
  }
  return true;
};
