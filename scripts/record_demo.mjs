import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const videoPath = path.join(projectRoot, 'demo_video.webm')
const baseUrl = process.env.DEMO_URL ?? 'http://localhost:5173'

async function assertApiProxy(page) {
  const response = await page.request.get(`${baseUrl}/health`)
  if (!response.ok()) {
    throw new Error(
      `API proxy not reachable at ${baseUrl}/health (${response.status()}). ` +
        'Start the Vite dev server with API proxy: cd frontend && npm run dev -- --port 5173',
    )
  }
  const body = await response.json()
  if (body.status !== 'ok') {
    throw new Error(`Unexpected health response: ${JSON.stringify(body)}`)
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: {
    dir: projectRoot,
    size: { width: 1440, height: 900 },
  },
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()
let exitCode = 0

try {
  console.log(`Opening ${baseUrl} …`)
  await assertApiProxy(page)
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(1500)

  const input = page.locator('#investigation-query')
  await input.waitFor({ state: 'visible' })
  await input.click()
  await input.fill('')
  await input.type('Why is Project Phoenix delayed?', { delay: 45 })
  await page.waitForTimeout(800)

  console.log('Starting investigation …')
  await page.getByRole('button', { name: 'Investigate', exact: true }).click()

  console.log('Waiting for knowledge graph nodes …')
  await page.waitForFunction(
    () => {
      const labels = [...document.querySelectorAll('p')].map((p) => p.textContent?.trim() ?? '')
      const match = labels.find((text) => /^\d+ nodes$/.test(text))
      return match ? parseInt(match, 10) > 0 : false
    },
    { timeout: 120_000 },
  )

  await page.locator('.react-flow__node').first().waitFor({
    state: 'visible',
    timeout: 30_000,
  })

  await page.locator('.graph-canvas').scrollIntoViewIfNeeded()
  await page.waitForFunction(
    () => document.querySelectorAll('.react-flow__node').length >= 5,
    { timeout: 60_000 },
  )

  console.log('Waiting for investigation to complete …')
  try {
    await page.getByText('Investigation Report').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(3000)
  } catch {
    try {
      await page.getByText('completed', { exact: false }).waitFor({ timeout: 30_000 })
    } catch {
      console.log('Completion UI not seen; keeping graph on screen.')
    }
  }

  await page.waitForTimeout(6000)
  console.log('Recording complete.')
} catch (error) {
  exitCode = 1
  console.error(error)
} finally {
  await context.close()
  const video = page.video()
  if (video) {
    await video.saveAs(videoPath)
    console.log(`Saved ${videoPath}`)
  }
  await browser.close()
  process.exit(exitCode)
}
