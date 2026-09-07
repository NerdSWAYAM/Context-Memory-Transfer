import { test as base, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define a custom test fixture that loads the unpacked extension
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    // The path to the extension build directory
    const pathToExtension = path.join(__dirname, '../../dist');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // Find the background worker to get the extension ID
    let [background] = context.serviceWorkers();
    if (!background)
      background = await context.waitForEvent('serviceworker');

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

test.describe('Poké Context Ball Extension', () => {
    test('popup page should render correctly', async ({ page, extensionId }) => {
        // Open the popup page directly to test it
        await page.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);
        
        // Wait for the popup to load
        await expect(page.locator('body')).toBeVisible();

        // Check if the title is present
        await expect(page).toHaveTitle('Poké Context Ball');
        
        // Wait for the capture tab button
        await expect(page.locator('#tab-capture')).toBeVisible();

        // Check tabs exist
        const captureTab = page.locator('#tab-capture');
        const transferTab = page.locator('#tab-transfer');
        
        await expect(captureTab).toBeVisible();
        await expect(transferTab).toBeVisible();

        // Check capture button exists
        const captureBtn = page.locator('#capture-btn');
        await expect(captureBtn).toBeVisible();
    });

    test('should allow switching between Capture and Transfer tabs', async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/src/ui/popup/popup.html`);

        const captureTab = page.locator('#tab-capture');
        const transferTab = page.locator('#tab-transfer');
        const capturePanel = page.locator('#capture-panel');
        const transferPanel = page.locator('#transfer-panel');

        // Initially in capture mode
        await expect(capturePanel).toHaveClass(/active/);
        
        // Click transfer tab
        await transferTab.click();
        
        // Transfer panel should become active
        await expect(transferPanel).toHaveClass(/active/);
        await expect(capturePanel).not.toHaveClass(/active/);
        
        // Click capture tab again
        await captureTab.click();
        
        await expect(capturePanel).toHaveClass(/active/);
        await expect(transferPanel).not.toHaveClass(/active/);
    });
});
