import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join, parse } from 'path';

const dir = 'src/assets/paints';
const files = readdirSync(dir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

for (const file of files) {
  const { name } = parse(file);
  const input = join(dir, file);
  const output = join(dir, `${name}.webp`);
  
  const info = await sharp(input)
    .webp({ quality: 82 })
    .toFile(output);
  
  console.log(`${file} → ${name}.webp  (${(info.size / 1024).toFixed(0)} KB)`);
}

console.log('\nDone! Now delete the .png files and update paintings.json to use .webp');
