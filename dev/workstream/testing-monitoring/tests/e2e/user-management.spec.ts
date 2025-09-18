import { test, expect } from '@playwright/test'

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display user management interface', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('User Management')
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible()
  })

  test('should create a new user', async ({ page }) => {
    await page.click('[data-testid="add-user-button"]')

    await page.fill('[data-testid="user-name-input"]', 'John Doe')
    await page.fill('[data-testid="user-email-input"]', 'john.doe@example.com')

    await page.click('[data-testid="save-user-button"]')

    await expect(page.locator('[data-testid="user-list"]')).toContainText('John Doe')
    await expect(page.locator('[data-testid="user-list"]')).toContainText('john.doe@example.com')
  })

  test('should validate email format', async ({ page }) => {
    await page.click('[data-testid="add-user-button"]')

    await page.fill('[data-testid="user-name-input"]', 'Invalid User')
    await page.fill('[data-testid="user-email-input"]', 'invalid-email')

    await page.click('[data-testid="save-user-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email format')
  })

  test('should prevent duplicate email addresses', async ({ page }) => {
    await page.click('[data-testid="add-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'First User')
    await page.fill('[data-testid="user-email-input"]', 'test@example.com')
    await page.click('[data-testid="save-user-button"]')

    await page.click('[data-testid="add-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'Second User')
    await page.fill('[data-testid="user-email-input"]', 'test@example.com')
    await page.click('[data-testid="save-user-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toContainText('User with this email already exists')
  })

  test('should edit user information', async ({ page }) => {
    await page.click('[data-testid="add-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'Edit User')
    await page.fill('[data-testid="user-email-input"]', 'edit@example.com')
    await page.click('[data-testid="save-user-button"]')

    await page.click('[data-testid="edit-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'Updated User')
    await page.click('[data-testid="save-user-button"]')

    await expect(page.locator('[data-testid="user-list"]')).toContainText('Updated User')
  })

  test('should delete user', async ({ page }) => {
    await page.click('[data-testid="add-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'Delete User')
    await page.fill('[data-testid="user-email-input"]', 'delete@example.com')
    await page.click('[data-testid="save-user-button"]')

    await page.click('[data-testid="delete-user-button"]')
    await page.click('[data-testid="confirm-delete-button"]')

    await expect(page.locator('[data-testid="user-list"]')).not.toContainText('Delete User')
  })

  test('should display user statistics', async ({ page }) => {
    await expect(page.locator('[data-testid="total-users-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-users-count"]')).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible()
  })

  test('should handle server errors gracefully', async ({ page }) => {
    await page.route('**/api/users', route => route.abort())

    await page.click('[data-testid="add-user-button"]')
    await page.fill('[data-testid="user-name-input"]', 'Error User')
    await page.fill('[data-testid="user-email-input"]', 'error@example.com')
    await page.click('[data-testid="save-user-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error')
  })
})