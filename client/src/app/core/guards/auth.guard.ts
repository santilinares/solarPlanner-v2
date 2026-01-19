import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard - protects routes requiring authentication
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Instant check using client-side session state
  if (authService.isAuthenticated()) {
    return true;
  }

  // Not authenticated, redirect to login with return URL
  void router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
