import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { LandingPageComponent } from './features/visitor/landing-page/landing-page.component';
import { VisitorLayoutComponent } from './layouts/visitor-layout/visitor-layout.component';

export const routes: Routes = [
  // Full-screen wizard — NO header / footer
  {
    path: 'projects/add',
    loadComponent: () => import('./features/user/add-project/add-project.component')
      .then(m => m.AddProjectComponent),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },

  // User routes (protected)
  {
    path: 'projects',
    loadComponent: () => import('./layouts/user-layout/user-layout.component')
      .then(m => m.UserLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/user/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'all',
        loadComponent: () => import('./features/user/user-projects/user-projects.component')
          .then(m => m.UserProjectsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/user/settings/settings.component')
          .then(m => m.SettingsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/user/profile/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/user/view-project/view-project.component')
          .then(m => m.ViewProjectComponent)
      },
      {
        path: ':id/configure',
        loadComponent: () => import('./features/user/configure-project/configure-project.component')
          .then(m => m.ConfigureProjectComponent)
      }
    ]
  },

  // Panels routes (protected)
  {
    path: 'panels',
    loadComponent: () => import('./layouts/user-layout/user-layout.component')
      .then(m => m.UserLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'all',
        loadComponent: () => import('./features/user/panel-list/panel-list.component')
          .then(m => m.PanelListComponent)
      }
    ]
  },

  // Admin routes (admin only)
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component')
          .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/admin/projects-list/projects-list.component')
          .then(m => m.ProjectsListComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users-list/users-list.component')
          .then(m => m.UsersListComponent)
      },
      {
        path: 'panels',
        loadComponent: () => import('./features/admin/panels/panels.component')
          .then(m => m.PanelsComponent)
      }
    ]
  },

  // Visitor routes (public)
  {
    path: '',
    component: VisitorLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: LandingPageComponent
      },
      {
        path: 'login',
        loadComponent: () => import('./features/visitor/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'registration',
        loadComponent: () => import('./features/visitor/register/register.component')
          .then(m => m.RegisterComponent)
      },
      {
        path: 'forgot_password',
        loadComponent: () => import('./features/visitor/forgot-password/forgot-password.component')
          .then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset_password/:id/:token',
        loadComponent: () => import('./features/visitor/reset-password/reset-password.component')
          .then(m => m.ResetPasswordComponent)
      }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
