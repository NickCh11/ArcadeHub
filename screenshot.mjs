import puppeteer from 'puppeteer'
import fs        from 'node:fs'
import path      from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR   = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temporary screenshots')
const url   = process.argv[2] || 'http://localhost:3000'
const label = process.argv[3] ? `-${process.argv[3]}` : ''

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

const existing = fs.readdirSync(DIR).filter(f => /^screenshot-\d+/.test(f))
const nums      = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'))
const next      = (nums.length ? Math.max(...nums) : 0) + 1
const outPath   = path.join(DIR, `screenshot-${next}${label}.png`)

const browser = await puppeteer.launch({
  executablePath: 'C:/Users/nickc/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
await page.screenshot({ path: outPath, fullPage: false })
await browser.close()
console.log(`Saved: ${outPath}`)
