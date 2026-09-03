import { useLayoutEffect, useRef, useState, type CSSProperties, type Key, type ReactNode } from 'react';

export interface MasonryGridProps<T> {
  items: T[];
  getItemKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  minColumnWidth?: number;
  gap?: number;
}

interface MasonryItemProps {
  children: ReactNode;
  gap: number;
}

function MasonryItem({ children, gap }: MasonryItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [rowSpan, setRowSpan] = useState(1);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    const updateRowSpan = () => {
      const nextSpan = Math.max(1, Math.ceil(content.getBoundingClientRect().height + gap));
      setRowSpan((current) => current === nextSpan ? current : nextSpan);
    };

    updateRowSpan();
    const observer = new ResizeObserver(updateRowSpan);
    observer.observe(content);
    return () => observer.disconnect();
  }, [gap]);

  return (
    <div className="masonry-item" style={{ gridRowEnd: `span ${rowSpan}` }}>
      <div ref={contentRef} className="masonry-item-content">{children}</div>
    </div>
  );
}

export function MasonryGrid<T>({ items, getItemKey, renderItem, className = '', minColumnWidth = 360, gap = 24 }: MasonryGridProps<T>) {
  return (
    <div
      className={`masonry-grid ${className}`.trim()}
      style={{
        '--masonry-gap': `${gap}px`,
        '--masonry-min-column-width': `${minColumnWidth}px`,
      } as CSSProperties}
    >
      {items.map((item, index) => (
        <MasonryItem key={getItemKey(item, index)} gap={gap}>
          {renderItem(item, index)}
        </MasonryItem>
      ))}
    </div>
  );
}
