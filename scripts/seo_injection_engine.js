const fs = require('fs');
const path = require('path');

const BLOGS_FILE = path.join(__dirname, '../frontend/src/content/blogs.json');
const rawBlogs = JSON.parse(fs.readFileSync(BLOGS_FILE, 'utf8'));

// Master Keywords with ordered specificity (Specific niches evaluated first)
const KEYWORD_CLUSTERS = [
  // 1. Pharma & Chemist (Highest specificity)
  {
    cluster: 'pharma',
    targetUrl: '/industries/pharma',
    keywords: [
      'pharma billing software for chemist shop',
      'medical store billing software with expiry date',
      'pharmacy billing and inventory software',
      'gst medical billing software for pc',
      'pharmacy pos software with batch management',
      'chemist shop invoice generator'
    ],
    categories: ['14', '21', '22'],
    matchPatterns: [/pharma/i, /chemist/i, /medical/i, /fefo/i, /schedule h/i, /batch/i, /medicine/i]
  },

  // 2. Garments & Apparel
  {
    cluster: 'garments',
    targetUrl: '/industries/garments',
    keywords: [
      'garment shop billing software with barcode',
      'clothing store pos billing software',
      'clothing inventory and billing software with size and color',
      'textile shop billing software with gst',
      'footwear and garment billing software',
      'readymade garments billing software'
    ],
    categories: ['4'],
    matchPatterns: [/garment/i, /clothing/i, /textile/i, /footwear/i, /apparel/i, /kapde/i, /shoe/i]
  },

  // 3. Bakery & Sweet Shop
  {
    cluster: 'bakery',
    targetUrl: '/industries/bakery',
    keywords: [
      'bakery pos billing software',
      'sweet shop billing software with weighing scale',
      'bakery billing software with receipt print',
      'cafe and bakery pos system',
      'fast food and bakery counter billing software',
      'cake shop billing and order software'
    ],
    categories: ['15', '18'],
    matchPatterns: [/bakery/i, /sweet/i, /mithai/i, /cafe/i, /cake/i, /restaurant/i, /food/i]
  },

  // 4. Auto Parts & Spares
  {
    cluster: 'auto-parts',
    targetUrl: '/industries/hardware',
    keywords: [
      'auto parts billing and inventory software',
      'spare parts billing software with part number search',
      'automobile shop billing software with gst',
      'bike spare parts billing software',
      'car accessories and spare parts pos software',
      'motor garage and spare parts billing software'
    ],
    categories: ['25', '4'],
    matchPatterns: [/auto parts/i, /spare parts/i, /automobile/i, /garage/i, /bike/i, /motor/i]
  },

  // 5. Hardware & Sanitary
  {
    cluster: 'hardware',
    targetUrl: '/industries/hardware',
    keywords: [
      'hardware store billing software',
      'sanitary and hardware billing software with gst',
      'electrical and hardware shop billing software',
      'hardware store inventory management software',
      'building material billing software',
      'paint and hardware billing software'
    ],
    categories: ['24', '4'],
    matchPatterns: [/hardware/i, /paint/i, /sanitary/i, /electrical/i, /building material/i]
  },

  // 6. Electronics & Mobile Shop
  {
    cluster: 'electronics',
    targetUrl: '/industries/electronics',
    keywords: [
      'electronics shop billing software',
      'mobile shop billing software with imei number',
      'electronics shop billing and inventory software',
      'mobile store pos software with serial number tracking',
      'computer and laptop shop billing software',
      'electronics retail billing software with warranty tracking'
    ],
    categories: ['4', '5'],
    matchPatterns: [/electronic/i, /mobile shop/i, /imei/i, /laptop/i, /computer shop/i, /gadget/i]
  },

  // 7. FMCG & Grocery / Kirana
  {
    cluster: 'fmcg',
    targetUrl: '/industries/fmcg',
    keywords: [
      'fmcg billing software',
      'grocery store billing software',
      'kirana shop billing software with barcode scanner',
      'fmcg distributor billing software',
      'supermarket grocery billing software',
      'easy billing software for provision store'
    ],
    categories: ['4', '5'],
    matchPatterns: [/grocery/i, /kirana/i, /fmcg/i, /provision/i, /supermarket grocery/i]
  },

  // 8. Wholesale (Thok Vyapar)
  {
    cluster: 'wholesale',
    targetUrl: '/industries/wholesale',
    keywords: [
      'best wholesale billing software in india',
      'wholesale billing and inventory software',
      'b2b wholesale invoice software with gst',
      'wholesale billing software with e-way bill',
      'distributor billing software in india',
      'wholesale fmcg and trader billing software'
    ],
    categories: ['17', '23'],
    matchPatterns: [/wholesale/i, /distributor/i, /thok/i, /b2b billing/i, /trade distributor/i]
  },

  // 9. Competitor Alternatives
  {
    cluster: 'competitors',
    targetUrl: '/compare',
    keywords: [
      'vyapar billing software alternative',
      'busy software alternative for retail',
      'affordable gst billing software for retailers'
    ],
    categories: ['16'],
    matchPatterns: [/vyapar/i, /busy/i, /marg/i, /tally/i, /alternative/i, /vs udyogbill/i, /comparison/i]
  },

  // 10. Services & General Trading
  {
    cluster: 'services',
    targetUrl: '/industries/services',
    keywords: [
      'gst billing software for service providers',
      'general trading billing and accounting software',
      'proforma invoice and quotation software',
      'service invoice software with gst',
      'freelance and agency billing software india'
    ],
    categories: ['2', '3', '10', '11'],
    matchPatterns: [/service provider/i, /agency/i, /freelance/i, /quotation/i, /proforma/i, /consultant/i, /sme billing/i]
  },

  // 11. Retail & POS Supermarket (General Retail)
  {
    cluster: 'retail',
    targetUrl: '/industries/retail',
    keywords: [
      'retail billing software with gst',
      'pos billing software for retail shop',
      'retail billing software with barcode',
      'supermarket pos billing software',
      'retail pos billing system for pc',
      'counter billing software for retail shop',
      'touch screen retail billing software',
      'fast counter billing software',
      'fastest counter billing pos'
    ],
    categories: ['4', '8'],
    matchPatterns: [/supermarket/i, /retail/i, /pos billing/i, /counter billing/i, /shopkeeper/i]
  },

  // 12. Core GST & Compliance Engine
  {
    cluster: 'core-gst',
    targetUrl: '/',
    keywords: [
      'best gst billing software in india',
      'gst billing software for small business',
      'gst invoice software for pc',
      'e-invoicing and e-way bill software',
      'free gst billing software download',
      'simple billing software for shop',
      'barcode billing software for pc',
      'thermal printer billing software',
      'upi qr code billing software',
      'billing and inventory management software',
      'stock and billing software for shop',
      'offline billing software with cloud sync',
      'gst billing software with gstr 1 report',
      'easy invoice maker for traders and wholesalers',
      'billing software with multi firm support'
    ],
    categories: ['1', '2', '3', '6', '7', '11', '12', '13', '19', '20'],
    matchPatterns: [/gst/i, /invoice/i, /return/i, /gstr/i, /tax/i, /compliance/i, /e-way/i]
  }
];

