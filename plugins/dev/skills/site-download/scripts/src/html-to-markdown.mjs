import { decodeEntities, stripTags } from './html-extract.mjs';

export function htmlToMarkdown(html, sourceUrl) {
  let body = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  body = body
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => `\n${'#'.repeat(Number(level))} ${clean(text)}\n`)
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, text) => `\n\`\`\`\n${decodeEntities(stripTags(text)).trim()}\n\`\`\`\n`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => `\`${decodeEntities(stripTags(text)).trim()}\``)
    .replace(/<img\b([^>]*)>/gi, (_, attrs) => {
      const alt = attr(attrs, 'alt') || 'image';
      const src = attr(attrs, 'src') || '';
      return src ? `![${clean(alt)}](${src})` : `![${clean(alt)}]`;
    })
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, text) => {
      const href = attr(attrs, 'href');
      const label = clean(text) || href || 'link';
      return href ? `[${label}](${href})` : label;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text) => `\n- ${clean(text)}`)
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const text = decodeEntities(stripTags(body))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return [`<!-- source: ${sourceUrl} -->`, '', text].join('\n');
}

export function markdownText(markdown) {
  return String(markdown)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_#>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

function attr(attrs, name) {
  const regex = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const match = String(attrs).match(regex);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}
