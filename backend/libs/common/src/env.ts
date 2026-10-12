/** Corta el arranque si falta una variable obligatoria, en vez de fallar más tarde con un error confuso. */
export function requireEnv(...names: string[]): void {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}. Revisá backend/.env (ver .env.example).`);
  }
}
