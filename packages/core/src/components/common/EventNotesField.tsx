import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import { useLocale } from '@/locale';

import { fitNotesToViewport } from './fitNotesToViewport';

interface EventNotesFieldProps {
  id: string;
  value: string;
  editable: boolean;
  disabled: boolean;
  rows: number;
  onChange: (value: string) => void;
}

const safeHref = (value: string): string | null => {
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
};

const linkPattern =
  /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>(.*?)<\/a>|([^<|]+)<((?:https?:\/\/|mailto:|tel:)[^>]+)>|https?:\/\/[^\s<>]+/gi;

function renderLink(href: string, label: string, key: number) {
  return (
    <a key={key} href={href} target='_blank' rel='noopener noreferrer'>
      {label}
    </a>
  );
}

function renderLine(line: string) {
  const parts: (string | ReturnType<typeof renderLink>)[] = [];
  let cursor = 0;
  for (const match of line.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));
    const raw = match[0];
    const hrefText = match[2] ?? match[5] ?? raw.replace(/[),.;!?]+$/, '');
    const label = match[3] ?? match[4] ?? hrefText;
    const href = safeHref(hrefText);
    parts.push(href ? renderLink(href, label, index) : raw);
    if (!match[2] && !match[5]) parts.push(raw.slice(hrefText.length));
    cursor = index + raw.length;
  }
  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

const htmlTags = [
  'a',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
];

const containsHtml = (value: string): boolean => {
  const lower = value.toLowerCase();
  return htmlTags.some(
    tag =>
      lower.includes(`<${tag}>`) ||
      lower.includes(`<${tag} `) ||
      lower.includes(`<${tag}/`)
  );
};

const parseHtml = (value: string): HTMLElement | null =>
  typeof DOMParser === 'undefined'
    ? null
    : new DOMParser().parseFromString(value, 'text/html').body;

function renderHtmlNode(node: ChildNode, key: number): ComponentChildren {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (
    ['script', 'style', 'iframe', 'object', 'svg', 'form', 'input'].includes(
      tag
    )
  ) {
    return null;
  }
  const children = Array.from(element.childNodes).map(renderHtmlNode);
  switch (tag) {
    case 'br':
      return <br key={key} />;
    case 'a': {
      const href = safeHref(element.getAttribute('href') ?? '');
      return href ? (
        <a key={key} href={href} target='_blank' rel='noopener noreferrer'>
          {children}
        </a>
      ) : (
        children
      );
    }
    case 'strong':
    case 'b':
      return <strong key={key}>{children}</strong>;
    case 'em':
    case 'i':
      return <em key={key}>{children}</em>;
    case 'ul':
      return <ul key={key}>{children}</ul>;
    case 'ol':
      return <ol key={key}>{children}</ol>;
    case 'li':
      return <li key={key}>{children}</li>;
    case 'p':
      return <p key={key}>{children}</p>;
    case 'div':
      return <div key={key}>{children}</div>;
    case 'h1':
    case 'h2':
    case 'h3':
      return (
        <strong key={key} className='df-event-notes-heading'>
          {children}
        </strong>
      );
    default:
      return children;
  }
}

