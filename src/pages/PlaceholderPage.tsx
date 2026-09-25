import { PageHeader } from '../components/ui/PageHeader';

export function PlaceholderPage({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="page">
      <div className="ik-page-width">
        <PageHeader compact eyebrow={eyebrow} title={title} description={text} />
        <section className="glass-panel ik-surface placeholder">
          <span className="ik-section-kicker">NEXT ROOM</span>
          <h3>Structure first, feature second.</h3>
          <p>The navigation exists now so the product architecture is visible before every feature is implemented.</p>
        </section>
      </div>
    </div>
  );
}
