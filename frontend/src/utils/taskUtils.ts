export function cleanTaskText(raw: string): string {
  return raw
    .replace(/^-\s\[.\]\s*/, '')
    .replace(/#[^\s]+\s*/g, '')
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/, '')
    .replace(/⏳\s*\d{4}-\d{2}-\d{2}/, '')
    .replace(/🛫\s*\d{4}-\d{2}-\d{2}/, '')
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/, '')
    .replace(/🔁[^📅⏳🛫✅]*/g, '')
    .replace(/[⏫🔼🔽]/, '')
    .replace(/@\d{2}:\d{2}/, '')
    .trim();
}

export function extractTags(raw: string): string[] {
  return [...raw.matchAll(/#(\S+)/g)]
    .map(m => m[0])
    .filter(t => t !== '#todo');
}

export function extractContextTags(raw: string): string[] {
  return [...raw.matchAll(/#context\/\S+/g)].map(m => m[0].replace('#context/', ''));
}

export function tagBadgeClass(tag: string): string {
  if (tag === '#next')        return 'tag-next';
  if (tag === '#someday')     return 'tag-someday';
  if (tag === '#backburner')  return 'tag-backburner';
  if (tag === '#inline')      return 'tag-inline';
  if (tag === '#remind')      return 'tag-remind';
  if (tag === '#buy')         return 'tag-buy';
  if (tag.startsWith('#context/')) return 'context';
  return 'tag-other';
}

export const FOLDER_COLORS: Record<string, string> = {
  Projects:  '#ffca3a',
  Inbox:     '#ff595e',
  Meta:      '#ff924c',
  Resources: '#1982c4',
  Areas:     '#8ac926',
  Spam:      '#6a4c93',
};

export function folderBadgeStyle(folder: string): string {
  const color = FOLDER_COLORS[folder];
  if (!color) return '';
  return `background:${color}22; color:${color}; border:1px solid ${color}55;`;
}

export function buildTaskLine(opts: {
  description: string;
  tags: string[];
  due: string;
  scheduled: string;
  start: string;
  time: string;
  recur: string;
}): string {
  const parts = ['- [ ] #todo'];
  if (opts.description) parts.push(opts.description);
  opts.tags.forEach(t => parts.push(t));
  if (opts.due)       parts.push(`📅 ${opts.due}`);
  if (opts.scheduled) parts.push(`⏳ ${opts.scheduled}`);
  if (opts.start)     parts.push(`🛫 ${opts.start}`);
  if (opts.time)      parts.push(`@${opts.time}`);
  if (opts.recur)     parts.push(`🔁 ${opts.recur}`);
  return parts.join(' ') + '\n';
}
