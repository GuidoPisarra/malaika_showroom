import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El panel vive solo en el navegador (usa la sesión guardada en localStorage).
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  // La tienda se renderiza en cada request: el catálogo y el comercio salen de la API.
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
