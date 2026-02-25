import https from 'node:https';

// Search Wikimedia for images of specific Seville locations
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'InteractiveItinerary/1.0' } });
  return res.json();
}

const searches = [
  'Casa de Pilatos Seville',
  'Palacio de las Dueñas Seville',
  'Palacio Condesa de Lebrija',
  'Palacio Bucarelli Seville',
  'Metropol Parasol Seville',
  'El Rinconcillo Seville',
  'Mercado de Triana Seville',
  'Convento Santa Ines Seville',
  'Palacio Marqueses Algaba Seville',
  'Calle Sierpes Seville'
];

for (const query of searches) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=pageimages&piprop=thumbnail|name&pithumbsize=1200&format=json&origin=*`;
  const data = await fetchJson(url);
  const pages = data?.query?.pages || {};
  console.log(`\n=== ${query} ===`);
  for (const [id, page] of Object.entries(pages)) {
    if (page?.thumbnail?.source) {
      const file = page.pageimage || '';
      console.log(`  ${file}`);
      console.log(`  ${page.thumbnail.source}`);
    }
  }
}
