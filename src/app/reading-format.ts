export interface ReadingBlock {
  kind: 'heading' | 'paragraph' | 'list' | 'objective' | 'step';
  text: string;
  label?: string;
  items?: string[];
}

/** Presentation only: join PDF line wraps and identify the guide's explicit labels. */
export function formatReading(source: string): ReadingBlock[] {
  const text = source
    .replace(/\r/g, '')
    .replace(/\nP\s*é\s*r\s*i\s*o\s*d\s*e\s*\n(?:\d\s*)?••\s*\nS\s*e\s*m\s*a\s*i\s*n\s*e\s*\n/g, '\n')
    .replace(/\n©\n[\p{L}\s,·∙]{1,160}$/u, '')
    .replace(/(\p{L})-\n(?=\p{Ll})/gu, '$1');
  const lines = text.split('\n').map(line => line.trim());
  const blocks: ReadingBlock[] = [];
  let pending: ReadingBlock | undefined;
  const flush = () => { if (pending) blocks.push(pending); pending = undefined; };
  const section = /^(?:Déroulement|Préparation|Différenciation|Structuration|Matériel(?: par élève)?|Rituels|Ateliers|ATELIERS|Activités en classe entière|La minute Énigme|La semaine en un coup d’œil|Le coin (?:maths|de l’enseignant[·∙]e)|Prolongements? possibles?|Variantes? possibles?|Tous les temps d’apprentissage|Des outils pratiques et synthétiques pour l’enseignant[·∙]e|OBJECTIFS? D[’ ]APPRENTISSAGE)$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { flush(); continue; }
    const objective = line.match(/^(Objectif(?:s)?(?: de la semaine| d’apprentissage| spécifique)?|Qu’avons-nous appris \?)\s*:?\s+(.+)$/i);
    const step = line.match(/^(Étape \d+|Étape autonome optionnelle|Jour [1-4])(?:\s*[:.]?\s+(.+))?$/);
    const workshop = /^(?:Dirigé|Semi-dirigé|Autonome(?: [12])?|Mon cahier de maths)(?:\s|$)/.test(line);
    if (section.test(line) || workshop || /^Une méthode\b/.test(line)) {
      flush(); blocks.push({kind: 'heading', text: line}); continue;
    }
    if (objective) {
      flush(); pending = {kind: 'objective', label: objective[1], text: objective[2]}; continue;
    }
    if (step && !/Jour [1-4].*Jour/.test(line)) {
      flush(); blocks.push({kind: 'step', label: step[1], text: step[2] || ''}); continue;
    }
    if (/^••/.test(line)) {
      flush(); pending = {kind: 'paragraph', text: line.replace(/^••\s*/, '')}; continue;
    }
    if (/^(?:•|–|—)\s*/.test(line)) {
      if (pending?.kind !== 'list') { flush(); pending = {kind: 'list', text: '', items: []}; }
      pending.items!.push(line.replace(/^(?:•|–|—)\s*/, '')); continue;
    }
    if (pending?.kind === 'list') {
      pending.items![pending.items!.length - 1] += ' ' + line;
    } else if (pending) {
      pending.text += (pending.text ? ' ' : '') + line;
    } else {
      // A short title immediately preceding an explicit rubric is a heading.
      const next = lines.slice(i + 1).find(Boolean) || '';
      const title = line.length < 110 && !/[.;:]$/.test(line) && (section.test(next) || /^(?:Objectif|••)/.test(next));
      pending = {kind: title ? 'heading' : 'paragraph', text: line};
    }
  }
  flush();
  return blocks;
}

export function weeklyPlan(flow: string): {days: {number: string; title: string}[]; workshops: string} {
  const [collective, ...workshops] = flow.split(/\nATELIERS\n/);
  const days = [...collective.matchAll(/• Jour (\d)\s+([\s\S]*?)(?=\n• Jour|$)/g)]
    .map(match => ({number: match[1], title: match[2].replace(/\s+/g, ' ').trim()}));
  return {days, workshops: workshops.join('\nATELIERS\n')};
}
