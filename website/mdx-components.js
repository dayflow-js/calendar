import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import { FrameworkInstall } from './components/FrameworkInstall';
import { FrameworkTabs } from './components/FrameworkTabs';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components) {
  return {
    ...docsComponents,
    FrameworkInstall,
    FrameworkTabs,
    ...components,
  };
}
