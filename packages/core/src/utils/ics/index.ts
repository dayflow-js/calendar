/**
 * ICS Utilities Module
 */

import { parseICS } from './icsParser';
import { ICSImportResult, ICSImportOptions } from './types';

export * from './types';
export * from './icsDateUtils';
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error('File content is empty');
        }
        const result = parseICS(content, options);
        resolve(result);
      } catch (err: any) {
        resolve({
          success: false,
          events: [],
          errors: [{ message: err.message || 'Failed to read file' }],
          totalParsed: 0,
          totalImported: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        events: [],
        errors: [{ message: 'File read error' }],
        totalParsed: 0,
        totalImported: 0,
      });
    };

    reader.readAsText(file);
  });
}
