import { readFile } from 'node:fs/promises'
import path from 'node:path'
const dist = path.resolve('dist')
const expected = ['fa/index.html','en/index.html','fa/services/index.html','en/services/index.html','fa/contact/index.html','en/contact/index.html']
for (const file of expected) {
  const html = await readFile(path.join(dist, file), 'utf8')
  for (const token of ['<title>', 'name="description"', 'rel="canonical"', 'hreflang="fa"', 'hreflang="en"', 'hreflang="x-default"', 'application/ld+json', '<main>']) {
    if (!html.includes(token)) throw new Error(`${file} is missing ${token}`)
  }
}
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
if ((sitemap.match(/<url>/g) ?? []).length !== 6) throw new Error('Expected six sitemap URLs')
if ((sitemap.match(/<loc>https:\/\//g) ?? []).length !== 6) throw new Error('Sitemap locations must be absolute HTTPS URLs')
console.log('Static Bridge SEO checks passed: six HTML pages + sitemap.')
