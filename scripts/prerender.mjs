// Prerender the landing page into dist/index.html so crawlers get full HTML
// instead of an empty <div id="root">. Runs as part of `npm run build`.
//
// Uses puppeteer-core with the system Chrome (present on macOS dev machines and
// on GitHub Actions ubuntu-latest runners) — no Chromium download. If Chrome is
// unavailable the build still succeeds, just without the snapshot.

import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

function serveDist() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        if (p.endsWith('/')) p += 'index.html'
        const file = path.join(dist, p)
        if (!file.startsWith(dist)) throw new Error('traversal')
        const body = await readFile(file)
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

async function main() {
  let puppeteer
  try {
    puppeteer = await import('puppeteer-core')
  } catch {
    console.warn('[prerender] puppeteer-core not installed — skipping snapshot')
    return
  }

  const server = await serveDist()
  const { port } = server.address()
  let browser
  try {
    browser = await puppeteer.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })
    // Suppress the cookie banner in the snapshot; landing defaults to light theme + PL.
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('sake_cookie_consent', 'accepted') } catch {}
    })
    await page.goto(`http://127.0.0.1:${port}/#/`, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForSelector('#faq', { timeout: 30000 })
    // Let staggered entry animations settle so opacity/transform end states are captured.
    await new Promise((r) => setTimeout(r, 1200))
    const html = await page.evaluate(() => document.getElementById('root').innerHTML)
    if (!html || html.length < 5000) throw new Error(`snapshot too small (${html?.length ?? 0} bytes)`)

    const indexPath = path.join(dist, 'index.html')
    const original = await readFile(indexPath, 'utf-8')
    const marker = '<div id="root"></div>'
    if (!original.includes(marker)) throw new Error('root marker not found in dist/index.html')
    // Guard: non-landing hash routes (e.g. #/app) clear the snapshot instantly so
    // logged-in users never flash landing content before React mounts.
    const guard =
      '<script>(function(){var h=location.hash;if(h&&h!=="#"&&h!=="#/"){var r=document.getElementById("root");if(r)r.innerHTML=""}})()</script>'
    const replaced = original.replace(marker, `<div id="root">${html}</div>\n    ${guard}`)
    await writeFile(indexPath, replaced)
    console.log(`[prerender] ok — injected ${(html.length / 1024).toFixed(1)} KB of landing HTML into dist/index.html`)
  } catch (e) {
    console.warn(`[prerender] skipped: ${e.message}`)
  } finally {
    await browser?.close()
    server.close()
  }
}

main()
