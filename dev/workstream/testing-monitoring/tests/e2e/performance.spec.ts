import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)

    await expect(page.locator('h1')).toBeVisible()
  })

  test('should handle rapid user interactions', async ({ page }) => {
    await page.goto('/')

    const startTime = Date.now()

    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-user-button"]')
      await page.fill('[data-testid="user-name-input"]', `User ${i}`)
      await page.fill('[data-testid="user-email-input"]', `user${i}@example.com`)
      await page.click('[data-testid="save-user-button"]')
    }

    const totalTime = Date.now() - startTime

    expect(totalTime).toBeLessThan(15000)

    const userCount = await page.locator('[data-testid="user-list"] tr').count()
    expect(userCount).toBe(10)
  })

  test('should maintain performance with large datasets', async ({ page }) => {
    await page.goto('/stress-test')

    await page.waitForSelector('[data-testid="large-dataset-loaded"]')

    const startTime = Date.now()
    await page.click('[data-testid="filter-button"]')
    await page.fill('[data-testid="search-input"]', 'test')
    const filterTime = Date.now() - startTime

    expect(filterTime).toBeLessThan(1000)

    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible()
  })

  test('should measure page load performance', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(5000)
    console.log('Page load time:', loadTime, 'ms')
  })

  test('should handle concurrent user sessions', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ])

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )

    const startTime = Date.now()

    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto('/')
        await page.click('[data-testid="add-user-button"]')
        await page.fill('[data-testid="user-name-input"]', `Concurrent User ${index}`)
        await page.fill('[data-testid="user-email-input"]', `concurrent${index}@example.com`)
        await page.click('[data-testid="save-user-button"]')
      })
    )

    const totalTime = Date.now() - startTime

    expect(totalTime).toBeLessThan(10000)

    await Promise.all(contexts.map(context => context.close()))
  })
})