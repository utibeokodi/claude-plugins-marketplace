// launch-browser.js
// Base template for launching Playwright with video recording and console error capture.
// Adapt the validation steps section for the current ticket.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,  // Headed mode: user can watch
    slowMo: 500       // Slow down actions so user can follow along
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: 'validation/<ticket-key>/videos/',
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });

  // Capture console errors
  const consoleErrors = [];
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // ... validation steps executed here ...

  // Save console errors
  require('fs').writeFileSync(
    'validation/<ticket-key>/logs/console-errors.log',
    consoleErrors.join('\n')
  );

  await context.close();
  await browser.close();
})();
