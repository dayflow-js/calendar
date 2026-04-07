import { spawn } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';

import * as p from '@clack/prompts';
import pc from 'picocolors';

const FRAMEWORKS = [
  { value: 'react', label: 'React', hint: '@dayflow/react' },
  { value: 'vue', label: 'Vue', hint: '@dayflow/vue' },
  { value: 'svelte', label: 'Svelte', hint: '@dayflow/svelte' },
  { value: 'angular', label: 'Angular', hint: '@dayflow/angular' },
] as const;

type Framework = (typeof FRAMEWORKS)[number]['value'];

const ADAPTER_PACKAGE: Record<Framework, string> = {
  react: '@dayflow/react',
  vue: '@dayflow/vue',
  svelte: '@dayflow/svelte',
  angular: '@dayflow/angular',
};

const PLUGINS = [
  {
    value: 'drag',
    label: 'Drag & Drop',
    hint: '@dayflow/plugin-drag',
  },
  {
    value: 'keyboard-shortcuts',
    label: 'Keyboard Shortcuts',
    hint: '@dayflow/plugin-keyboard-shortcuts',
  },
  {
    value: 'localization',
    label: 'Localization',
    hint: '@dayflow/plugin-localization',
  },
  {
    value: 'sidebar',
    label: 'Sidebar',
    hint: '@dayflow/plugin-sidebar',
  },
] as const;

type Plugin = (typeof PLUGINS)[number]['value'];

const PLUGIN_PACKAGE: Record<Plugin, string> = {
  drag: '@dayflow/plugin-drag',
  'keyboard-shortcuts': '@dayflow/plugin-keyboard-shortcuts',
  localization: '@dayflow/plugin-localization',
  sidebar: '@dayflow/plugin-sidebar',
};

const PACKAGE_MANAGERS = [
  { value: 'npm', label: 'npm', hint: 'npm install' },
  { value: 'pnpm', label: 'pnpm', hint: 'pnpm add' },
  { value: 'yarn', label: 'yarn', hint: 'yarn add' },
  { value: 'bun', label: 'bun', hint: 'bun add' },
] as const;

type PackageManager = (typeof PACKAGE_MANAGERS)[number]['value'];