function htmlToPlainText(root: HTMLElement): string {
  const walk = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (
      ['script', 'style', 'iframe', 'object', 'svg', 'form', 'input'].includes(
        tag
      )
    )
      return '';
    if (tag === 'br') return '\n';
    const text = Array.from(element.childNodes).map(walk).join('');
    if (tag === 'a') {
      const href = safeHref(element.getAttribute('href') ?? '');
      return href && text.trim() !== href ? `${text} <${href}>` : text;
    }
    if (tag === 'li') return `• ${text.trim()}\n`;
    if (['p', 'div', 'ul', 'ol', 'h1', 'h2', 'h3'].includes(tag))
      return `${text}\n`;
    return text;
  };
  return Array.from(root.childNodes)
    .map(walk)
    .join('')
    .replaceAll(/\n[ \t]+/g, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

const NOTES_CONTAINER = '.df-event-detail-panel, .df-dialog-container';

/** Tallest the notes can get before the surface would exceed the viewport. */
const availableNotesHeight = (container: HTMLElement, frame: HTMLElement) => {
  const borders = container.offsetHeight - container.clientHeight;
  const otherHeight = container.scrollHeight - frame.offsetHeight + borders;
  return Math.max(48, window.innerHeight - 16 - otherHeight);
};

/** Extra width (px) the wide layout adds on top of 28rem. */
const WIDE_EXTRA = 30;

/** Unwrapped width of each line, measured from the content box's left edge. */
function measureLineWidths(content: HTMLElement): number[] {
  const style = getComputedStyle(content);
  if (content instanceof HTMLTextAreaElement) {
    const mirror = document.createElement('div');
    mirror.style.cssText =
      'position:absolute;visibility:hidden;left:-9999px;top:0;white-space:pre';
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing;
    for (const line of content.value.split('\n')) {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.textContent = line;
      mirror.append(span, document.createElement('br'));
    }
    document.body.append(mirror);
    const widths = Array.from(mirror.querySelectorAll('span')).map(
      span => span.offsetWidth
    );
    mirror.remove();
    return widths;
  }

  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return [];
  const { whiteSpace } = content.style;
  content.style.whiteSpace = 'nowrap';
  range.selectNodeContents(content);
  const left =
    content.getBoundingClientRect().left +
    content.clientLeft +
    Number.parseFloat(style.paddingLeft);
  const rightByLine = new Map<number, number>();
  for (const rect of Array.from(range.getClientRects())) {
    const line = Math.round(rect.top);
    rightByLine.set(line, Math.max(rightByLine.get(line) ?? 0, rect.right));
  }
  content.style.whiteSpace = whiteSpace;
  return Array.from(rightByLine.values(), right => right - left);
}

/**
 * Whether the notes need the wide layout: some line wraps at 28rem but would
 * fit on one line with the extra width, or the notes are too tall to fit.
 */
function needsWideLayout(
  container: HTMLElement,
  frame: HTMLElement,
  content: HTMLElement
): boolean {
  const style = getComputedStyle(content);
  const lineSpace =
    content.clientWidth -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight);
  const fitsWhenWide = measureLineWidths(content).some(
    width => width > lineSpace + 0.5 && width <= lineSpace + WIDE_EXTRA
  );

  const { height } = content.style;
  content.style.height = 'auto';
  const scrolls = content.scrollHeight > availableNotesHeight(container, frame);
  content.style.height = height;
  return fitsWhenWide || scrolls;
}

