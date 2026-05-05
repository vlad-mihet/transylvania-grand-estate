import fs from 'fs';

const filePath = 'packages/data/src/cities.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/image: "\/images\/cities\/placeholder\.jpg"/g, (match, offset) => {
  const before = content.slice(0, offset);
  const slugMatches = [...before.matchAll(/slug: "([^"]+)"/g)];
  if (slugMatches.length > 0) {
    const lastSlug = slugMatches[slugMatches.length - 1][1];
    return `image: "/images/cities/${lastSlug}.jpg"`;
  }
  return match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('cities.ts updated successfully.');
