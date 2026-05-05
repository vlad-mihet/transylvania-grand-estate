import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

const cities = [
  { name: 'Arad', slug: 'arad' },
  { name: 'Bacău', slug: 'bacau' },
  { name: 'Baia Mare', slug: 'baia-mare' },
  { name: 'Botoșani', slug: 'botosani' },
  { name: 'Brăila', slug: 'braila' },
  { name: 'București', slug: 'bucuresti' },
  { name: 'Buftea', slug: 'buftea' },
  { name: 'Buzău', slug: 'buzau' },
  { name: 'Constanța', slug: 'constanta' },
  { name: 'Drobeta-Turnu Severin', slug: 'drobeta-turnu-severin' },
  { name: 'Giurgiu', slug: 'giurgiu' },
  { name: 'Oradea', slug: 'oradea' },
  { name: 'Miercurea Ciuc', slug: 'miercurea-ciuc' },
  { name: 'Iași', slug: 'iasi' },
  { name: 'Pitești', slug: 'pitesti' },
  { name: 'Ploiești', slug: 'ploiesti' },
  { name: 'Reșița', slug: 'resita' },
  { name: 'Sibiu', slug: 'sibiu' },
  { name: 'Sighișoara', slug: 'sighisoara' },
  { name: 'Slatina', slug: 'slatina' },
  { name: 'Slobozia', slug: 'slobozia' },
  { name: 'Suceava', slug: 'suceava' },
  { name: 'Târgu Mureș', slug: 'targu-mures' },
  { name: 'Zalău', slug: 'zalau' }
];

const REVERY_DIR = path.resolve('apps/revery/public/images/cities');
const LANDING_DIR = path.resolve('apps/landing/public/images/cities');

async function downloadImage(url, destPaths) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  
  // Need to read the response fully into a buffer to write to multiple places
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  for (const dest of destPaths) {
    fs.writeFileSync(dest, buffer);
  }
}

async function scrape() {
  await mkdir(REVERY_DIR, { recursive: true });
  await mkdir(LANDING_DIR, { recursive: true });

  for (const city of cities) {
    console.log(`Searching for ${city.name}...`);
    // Remove diacritics for better search
    const cleanName = city.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Fallback order of queries
    const queries = [
      `${cleanName} Romania cityscape`,
      `${cleanName} Romania landmark`,
      `${cleanName} Romania`
    ];

    let imageUrl = null;
    for (const query of queries) {
      const apiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=5`;
      try {
        const res = await fetch(apiUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.results && json.results.length > 0) {
            // Get the best resolution raw URL
            imageUrl = json.results[0].urls.raw;
            console.log(`  Found via query: "${query}"`);
            break;
          }
        }
      } catch (err) {
        console.error(`  Error searching for ${query}:`, err.message);
      }
    }

    if (!imageUrl) {
      console.warn(`  Could not find any Unsplash image for ${city.name}.`);
      continue;
    }

    // append fit to raw url if we want to ensure sizes, but raw is fine.
    // Unsplash raw urls don't have file extensions, so we just write as .jpg
    const dests = [
      path.join(REVERY_DIR, `${city.slug}.jpg`),
      path.join(LANDING_DIR, `${city.slug}.jpg`)
    ];

    console.log(`  Downloading from ${imageUrl}`);
    try {
      // Append formatting options to unsplash raw url to get a good size JPEG
      const finalUrl = `${imageUrl}&auto=format&fit=crop&w=1600&q=80`;
      await downloadImage(finalUrl, dests);
      console.log(`  Saved ${city.slug}.jpg`);
    } catch (err) {
      console.error(`  Failed to download ${city.name}:`, err.message);
    }
    
    // Add delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}

scrape().catch(console.error);
