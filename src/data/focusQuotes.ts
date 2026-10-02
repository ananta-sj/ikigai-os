export interface FocusQuote {
  id: string;
  text: string;
  author: string;
}

export const focusBuiltInQuotes: FocusQuote[] = [
  { id: 'epictetus-suddenly', text: 'No great thing is created suddenly.', author: 'Epictetus' },
  { id: 'seneca-postponing', text: 'While we are postponing, life speeds by.', author: 'Seneca' },
  { id: 'thoreau-industrious', text: 'It is not enough to be industrious; so are the ants. What are you industrious about?', author: 'Henry David Thoreau' },
  { id: 'aurelius-judgment', text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { id: 'emerson-do-thing', text: 'Do the thing, and you will have the power.', author: 'Ralph Waldo Emerson' },
  { id: 'lincoln-time', text: 'The best thing about the future is that it comes one day at a time.', author: 'Abraham Lincoln' },
  { id: 'curie-understand', text: 'Nothing in life is to be feared; it is only to be understood.', author: 'Marie Curie' },
  { id: 'newton-patience', text: 'If I have ever made any valuable discoveries, it has been owing more to patient attention than to any other talent.', author: 'Isaac Newton' },
  { id: 'franklin-diligence', text: 'Diligence is the mother of good luck.', author: 'Benjamin Franklin' },
  { id: 'douglass-struggle', text: 'If there is no struggle, there is no progress.', author: 'Frederick Douglass' },
  { id: 'nightingale-success', text: 'I attribute my success to this: I never gave or took any excuse.', author: 'Florence Nightingale' },
  { id: 'twain-secret', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' }
];

export function shuffleFocusQuotes<T>(items: readonly T[], random = Math.random): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}
