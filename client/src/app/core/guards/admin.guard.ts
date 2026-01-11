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
    //For guards, the cleanest approach is to use UrlTree return type and let Angular handle the navigation, or use void since we're already returning false.
    void router.navigate(['/login']);
    return false;
  }

  // Check if user has admin role
  if (authService.isAdmin()) {
    return true;
  }

  // Redirect to user dashboard if not admin
  //For guards, the cleanest approach is to use UrlTree return type and let Angular handle the navigation, or use void since we're already returning false.
  void router.navigate(['/projects']);
  return false;
};
