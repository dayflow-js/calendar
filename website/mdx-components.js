import Image from 'next/image';
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';

import { FrameworkInstall } from './components/FrameworkInstall';
import { FrameworkTabs } from './components/FrameworkTabs';
import { withBasePath } from './utils/basePath';

const docsComponents = getDocsMDXComponents();

// DocImg is used instead of <img> in MDX files because explicit JSX <img> elements
// bypass the useMDXComponents override (only markdown ![]() goes through it).
// Using an uppercase component name ensures MDX routes it through the components system.
function DocImg(props) {
  return <Image {...props} src={withBasePath(props.src)} alt='' />;
}

export function useMDXComponents(components) {
  return {
    ...docsComponents,
    img: props => <Image {...props} src={withBasePath(props.src)} alt='' />,
    DocImg,
    FrameworkInstall,
    FrameworkTabs,
    ...components,
  };
}
