/**
 * Logger utility for DayFlow calendar
 * Only logs in development mode
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment =
      (globalThis as any).process?.env?.NODE_ENV !== 'production';
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    const prefix = `[DayFlow ${level.toUpperCase()}] ${timestamp}:`;

    switch (level) {
      case 'log':
        console.log(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
    }
  }

  log(message: string, ...args: any[]): void {
    this.formatMessage('log', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }
}

export const logger = new Logger();
