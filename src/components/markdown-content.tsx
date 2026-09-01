import type { ReactNode } from 'react';
import createDOMPurify, {
  type Config,
  type DOMPurify as DOMPurifyInstance,
  type WindowLike,
} from 'dompurify';
import MarkdownIt from 'markdown-it';
import 'katex/dist/katex.min.css';

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });

const sanitizeConfig: Config = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'style'],
};

const isServer = import.meta.env?.SSR ?? typeof window === 'undefined';

const createSanitizer = async (): Promise<DOMPurifyInstance> => {
  // Keep this import server-only: Framework Mode's browser graph must not ship jsdom.
  const root = isServer
    ? (new (await import(
      // @ts-expect-error -- jsdom is a build-only dependency without bundled declarations here.
      'jsdom',
    )).JSDOM('').window as unknown as WindowLike)
    : (window as unknown as WindowLike);

  const sanitizer = createDOMPurify(root);
  if (!sanitizer.isSupported) {
    throw new Error('DOMPurify could not initialize a supported DOM.');
  }
  return sanitizer;
};

const DOMPurify = await createSanitizer();

const renderMarkdown = (source: string): string => DOMPurify.sanitize(markdown.render(source || ''), sanitizeConfig);

export function MarkdownBody({ source, className = 'markdown-content' }: { source: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

export function RichTitle({ children }: { children: ReactNode }) {
  return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(children || '')) }} />;
}
