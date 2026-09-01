import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DISCORD_URL, INSTAGRAM_URL, SPONSORS } from '../data/site';

type ButtonTone = 'primary' | 'light' | 'outline';

export interface ButtonProps {
  href?: string;
  children: ReactNode;
  tone?: ButtonTone;
  external?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  form?: string;
}

export function Button({ href, children, tone = 'primary', external = false, type = 'button', form }: ButtonProps) {
  const className = `button button-${tone}`;
  if (external) return <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>;
  if (href) return <Link className={className} to={href}>{children}</Link>;
  return <button className={className} type={type} form={form}>{children}</button>;
}

function Logo({ full = false, inverse = false }: { full?: boolean; inverse?: boolean }) {
  return (
    <Link to="/" className={`logo ${full ? 'logo-full' : 'logo-simc'} ${inverse ? 'logo-inverse' : ''}`}>
      <img src="/int.svg" alt="" aria-hidden="true" />
      <span>{full ? 'SEATTLE INFINITY MATH CIRCLE' : 'SIMC'}</span>
    </Link>
  );
}

function Header() {
  return (
    <header className="site-header">
      <Logo inverse />
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/events">Events</Link>
        <Link to="/resources">Resources</Link>
        <Link to="/press-releases">Press releases</Link>
        <Link to="/about-us">About us</Link>
        <Button href="/contact" tone="light">Contact us</Button>
      </nav>
    </header>
  );
}

export function SignupBanner() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="signup-banner" aria-label="Join the SIMC community">
      <div className="signup-copy">
        <h2>Stay in the loop.</h2>
        <p>Sign up for our mailing list so you don't miss out!</p>
      </div>
      <div className="signup-spacer" aria-hidden="true" />
      <form id="banner-email-form" className="signup-form" onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubmitted(true); }}>
        <label className="sr-only" htmlFor="banner-email">Email address</label>
        <input id="banner-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="your@email.com" required />
      </form>
      <button className="button button-primary" type="submit" form="banner-email-form">{submitted ? 'You\'ve been added!' : 'Join mailing list'}</button>
      <Button href={DISCORD_URL} external tone="outline">Join our Discord</Button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Logo full />
         <p className="eyebrow">501(c)(3) nonprofit organization</p>
        <div className="footer-links">
          <Link to="/contact">Mailing list</Link>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
      <div className="footer-spacer" aria-hidden="true" />
      <div className="sponsors">
        <p className="eyebrow">Sponsors</p>
        <div className="sponsor-row">
          {SPONSORS.map((sponsor) => (
            <a className="sponsor-link" key={sponsor.name} href={sponsor.href} target="_blank" rel="noreferrer" aria-label={`Visit ${sponsor.name}`}>
              <img className={`sponsor-image ${sponsor.className}`} src={sponsor.image} alt={`${sponsor.name} logo`} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <><Header />{children}<Footer /></>;
}
