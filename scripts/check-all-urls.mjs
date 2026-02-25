import { readFileSync } from 'fs';

const json = JSON.parse(readFileSync('private/seville-itinerary.json', 'utf8'));

// Collect ALL URLs with context
const entries = [];

for (const day of json.days) {
  for (const act of day.activities) {
    const label = `${act.activityId} (${act.name})`;
    
    // Banner image
    if (act.image?.url) {
      entries.push({ url: act.image.url, context: `${label} → image.url` });
    }
    
    // Photo examples - both image URL and pageUrl
    for (const pe of act.photoExamples || []) {
      if (pe.url) entries.push({ url: pe.url, context: `${label} → photoExample.url` });
      if (pe.pageUrl) entries.push({ url: pe.pageUrl, context: `${label} → photoExample.pageUrl` });
    }
    
    // Review links
    for (const rl of act.reviewLinks || []) {
      if (rl.url) entries.push({ url: rl.url, context: `${label} → reviewLink (${rl.sourceName})` });
    }
    
    // Website URL
    if (act.websiteUrl) {
      entries.push({ url: act.websiteUrl, context: `${label} → websiteUrl` });
    }
  }
}

console.log(`Checking ${entries.length} URLs...\n`);

const results = { ok: [], fail: [] };

for (const entry of entries) {
  try {
    const resp = await fetch(entry.url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });
    if (resp.ok || resp.status === 302 || resp.status === 301) {
      results.ok.push(entry);
    } else {
      results.fail.push({ ...entry, status: resp.status });
      console.log(`FAIL ${resp.status} | ${entry.context}`);
      console.log(`     ${entry.url}`);
    }
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'TIMEOUT' : e.message?.substring(0, 60);
    results.fail.push({ ...entry, status: msg });
    console.log(`ERR  ${msg} | ${entry.context}`);
    console.log(`     ${entry.url}`);
  }
  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n=== SUMMARY ===`);
console.log(`${results.ok.length} OK, ${results.fail.length} FAIL out of ${entries.length} total`);

if (results.fail.length > 0) {
  console.log(`\n=== FAILURES ===`);
  for (const f of results.fail) {
    console.log(`  [${f.status}] ${f.context}`);
    console.log(`          ${f.url}`);
  }
}
