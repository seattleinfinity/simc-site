import { Link } from 'react-router-dom';
import { RichTitle } from './markdown-content';
import type { Person } from '../data/site';

export interface SourceImageProps {
  src?: string;
  className?: string;
  alt: string;
}

export function SourceImage({ src, className = '', alt }: SourceImageProps) {
  if (!src) return null;
  return <img className={'source-image ' + className} src={src} alt={alt} loading="lazy" />;
}

export interface PressCardProps {
  variant?: 'page' | 'compact' | 'featured';
  title: string;
  date?: string;
  description?: string;
  image?: string;
  href: string;
}

export function PressCard({ variant = 'page', title, date, description = '', image, href }: PressCardProps) {
  return (
    <Link to={href} className={'column-card press-card press-card-' + variant}>
      {variant !== 'compact' && image && <SourceImage src={image} className="card-image" alt={title + ' source image'} />}
      <div className="card-copy">
        <p className="card-kicker">{date}</p>
        <h3><RichTitle>{title}</RichTitle></h3>
        {variant !== 'compact' && description && <p>{description}</p>}
      </div>
    </Link>
  );
}

export function CompactCard({ title, date, description = '', href }: Omit<PressCardProps, 'variant' | 'image'>) {
  return <PressCard variant="compact" title={title} date={date} description={description} href={href} />;
}

export function PersonCard({ name, role, bio, image }: Person) {
  return (
    <article className="column-card person-card">
      <SourceImage src={image} className="card-image" alt={`Photo of ${name}`} />
      <div className="card-copy">
        <h3>{name}</h3>
        {role && <p className="card-kicker">{role}</p>}
        <p>{bio}</p>
      </div>
    </article>
  );
}
