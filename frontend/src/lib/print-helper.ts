export function printRawHtml(
  htmlContent: string,
  title: string = "Tax Invoice",
  pageSize: "A4 portrait" | "A5 landscape" | "thermal80" | "thermal58" | "auto" = "A4 portrait",
  margin: string = "4mm 5mm"
) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  let pageCss = `@page { size: A4 portrait; margin: ${margin || "4mm 5mm"}; }`;
  if (pageSize === "A5 landscape") {
    pageCss = `@page { size: A5 landscape; margin: ${margin || "3mm 4mm"}; }`;
  } else if (pageSize === "thermal80") {
    pageCss = `@page { size: 80mm auto; margin: ${margin || "2mm"}; }`;
  } else if (pageSize === "thermal58") {
    pageCss = `@page { size: 58mm auto; margin: ${margin || "1mm"}; }`;
  }

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
                background-color: #ffffff;
              }
              .invoice-container, .invoice-wrapper, .cbo-invoice-wrap {
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

    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
    }

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print execution failed:", err);
      } finally {
        // Fallback cleanup if user cancels or browser doesn't fire onafterprint
        setTimeout(cleanup, 15000);
      }
    }, 400);
  }
}

// ─── PHASE 20A: TRANSPARENT ERROR & USER FEEDBACK ENGINE ──────────────
export interface AppErrorDetails {
  title: string;
  whatFailed: string;
  whyItFailed: string;
  whereItOccurred: string;
  whatToDoNext: string;
  transactionStatus: "NOT_COMMITTED" | "ROLLED_BACK" | "PARTIALLY_SAVED" | "SAVED" | "UNKNOWN";
  category: "NETWORK_ERROR" | "AUTHENTICATION_ERROR" | "AUTHORIZATION_ERROR" | "VALIDATION_ERROR" | "BUSINESS_RULE_ERROR" | "NOT_FOUND" | "CONFLICT" | "DATABASE_ERROR" | "TRANSACTION_ERROR" | "SERVER_ERROR" | "TIMEOUT" | "UNKNOWN_ERROR";
  correlationId: string;
  retryable: boolean;
  fieldErrors?: Record<string, string[]>;
}

export function parseAppError(error: any, defaultContext: string = "Operation"): AppErrorDetails {
  if (typeof window !== "undefined" && !navigator.onLine) {
    return {
      title: "Internet Connection Lost",
      whatFailed: `${defaultContext} could not reach the server.`,
      whyItFailed: "Your device is currently offline. No network packets could be delivered.",
      whereItOccurred: "Browser Network Layer",
      whatToDoNext: "Check your Wi-Fi or mobile data connection and try again.",
      transactionStatus: "NOT_COMMITTED",
      category: "NETWORK_ERROR",
      correlationId: `UB-OFF-${Date.now().toString().slice(-6)}`,
      retryable: true
    };
  }

  const response = error?.response;
  const data = response?.data;
  const status = response?.status;

  const correlationId = data?.correlationId || response?.headers?.["x-correlation-id"] || `UB-ERR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const errorCode = data?.errorCode || data?.code || "UNKNOWN_ERROR";
  const rawMsg = data?.userMessage || data?.message || data?.error || error?.message || "An unexpected error occurred.";

  if (status === 401) {
    return {
      title: "Session Expired / Unauthorized",
      whatFailed: `${defaultContext} authentication failed.`,
      whyItFailed: "Your login session is either expired or invalid.",
      whereItOccurred: "Authentication Gateway",
      whatToDoNext: "Please log in again to continue your session.",
      transactionStatus: "NOT_COMMITTED",
      category: "AUTHENTICATION_ERROR",
      correlationId,
      retryable: false
    };
  }

  if (status === 403) {
    return {
      title: "Permission Denied",
      whatFailed: `${defaultContext} was blocked.`,
      whyItFailed: "Your user account does not have sufficient role permissions for this action.",
      whereItOccurred: "Security Authorization Policy",
      whatToDoNext: "Contact your business administrator to grant you access.",
      transactionStatus: "NOT_COMMITTED",
      category: "AUTHORIZATION_ERROR",
      correlationId,
      retryable: false
    };
  }

  if (status === 404) {
    return {
      title: "Record Not Found",
      whatFailed: `${defaultContext} target record was not found.`,
      whyItFailed: rawMsg || "The requested item, customer, or document does not exist in your tenant database.",
      whereItOccurred: "Data Persistence Layer",
      whatToDoNext: "Refresh the page or verify that the selected record was not deleted.",
      transactionStatus: "NOT_COMMITTED",
      category: "NOT_FOUND",
      correlationId,
      retryable: false
    };
  }

  if (status === 409) {
    return {
      title: "Duplicate / Conflict Detected",
      whatFailed: `${defaultContext} could not be saved.`,
      whyItFailed: rawMsg || "A conflicting record with identical unique fields (such as GSTIN, SKU, or Invoice #) already exists.",
      whereItOccurred: "Unique Constraint Validator",
      whatToDoNext: "Change the conflicting value or search for the existing record.",
      transactionStatus: "NOT_COMMITTED",
      category: "CONFLICT",
      correlationId,
      retryable: false
    };
  }

  if (status === 400) {
    return {
      title: "Validation / Business Rule Blocked",
      whatFailed: `${defaultContext} failed validation checks.`,
      whyItFailed: rawMsg || "One or more inputs did not meet the business accounting rules.",
      whereItOccurred: "Input Form & Accounting Rules",
      whatToDoNext: "Please correct the highlighted fields and resubmit.",
      transactionStatus: "NOT_COMMITTED",
      category: "VALIDATION_ERROR",
      correlationId,
      retryable: false,
      fieldErrors: data?.fieldErrors || data?.errors
    };
  }

  if (status >= 500) {
    return {
      title: "Server Transaction Error",
      whatFailed: `${defaultContext} could not be completed on the server.`,
      whyItFailed: rawMsg || "The database or server transaction failed. The system rolled back all changes.",
      whereItOccurred: "Database Transaction Manager",
      whatToDoNext: `No data was committed. You can safely retry. If the problem persists, share Error ID: ${correlationId} with support.`,
      transactionStatus: "ROLLED_BACK",
      category: "DATABASE_ERROR",
      correlationId,
      retryable: true
    };
  }

  return {
    title: "Action Could Not Complete",
    whatFailed: `${defaultContext} failed.`,
    whyItFailed: rawMsg,
    whereItOccurred: "Application Controller",
    whatToDoNext: "Review your parameters and try again.",
    transactionStatus: "NOT_COMMITTED",
    category: "UNKNOWN_ERROR",
    correlationId,
    retryable: true
  };
}

