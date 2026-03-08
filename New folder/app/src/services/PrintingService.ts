import type { PrintInvoiceData, PrintReceiptData, ApiResponse } from '../types';

export type InvoiceTemplate = 'standard' | 'modern' | 'professional' | 'thermal';

/**
 * PrintingService - Handles invoice and receipt printing
 * Supports both A4 invoices and 80mm thermal receipts
 */
export class PrintingService {
  constructor() {
    // Initialize printer settings
  }

  /**
   * Get available printers
   */
  getPrinters(): string[] {
    // In a real implementation, this would use electron's webContents.getPrinters()
    // For now, return default options
    return ['Default Printer', 'Thermal Printer', 'PDF'];
  }

  /**
   * Print A4 invoice
   */
  printInvoice(data: PrintInvoiceData, template: InvoiceTemplate = 'standard'): ApiResponse {
    try {
      const html = this.generateA4InvoiceHTML(data, template);

      // In a real implementation, this would send to printer via Electron's webContents.print()
      console.log(`Printing A4 Invoice (${template}):`, data.invoiceNo);

      // Store the HTML for printing
      (global as any).lastPrintHTML = html;

      return { success: true, message: 'Invoice sent to printer' };
    } catch (error: any) {
      console.error('Print invoice error:', error);
      return { success: false, message: 'Failed to print invoice: ' + error.message };
    }
  }

  /**
   * Print 80mm thermal receipt
   */
  printThermalReceipt(data: PrintReceiptData): ApiResponse {
    try {
      const html = this.generateThermalReceiptHTML(data);

      console.log('Printing Thermal Receipt:', data.invoiceNo);

      // Store the HTML for printing
      (global as any).lastPrintHTML = html;

      return { success: true, message: 'Receipt sent to thermal printer' };
    } catch (error: any) {
      console.error('Print receipt error:', error);
      return { success: false, message: 'Failed to print receipt: ' + error.message };
    }
  }

  /**
   * Print a generic report
   */
  printReport(title: string, contentHtml: string, businessInfo?: Record<string, string>): ApiResponse {
    try {
      const html = this.generateReportHTML(title, contentHtml, businessInfo || {});

      console.log('Printing Report:', title);
      (global as any).lastPrintHTML = html;

      return { success: true, message: 'Report sent to printer' };
    } catch (error: any) {
      console.error('Print report error:', error);
      return { success: false, message: 'Failed to print report: ' + error.message };
    }
  }

  /**
   * Generate preview HTML
   */
  generatePreviewHTML(data: PrintInvoiceData, template: InvoiceTemplate): string {
    if (template === 'thermal') {
      const receiptData: PrintReceiptData = {
        invoiceNo: data.invoiceNo,
        date: data.date,
        businessName: data.businessName,
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        subtotal: data.subtotal,
        gstAmount: data.gstAmount,
        total: data.totalAmount,
        paymentMode: data.paymentMode,
        isDuplicate: data.isDuplicate
      };
      return this.generateThermalReceiptHTML(receiptData);
    }
    return this.generateA4InvoiceHTML(data, template);
  }

  private generateReportHTML(title: string, contentHtml: string, biz: Record<string, string>): string {
    const companyName = biz.company_name || 'My Business';
    const address = biz.address || '';
    const phone = biz.phone || '';
    const email = biz.email || '';
    const taxNo = biz.tax_no || '';
    const logo = biz.company_logo || '';

    const logoHtml = logo ? `<img src="${logo}" style="max-height:45px;max-width:90px;object-fit:contain;" alt="Logo">` : '';
    const contactParts: string[] = [];
    if (phone) contactParts.push(`Phone: ${phone}`);
    if (email) contactParts.push(`Email: ${email}`);
    if (taxNo) contactParts.push(`GSTIN: ${taxNo}`);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    /* CRITICAL: margin:0 on @page removes the default Windows headers/footers */
    @page { size: A4; margin: 0; }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 11px; 
      line-height: 1.4; 
      color: #1e293b; 
      padding: 10mm; 
      background: white;
      -webkit-print-color-adjust: exact;
    }
    
