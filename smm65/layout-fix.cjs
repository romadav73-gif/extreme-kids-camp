'use strict';
const fs = require('node:fs');
const file = 'smm65/src/smm-ui.css';
const source = fs.readFileSync(file, 'utf8');
if (!source.includes('SMM_TABLET_REPAIR')) fs.writeFileSync(file, source + `
/* SMM_TABLET_REPAIR: wrap content and header controls instead of hiding overflow. */
.sm65 { overflow-wrap: anywhere; }
.sm65 .btn { white-space: normal; max-width: 100%; min-width: 0; }
.sm65-hero > div, .sm65-pay-hero > div, .sm65-pay-row > div { min-width: 0; }
.sm65-hero-actions, .sm65-section-head, .sm65-pay-row { flex-wrap: wrap; }
body:has(.sm65) .topbar { height: auto; min-height: 82px; flex-wrap: wrap; padding-block: 10px; gap: 12px; }
body:has(.sm65) .top-title { flex: 1; min-width: 0; }
body:has(.sm65) .top-title > div { min-width: 0; }
body:has(.sm65) .top-title .crumb { white-space: normal; }
body:has(.sm65) .top-actions { max-width: 100%; min-width: 0; flex-wrap: wrap; }
@media (max-width: 1120px) {
  .sm65-grid { grid-template-columns: minmax(0, 1fr); }
  .sm65-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  body:has(.sm65) .topbar { gap: 8px; }
  body:has(.sm65) .top-actions { flex: 1 1 100%; justify-content: flex-end; }
  body:has(.sm65) .top-title h1 { max-width: none; }
  .sm65 .sm65-badge { max-width: 100%; white-space: normal; }
}
`);
