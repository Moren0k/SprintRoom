import type { Clock } from "../application/abstractions/ports";

/**
 * Implementacion del puerto `Clock` usando el reloj del sistema. Adecuada
 * para uso en runtime (rutas Next.js, scripts, etc.). En pruebas se utiliza
 * un reloj fijo en `tests/application/support/fakes.ts`.
 */
export class SystemClock implements Clock {
  get utcNow(): Date {
    return new Date();
  }
}
