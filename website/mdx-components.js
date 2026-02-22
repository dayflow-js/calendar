import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';
import { FrameworkInstall } from './components/FrameworkInstall';
import { FrameworkTabs } from './components/FrameworkTabs';
import { withBasePath } from './utils/basePath';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components) {
  return {
    ...docsComponents,
    img: (props) => (
      <img {...props} src={withBasePath(props.src)} />
    ),
    FrameworkInstall,
    FrameworkTabs,
    ...components,
  };
}
