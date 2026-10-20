import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const svg = await readFile('src/icons/icon.svg', 'utf8');
for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(`src/icons/icon-${size}.png`, png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
}
