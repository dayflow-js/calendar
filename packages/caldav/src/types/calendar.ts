/**
 * A CalDAV calendar discovered from a server.
 *
 * Permissions are optional — servers may not expose them.
 * Consumers should treat missing permissions as read-only (conservative default).
 */
export type CalDAVCalendar = {
  id: string;
  name: string;
  color?: string;
  readOnly?: boolean;
  permissions?: {
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  };
};
