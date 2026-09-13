import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://www.uwstories.co.uk';
const OUTPUT = new URL('../data/uw-stories.json', import.meta.url);
const USER_AGENT = 'TeamTriumph-UWStories-Indexer/1.0 (+https://aqcroft.github.io/TeamTriumph/)';

function decodeHtml(value = '') {
  const named = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...'
  };
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function cleanText(value = '') {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function get(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function normaliseStoryUrl(href) {
  try {
    const url = new URL(decodeHtml(href), BASE);
    if (url.hostname !== 'www.uwstories.co.uk' && url.hostname !== 'uwstories.co.uk') return null;
    if (!url.pathname.startsWith('/stories/')) return null;
    url.protocol = 'https:';
    url.hostname = 'www.uwstories.co.uk';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function storyLinksFromHtml(html) {
  const links = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = normaliseStoryUrl(match[1]);
    if (url) links.add(url);
  }
  return links;
}

async function discoverStories() {
  const links = new Set();

  // Webflow normally exposes a sitemap. Prefer this because it is the least brittle source.
  try {
    const sitemap = await get(`${BASE}/sitemap.xml`);
    for (const match of sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
      const url = normaliseStoryUrl(match[1].trim());
      if (url) links.add(url);
    }
  } catch (error) {
    console.warn('Sitemap unavailable:', error.message);
  }

  // Fallback/enrichment: inspect the visible library and its Webflow pagination.
  let emptyPages = 0;
  for (let page = 1; page <= 30 && emptyPages < 2; page++) {
    const url = page === 1 ? `${BASE}/` : `${BASE}/?303e2181_page=${page}`;
    try {
      const html = await get(url);
      const before = links.size;
      for (const link of storyLinksFromHtml(html)) links.add(link);
      emptyPages = links.size === before ? emptyPages + 1 : 0;
    } catch (error) {
      console.warn(`Library page ${page} unavailable:`, error.message);
      emptyPages++;
    }
  }

  // The legacy home currently exposes a useful flat collection too.
  try {
    const legacy = await get(`${BASE}/old-home`);
    for (const link of storyLinksFromHtml(legacy)) links.add(link);
  } catch (error) {
    console.warn('Legacy library unavailable:', error.message);
  }

  return [...links].sort();
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return '';
}

function extractStory(html, url) {
  const title = firstMatch(html, [
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<title\b[^>]*>([\s\S]*?)<\/title>/i
  ]).replace(/\s*\|\s*UW Stories\s*$/i, '').trim();

  const summary = firstMatch(html, [
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i
  ]);

  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  let text = cleanText(mainMatch?.[1] || bodyMatch?.[1] || html);

  // Remove common footer/legal boilerplate from the searchable body where possible.
  text = text
    .replace(/©\s*Utility Warehouse Limited[\s\S]*$/i, '')
    .replace(/Utility Warehouse Limited is authorised and regulated by the Financial Conduct Authority[\s\S]*$/i, '')
    .trim();

  return { title, summary, text, url };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        console.warn(`Skipping ${items[index]}:`, error.message);
        results[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker));
  return results.filter(Boolean);
}

const urls = await discoverStories();
if (!urls.length) throw new Error('No UW Stories URLs discovered - refusing to overwrite the catalogue.');

console.log(`Discovered ${urls.length} story URLs.`);
const stories = await mapWithConcurrency(urls, 6, async (url) => {
  const html = await get(url);
  const story = extractStory(html, url);
  if (!story.title) throw new Error('No title found');
  return story;
});

if (!stories.length) throw new Error('No UW Stories could be indexed - refusing to overwrite the catalogue.');

stories.sort((a, b) => a.title.localeCompare(b.title, 'en-GB'));
const payload = {
  generatedAt: new Date().toISOString(),
  source: BASE,
  count: stories.length,
  stories
};

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${stories.length} stories to data/uw-stories.json.`);
