#!/usr/bin/env node
// Renders one diagram in docs/assets/diagrams/src/ to the light and dark SVG pair beside it.
//
//   node scripts/diagrams/render.mjs <name>      e.g. tech-stack
//
// Needs, outside the repository:
//   ARCHIFY      path to Archify's bin/archify.mjs
//   TOOLS_DIR    a folder holding playwright-core (default ~/.cache/catatmd-diagrams):
//                bun add --cwd ~/.cache/catatmd-diagrams playwright-core@1.65.0
//   CHROME_PATH  a Chromium binary, if playwright-core cannot find its own
// Fonts come from the frontend's own @fontsource packages, so run `bun install` first.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const dir = path.join(root, 'docs/assets/diagrams')
const name = process.argv[2]
const source = fs.readdirSync(path.join(dir, 'src')).find((f) => f.startsWith(`${name}.`))
if (!name || !source) {
  console.error(
    'usage: node scripts/diagrams/render.mjs <name>  (a file in docs/assets/diagrams/src/)',
  )
  process.exit(1)
}
const type = source.split('.')[1]
const archify = process.env.ARCHIFY
if (!archify) {
  console.error('Set ARCHIFY to the path of bin/archify.mjs')
  process.exit(1)
}
const toolsDir = process.env.TOOLS_DIR ?? path.join(os.homedir(), '.cache/catatmd-diagrams')
const { chromium } = createRequire(path.join(toolsDir, 'package.json'))('playwright-core')

// Archify wants the candidate and its output inside the working directory.
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'catatmd-diagram-'))
const candidate = JSON.parse(fs.readFileSync(path.join(dir, 'src', source), 'utf8'))
candidate.meta.output = `${name}.html`
fs.writeFileSync(path.join(work, 'candidate.json'), JSON.stringify(candidate, null, 2))
execFileSync(
  'node',
  [archify, 'finalize', type, 'candidate.json', `${name}.html`, '--quality', 'showcase', '--json'],
  { cwd: work, stdio: 'inherit' },
)

// Tokens from docs/DESIGN.md. Accent for clinical logic, Advisory blue for the
// browser, Emergency red for trust gates, Urgent amber for third parties.
const TOKENS = {
  light: {
    '--bg': '#EEEDE9',
    '--grid': '#E5E3DE',
    '--canvas-dot': '#DDDCD9',
    '--text': '#1D221F',
    '--text-muted': '#555D58',
    '--text-dim': '#7A817C',
    '--text-faint': '#6A716C',
    '--panel': '#FFFFFF',
    '--panel-border': '#DDDCD9',
    '--lane-fill': 'rgba(255, 255, 255, 0.55)',
    '--lane-stroke': '#CFCDC8',
    '--arrow': '#7A817C',
    '--arrow-emphasis': '#136A51',
    '--mask': '#EEEDE9',
    '--frontend-fill': '#E6EEF8',
    '--frontend-stroke': '#0752B0',
    '--backend-fill': '#E3EDEA',
    '--backend-stroke': '#136A51',
    '--database-fill': '#F4F3F0',
    '--database-stroke': '#555D58',
    '--cloud-fill': '#F8EDDF',
    '--cloud-stroke': '#A35700',
    '--security-fill': '#F8E4E3',
    '--security-stroke': '#B30D16',
    '--messagebus-fill': '#F8EDDF',
    '--messagebus-stroke': '#A35700',
    '--external-fill': '#FFFFFF',
    '--external-stroke': '#555D58',
  },
  dark: {
    '--bg': '#0A0D0B',
    '--grid': '#171A18',
    '--canvas-dot': '#2C302E',
    '--text': '#EBEEEC',
    '--text-muted': '#A0A7A2',
    '--text-dim': '#6F7772',
    '--text-faint': '#858C87',
    '--panel': '#171A18',
    '--panel-border': '#2C302E',
    '--lane-fill': 'rgba(23, 26, 24, 0.6)',
    '--lane-stroke': '#2C302E',
    '--arrow': '#6F7772',
    '--arrow-emphasis': '#54BB97',
    '--mask': '#0A0D0B',
    '--frontend-fill': '#14212E',
    '--frontend-stroke': '#6FB8F5',
    '--backend-fill': '#1E2E28',
    '--backend-stroke': '#54BB97',
    '--database-fill': '#171A18',
    '--database-stroke': '#A0A7A2',
    '--cloud-fill': '#2A2015',
    '--cloud-stroke': '#F5A843',
    '--security-fill': '#2E1A18',
    '--security-stroke': '#FB7764',
    '--messagebus-fill': '#2A2015',
    '--messagebus-stroke': '#F5A843',
    '--external-fill': '#171A18',
    '--external-stroke': '#A0A7A2',
  },
}

