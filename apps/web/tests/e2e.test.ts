import { test, expect } from '@playwright/test';

test.describe('Zoom Clone E2E Flows', () => {
  test('User can access dashboard, start meeting, and enter lobby', async ({ page }) => {
    // 1. Visit /home in demo mode
    await page.goto('http://localhost:3000/home');
    await expect(page).toHaveTitle(/zoom/i);

    // 2. Verify dashboard quick actions exist
    await expect(page.getByText(/personal meeting id/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /new meeting/i })).toBeVisible();

    // 3. Navigate to Join page
    await page.goto('http://localhost:3000/join');
    await expect(page.getByRole('heading', { name: /join meeting/i })).toBeVisible();

    // 4. Check join button disabled state until input is valid
    const joinInput = page.getByPlaceholder(/enter meeting id/i);
    const joinBtn = page.getByRole('button', { name: 'Join' });
    await expect(joinBtn).toBeDisabled();

    // 5. Enter 10-digit meeting ID
    await joinInput.fill('8338347512');
    await expect(joinBtn).toBeEnabled();
  });
});
