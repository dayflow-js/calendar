import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import terser from '@rollup/plugin-terser';
import { rollup } from 'rollup';

const args = process.argv.slice(2);
const target = path.resolve(
  args.find(arg => !arg.startsWith('--')) ??
    fileURLToPath(new URL('../dist/index.esm.js', import.meta.url))
);
const cases = {
  utility: 'isTask',
  monthHeadless: 'CalendarApp,createMonthView',
  monthCalendar: 'CalendarApp,CalendarRenderer,createMonthView',
  allViews:
    'CalendarApp,CalendarRenderer,createDayView,createWeekView,createMonthView,createYearView,createAgendaView',
};

// Bundle the published ESM again, as a consumer would. Keep runtime dependencies
// external so the measurements describe core's contribution consistently.
for (const [name, imports] of Object.entries(cases)) {
  const bundle = await rollup({
    input: 'bundle-size-probe',
    plugins: [
      {
        name: 'bundle-size-probe',
        resolveId: id => (id === 'bundle-size-probe' ? id : null),
        load: id =>
          id === 'bundle-size-probe'
            ? `export {${imports}} from ${JSON.stringify(target)};`
            : null,
      },
      terser(),
    ],
    external: id => !path.isAbsolute(id) && id !== 'bundle-size-probe',
  });
  try {
    const { output } = await bundle.generate({ format: 'esm' });
    const code = output[0].code;
    const gzip = gzipSync(code, { level: 9 }).length;
    console.log(
      JSON.stringify({ name, imports, bytes: Buffer.byteLength(code), gzip })
    );
    if (args.includes('--check') && name === 'utility' && gzip > 2048) {
      throw new Error(
        'Utility import exceeds 2 KiB gzip: unused UI initialization may be retained.'
      );
    }
  } finally {
    await bundle.close();
  }
}
