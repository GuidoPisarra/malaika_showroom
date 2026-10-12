export type Role = 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN';

export interface JwtPayload {
  sub: string;
  /** null solo para el superadmin de la plataforma. */
  tenantId: string | null;
  role: Role;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; name: string; role: Role; tenantId: string | null };
}
