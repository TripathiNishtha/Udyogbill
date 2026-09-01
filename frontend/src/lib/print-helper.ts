export function printRawHtml(
  htmlContent: string,
  title: string = "Tax Invoice",
  pageSize: "A4 portrait" | "A5 landscape" | "auto" = "A4 portrait",
  margin: string = "4mm 5mm"
) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const pageCss =
    pageSize === "A5 landscape"
      ? "@page { size: 210mm 148mm; margin: 3mm 4mm; }"
      : "@page { size: 210mm 297mm; margin: 4mm 5mm; }";

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            ${pageCss}
            *, *:before, *:after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body { 
              margin: 0 !important; 
              padding: 0 !important;
              width: 100% !important;
              background-color: #ffffff;
              color: #000000;
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
                overflow: hidden !important;
              }
              .invoice-container, .invoice-wrapper {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                max-height: 265mm !important;
                box-sizing: border-box !important;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 300);
  }
}
