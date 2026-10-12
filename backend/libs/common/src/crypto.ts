import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('Falta ENCRYPTION_KEY para cifrar credenciales');
  // Acepta cualquier string y deriva 32 bytes, así no depende del formato.
  return createHash('sha256').update(raw).digest();
}

/** Cifra un secreto (por ejemplo, el access token de Mercado Pago) con AES-256-GCM. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** Muestra solo los últimos caracteres de un secreto. */
export function maskSecret(secret: string | null | undefined): string | null {
  if (!secret) return null;
  return secret.length <= 8 ? '••••' : `••••${secret.slice(-4)}`;
}
