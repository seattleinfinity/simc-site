import { MailingListForm } from '../components/mailing-list-form';
import { PersonCard } from '../components/content-card';
import { MarkdownBody } from '../components/markdown-content';
import { MasonryGrid } from '../components/masonry-grid';
import { Intro } from '../components/page-primitives';
import { Button, SignupBanner } from '../components/site-shell';
import { PAGE_CONTENT_BY_SLUG, type ContentRecord } from '../content';
import { CALENDAR_EMBED_URL, DISCORD_URL, EMAIL, PEOPLE } from '../data/site';

interface MarkdownPageProps {
  record?: ContentRecord;
  title?: string;
  body?: string;
}

function MarkdownPage({ record, title, body }: MarkdownPageProps) {
  const pageTitle = title || record?.title || 'SIMC';
  const content = (body || record?.body || '').replace(/^#\s+.+(?:\r?\n){1,2}/, '');
  return (
    <main>
      <Intro title={pageTitle} body={record?.description} />
      <section className="source-page-content">
        <MarkdownBody source={content} />
      </section>
    </main>
  );
}

export function NewslettersPage() {
  return <MarkdownPage record={PAGE_CONTENT_BY_SLUG.newsletters} />;
}

export function CalendarPage() {
  return (
    <main>
      <Intro title="Calendar" body="Upcoming SIMC events and competition dates." />
      <section className="embedded-page">
        <iframe title="SIMC calendar" src={CALENDAR_EMBED_URL} loading="lazy" />
      </section>
    </main>
  );
}

export function PotmPage() {
  return <MarkdownPage record={PAGE_CONTENT_BY_SLUG['problems-of-the-month']} />;
}

function ContactMailingForm() {
  return (
    <div className="contact-option">
      <h2>Join our mailing list</h2>
      <p>Sign up for our mailing list so you don't miss out on any of our fun events!</p>
      <MailingListForm />
    </div>
  );
}

export function ContactPage() {
  return (
    <main>
      <Intro title="Contact Us" className="contact-hero" />
      <section className="contact-layout">
        <div className="contact-email">
          <h2>Want to get in touch with us?</h2>
          <p>For questions, comments, or general inquiries, reach out through our <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord Server</a>. You can also email us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
        </div>
        <div className="contact-options-row">
          <div className="contact-option">
            <h2>Join our Discord!</h2>
            <p>Join our Discord Server to connect with the SIMC community.</p>
            <Button href={DISCORD_URL} external>Join our Discord</Button>
          </div>
          <ContactMailingForm />
        </div>
      </section>
    </main>
  );
}

export function SlgPage() {
  return (
    <main>
      <section className="about-hero">
        <div className="about-copy">
          <h1>Student Leadership Group</h1>
          <div className="about-panel"><p>Our student leaders create competitions, write problems, and expand math literacy for students across the Seattle area.</p></div>
        </div>
        <img
          className="source-image about-image"
          src="/assets/images/about-classroom-1600.webp"
          srcSet="/assets/images/about-classroom-800.webp 800w, /assets/images/about-classroom-1600.webp 1600w"
          sizes="(max-width: 899px) 100vw, 50vw"
          width="1600"
          height="1200"
          fetchPriority="high"
          decoding="async"
          alt="Students working on math problems at a SIMC event"
        />
      </section>
      <SignupBanner />
      <section className="slg-page-list">
        <h2>Meet the Student Leadership Group</h2>
        <MasonryGrid
          className="people-grid"
          items={PEOPLE}
          getItemKey={(person) => person.name}
          renderItem={(person) => <PersonCard {...person} />}
        />
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return <main><Intro title="That page is missing."><Button href="/">Back home</Button></Intro></main>;
}
