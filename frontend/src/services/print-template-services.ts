import { apiClient } from "@/lib/api-client";

export interface PrintTemplate {
  id: string;
  documentType: number; // 1: TaxInvoice, 2: POSReceipt, 3: Quotation, 4: DeliveryChallan, 5: PurchaseOrder, 6: PaymentReceipt, 7: BarcodeLabel
  templateName: string;
  templateCode: string;
  pageSize: number; // 1: A4 Portrait, 2: A4 Landscape, 3: A5, 4: Thermal 80mm, 5: Thermal 58mm, 6: Barcode 50x25mm
  isDefault: boolean;
  primaryColorHex: string;
  secondaryColorHex: string;
  fontFamily: string;
  showLogo: boolean;
  logoUrl?: string;
  headerTitle: string;
  headerSubtitle?: string;
  showGstin: boolean;
  showDrugLicense: boolean;
  showFssai: boolean;
  showBankDetails: boolean;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  showUpiQr: boolean;
  upiId?: string;
  showItemHsn: boolean;
  showBatchExpiry: boolean;
  showMrpStrikethrough: boolean;
  showSavingsCallout: boolean;
  showLoyaltyPoints: boolean;
  showCustomerBalance: boolean;
  showTerms: boolean;
  termsAndConditions?: string;
  showDeclaration: boolean;
  declarationText?: string;
  footerGreeting?: string;
  languageCode: string;
  customLabelsJson: string;
  customCss?: string;
  htmlTemplateBody?: string;
  isActive: boolean;
}

export interface RenderPrintPreviewResult {
  templateName: string;
  pageSize: number;
  renderedHtml: string;
  customCss: string;
}

export const printTemplateService = {
  async getTemplates(documentType?: number): Promise<PrintTemplate[]> {
    const query = documentType !== undefined ? `?documentType=${documentType}` : "";
    const response = await apiClient.get<PrintTemplate[]>(`/tenant/print-templates${query}`);
    return response.data;
  },

  async getTemplateById(id: string): Promise<PrintTemplate> {
    const response = await apiClient.get<PrintTemplate>(`/tenant/print-templates/${id}`);
    return response.data;
  },

  async createTemplate(input: Partial<PrintTemplate>): Promise<string> {
    const response = await apiClient.post<string>("/tenant/print-templates", input);
    return response.data;
  },

  async updateTemplate(id: string, input: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const response = await apiClient.put<PrintTemplate>(`/tenant/print-templates/${id}`, input);
    return response.data;
  },

  async setDefaultTemplate(id: string, documentType?: number): Promise<boolean> {
    const query = documentType !== undefined ? `?documentType=${documentType}` : "";
    const response = await apiClient.post<boolean>(`/tenant/print-templates/${id}/set-default${query}`, {});
    return response.data;
  },

  async renderPreview(input: { templateId?: string; invoiceId?: string; documentType?: number }): Promise<RenderPrintPreviewResult> {
    const response = await apiClient.post<RenderPrintPreviewResult>("/tenant/print-templates/preview", input);
    return response.data;
  },
};
