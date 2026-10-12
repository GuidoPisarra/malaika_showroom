/** Un email listo para entregar. */
export interface OutgoingEmail {
  from: string;
  to: string[];
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Clave para que el proveedor descarte duplicados si se reintenta. */
  idempotencyKey?: string;
  tags?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  /** Entrega el email y devuelve el id del proveedor, si lo da. Tira error si no se pudo. */
  send(email: OutgoingEmail): Promise<{ id: string | null }>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export type EmailDriver = 'resend' | 'smtp' | 'log';

/**
 * Proveedor de emails de la plataforma: EMAIL_DRIVER manda; si no está, Resend
 * cuando hay RESEND_API_KEY, SMTP cuando hay SMTP_URL y si no, solo se registran.
 */
export function emailDriver(): EmailDriver {
  const explicit = process.env.EMAIL_DRIVER;
  if (explicit === 'resend' || explicit === 'smtp' || explicit === 'log') return explicit;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_URL) return 'smtp';
  return 'log';
}

/** Variables obligatorias según el proveedor. */
export function emailRequiredEnv(): string[] {
  switch (emailDriver()) {
    case 'resend':
      return ['RESEND_API_KEY', 'EMAIL_FROM'];
    case 'smtp':
      return ['SMTP_URL', 'EMAIL_FROM'];
    default:
      return [];
  }
}
