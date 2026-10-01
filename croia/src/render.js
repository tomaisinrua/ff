// Render SVG files to PNG at 1024px: node croia/src/render.js a.svg [b.svg ...]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const f of process.argv.slice(2)) {
    await p.setContent('<body style="margin:0">' + fs.readFileSync(f, 'utf8') + '</body>');
    await p.screenshot({ path: f.replace(/\.svg$/, '.png') });
    fs.unlinkSync(f);
    console.log('wrote', f.replace(/\.svg$/, '.png'));
  }
  await b.close();
})();
