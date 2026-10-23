import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { scanDistJsViolations } from '../../../scripts/atomic-css-guard-utils.mjs';

it('scans minified JS literals without treating URLs, regexes, or PURE annotations as quotes/comments', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dayflow-css-guard-'));
  try {
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(
      path.join(root, 'dist/index.js'),
      [
        'const url="https://example.com/*not a comment*/";',
        'const pattern=/["\'`]/;',
        'const component=/* @__PURE__ */memo(()=>"df-event");',
        'const classes="bg-red-500 flex";',
        'const template=`df-event ${active ? "px-2" : "py-2"}`;',
      ].join('')
    );
    expect(
      scanDistJsViolations(root)
        .map((violation: { token: string }) => violation.token)
        .toSorted()
    ).toEqual(['bg-red-500', 'px-2', 'py-2']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
