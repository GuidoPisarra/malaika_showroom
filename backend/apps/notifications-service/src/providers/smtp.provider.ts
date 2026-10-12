import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailProvider, OutgoingEmail } from './email-provider.js';

/** Cualquier servidor SMTP (el del hosting, Gmail, Amazon SES, Mailpit en desarrollo...). */
export class SmtpProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transport: Transporter;

  constructor(url: string) {
    // Que una conexión colgada no quede abierta minutos después de darla por fallida.
    this.transport = nodemailer.createTransport({ url, connectionTimeout: 7_000, greetingTimeout: 7_000, socketTimeout: 20_000 });
  }

  async send(email: OutgoingEmail): Promise<{ id: string | null }> {
    const sending = this.transport.sendMail({
      from: email.from,
      to: email.to,
      replyTo: email.replyTo ?? undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    // Menor que el timeout de RPC del gateway, para que el envío de prueba responda con el error real.
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('El servidor SMTP no respondió a tiempo')), 8_000);
    });
    const info = await Promise.race([sending, timeout]).finally(() => clearTimeout(timer));
    return { id: info.messageId ?? null };
  }
}
