// Deployment config. For GitHub Pages / any static host, point the app at your separately hosted function, e.g.
//   window.LL_CONFIG = { analyzeEndpoint: 'https://YOUR-SITE.netlify.app/api/analyze' };
// Leave as-is on Netlify/Vercel (same-origin /api/analyze). If the endpoint is missing or has no API key the app runs in DEMO mode.
// bulkEndpoint (optional): where Bulk Walkthrough sends {mode:'bulk'} photo batches; defaults to analyzeEndpoint.
window.LL_CONFIG = { analyzeEndpoint: 'api/analyze' };