export const EventNotesField = ({
  id,
  value,
  editable,
  disabled,
  rows,
  onChange,
}: EventNotesFieldProps) => {
  const { t } = useLocale();
  // Notes read as formatted text; clicking or tabbing into them edits them.
  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sizedRef = useRef(false);
  const lastValueRef = useRef(value);

  const canEdit = editable && !disabled;
  const showEditor = !value || (editing && canEdit);

  // The surface width is fixed when it opens: wide only if the notes need it.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const frame = frameRef.current;
    const container = frame?.closest<HTMLElement>(NOTES_CONTAINER);
    if (!content || !frame || !container) return;
    if (needsWideLayout(container, frame, content)) {
      container.dataset.notesWide = 'true';
    }
    return () => {
      delete container.dataset.notesWide;
    };
  }, []);

  useLayoutEffect(() => {
    const fit = () => {
      const content = contentRef.current;
      const frame = frameRef.current;
      const container = frame?.closest<HTMLElement>(NOTES_CONTAINER);
      if (!content || !frame || !container) return;

      const availableHeight = availableNotesHeight(container, frame);
      const typed = lastValueRef.current !== value;
      lastValueRef.current = value;

      if (!sizedRef.current) {
        sizedRef.current = true;
        content.style.height = 'auto';
        fitNotesToViewport(container, content);
        frame.style.height = `${content.offsetHeight}px`;
      }

      if (content instanceof HTMLTextAreaElement) {
        // The frame follows the textarea so dragging it grows the surface,
        // which is capped at the viewport and never scrolls. Typing past the
        // bottom grows it too; switching from the preview keeps its height.
        const borders = content.offsetHeight - content.clientHeight;
        const height = Math.max(
          frame.offsetHeight,
          typed && content.scrollHeight > content.clientHeight
            ? content.scrollHeight + borders
            : 0
        );
        frame.style.height = '';
        frame.style.maxHeight = '';
        content.style.maxHeight = `${availableHeight}px`;
        content.style.height = `${Math.min(height, availableHeight)}px`;
      } else {
        frame.style.maxHeight = `${availableHeight}px`;
        frame.style.height = `${Math.min(frame.offsetHeight, availableHeight)}px`;
        content.style.maxHeight = '100%';
        content.style.height = '100%';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value, showEditor]);

  // Keep the field's current height when switching between view and edit.
  const holdHeight = () => {
    const frame = frameRef.current;
    if (frame) frame.style.height = `${frame.offsetHeight}px`;
  };

  const startEditing = () => {
    if (!canEdit || editing) return;
    holdHeight();
    setEditing(true);
  };

  const stopEditing = () => {
    if (!editing) return;
    holdHeight();
    setEditing(false);
  };

  // Move focus into the editor that replaced the preview, caret at the end.
  const focusEditorRef = useRef(false);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!focusEditorRef.current || !(content instanceof HTMLTextAreaElement)) {
      return;
    }
    focusEditorRef.current = false;
    content.focus();
    content.setSelectionRange(content.value.length, content.value.length);
  }, [showEditor]);

  const htmlRoot = containsHtml(value) ? parseHtml(value) : null;
  const editorValue = htmlRoot ? htmlToPlainText(htmlRoot) : value;

  return (
    <div className='df-event-dialog-notes-row df-event-notes-field'>
      <div className='df-event-notes-header'>
        <label
          id={`${id}-label`}
          className='df-form-label'
          htmlFor={showEditor ? id : undefined}
        >
          {t('note')}
        </label>
      </div>
      <div ref={frameRef} className='df-event-notes-frame'>
        {showEditor ? (
          <textarea
            ref={element => {
              contentRef.current = element;
            }}
            id={id}
            name='note'
            value={editorValue}
            readOnly={!editable || disabled}
            disabled={!editable || disabled}
            onInput={event => onChange(event.currentTarget.value)}
            onFocus={() => setEditing(true)}
            onBlur={stopEditing}
            rows={rows}
            className='df-form-textarea'
            placeholder={t('addNotePlaceholder')}
          />
        ) : (
          <div
            ref={element => {
              contentRef.current = element;
            }}
            className='df-event-notes-preview'
            role={canEdit ? 'textbox' : 'note'}
            aria-multiline={canEdit ? true : undefined}
            aria-labelledby={`${id}-label`}
            tabIndex={canEdit ? 0 : undefined}
            data-editable={canEdit ? 'true' : undefined}
            onMouseDown={event => {
              // Clicking a link opens it instead of switching to the editor.
              if ((event.target as Element).closest('a'))
                event.preventDefault();
            }}
            onFocus={() => {
              focusEditorRef.current = true;
              startEditing();
            }}
          >
            {htmlRoot
              ? Array.from(htmlRoot.childNodes).map(renderHtmlNode)
              : value.split(/\r?\n/).map((line, index) =>
                  /^[_-]{8,}\s*$/.test(line.trim()) ? (
                    <hr key={index} />
                  ) : line.trim() ? (
                    <div key={index} className='df-event-notes-line'>
                      {renderLine(line)}
                    </div>
                  ) : (
                    <div key={index} className='df-event-notes-gap' />
                  )
                )}
          </div>
        )}
      </div>
    </div>
  );
};
