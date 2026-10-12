import { Routes } from '@angular/router';
import { adminGuard, adminLoginGuard } from './admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Ingresar al panel · Malaika',
    canActivate: [adminLoginGuard],
    loadComponent: () => import('./login/admin-login.page').then((m) => m.AdminLoginPage),
  },
  {
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Panel · Malaika',
        loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'pedidos',
        title: 'Pedidos · Panel',
        loadComponent: () => import('./orders/orders-list.page').then((m) => m.OrdersListPage),
        children: [
          {
            path: ':id',
            loadComponent: () => import('./orders/order-detail.drawer').then((m) => m.OrderDetailDrawer),
          },
        ],
      },
      {
        path: 'productos',
        title: 'Productos · Panel',
        loadComponent: () => import('./products/products-list.page').then((m) => m.ProductsListPage),
      },
      {
        path: 'productos/nuevo',
        title: 'Nuevo producto · Panel',
        loadComponent: () => import('./products/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: 'productos/:id',
        title: 'Editar producto · Panel',
        loadComponent: () => import('./products/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: 'cupones',
        title: 'Cupones · Panel',
        loadComponent: () => import('./coupons/coupons.page').then((m) => m.CouponsPage),
      },
      {
        path: 'looks',
        title: 'Looks · Panel',
        loadComponent: () => import('./looks/looks.page').then((m) => m.LooksPage),
      },
      {
        path: 'configuracion',
        title: 'Configuración · Panel',
        loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · Panel',
        loadComponent: () => import('./users/users.page').then((m) => m.UsersPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
