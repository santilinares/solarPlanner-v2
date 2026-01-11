import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Admin guard - protects admin-only routes
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user has admin role
  if (authService.isAdmin()) {
    return true;
  }

  // Redirect to user dashboard if not admin
  router.navigate(['/projects']);
  return false;
};