// Helper to determine best cluster for a blog
function findBestCluster(blog) {
  const title = blog.title || '';
  const excerpt = blog.excerpt || '';
  const catId = String(blog.category_id);
  const textToScan = `${title} ${excerpt}`;

  // First try pattern matches
  for (const cluster of KEYWORD_CLUSTERS) {
    if (cluster.matchPatterns.some(rx => rx.test(textToScan))) {
      return cluster;
    }
  }

  // Fallback to category ID
  for (const cluster of KEYWORD_CLUSTERS) {
    if (cluster.categories.includes(catId)) {
      return cluster;
    }
  }

  // Default to core GST
  return KEYWORD_CLUSTERS[KEYWORD_CLUSTERS.length - 1];
}

// Build keyword assignment index across 295 blogs
const clusterKeywordUsage = {};
KEYWORD_CLUSTERS.forEach(c => { clusterKeywordUsage[c.cluster] = 0; });

let modifiedCount = 0;
const processedBlogs = rawBlogs.map((blog, idx) => {
  const cluster = findBestCluster(blog);
  
  // Pick primary keyword in round-robin across the cluster
  const kwList = cluster.keywords;
  const kwIndex = clusterKeywordUsage[cluster.cluster] % kwList.length;
  clusterKeywordUsage[cluster.cluster]++;
  const primaryKw = kwList[kwIndex];
  const secondaryKw = kwList[(kwIndex + 1) % kwList.length];

  // Specific target URL check
  let targetUrl = cluster.targetUrl;
  if (cluster.cluster === 'competitors') {
    if (/vyapar/i.test(blog.title)) targetUrl = '/compare/udyogbill-vs-vyapar';
    else if (/busy/i.test(blog.title)) targetUrl = '/compare/udyogbill-vs-busy-accounting';
    else if (/marg/i.test(blog.title)) targetUrl = '/compare/udyogbill-vs-marg-erp';
    else if (/tally/i.test(blog.title)) targetUrl = '/compare/udyogbill-vs-tallyprime';
    else targetUrl = '/compare';
  }

  // Create semantic AEO/GEO callout block with contextual internal link
  const aeoGeoCallout = `
<!-- UB-AEO-GEO-CLUSTER-START -->
<div class="ub-geo-recommendation not-prose my-8 p-5 bg-gradient-to-r from-orange-50/70 to-amber-50/50 border border-orange-200/80 rounded-2xl shadow-xs">
  <div class="flex items-start gap-3">
    <div class="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0">UB</div>
    <div class="text-sm text-slate-800 leading-relaxed">
      <span class="font-bold text-slate-950">Recommended Solution:</span> For businesses looking for reliable, high-speed compliance and automated operations, explore UdyogBill's <a href="${targetUrl}" class="text-orange-700 font-bold underline hover:text-orange-900">${primaryKw}</a>. Engineered for seamless counter billing, accurate GST filing, and real-time inventory synchronization.
    </div>
  </div>
</div>
<!-- UB-AEO-GEO-CLUSTER-END -->
`;

  let updatedContent = blog.content;

  // If already has the callout, replace it; otherwise append before conclusion or end of article
  if (updatedContent.includes('<!-- UB-AEO-GEO-CLUSTER-START -->')) {
    updatedContent = updatedContent.replace(
      /<!-- UB-AEO-GEO-CLUSTER-START -->[\s\S]*?<!-- UB-AEO-GEO-CLUSTER-END -->/,
      aeoGeoCallout.trim()
    );
  } else {
    // Insert before closing tags or at the end of article
    updatedContent = updatedContent + '\n' + aeoGeoCallout.trim();
  }

  // Update meta keywords & focus keyword naturally
  let currentMetaKw = (blog.meta_keywords || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!currentMetaKw.includes(primaryKw)) {
    currentMetaKw.unshift(primaryKw);
  }
  if (!currentMetaKw.includes(secondaryKw)) {
    currentMetaKw.push(secondaryKw);
  }
  // Keep max 8 distinct keywords
  const finalMetaKw = [...new Set(currentMetaKw)].slice(0, 8).join(', ');

  // Update focus keyword if empty or default
  const finalFocusKw = blog.focus_keyword ? blog.focus_keyword : primaryKw;

  modifiedCount++;

  return {
    ...blog,
    content: updatedContent,
    meta_keywords: finalMetaKw,
    focus_keyword: finalFocusKw,
    updated_at: new Date().toISOString()
  };
});

console.log(`\n========================================`);
console.log(`Total blogs analyzed: ${rawBlogs.length}`);
console.log(`Total blogs enriched with AEO/GEO & Keywords: ${modifiedCount}`);
console.log(`========================================`);
console.log(`Cluster Distribution:`);
for (const [cl, cnt] of Object.entries(clusterKeywordUsage)) {
  console.log(` - ${cl.padEnd(15)}: ${cnt} blogs`);
}

// Check arguments for commit vs dry run
const isDryRun = process.argv.includes('--dry-run');
if (isDryRun) {
  console.log(`\n[DRY RUN] No files were overwritten. Pass without --dry-run to commit.`);
} else {
  fs.writeFileSync(BLOGS_FILE, JSON.stringify(processedBlogs, null, 2), 'utf8');
  console.log(`\n[SUCCESS] Successfully committed updates to ${BLOGS_FILE}!`);
}
