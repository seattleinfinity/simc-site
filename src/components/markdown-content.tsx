import type { ReactNode } from 'react';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import 'katex/dist/katex.min.css';

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });

const renderMarkdown = (source: string): string => DOMPurify.sanitize(markdown.render(source || ''), {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'style'],
});

export function MarkdownBody({ source, className = 'markdown-content' }: { source: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

export function RichTitle({ children }: { children: ReactNode }) {
  return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(children || '')) }} />;
}
