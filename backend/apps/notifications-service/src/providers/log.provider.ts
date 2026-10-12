import { Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { EmailProvider, OutgoingEmail } from './email-provider.js';

/**
 * Para desarrollo: no manda nada, lo anota en el log y guarda el HTML en
 * EMAIL_OUTBOX_DIR para abrirlo en el navegador.
 */
export class LogProvider implements EmailProvider {
  readonly name = 'log';
  private readonly logger = new Logger('Emails');
  private readonly dir = resolve(process.env.EMAIL_OUTBOX_DIR ?? 'outbox');

  async send(email: OutgoingEmail): Promise<{ id: string | null }> {
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
    let where = '';
    try {
      await mkdir(this.dir, { recursive: true });
      const file = join(this.dir, `${id}.html`);
      await writeFile(file, email.html);
      where = ` → ${file}`;
    } catch (err) {
      // Sin carpeta con permisos de escritura (por ejemplo en el contenedor) alcanza con el log.
      this.logger.warn(`No se pudo guardar el HTML en ${this.dir}: ${(err as Error).message}`);
    }
    this.logger.log(`[sin enviar] "${email.subject}" para ${email.to.join(', ')}${where}`);
    return { id };
  }
}
