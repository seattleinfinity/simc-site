import { useState, type CSSProperties } from 'react';
import { AWARDS_BY_YEAR, CAROUSEL_AWARDS, type AwardsYear } from '../data/site';

interface ResultsAwardItemProps {
  competition: string;
  rank: string;
  ariaHidden?: boolean;
}

function ResultsAwardItem({ competition, rank, ariaHidden = false }: ResultsAwardItemProps) {
  return (
    <div className="results-award-item" aria-hidden={ariaHidden || undefined}>
      <span className="results-rank">{rank}</span>
      <span className="results-competition">{competition}</span>
    </div>
  );
}

function ResultsYear({ year, rows, awards }: AwardsYear) {
  return (
    <div className="results-year">
      <div className="results-year-rule"><span>{year}</span></div>
      <div className="results-awards-grid" style={{ '--results-rows': rows } as CSSProperties}>
        {awards.map(([competition, rank]) => <ResultsAwardItem key={`${competition}-${rank}`} competition={competition} rank={rank} />)}
      </div>
    </div>
  );
}

export function ResultsSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`results-section ${expanded ? 'results-expanded' : 'results-collapsed'}`} aria-label="SIMC results">
      <div className="results-header">
        <h2 className="results-label">Among USA's top math teams</h2>
        <div className="results-toggle-controls">
          {!expanded && <button className="results-toggle" type="button" aria-expanded="false" aria-controls="results-carousel" onClick={() => setExpanded(true)}>View all results</button>}
          {expanded && <button className="results-toggle results-close" type="button" aria-label="Show top three results" aria-expanded="true" aria-controls="results-list" onClick={() => setExpanded(false)}>×</button>}
        </div>
      </div>
      <div className="results-stage">
        <div id="results-carousel" className="results-carousel" role="region" aria-label="Top results carousel" aria-hidden={expanded || undefined}>
          <div className="results-carousel-track">
            {[0, 1].map((set) => (
              <div className="results-carousel-set" key={set}>
                {CAROUSEL_AWARDS.map(([competition, rank], index) => <ResultsAwardItem key={`${set}-${index}-${competition}-${rank}`} competition={competition} rank={rank} ariaHidden={set === 1} />)}
              </div>
            ))}
          </div>
        </div>
        <div id="results-list" className="results-awards-list" aria-hidden={!expanded || undefined}>
          {AWARDS_BY_YEAR.map((section) => <ResultsYear key={section.year} {...section} />)}
        </div>
      </div>
    </section>
  );
}
