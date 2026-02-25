/**
 * ICS Utilities Module
 */

import { parseICS } from './icsParser';
import { ICSImportResult, ICSImportOptions } from './types';

export * from './types';
export * from './utils';
export * from './icsParser';
export * from './icsGenerator';

/**
 * Import events from an ICS file object
 *
 * @param file - The File object (from input[type="file"])
 * @param options - Import options
 * @returns Promise resolving to import result
 */
export async function importICSFile(
  file: File,
  options?: ICSImportOptions
): Promise<ICSImportResult> {
  try {
    const content = await file.text();
    if (!content) {
      throw new Error('File content is empty');
    }
    const result = parseICS(content, options);
    return result;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Failed to read file';
    return {
      success: false,
      events: [],
      errors: [{ message }],
      totalParsed: 0,
      totalImported: 0,
    };
  }
}