// Work Sans sets narrower than the monospace face Archify measures with, so
// text grows about 20% and keeps the same footprint inside each box.
const SIZES = { 7.5: '9', 8: '9.5', 9: '10.5', 10: '11.5', 11: '12.5', 12: '13.5' }

const fromFrontend = createRequire(path.join(root, 'frontend/package.json'))
const font = (pkg, file) =>
  fs
    .readFileSync(fromFrontend.resolve(`@fontsource-variable/${pkg}/files/${file}`))
    .toString('base64')
const WORK = font('work-sans', 'work-sans-latin-wght-normal.woff2')
const OUTFIT = font('outfit', 'outfit-latin-wght-normal.woff2')

function brand(svg, theme) {
  const tokens = TOKENS[theme]
  const css =
    `@font-face{font-family:'Work Sans';font-weight:100 900;src:url(data:font/woff2;base64,${WORK}) format('woff2');}` +
    `@font-face{font-family:'Outfit';font-weight:100 900;src:url(data:font/woff2;base64,${OUTFIT}) format('woff2');}` +
    "svg,svg text{font-family:'Work Sans',system-ui,-apple-system,'Segoe UI',sans-serif !important;}" +
    "svg .t-primary{font-family:'Outfit','Work Sans',system-ui,sans-serif !important;}" +
    `svg[data-theme][data-theme]{${Object.entries(tokens)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`
  return svg
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@font-face\s*\{[^}]*'JetBrains Mono'[^}]*\}/g, '')
    .replace(/svg \{ font-family:[^}]*\}/, '')
    .replace(/fill="#f4f5f7"|fill="#020617"/, `fill="${tokens['--bg']}"`)
    .replace('</style>', `${css}</style>`)
    .replace(/ style="width: [^"]*"/, '')
    .replaceAll(' role="button"', '')
    .replaceAll(' tabindex="0"', '')
    .replace(/font-size="([\d.]+)"/g, (_m, size) => `font-size="${SIZES[size] ?? size}"`)
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
)
const page = await browser.newPage({
  acceptDownloads: true,
  viewport: { width: 1600, height: 1000 },
})
await page.goto(`file://${path.join(work, `${name}.html`)}`)
await page.waitForTimeout(800)
for (const theme of ['light', 'dark']) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(
      (f) => document.querySelector(`button[data-format="${f}"]`).click(),
      `svg-${theme}`,
    ),
  ])
  const raw = fs.readFileSync(await download.path(), 'utf8')
  let svg = brand(raw, theme)

  // Crop the canvas to what is drawn, plus a margin.
  const trim = await browser.newPage()
  await trim.setContent(`<body>${svg.replace(/^<\?xml[^>]*>/, '')}</body>`)
  const box = await trim.evaluate(() => {
    const el = document.querySelector('svg')
    const bg = el.querySelector(':scope > rect')
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const node of el.querySelectorAll('rect,path,line,polyline,polygon,text,circle,ellipse')) {
      if (
        node.closest('defs,marker,pattern') ||
        node === bg ||
        node.getAttribute('width') === '100%'
      )
        continue
      const b = node.getBBox()
      if (!b.width && !b.height) continue
      const m = el.getScreenCTM().inverse().multiply(node.getScreenCTM())
      for (const [x, y] of [
        [b.x, b.y],
        [b.x + b.width, b.y + b.height],
      ]) {
        const p = new DOMPoint(x, y).matrixTransform(m)
        x0 = Math.min(x0, p.x)
        y0 = Math.min(y0, p.y)
        x1 = Math.max(x1, p.x)
        y1 = Math.max(y1, p.y)
      }
    }
    return { x0, y0, x1, y1 }
  })
  await trim.close()
  const pad = 24
  const x = Math.floor(box.x0 - pad)
  const y = Math.floor(box.y0 - pad)
  const w = Math.ceil(box.x1 - box.x0 + 2 * pad)
  const h = Math.ceil(box.y1 - box.y0 + 2 * pad)
  svg = svg
    .replace(/<svg([^>]*?) viewBox="[^"]*"/, `<svg$1 viewBox="${x} ${y} ${w} ${h}"`)
    .replace(/(<svg[^>]*?) width="[^"]*" height="[^"]*"/, `$1 width="${w}" height="${h}"`)
    .replace(
      /<rect x="0" y="0" width="\d+" height="\d+" fill=/,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill=`,
    )
    .replace(
      /<rect width="100%" height="100%" fill="url\(#grid\)"\/>/,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#grid)"/>`,
    )
  fs.writeFileSync(path.join(dir, `${name}-${theme}.svg`), svg)
  process.stdout.write(`wrote docs/assets/diagrams/${name}-${theme}.svg\n`)
}
await browser.close()
fs.rmSync(work, { recursive: true, force: true })