function detectPackageManager(): PackageManager {
  const cwd = process.cwd();
  if (
    existsSync(resolve(cwd, 'bun.lockb')) ||
    existsSync(resolve(cwd, 'bun.lock'))
  )
    return 'bun';
  if (existsSync(resolve(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function getInstallCommand(pm: PackageManager, packages: string[]): string {
  const pkgs = packages.join(' ');
  switch (pm) {
    case 'npm':
      return `npm install ${pkgs}`;
    case 'pnpm':
      return `pnpm add ${pkgs}`;
    case 'yarn':
      return `yarn add ${pkgs}`;
    case 'bun':
      return `bun add ${pkgs}`;
    default:
      return `npm install ${pkgs}`;
  }
}

function getPluginImportName(plugin: Plugin): string {
  switch (plugin) {
    case 'drag':
      return 'DragPlugin';
    case 'keyboard-shortcuts':
      return 'KeyboardShortcutsPlugin';
    case 'localization':
      return 'LocalizationPlugin';
    case 'sidebar':
      return 'SidebarPlugin';
    default:
      return '';
  }
}

function buildNextSteps(
  framework: Framework,
  plugins: Plugin[],
  isTailwind: boolean
): string {
  const imports: string[] = [];

  if (isTailwind) {
    imports.push(
      `/* DayFlow styles are handled via your CSS file (Tailwind V4 integration) */`
    );
  } else {
    imports.push(`import '@dayflow/core/dist/styles.css'`);
  }

  switch (framework) {
    case 'react':
      imports.push(`import { DayFlowCalendar } from '@dayflow/react'`);
      break;
    case 'vue':
      imports.push(`import { DayFlowCalendar } from '@dayflow/vue'`);
      break;
    case 'svelte':
      imports.push(`import { DayFlowCalendar } from '@dayflow/svelte'`);
      break;
    case 'angular':
      imports.push(`import { DayFlowCalendarModule } from '@dayflow/angular'`);
      break;
    default:
      break;
  }

  for (const plugin of plugins) {
    imports.push(
      `import { ${getPluginImportName(plugin)} } from '${PLUGIN_PACKAGE[plugin]}'`
    );
  }

  return imports.join('\n');
}

function findCssFile(dir: string): string | null {
  const commonNames = [
    'globals.css',
    'global.css',
    'index.css',
    'app.css',
    'main.css',
    'style.css',
  ];

  // 1. Check top-level common directories
  const commonDirs = ['src', 'app', 'styles'];
  for (const d of commonDirs) {
    const fullDir = resolve(dir, d);
    if (existsSync(fullDir) && statSync(fullDir).isDirectory()) {
      for (const name of commonNames) {
        const file = resolve(fullDir, name);
        if (existsSync(file)) return file;
      }
    }
  }

  // 2. Fallback: shallow search in src/ and app/ for ANY .css
  for (const d of ['src', 'app']) {
    const fullDir = resolve(dir, d);
    if (existsSync(fullDir) && statSync(fullDir).isDirectory()) {
      try {
        const files = readdirSync(fullDir);
        const css = files.find(f => f.endsWith('.css'));
        if (css) return resolve(fullDir, css);
      } catch {
        // ignore errors
      }
    }
  }

  // 3. Fallback to current directory for any of the common names
  for (const name of commonNames) {
    const file = resolve(dir, name);
    if (existsSync(file)) return file;
  }

  return null;
}

async function main() {
  console.log();
  p.intro(
    `${pc.bgCyan(pc.black(' DayFlow '))} ${pc.dim('— Calendar component setup')}`
  );

  // Step 1: framework
  const framework = await p.select<Framework>({
    message: 'Which framework are you using?',
    options: FRAMEWORKS.map(f => ({
      value: f.value,
      label: f.label,
      hint: f.hint,
    })),
  });

  if (p.isCancel(framework)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 2: plugins
  const selectedPlugins = await p.multiselect<Plugin>({
    message: 'Select plugins to install (space to toggle, enter to confirm)',
    options: PLUGINS.map(plugin => ({
      value: plugin.value,
      label: plugin.label,
      hint: plugin.hint,
    })),
    required: false,
  });

  if (p.isCancel(selectedPlugins)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 3: Tailwind CSS
  const isTailwind = await p.confirm({
    message: 'Are you using Tailwind CSS?',
    initialValue: true,
  });

  if (p.isCancel(isTailwind)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 4: package manager
  const detectedPm = detectPackageManager();
  const packageManager = await p.select<PackageManager>({
    message: 'Which package manager do you use?',
    options: PACKAGE_MANAGERS.map(pm => ({
      value: pm.value,
      label: pm.label,
      hint: pm.hint,
      ...(pm.value === detectedPm
        ? { label: `${pm.label} ${pc.dim('(detected)')}` }
        : {}),
    })),
    initialValue: detectedPm,
  });

  if (p.isCancel(packageManager)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Build packages list
  const packages: string[] = [
    '@dayflow/core',
    ADAPTER_PACKAGE[framework as Framework],
  ];

  for (const plugin of selectedPlugins as Plugin[]) {
    packages.push(PLUGIN_PACKAGE[plugin]);
  }

  // Summary
  console.log();
  const note = [
    `${pc.bold('Framework:')}  ${pc.cyan(ADAPTER_PACKAGE[framework as Framework])}`,
    selectedPlugins.length > 0
      ? `${pc.bold('Plugins:')}    ${(selectedPlugins as Plugin[]).map(plugin => PLUGIN_PACKAGE[plugin]).join(', ')}`
      : null,
    `${pc.bold('Packages:')}   ${packages.join(' ')}`,
    `${pc.bold('Command:')}    ${pc.dim(getInstallCommand(packageManager as PackageManager, packages))}`,
  ]
    .filter(Boolean)
    .join('\n');

  p.note(note, 'Installation plan');

  const confirmed = await p.confirm({
    message: 'Proceed with installation?',
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Install
  const spinner = p.spinner();
  spinner.start('Installing packages...');

  const cmd = getInstallCommand(packageManager as PackageManager, packages);

  const result = await new Promise<{ code: number; stderr: string }>(done => {
    let stderr = '';
    const child = spawn(cmd, {
      shell: true,
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', code => done({ code: code ?? 1, stderr }));
  });

  if (result.code !== 0) {
    spinner.stop('Installation failed');
    console.log();
    console.log(pc.red('Error output:'));
    console.log(result.stderr);
    process.exit(1);
  }

  spinner.stop('Packages installed successfully');

  // Step 5: Configure CSS for Tailwind
  if (isTailwind) {
    const rootCss = findCssFile(process.cwd());
    if (rootCss) {
      try {
        const content = readFileSync(rootCss, 'utf-8');
        if (!content.includes('@dayflow/core/dist/styles.components.css')) {
          const relativeToRoot = relative(dirname(rootCss), process.cwd());
          const nmPath = join(relativeToRoot, 'node_modules').replaceAll(
            '\\',
            '/'
          );

          // Build source block
          let sourceBlock =
            '\n/* DayFlow: scan compiled JS so Tailwind generates utility classes used inside DayFlow components */';
          sourceBlock += `\n@source '${nmPath}/@dayflow/core/dist/**/*.js';`;
          if (selectedPlugins.includes('drag')) {
            sourceBlock += `\n@source '${nmPath}/@dayflow/plugin-drag/dist/**/*.js';`;
          }
          if (selectedPlugins.includes('sidebar')) {
            sourceBlock += `\n@source '${nmPath}/@dayflow/plugin-sidebar/dist/**/*.js';`;
          }
          sourceBlock +=
            '\n\n/* DayFlow: class-based dark mode so theme.mode works correctly */\n@variant dark (.dark &);';
          sourceBlock +=
            '\n/* Tailwind V4 integration: https://calendar.dayflow.studio/docs/guides/theme-customization#tailwind-v4-integration */';

          const lines = content.split('\n');
          let lastImportIndex = -1;
          let tailwindImportIndex = -1;

          for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('@import')) {
              lastImportIndex = i;
              if (trimmed.includes('tailwindcss')) {
                tailwindImportIndex = i;
              }
            }
          }

          const header =
            "/* DayFlow Tailwind Setup */\n@import '@dayflow/core/dist/styles.components.css';";

          let finalLines = [...lines];

          if (tailwindImportIndex === -1) {
            // No tailwind import, put both at the top
            finalLines.unshift(header, "@import 'tailwindcss';");
            lastImportIndex += 2;
          } else {
            // Insert DayFlow import before Tailwind import
            finalLines.splice(tailwindImportIndex, 0, header);
            lastImportIndex++; // Adjust for the new line
          }

          // Insert source block after the LAST consecutive import to keep CSS valid
          finalLines.splice(lastImportIndex + 1, 0, sourceBlock);

          writeFileSync(rootCss, finalLines.join('\n'));
          p.log.success(
            `${pc.green('✓')} Added DayFlow configuration to ${pc.cyan(relative(process.cwd(), rootCss))}`
          );
        }
      } catch (err) {
        p.log.warn(
          `Could not update CSS file: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } else {
      p.log.warn('Could not find a root CSS file to update automatically.');
    }
  }

  // Done
  const nextSteps = buildNextSteps(
    framework as Framework,
    selectedPlugins as Plugin[],
    isTailwind as boolean
  );
  p.note(nextSteps, 'Next steps');

  p.outro(
    `${pc.green('✓')} DayFlow is ready! See ${pc.cyan('https://dayflow-js.github.io/calendar/docs/introduction')} for documentation.`
  );
}

main().catch(err => {
  console.error(pc.red('Unexpected error:'), err);
  process.exit(1);
});