    .company-banner {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .company-banner td { vertical-align: middle; }
    .company-name { font-size: 18px; font-weight: 800; color: #10b981; text-transform: uppercase; }
    .company-info { font-size: 9px; color: #64748b; margin-top: 2px; }
    
    .report-header { 
      margin-bottom: 25px; 
      border-bottom: 4px solid #9e1b32; 
      padding-bottom: 12px; 
      display: table;
      width: 100%;
    }
    
    .report-title { 
      font-size: 18px; 
      font-weight: 800; 
      color: #0f172a;
      display: table-cell;
      vertical-align: bottom;
    }
    
    .print-info { 
      display: table-cell;
      text-align: right;
      vertical-align: bottom;
      font-size: 9px; 
      color: #64748b; 
    }
    
    /* Table Styling for Reports */
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
    th { 
      background-color: #f8fafc; 
      border-bottom: 2px solid #e2e8f0; 
      padding: 6px 6px; 
      text-align: left; 
      font-weight: 700; 
      color: #475569;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td { border-bottom: 1px solid #f1f5f9; padding: 5px 6px; word-break: break-word; }
    tr:nth-child(even) { background-color: #fbfcfd; }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .text-emerald { color: #10b981; }
    
    .report-footer { 
      margin-top: 20px; 
      font-size: 8px; 
      text-align: center; 
      color: #94a3b8; 
      border-top: 1px solid #f1f5f9; 
      padding-top: 8px; 
    }
    
    /* Summary Sections */
    .summary-grid { display: table; width: 100%; margin-bottom: 10px; border-spacing: 8px; }
    .summary-card { display: table-cell; background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981; }
    .summary-label { font-size: 8px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .summary-value { font-size: 16px; font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <table class="company-banner">
    <tr>
      <td style="width: 80px;">${logoHtml}</td>
      <td ${logo ? '' : 'colspan="2"'}>
        <div class="company-name">${companyName}</div>
        <div class="company-info">
          ${address ? address + '<br>' : ''}
          ${contactParts.join(' | ')}
        </div>
      </td>
    </tr>
  </table>

  <div class="report-header">
    <div class="report-title">${title}</div>
    <div class="print-info">
      Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
    </div>
  </div>
  
  <div class="content-wrapper">
    ${contentHtml}
  </div>
  
  <div class="report-footer">
    <p>© ${new Date().getFullYear()} ${companyName} | Powered by Dhisum Tseyig</p>
  </div>
</body>
</html>`;
  }


  /**
   * Generate A4 invoice HTML
   */
  private generateA4InvoiceHTML(data: PrintInvoiceData, template: InvoiceTemplate = 'standard'): string {
    const duplicateMark = data.isDuplicate ?
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:72px;color:rgba(255,0,0,0.12);border:5px solid rgba(255,0,0,0.12);padding:20px;z-index:0;pointer-events:none;">DUPLICATE</div>' : '';

    if (template === 'modern') {
      return this.generateModernTemplate(data, duplicateMark);
    }

    if (template === 'professional') {
      return this.generateProfessionalTemplate(data, duplicateMark);
    }

    // ---- STANDARD TEMPLATE ----

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    /* CRITICAL: margin:0 on @page removes the default Windows headers/footers (file path, date, etc) */
    @page { size: A4; margin: 0; }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.5; 
      color: #1a1a1a; 
      /* We add padding here instead of @page margin to keep content away from edges without triggering headers */
      padding: 15mm 15mm; 
      background: white;
      -webkit-print-color-adjust: exact;
    }
    
    .invoice-container { width: 100%; position: relative; }
    
    /* Modern Header */
    .top-section { margin-bottom: 40px; }
    .header-table { width: 100%; border-collapse: collapse; }
    .company-name { font-size: 26px; font-weight: 800; color: #9e1b32; text-transform: uppercase; margin-bottom: 4px; }
    .company-tagline { font-size: 10px; color: #d97706; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .company-info { font-size: 9px; color: #444; }
    
    .invoice-title-cell { text-align: right; vertical-align: top; }
    .invoice-title { font-size: 32px; font-weight: 900; color: #e5e7eb; letter-spacing: 2px; line-height: 1; }
    .invoice-no { font-size: 14px; font-weight: 700; color: #333; margin-top: 5px; }
    
    /* Info Grid */
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .details-cell { padding: 10px 0; vertical-align: top; width: 50%; }
    .label { font-size: 9px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .value { font-size: 11px; color: #333; }
    
    /* Premium Table */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { 
      background: #fafafa; 
      color: #1e293b; 
      text-align: left; 
      padding: 14px 10px; 
      font-size: 9px; 
      font-weight: 900;
      text-transform: uppercase; 
      letter-spacing: 1px;
      border-bottom: 3px solid #9e1b32; 
    }
    .items-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .items-table tr:last-child td { border-bottom: none; }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    
    /* Totals */
    .summary-table-wrap { width: 100%; }
    .summary-table { width: 40%; margin-left: auto; border-collapse: collapse; }
    .summary-table td { padding: 6px 10px; font-size: 11px; }
    .summary-label { text-align: left; color: #64748b; }
    .summary-value { text-align: right; font-weight: 600; }
    
    .grand-total-row td { 
      padding-top: 20px; 
      border-top: 3px solid #9e1b32; 
      font-size: 18px; 
      font-weight: 900; 
      color: #9e1b32; 
    }
    
    /* Footer */
    .bottom-section { margin-top: 50px; }
    .notes-box { width: 55%; font-size: 10px; color: #64748b; line-height: 1.6; }
    
    .signatures-table { width: 100%; margin-top: 60px; }
    .sig-cell { width: 50%; text-align: center; }
    .sig-line { width: 180px; border-top: 1px solid #cbd5e1; margin: 0 auto; padding-top: 8px; font-size: 10px; color: #64748b; }
    
    .power-footer { text-align: center; margin-top: 40px; font-size: 9px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="invoice-container">
    ${duplicateMark}
    
    <div class="top-section">
      <table class="header-table">
        <tr>
          <td>
            <table style="border-collapse:collapse;"><tr>
              ${data.businessLogo ? `<td style="vertical-align:middle;padding-right:15px;"><img src="${data.businessLogo}" style="max-height:55px;max-width:100px;object-fit:contain;" alt="Logo"></td>` : ''}
              <td style="vertical-align:middle;">
                <div class="company-name">${data.businessName}</div>
                ${data.businessTagline ? `<div class="company-tagline">${data.businessTagline}</div>` : ''}
                <div class="company-info">
                  ${data.businessAddress}<br>
                  Phone: ${data.businessPhone} | Email: ${data.businessEmail}<br>
                  ${data.taxNo ? `GSTIN: ${data.taxNo}` : ''} ${data.tradeLicenseNo ? `| License: ${data.tradeLicenseNo}` : ''}
                </div>
              </td>
            </tr></table>
          </td>
          <td class="invoice-title-cell">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-no">#${data.invoiceNo}</div>
            <div style="font-size:11px;color:#666;margin-top:4px;">Date: ${data.date}</div>
          </td>
        </tr>
      </table>
    </div>

    <table class="details-table">
      <tr>
        <td class="details-cell">
          <div class="label">Billed To</div>
          <div class="value">
            <strong style="font-size:13px;">${data.customerName || 'Cash Customer'}</strong><br>
            ${data.customerAddress ? `${data.customerAddress}<br>` : ''}
            ${data.customerPhone ? `Ph: ${data.customerPhone}<br>` : ''}
            ${data.customerGst ? `GSTIN: ${data.customerGst}` : ''}
          </div>
        </td>
        <td class="details-cell" style="text-align:right;">
          <div class="label">Payment Details</div>
          <div class="value">
            Status: <strong style="color:${data.balanceDue > 0 ? '#ef4444' : '#10b981'};text-transform:uppercase;">${data.balanceDue > 0 ? 'Unpaid' : 'Paid'}</strong><br>
            Mode: ${data.paymentMode}<br>
            Time: ${new Date().toLocaleTimeString()}
          </div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px;" class="text-center">#</th>
          <th>Description</th>
          <th style="width:60px;" class="text-center">Qty</th>
          <th style="width:90px;" class="text-right">Price</th>
          <th style="width:90px;" class="text-right">GST</th>
          <th style="width:100px;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, i) => `
        <tr>
          <td class="text-center" style="color:#64748b;">${i + 1}</td>
          <td>
            <div class="font-bold">${item.description}</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:2px;">GST ${item.gstRate}%</div>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${item.unitPrice.toFixed(2)}</td>
          <td class="text-right">${item.gstAmount.toFixed(2)}</td>
          <td class="text-right font-bold">${item.total.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top;">
          <div class="notes-box">
            <div class="label">Notes & Terms</div>
            <div>${data.notes || 'Thank you for your business!'}</div>
            <div style="margin-top:8px;">${data.terms || 'Goods once sold cannot be returned.'}</div>
          </div>
        </td>
        <td style="vertical-align:top;width:40%;">
          <table class="summary-table">
            <tr>
              <td class="summary-label">Subtotal</td>
              <td class="summary-value">Nu. ${data.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="summary-label">GST Total</td>
              <td class="summary-value">Nu. ${data.gstAmount.toFixed(2)}</td>
            </tr>
            ${data.discountAmount > 0 ? `<tr><td class="summary-label">Discount</td><td class="summary-value" style="color:#ef4444;">- Nu. ${data.discountAmount.toFixed(2)}</td></tr>` : ''}
            <tr class="grand-total-row">
              <td class="summary-label" style="color:#10b981;">Total Amount</td>
              <td class="summary-value">Nu. ${data.totalAmount.toFixed(2)}</td>
            </tr>
            ${data.balanceDue > 0 ? `
            <tr>
              <td class="summary-label">Amount Paid</td>
              <td class="summary-value">Nu. ${data.amountPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="summary-label" style="color:#ef4444;font-weight:900;">Balance Due</td>
              <td class="summary-value" style="color:#ef4444;font-weight:900;">Nu. ${data.balanceDue.toFixed(2)}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <table class="signatures-table">
      <tr>
        <td class="sig-cell">
          <div class="sig-line">Authorized Signatory</div>
        </td>
        <td class="sig-cell">
          <div class="sig-line">Customer Signature</div>
        </td>
      </tr>
    </table>

    <div class="power-footer">
      Generated by Dhisum Tseyig Cloud POS & Accounting
    </div>
  </div>
</body>
</html>`;
  }

  private generateModernTemplate(data: PrintInvoiceData, duplicateMark: string): string {

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', -apple-system, sans-serif; 
      color: #1a1a1a; 
      line-height: 1.5; 
      font-size: 11px; 
      padding: 15mm;
      background: #fff;
    }
    .modern-container { width: 100%; border-left: 12px solid #9e1b32; padding-left: 30px; }
    
    .header-row { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .biz-cell { vertical-align: top; width: 60%; }
    .inv-cell { vertical-align: top; text-align: right; width: 40%; }
    
    .biz-name { font-size: 32px; color: #9e1b32; font-weight: 900; line-height: 1; margin-bottom: 5px; text-transform: uppercase; }
    .invoice-label { font-size: 56px; font-weight: 900; color: #f8fafc; line-height: 0.8; letter-spacing: -3px; }
    
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-cell { width: 50%; vertical-align: top; padding: 15px 0; }
    .label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { text-align: left; padding: 12px 10px; background: #f8fafc; color: #475569; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .items-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    
    .totals-area { width: 100%; border-collapse: collapse; }
    .totals-box { width: 45%; background: #9e1b32; padding: 25px; border-radius: 24px; color: white; box-shadow: 0 20px 40px -10px rgba(158, 27, 50, 0.3); }
    .total-row { border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px; margin-top: 15px; font-size: 24px; font-weight: 900; color: #fcd34d; }
    
    .footer { margin-top: 60px; color: #94a3b8; font-size: 10px; line-height: 1.6; }
    .power-by { text-align: center; margin-top: 40px; font-size: 9px; color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="modern-container">
    ${duplicateMark}
    <table class="header-row">
      <tr>
        <td class="biz-cell">
          <table style="border-collapse:collapse;"><tr>
            ${data.businessLogo ? `<td style="vertical-align:middle;padding-right:15px;"><img src="${data.businessLogo}" style="max-height:55px;max-width:100px;object-fit:contain;" alt="Logo"></td>` : ''}
            <td style="vertical-align:middle;">
              <div class="biz-name">${data.businessName}</div>
              <div style="font-size:11px;color:#64748b;">${data.businessTagline || ''}</div>
              <div style="margin-top:10px;font-size:10px;color:#475569;">
                ${data.businessAddress}<br>
                ${data.taxNo ? `GSTIN: ${data.taxNo}` : ''}
              </div>
            </td>
          </tr></table>
        </td>
        <td class="inv-cell">
          <div class="invoice-label">INVOICE</div>
          <div style="font-size:16px;font-weight:700;margin-top:5px;">#${data.invoiceNo}</div>
          <div style="color:#64748b;">${data.date}</div>
        </td>
      </tr>
    </table>

    <table class="info-table">
      <tr>
        <td class="info-cell">
          <div class="label">Billed To</div>
          <div style="font-size:14px;font-weight:700;">${data.customerName || 'Cash Customer'}</div>
          <div style="color:#475569;margin-top:2px;">${data.customerAddress || ''}</div>
        </td>
        <td class="info-cell" style="text-align:right;">
          <div class="label">Payment Status</div>
          <div style="display:inline-block;padding:4px 12px;background:${data.balanceDue > 0 ? '#fee2e2' : '#dcfce7'};color:${data.balanceDue > 0 ? '#991b1b' : '#166534'};border-radius:20px;font-weight:700;font-size:10px;">${data.balanceDue > 0 ? 'UNPAID / CREDIT' : 'FULLY PAID'}</div>
          <div style="margin-top:5px;font-size:11px;">via ${data.paymentMode}</div>
          ${data.balanceDue > 0 ? `<div style="font-size:10px;color:#ef4444;font-weight:bold;margin-top:2px;">BAL DUE: Nu. ${data.balanceDue.toFixed(2)}</div>` : ''}
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="width:70px;text-align:center;">Qty</th>
          <th style="width:100px;text-align:right;">Price</th>
          <th style="width:100px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(i => `
        <tr>
          <td>
            <div style="font-weight:700;">${i.description}</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:2px;">GST ${i.gstRate}%</div>
          </td>
          <td style="text-align:center;">${i.quantity}</td>
          <td style="text-align:right;">${i.unitPrice.toFixed(2)}</td>
          <td style="text-align:right;font-weight:700;">${i.total.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top;padding-top:20px;">
          <div class="label">Total in Words</div>
          <div style="font-style:italic;color:#64748b;">Amount successfully received</div>
        </td>
        <td style="width:40%;vertical-align:top;">
          <div class="totals-box">
            <div style="display:table;width:100%;margin-bottom:8px;">
              <div style="display:table-cell;color:#64748b;">Subtotal</div>
              <div style="display:table-cell;text-align:right;">${data.subtotal.toFixed(2)}</div>
            </div>
            <div style="display:table;width:100%;margin-bottom:8px;">
              <div style="display:table-cell;color:#64748b;">GST Total</div>
              <div style="display:table-cell;text-align:right;">${data.gstAmount.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div style="display:table-cell;">Total</div>
              <div style="display:table-cell;text-align:right;">Nu. ${data.totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <div class="footer">
      <div class="label">Notes & Terms</div>
      <div>${data.notes || 'Thank you for choosing us!'}</div>
      <div style="margin-top:5px;">${data.terms || ''}</div>
    </div>
    
    <div class="power-by">Powered by Dhisum Tseyig Cloud Accounting</div>
  </div>
</body>
</html>`;
  }

  private generateProfessionalTemplate(data: PrintInvoiceData, duplicateMark: string): string {

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      color: #000; 
      line-height: 1.5; 
      font-size: 12px; 
      padding: 20mm;
      background: #fff;
    }
    .wrapper { width: 100%; border: 1px solid #000; padding: 30px; }
    
    .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; text-transform: uppercase; }
    .subtitle { font-size: 28px; font-weight: 200; text-align: right; }
    
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-cell { width: 50%; vertical-align: top; }
    .section-head { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 10px; padding-bottom: 2px; text-transform: uppercase; font-size: 10px; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { border: 1px solid #000; background: #eee; padding: 8px; text-align: left; text-transform: uppercase; font-size: 10px; }
    .items-table td { border: 1px solid #000; padding: 8px; }
    
    .totals-table { width: 40%; margin-left: auto; border-collapse: collapse; }
    .totals-table td { border: 1px solid #000; padding: 8px; }
    .grand-total { background: #eee; font-weight: bold; font-size: 14px; }
    
    .sig-table { width: 100%; margin-top: 80px; }
    .sig-line { border-top: 1px solid #000; width: 180px; margin: 0 auto; padding-top: 5px; text-align: center; font-size: 10px; }
  </style>
</head>
<body>
  <div class="wrapper">
    ${duplicateMark}
    <table class="header-table">
      <tr>
        <td>
          <table style="border-collapse:collapse;"><tr>
            ${data.businessLogo ? `<td style="vertical-align:middle;padding-right:15px;"><img src="${data.businessLogo}" style="max-height:50px;max-width:90px;object-fit:contain;" alt="Logo"></td>` : ''}
            <td style="vertical-align:middle;">
              <div class="title">${data.businessName}</div>
              <div style="font-size:10px;">${data.businessAddress}</div>
            </td>
          </tr></table>
        </td>
        <td class="subtitle">INVOICE</td>
      </tr>
    </table>

    <table class="info-table">
      <tr>
        <td class="info-cell">
          <div class="section-head">Billed To</div>
          <strong>${data.customerName || 'Cash Customer'}</strong><br>
          ${data.customerAddress || ''}
        </td>
        <td class="info-cell" style="text-align:right;">
          <div class="section-head">Invoice Details</div>
          <strong>No: ${data.invoiceNo}</strong><br>
          Date: ${data.date}<br>
          GSTIN: ${data.taxNo || 'N/A'}
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="width:60px;text-align:center;">Qty</th>
          <th style="width:100px;text-align:right;">Unit Price</th>
          <th style="width:110px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(i => `
        <tr>
          <td>${i.description} (GST ${i.gstRate}%)</td>
          <td style="text-align:center;">${i.quantity}</td>
          <td style="text-align:right;">${i.unitPrice.toFixed(2)}</td>
          <td style="text-align:right;">${i.total.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Subtotal</td>
        <td style="text-align:right;">${data.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>GST Total</td>
        <td style="text-align:right;">${data.gstAmount.toFixed(2)}</td>
      </tr>
      <tr class="grand-total">
        <td>Grand Total</td>
        <td style="text-align:right;">Nu. ${data.totalAmount.toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-top:40px;font-size:11px;">
      <div class="section-head">Terms & Notes</div>
      <div>${data.notes || ''}</div>
      <div>${data.terms || ''}</div>
    </div>

    <table class="sig-table">
      <tr>
        <td style="text-align:center;"><div class="sig-line">Customer Signature</div></td>
        <td style="text-align:center;"><div class="sig-line">Authorized Signatory</div></td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  }

  /**
   * Generate 80mm thermal receipt HTML
   */
  private generateThermalReceiptHTML(data: PrintReceiptData): string {
    const duplicateMark = data.isDuplicate ?
      '<div style="text-align:center;font-size:14px;color:red;border:2px solid red;padding:5px;margin:10px 0;">*** DUPLICATE ***</div>' : '';

    const itemsHtml = data.items.map(item => `
      <div style="margin:5px 0;">
        <div style="font-weight:bold;">${item.description}</div>
        <table style="width:100%;font-size:12px;">
          <tr>
            <td>${item.quantity} x ${item.price.toFixed(2)}</td>
            <td style="text-align:right;">${(item.quantity * item.price).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${data.invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 13px; 
      width: 74mm;
      margin: 0;
      padding: 5mm;
      color: #000;
    }
    .center { text-align: center; }
    .business-name { font-size: 20px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; }
    .divider { border-top: 2px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 2px solid #000; margin: 8px 0; }
    .total { font-size: 18px; font-weight: 900; }
    .row-table { width: 100%; border-collapse: collapse; }
    .gst-breakdown { font-size: 11px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="business-name">${data.businessName}</div>
    <div style="font-size:11px;">GST RECEIPT</div>
  </div>
  <div class="divider"></div>
  <table class="row-table">
    <tr><td>INV: ${data.invoiceNo}</td><td style="text-align:right;">${data.date}</td></tr>
  </table>
  <div class="divider"></div>
  ${itemsHtml}
  <div class="divider"></div>
  <table class="row-table">
    <tr><td>Subtotal:</td><td style="text-align:right;">${data.subtotal.toFixed(2)}</td></tr>
    <tr><td>Total GST:</td><td style="text-align:right;">${data.gstAmount.toFixed(2)}</td></tr>
  </table>
  <div class="double-divider"></div>
  <table class="row-table total">
    <tr><td>TOTAL:</td><td style="text-align:right;">Nu. ${data.total.toFixed(2)}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="row-table">
    <tr><td>Payment:</td><td style="text-align:right;">${data.paymentMode.toUpperCase()}</td></tr>
    ${data.total > 0 && data.paymentMode === 'credit' ? `
    <tr style="color:red;"><td>STATUS:</td><td style="text-align:right;">UNPAID</td></tr>
    <tr style="font-weight:bold;"><td>BAL DUE:</td><td style="text-align:right;">Nu. ${data.total.toFixed(2)}</td></tr>
    ` : `<tr><td>STATUS:</td><td style="text-align:right;">PAID</td></tr>`}
  </table>
  ${duplicateMark}
  <div class="center" style="margin-top:15px; font-size:11px;">
    <div>Thank You! Please visit again.</div>
    <div>Software by Dhisum Tseyig</div>
  </div>
</body>
</html>`;
  }
}
