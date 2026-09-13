import { chromium } from 'playwright'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = join(root, 'scripts', '.hero-record')
const destWebm = join(root, 'public', 'landing', 'hero.webm')
const base = process.env.SEA_URL || 'http://127.0.0.1:5174'

function pause(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function clickVoucherTab(page, label) {
  await page.locator('section').first().getByRole('button', { name: label, exact: true }).click({ timeout: 8000 })
}

rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
mkdirSync(join(root, 'public', 'landing'), { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  locale: 'ko-KR',
  recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
})
const page = await context.newPage()
page.setDefaultTimeout(20000)

await page.goto(`${base}/app/exceptions/EX-260828-0001`, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready
})
await pause(2800)
await clickVoucherTab(page, '필드')
await pause(2000)
await clickVoucherTab(page, '확인')
await pause(2200)
await clickVoucherTab(page, '통보')
await pause(2800)
await clickVoucherTab(page, '이력')
await pause(1800)
await clickVoucherTab(page, '변경')
await pause(1800)

await page.goto(`${base}/app`, { waitUntil: 'networkidle' })
await pause(2400)

const video = page.video()
await page.close()
await context.close()
await browser.close()

if (!video) throw new Error('video not recorded')
const src = await video.path()
copyFileSync(src, destWebm)
rmSync(tmp, { recursive: true, force: true })
console.log('wrote', destWebm)
