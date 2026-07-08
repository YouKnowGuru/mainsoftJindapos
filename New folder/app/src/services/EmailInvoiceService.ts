import { shell } from 'electron';
import { PrintInvoiceData } from '../types';

export class EmailInvoiceService {
  /**
   * Open default email client with professional invoice details
   */
  sendInvoiceViaEmail(customerEmail: string, data: PrintInvoiceData): boolean {
    try {
      const nu = (v: number) => `Nu. ${v.toFixed(2)}`;
      
      const subject = encodeURIComponent(`Invoice ${data.invoiceNo} from ${data.businessName}`);
      
      // Construct a professional text-based invoice body
      let bodyText = `Dear ${data.customerName || 'Customer'},\n\n`;
      bodyText += `Please find the details of your invoice below:\n\n`;
      
      // Business Header
      bodyText += `-------------------------------------------\n`;
      bodyText += `${data.businessName.toUpperCase()}\n`;
      if (data.taxNo) bodyText += `TPN/GST: ${data.taxNo}\n`;
      if (data.businessAddress) bodyText += `Address: ${data.businessAddress}\n`;
      if (data.businessPhone) bodyText += `Phone: ${data.businessPhone}\n`;
      bodyText += `-------------------------------------------\n\n`;
      
      // Invoice Info
      bodyText += `INVOICE NO: ${data.invoiceNo}\n`;
      bodyText += `DATE: ${data.date}\n`;
      bodyText += `PAYMENT: ${data.paymentMode.toUpperCase()}\n\n`;
      
      // Items Table Header
      bodyText += `${'ITEM'.padEnd(25)} ${'QTY'.padStart(5)} ${'TOTAL'.padStart(12)}\n`;
      bodyText += `${'-'.repeat(44)}\n`;
      
      // Items List
      data.items.forEach(item => {
        const desc = item.description.length > 24 ? item.description.substring(0, 21) + '...' : item.description;
        bodyText += `${desc.padEnd(25)} ${item.quantity.toString().padStart(5)} ${nu(item.total).padStart(12)}\n`;
      });
      
      bodyText += `${'-'.repeat(44)}\n`;
      
      // Totals
      bodyText += `${'SUBTOTAL:'.padEnd(31)} ${nu(data.subtotal).padStart(12)}\n`;
      if (data.discountAmount > 0) {
        bodyText += `${'DISCOUNT:'.padEnd(31)} ${nu(data.discountAmount).padStart(12)}\n`;
      }
      bodyText += `${'GST TOTAL:'.padEnd(31)} ${nu(data.gstAmount).padStart(12)}\n`;
      bodyText += `${'GRAND TOTAL:'.padEnd(31)} ${nu(data.totalAmount).padStart(12)}\n\n`;
      
      if (data.notes) {
        bodyText += `NOTES: ${data.notes}\n\n`;
      }
      
      bodyText += `Thank you for choosing ${data.businessName}!\n`;
      bodyText += `-------------------------------------------`;

      const mailtoUrl = `mailto:${customerEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
      shell.openExternal(mailtoUrl);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * Generate a simple HTML invoice for printing/emailing (Optional use for future)
   */
  generateInvoiceHTML(data: any): string {
    return `
      <div style="font-family:system-ui;max-width:700px;margin:0 auto;padding:40px">
        <div style="text-align:center;border-bottom:2px solid #9B2335;padding-bottom:20px;margin-bottom:30px">
          <h1 style="color:#9B2335;margin:0">${data.businessName || 'Jinda'}</h1>
          <p style="color:#64748b;margin:5px 0">Invoice: ${data.invoiceNo}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:30px">
          <div><strong>Bill To:</strong><br>${data.customerName || 'Cash Customer'}<br>${data.customerAddress || ''}</div>
          <div style="text-align:right"><strong>Date:</strong> ${data.date}<br><strong>Payment:</strong> ${data.paymentMode}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead><tr style="background:#f8fafc"><th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0">Item</th><th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0">Qty</th><th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0">Price</th><th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0">GST</th><th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0">Total</th></tr></thead>
          <tbody>${(data.items || []).map((item: any) => `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9">${item.description || item.name}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9">${item.quantity}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9">${item.unitPrice.toFixed(2)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9">${item.gstAmount?.toFixed(2) || '0.00'}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9">${item.total.toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>
        <div style="text-align:right;font-size:20px;font-weight:700;color:#9B2335">Total: Nu. ${data.totalAmount?.toFixed(2) || '0.00'}</div>
        <p style="text-align:center;color:#94a3b8;margin-top:40px;font-size:12px">Thank you for your business!</p>
      </div>
    `;
  }
}
