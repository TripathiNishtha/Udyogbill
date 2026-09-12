const fs = require('fs');
const path = require('path');

const categories = [
  { id: 'default', title: 'GST Billing & Business Operating Guide', tag: 'UdyogBill Guide', color1: '#ea580c', color2: '#f97316', icon: '📄' },
  { id: 'gst-billing', title: 'GST Tax Invoicing & Compliance Masterclass', tag: 'GST Billing', color1: '#ea580c', color2: '#c2410c', icon: '🧾' },
  { id: 'retail-billing', title: 'Retail POS, Counter Billing & Supermarket Ops', tag: 'Retail POS', color1: '#16a34a', color2: '#15803d', icon: '🛒' },
  { id: 'pharmacy', title: 'Pharma Batch, Expiry & Schedule H1 Management', tag: 'Pharma ERP', color1: '#e11d48', color2: '#be123c', icon: '💊' },
  { id: 'inventory', title: 'Real-Time Inventory, Multi-Godown & Barcoding', tag: 'Inventory', color1: '#2563eb', color2: '#1d4ed8', icon: '📦' },
  { id: 'compliance', title: 'E-Way Bills, E-Invoicing & Tax Audit Safeguards', tag: 'Compliance', color1: '#7c3aed', color2: '#6d28d9', icon: '⚖️' },
  { id: 'restaurant', title: 'Restaurant KOT, Table Orders & Cafe POS', tag: 'Restaurant POS', color1: '#d97706', color2: '#b45309', icon: '🍽️' },
  { id: 'wholesale', title: 'Wholesale B2B Ledgers, Credit Limits & Logistics', tag: 'Wholesale ERP', color1: '#0284c7', color2: '#0369a1', icon: '🏢' }
];

function generateBanner(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#fff7ed"/>
      <stop offset="100%" stop-color="#ffedd5"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c.color1}"/>
      <stop offset="100%" stop-color="${c.color2}"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#ea580c" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle Grid Pattern -->
  <g stroke="#f97316" stroke-opacity="0.08" stroke-width="1">
    <line x1="100" y1="0" x2="100" y2="630"/>
    <line x1="300" y1="0" x2="300" y2="630"/>
    <line x1="500" y1="0" x2="500" y2="630"/>
    <line x1="700" y1="0" x2="700" y2="630"/>
    <line x1="900" y1="0" x2="900" y2="630"/>
    <line x1="1100" y1="0" x2="1100" y2="630"/>
    <line x1="0" y1="100" x2="1200" y2="100"/>
    <line x1="0" y1="200" x2="1200" y2="200"/>
    <line x1="0" y1="300" x2="1200" y2="300"/>
    <line x1="0" y1="400" x2="1200" y2="400"/>
    <line x1="0" y1="500" x2="1200" y2="500"/>
  </g>

  <!-- Main Card -->
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="#ffffff" stroke="#fed7aa" stroke-width="2" filter="url(#shadow)"/>

  <!-- Top Accent Bar -->
  <rect x="60" y="60" width="1080" height="12" rx="6" fill="url(#accent)"/>

  <!-- Logo Pill -->
  <g transform="translate(100, 110)">
    <rect width="210" height="42" rx="10" fill="#fff7ed" stroke="#fdba74" stroke-width="1.5"/>
    <circle cx="24" cy="21" r="10" fill="${c.color1}"/>
    <text x="44" y="27" fill="#9a3412" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" letter-spacing="-0.02em">UDYOGBILL</text>
  </g>

  <!-- Category Tag -->
  <g transform="translate(325, 110)">
    <rect width="180" height="42" rx="10" fill="${c.color1}" fill-opacity="0.1" stroke="${c.color1}" stroke-opacity="0.3" stroke-width="1.5"/>
    <text x="90" y="26" fill="${c.color1}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" text-anchor="middle">${c.tag}</text>
  </g>

  <!-- Verified Trust Badge -->
  <g transform="translate(930, 110)">
    <rect width="170" height="42" rx="10" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
    <text x="85" y="26" fill="#065f46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" text-anchor="middle">✓ CBIC Compliant</text>
  </g>

  <!-- Emoji Icon Circle -->
  <g transform="translate(100, 200)">
    <circle cx="50" cy="50" r="50" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/>
    <text x="50" y="65" font-size="48" text-anchor="middle">${c.icon}</text>
  </g>

  <!-- Main Title -->
  <text x="230" y="240" fill="#0f172a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.03em">
    ${c.title}
  </text>
  <text x="230" y="285" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">
    Comprehensive Business Operating &amp; Compliance Guide for Indian Vyaparis
  </text>

  <!-- Divider Line -->
  <line x1="100" y1="350" x2="1100" y2="350" stroke="#f1f5f9" stroke-width="2"/>

  <!-- Value Feature Pills -->
  <g transform="translate(100, 390)">
    <!-- Pill 1 -->
    <g transform="translate(0, 0)">
      <rect width="310" height="60" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="28" cy="30" r="12" fill="${c.color1}" fill-opacity="0.15"/>
      <text x="28" y="35" fill="${c.color1}" font-size="14" font-weight="900" text-anchor="middle">1</text>
      <text x="52" y="28" fill="#0f172a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800">100% Tax Compliant</text>
      <text x="52" y="47" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Direct CBIC &amp; GST Rules</text>
    </g>

    <!-- Pill 2 -->
    <g transform="translate(330, 0)">
      <rect width="310" height="60" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="28" cy="30" r="12" fill="${c.color1}" fill-opacity="0.15"/>
      <text x="28" y="35" fill="${c.color1}" font-size="14" font-weight="900" text-anchor="middle">2</text>
      <text x="52" y="28" fill="#0f172a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800">15-Second Billing</text>
      <text x="52" y="47" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Barcode &amp; Thermal Print</text>
    </g>

    <!-- Pill 3 -->
    <g transform="translate(660, 0)">
      <rect width="310" height="60" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
      <circle cx="28" cy="30" r="12" fill="${c.color1}" fill-opacity="0.15"/>
      <text x="28" y="35" fill="${c.color1}" font-size="14" font-weight="900" text-anchor="middle">3</text>
      <text x="52" y="28" fill="#0f172a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800">Automated Khata</text>
      <text x="52" y="47" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">WhatsApp Payment Links</text>
    </g>
  </g>

  <!-- Footer Info -->
  <text x="100" y="520" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">
    Published by UdyogBill Editorial Team • https://udyogbill.com
  </text>
  <text x="1100" y="520" fill="${c.color1}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" text-anchor="end">
    Cloud ERP for Indian MSMEs →
  </text>
</svg>`;
}

const targetDir = path.join(__dirname, 'frontend/public/img/blog');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

categories.forEach(c => {
  const filePath = path.join(targetDir, `${c.id}.svg`);
  fs.writeFileSync(filePath, generateBanner(c), 'utf8');
  console.log('Generated banner:', filePath);
});
