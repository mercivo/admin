export const serverLoadingStyle = '<style data-server-loading-style>html,body{min-height:100%}body{margin:0}[data-server-loading]{display:grid;min-height:100vh;place-items:center;background:#fff}[data-server-loader]{width:38px;height:38px;border:3px solid #e5e7eb;border-top-color:#7c6ef5;border-radius:50%;animation:mercivo-server-spin 1s linear infinite}[data-server-seo]{display:none!important}@keyframes mercivo-server-spin{to{transform:rotate(360deg)}}</style>';

export const renderInitialDocument = (template, head = '', seoBody = '') => {
  const root = `<div id="root"><main data-server-loading aria-label="Loading site" aria-busy="true"><span data-server-loader aria-hidden="true"></span></main>${seoBody}</div>`;
  const document = head ? template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["'](?:description|keywords|robots)["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["'](?:icon|shortcut icon|canonical)["'][^>]*>/gi, '') : template;
  return document
    .replace('</head>', `${head}${serverLoadingStyle}</head>`)
    .replace('<div id="root"></div>', root);
};
