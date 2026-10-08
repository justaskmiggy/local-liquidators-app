// Deployment config. For GitHub Pages / any static host, point the app at your separately hosted function, e.g.
//   window.LL_CONFIG = { analyzeEndpoint: 'https://YOUR-SITE.netlify.app/api/analyze' };
// Leave as-is on Netlify/Vercel (same-origin /api/analyze). If the endpoint can't be reached the app shows a clearly labeled placeholder.
// bulkEndpoint (optional): where Bulk Walkthrough sends {mode:'bulk'} photo batches; defaults to analyzeEndpoint.
window.LL_CONFIG = { analyzeEndpoint: 'https://www.justaskmiggy.com/api/ll-analyze', bulkEndpoint: 'https://www.justaskmiggy.com/api/ll-analyze', leadEndpoint: 'https://www.justaskmiggy.com/api/ll-lead' };
