import { CompactCard, PressCard } from '../components/content-card';
import { MasonryGrid } from '../components/masonry-grid';
import { ResultsSection } from '../components/results-section';
import { Button, SignupBanner } from '../components/site-shell';
import { PRESS_CONTENT } from '../content';
import { UPCOMING_EVENTS } from '../data/site';

function HomeHero() {
  return (
    <div className="home-hero">
      <div className="home-support">
        <div className="home-title">
          <img src="/int.svg" alt="" aria-hidden="true" />
          <h1>Seattle Infinity Math Circle</h1>
        </div>
        <div className="hero-panel">
          <p>Our goal is to inspire students to engage in mathematics and expand their mathematical interests and capabilities.</p>
          <div className="hero-actions">
            <Button href="/contact">Join us</Button>
            <span className="hero-actions-spacer" aria-hidden="true" />
            <Button href="/about-us" tone="primary">Who are we</Button>
          </div>
        </div>
      </div>
      <img className="source-image home-hero-image" src="/assets/images/about-classroom.png" alt="Students working on math problems at a SIMC event" />
    </div>
  );
}

function HomeLatest() {
  return (
    <section className="home-latest">
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Upcoming events</h2>
          <div className="title-spacer" />
          <Button href="/events" tone="outline">View all events</Button>
        </div>
        <MasonryGrid
          className="compact-stack"
          items={UPCOMING_EVENTS.slice(0, 3)}
          minColumnWidth={280}
          gap={12}
          renderItem={(event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />}
        />
      </div>
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Latest press releases</h2>
          <div className="title-spacer" />
          <Button href="/press-releases" tone="outline">View all press releases</Button>
        </div>
        <MasonryGrid
          className="featured-press-grid"
          items={PRESS_CONTENT.slice(0, 2)}
          minColumnWidth={280}
          renderItem={(article) => <PressCard key={article.slug} variant="featured" title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />}
        />
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <main className="home-page">
      <section className="home-dark">
        <HomeHero />
        <ResultsSection />
      </section>
      <SignupBanner />
      <HomeLatest />
    </main>
  );
}
