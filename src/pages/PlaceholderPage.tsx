export function PlaceholderPage({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page"><header className="page-header compact"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div></header><section className="glass-panel placeholder"><span>Coming in the next sprint.</span><p>The navigation exists now so the product architecture is visible before every feature is implemented.</p></section></div>;
}
