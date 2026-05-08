export type CalDAVErrorCode =
  | 'etag-conflict' // 412 Precondition Failed — concurrent edit, retry with fresh etag
  | 'not-found' // 404 Not Found
  | 'forbidden' // 403 Forbidden — insufficient privileges
  | 'server-error'; // 5xx or unexpected status

/**
 * Error thrown by the CalDAV adapter for protocol-level failures.
 *
 * `code === 'etag-conflict'` indicates a concurrent modification — the caller
 * should refresh the remote state and retry if appropriate.
 */
export class CalDAVError extends Error {
  readonly code: CalDAVErrorCode;
  readonly statusCode?: number;
  readonly href?: string;

  constructor(
    code: CalDAVErrorCode,
    message: string,
    statusCode?: number,
    href?: string
  ) {
    super(message);
    this.name = 'CalDAVError';
    this.code = code;
    this.statusCode = statusCode;
    this.href = href;
  }
}
