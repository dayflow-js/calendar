import type {
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { ReactNode } from 'react';

import styles from './changelog.module.css';

type MarkdownNode = RootContent | PhrasingContent | ListItem;

function renderNode(node: MarkdownNode, key: number): ReactNode {
  const children =
    'children' in node
      ? node.children.map((child, i) => renderNode(child, i))
      : undefined;
  switch (node.type) {
    case 'text':
      return node.value;
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading':
      return node.depth > 3 ? (
        <h4 key={key}>{children}</h4>
      ) : (
        <h3 key={key}>{children}</h3>
      );
    case 'strong':
      return <strong key={key}>{children}</strong>;
    case 'emphasis':
      return <em key={key}>{children}</em>;
    case 'inlineCode':
      return <code key={key}>{node.value}</code>;
    case 'code':
      return (
        <pre key={key}>
          <code>{node.value}</code>
        </pre>
      );
    case 'list':
      return node.ordered ? (
        <ol key={key} start={node.start ?? 1}>
          {children}
        </ol>
      ) : (
        <ul key={key}>{children}</ul>
      );
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'link':
      return (
        <a
          key={key}
          href={/^(https?:\/\/|\/|#)/.test(node.url) ? node.url : undefined}
        >
          {children}
        </a>
      );
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'break':
      return <br key={key} />;
    case 'thematicBreak':
      return <hr key={key} />;
    default:
      return children ?? null;
  }
}

export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className={styles.notes}>
      {fromMarkdown(markdown).children.map((node, index) =>
        renderNode(node, index)
      )}
    </div>
  );
}

const textOf = (node: MarkdownNode): string =>
  'value' in node
    ? node.value
    : 'children' in node
      ? node.children.map(child => textOf(child)).join('')
      : '';

const PACKAGE_SUFFIX = /\s*\(([^)]*@dayflow\/[^)]*)\)\s*$/;

/** A `- **Title (`@dayflow/x`)**: description` bullet, split into parts. */
function parseFeatureItem(item: ListItem) {
  const [first, ...rest] = item.children;
  if (first?.type !== 'paragraph') return null;
  const [lead, ...after] = first.children;
  if (lead?.type !== 'strong') return null;
  let title = textOf(lead).trim();
  const packages: string[] = [];
  const suffix = title.match(PACKAGE_SUFFIX);
  if (suffix) {
    title = title.slice(0, suffix.index).trim();
    packages.push(
      ...[...suffix[1].matchAll(/@dayflow\/([a-z-]+)/g)].map(match => match[1])
    );
  }
  const description = after.map(node =>
    node.type === 'text' ? { ...node } : node
  );
  if (description[0]?.type === 'text') {
    description[0].value = description[0].value.replace(/^\s*:\s*/, '');
  }
  return {
    title: title.replace(/:$/, ''),
    packages,
    description: description.length
      ? ({ ...first, children: description } as Paragraph)
      : null,
    rest,
  };
}

/**
 * New-feature sections as a scannable list: each labelled bullet becomes a
 * title with package chips and its description below. Anything else renders
 * as ordinary release notes.
 */
export function FeatureNotes({ markdown }: { markdown: string }) {
  return (
    <div className={styles.notes}>
      {fromMarkdown(markdown).children.map((node, index) => {
        const items =
          node.type === 'list'
            ? (node as List).children.map(parseFeatureItem)
            : [];
        const features = items.filter(item => item !== null);
        if (features.length === 0 || features.length < items.length) {
          return renderNode(node, index);
        }
        return (
          <ul key={index} className={styles.features}>
            {features.map((item, itemIndex) => (
              <li key={itemIndex}>
                <div className={styles.featureTitle}>
                  <strong>{item.title}</strong>
                  {item.packages.map(name => (
                    <code key={name}>{name}</code>
                  ))}
                </div>
                {item.description && renderNode(item.description, 0)}
                {item.rest.map((child, i) => renderNode(child, i + 1))}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
