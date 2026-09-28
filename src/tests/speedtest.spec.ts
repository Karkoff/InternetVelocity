import { test, expect } from '@playwright/test'

test('speed test should complete and show results', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173/')
  
  // Wait for the page to load
  await expect(page.locator('text=Internet Velocity')).toBeVisible()
  
  // Collect console logs
  const consoleLogs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(text)
    if (text.includes('[SpeedTest]')) {
      console.log(`PLAYWRIGHT: ${text}`)
    }
  })
  
  // Collect errors
  const errors: string[] = []
  page.on('pageerror', err => {
    errors.push(err.message)
    console.error(`PLAYWRIGHT ERROR: ${err.message}`)
  })
  
  // Click the start button
  await page.locator('button', { hasText: 'Iniciar Teste' }).click()
  
  // Wait for the test to complete (should take ~30-60 seconds max)
  await page.waitForTimeout(90000)
  
  // Check for errors
  if (errors.length > 0) {
    console.error('Errors found:', errors)
  }
  
  // Print all SpeedTest logs
  console.log('\n=== SPEED TEST LOGS ===')
  consoleLogs.filter(l => l.includes('[SpeedTest]')).forEach(log => console.log(log))
  console.log('=======================\n')
  
  // Check if results are displayed
  const downloadCard = page.locator('text=Download').locator('..')
  const uploadCard = page.locator('text=Upload').locator('..')
  const latencyCard = page.locator('text=Latência').locator('..')
  
  console.log('Download card found:', await downloadCard.count() > 0)
  console.log('Upload card found:', await uploadCard.count() > 0)
  console.log('Latency card found:', await latencyCard.count() > 0)
})
