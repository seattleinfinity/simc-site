import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  minColumnWidth?: number;
  gap?: number;
}

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  return items.reduce<T[][]>((columns, item, index) => {
    columns[index % columnCount].push(item);
    return columns;
  }, Array.from({ length: columnCount }, () => []));
}

export function MasonryGrid<T>({ items, renderItem, className = '', minColumnWidth = 360, gap = 24 }: MasonryGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    const updateColumnCount = () => {
      const width = grid.getBoundingClientRect().width;
      const nextCount = Math.min(
        Math.max(1, items.length),
        Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap))),
      );
      setColumnCount((current) => current === nextCount ? current : nextCount);
    };
    updateColumnCount();
    const observer = new ResizeObserver(updateColumnCount);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gap, items.length, minColumnWidth]);

  return (
    <div
      ref={gridRef}
      className={`masonry-grid ${className}`.trim()}
      style={{ '--masonry-columns': columnCount, '--masonry-gap': `${gap}px` } as CSSProperties}
    >
      {splitIntoColumns(items, columnCount).map((column, columnIndex) => (
        <div className="masonry-column" key={columnIndex}>
          {column.map((item, itemIndex) => renderItem(item, itemIndex * columnCount + columnIndex))}
        </div>
      ))}
    </div>
  );
}
