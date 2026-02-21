import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import { FrameworkInstall } from './components/FrameworkInstall';
import { FrameworkTabs } from './components/FrameworkTabs';
import { withBasePath } from './utils/basePath';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: any): any {
  return {
    ...docsComponents,
    img: (props: any) => (
      <img {...props} src={withBasePath(props.src)} />
    ),
    FrameworkInstall,
    FrameworkTabs,
    ...components,
  };
}
