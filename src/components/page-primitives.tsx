import type { ReactNode } from 'react';

export interface IntroProps {
  title: string;
  body?: string;
  className?: string;
  children?: ReactNode;
}

export function Intro({ title, body, className = '', children }: IntroProps) {
  return (
    <section className={`page-intro ${className}`}>
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}

export function YearRule({ children }: { children: ReactNode }) {
  return <div className="section-year-rule"><span>{children}</span></div>;
}
