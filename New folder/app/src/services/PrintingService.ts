import type { PrintInvoiceData, PrintReceiptData, ApiResponse } from '../types';
import { bhutanLocations } from '../data/bhutanLocations';

/**
 * Escape HTML special characters to prevent XSS in print templates.
 * Security: All user-controlled data must be escaped before HTML interpolation.
 */
function escapeHtml(text: string | number | undefined): string {
  if (text === undefined || text === null) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type InvoiceTemplate = 'standard' | 'modern' | 'professional' | 'thermal';

/**
 * Format a full address string from structured fields
 * Uses the raw name (not ID) for dzongkhag and gewog
 */
function formatFullAddress(
  street?: string,
  gewogId?: string,
  dzongkhagId?: string
): string {
  const parts: string[] = [];

  const safeStreet = street === 'null' || street === 'undefined' ? null : street;
  if (safeStreet?.trim()) parts.push(safeStreet.trim());

  // Resolve gewog name from ID
  if (gewogId && dzongkhagId) {
    const dz = bhutanLocations.find((d) => d.id === dzongkhagId);
    const gewog = dz?.gewogs.find((g) => g.id === gewogId);
    if (gewog && gewog.name !== 'null' && gewog.name !== 'undefined') parts.push(gewog.name);
  }

  // Resolve dzongkhag name from ID
  if (dzongkhagId) {
    const dz = bhutanLocations.find((d) => d.id === dzongkhagId);
    if (dz && dz.name !== 'null' && dz.name !== 'undefined') parts.push(dz.name);
  }

  parts.push('Bhutan');
  return parts.join(', ');
}

// ─── Bhutanese Palette ────────────────────────────────────────────────────────
const C = {
  crimson: '#9B2335',
  saffron: '#E8A020',
  saffronL: '#F5C842',
  gold: '#C49A25',
  goldL: '#F0D98A',
  slate: '#1E2B3C',
  navy: '#0F1C2D',
  sky: '#2E6DA4',
  skyL: '#D6E8F5',
  cream: '#FDF8F0',
  ash: '#F4EFE6',
  ash2: '#EBE5DA',
  white: '#FFFFFF',
  grey: '#64748B',
  greyL: '#94A3B8',
};

// ─── Prayer Flag Gradient (CSS only, no SVG) ──────────────────────────────────
const FLAG_BAR = `<div style="height:6px;background:linear-gradient(to right,#3A7BD5 0%,#3A7BD5 20%,#fff 20%,#fff 40%,${C.saffron} 40%,${C.saffron} 60%,#2EB85C 60%,#2EB85C 80%,#E53935 80%,#E53935 100%);"></div>`;

// ─── Shared @page CSS — suppresses file path in Chromium print ─────────────────
const PAGE_CSS = `
  @page { size: A4 portrait; margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; background: #fff; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: ${C.slate}; padding: 10mm 13mm 8mm 13mm; }
`;

const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">`;

// ─── Number formatter ─────────────────────────────────────────────────────────
const nu = (v: number) => `Nu.\u00A0${v.toFixed(2)}`;

// ─────────────────────────────────────────────────────────────────────────────

export class PrintingService {
  constructor() { }

  getPrinters(): string[] {
    return ['Default Printer', 'Thermal Printer', 'PDF'];
  }

  printInvoice(data: PrintInvoiceData, template: InvoiceTemplate = 'standard'): ApiResponse {
    try {
      const html = this.generateA4InvoiceHTML(data, template);
      console.log(`Printing A4 Invoice (${template}):`, data.invoiceNo);
      (global as any).lastPrintHTML = html;
      return { success: true, message: 'Invoice sent to printer' };
    } catch (error: any) {
      return { success: false, message: 'Failed to print invoice: ' + error.message };
    }
  }

  printThermalReceipt(data: PrintReceiptData): ApiResponse {
    try {
      const html = this.generateThermalHTML(data);
      console.log('Printing Thermal Receipt:', data.invoiceNo);
      (global as any).lastPrintHTML = html;
      return { success: true, message: 'Receipt sent to thermal printer' };
    } catch (error: any) {
      return { success: false, message: 'Failed to print receipt: ' + error.message };
    }
  }

  printReport(title: string, contentHtml: string, businessInfo?: Record<string, string>): ApiResponse {
    try {
      const html = this.generateReportHTML(title, contentHtml, businessInfo || {});
      (global as any).lastPrintHTML = html;
      return { success: true, message: 'Report sent to printer' };
    } catch (error: any) {
      return { success: false, message: 'Failed to print report: ' + error.message };
    }
  }

  /**
   * Print a dedicated Payroll Report with clean, professional layout
   */
  printPayrollReport(title: string, data: any, businessInfo?: Record<string, string>): ApiResponse {
    try {
      const html = this.generatePayrollReportHTML(title, data, businessInfo || {});
      (global as any).lastPrintHTML = html;
      return { success: true, message: 'Payroll report sent to printer' };
    } catch (error: any) {
      return { success: false, message: 'Failed to print payroll report: ' + error.message };
    }
  }

  generatePreviewHTML(data: PrintInvoiceData, template: InvoiceTemplate): string {
    if (template === 'thermal') {
      const rd: PrintReceiptData = {
        invoiceNo: data.invoiceNo,
        date: data.date,
        businessName: data.businessName || 'My Business',
        businessTagline: data.businessTagline,
        businessAddress: formatFullAddress(
          data.businessAddressStreet || data.businessAddress,
          data.businessAddressGewog,
          data.businessAddressDzongkhag
        ),
        businessPhone: data.businessPhone,
        businessEmail: data.businessEmail,
        taxNo: data.taxNo,
        businessSeal: data.businessSeal,
        businessSignature: data.businessSignature,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerGst: data.customerGst,
        items: data.items.map(i => ({ description: i.description, quantity: i.quantity, price: i.unitPrice })),
        subtotal: data.subtotal,
        gstAmount: data.gstAmount,
        discountAmount: data.discountAmount,
        total: data.totalAmount,
        paymentMode: data.paymentMode,
        isDuplicate: data.isDuplicate,
        notes: data.notes,
        terms: data.terms,
        taxType: data.taxType,
      };
      return this.generateThermalHTML(rd);
    }
    return this.generateA4InvoiceHTML(data, template);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  REPORT TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════
  private generateReportHTML(title: string, content: string, biz: Record<string, string>): string {
    const name = biz.company_name || 'My Business';
    const logo = biz.company_logo || '';
    const address = biz.address || '';
    const phone = biz.phone || '';
    const email = biz.email || '';
    const taxNo = biz.tax_no || '';

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
${FONT_LINK}<style>${PAGE_CSS}
.rh{display:table;width:100%;border-bottom:3px solid ${C.crimson};padding-bottom:8px;margin-bottom:8px;}
.rl{display:table-cell;vertical-align:middle;}
.rr{display:table-cell;vertical-align:bottom;text-align:right;}
.rn{font-family:'Cinzel',serif;font-size:16pt;font-weight:700;color:${C.crimson};}
.ri{font-size:8.5pt;color:${C.grey};margin-top:3px;}
.rt{font-family:'Outfit',sans-serif;font-size:18pt;font-weight:800;color:${C.slate};}
.rd{font-size:8pt;color:${C.greyL};}
table{width:100%;border-collapse:collapse;margin-bottom:8px;}
th{background:${C.crimson};color:#fff;padding:7px 8px;font-size:8.5pt;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:.5px;}
td{border-bottom:1px solid ${C.ash2};padding:6px 8px;font-size:9.5pt;}
tr:nth-child(even) td{background:${C.ash};}
.rf{margin-top:8px;font-size:8pt;text-align:center;color:${C.greyL};border-top:1px solid ${C.ash2};padding-top:6px;}
</style></head><body>
${FLAG_BAR}
<div style="margin-top:8px;" class="rh">
  <div class="rl">
    ${logo ? `<img src="${escapeHtml(logo)}" style="max-height:42px;max-width:90px;object-fit:contain;margin-bottom:4px;display:block;" alt="Logo">` : ''}
    <div class="rn">${name}</div>
    <div class="ri">${[address, phone ? 'Ph: ' + phone : '', email, taxNo ? 'GST/TPN/CID: ' + taxNo : ''].filter(Boolean).join(' · ')}</div>
  </div>
  <div class="rr">
    <div class="rt">${title}</div>
    <div class="rd">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
  </div>
</div>
${content}
<div class="rf">© ${new Date().getFullYear()} ${name} · powered by Phojaa95 ☸</div>
</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAYROLL REPORT TEMPLATE — Clean, professional A4 layout
  // ═══════════════════════════════════════════════════════════════════════════
  private generatePayrollReportHTML(title: string, data: any, biz: Record<string, string>): string {
    const name = biz.company_name || 'My Business';
    const logo = biz.company_logo || '';
    const address = biz.address || '';
    const phone = biz.phone || '';
    const email = biz.email || '';
    const taxNo = biz.tax_no || '';

    const records = data.records || [];
    const summary = data.summary || {};
    const byEmployee = data.byEmployee || [];
    const byDepartment = data.byDepartment || [];
    const byMode = data.byMode || [];

    const totalPayroll = summary.totalPayroll || 0;
    const employeeCount = summary.employeeCount || 0;
    const paymentCount = summary.paymentCount || 0;
    const avgPayment = summary.averagePayment || 0;

    const totalPf = records.reduce((s: number, r: any) => s + (r.pf_amount || 0), 0);
    const totalTds = records.reduce((s: number, r: any) => s + (r.tds_amount || 0), 0);
    const totalGis = records.reduce((s: number, r: any) => s + (r.gis_amount || 0), 0);
    const totalHc = records.reduce((s: number, r: any) => s + (r.hc_amount || 0), 0);
    const totalGross = records.reduce((s: number, r: any) => s + (r.gross_salary || 0), 0);

    const nu = (v: number) => `Nu. ${v.toFixed(2)}`;

    // By Employee rows
    const empRows = byEmployee.map((emp: any) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;"><strong>${escapeHtml(emp.employee_name)}</strong>${emp.department ? `<br><span style="font-size:7.5pt;color:#94A3B8;">${escapeHtml(emp.department)}</span>` : ''}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:center;">${emp.position || '—'}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;">${nu(emp.total_gross || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;color:#D97706;">${nu(emp.total_pf || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;color:#7C3AED;">${nu(emp.total_tds || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;color:#2563EB;">${nu(emp.total_gis || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;color:#059669;">${nu(emp.total_hc || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:center;">${emp.payments_count || 0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:9pt;text-align:right;font-weight:700;">${nu(emp.total_paid || 0)}</td>
      </tr>
    `).join('');

    // Payment history rows
    const histRows = records.map((rec: any) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;"><strong>#${escapeHtml(rec.transaction_no)}</strong><br><span style="font-size:7pt;color:#94A3B8;">${rec.date}</span></td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;">${escapeHtml(rec.employee_name)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:center;">${rec.month} ${rec.year}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:center;text-transform:uppercase;">${rec.payment_mode}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;">${nu(rec.gross_salary || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;color:#D97706;">${nu(rec.pf_amount || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;color:#7C3AED;">${nu(rec.tds_amount || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;color:#2563EB;">${nu(rec.gis_amount || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;color:#059669;">${nu(rec.hc_amount || 0)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #EBE5DA;font-size:8.5pt;text-align:right;font-weight:700;">${nu(rec.amount || 0)}</td>
      </tr>
    `).join('');

    // By Mode rows
    const modeRows = byMode.map((mode: any) => `
      <div style="display:inline-block;width:22%;margin:0 1% 8px 0;background:#fff;border:1px solid #EBE5DA;border-radius:4px;padding:8px;text-align:center;">
        <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;margin-bottom:3px;">${escapeHtml(mode.payment_mode)}</div>
        <div style="font-size:11pt;font-weight:700;color:#1E2B3C;">${nu(mode.total || 0)}</div>
        <div style="font-size:7.5pt;color:#94A3B8;">${mode.count || 0} payment${(mode.count || 0) > 1 ? 's' : ''}</div>
      </div>
    `).join('');

    // By Department rows
    const deptRows = byDepartment.map((dept: any) => `
      <div style="display:inline-block;width:30%;margin:0 1.5% 8px 0;background:#fff;border:1px solid #EBE5DA;border-radius:4px;padding:8px;">
        <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;margin-bottom:3px;">${escapeHtml(dept.department || 'General')}</div>
        <div style="font-size:11pt;font-weight:700;color:#1E2B3C;">${nu(dept.total_paid || 0)}</div>
        <div style="font-size:7.5pt;color:#94A3B8;">${dept.employee_count || 0} emp, ${dept.payment_count || 0} payments</div>
      </div>
    `).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
${FONT_LINK}<style>${PAGE_CSS}
.rh{display:table;width:100%;border-bottom:3px solid ${C.crimson};padding-bottom:8px;margin-bottom:10px;}
.rl{display:table-cell;vertical-align:middle;}
.rr{display:table-cell;vertical-align:bottom;text-align:right;}
.rn{font-family:'Cinzel',serif;font-size:16pt;font-weight:700;color:${C.crimson};}
.ri{font-size:8.5pt;color:${C.grey};margin-top:3px;}
.rt{font-family:'Outfit',sans-serif;font-size:18pt;font-weight:800;color:${C.slate};}
.rd{font-size:8pt;color:${C.greyL};}

/* Summary cards */
.sum-row{display:table;width:100%;margin-bottom:10px;border-spacing:6px 0;margin-left:-6px;}
.sum-cell{display:table-cell;width:25%;padding:10px 8px;border-radius:4px;text-align:center;vertical-align:top;}
.sum-cell.dark{background:${C.slate};color:#fff;}
.sum-cell.purple{background:#F3E8FF;color:#7C22BD;}
.sum-cell.blue{background:#DBEAFE;color:#1D4ED8;}
.sum-cell.green{background:#D1FAE5;color:#047857;}
.sum-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;opacity:.7;}
.sum-val{font-family:'Outfit',sans-serif;font-size:13pt;font-weight:800;}

/* Deduction cards */
.ded-row{display:table;width:100%;margin-bottom:10px;border-spacing:4px 0;margin-left:-4px;}
.ded-cell{display:table-cell;width:20%;padding:8px 6px;border-radius:4px;text-align:center;vertical-align:top;}
.ded-cell.amber{background:#FEF3C7;color:#92400E;}
.ded-cell.orange{background:#FFEDD5;color:#9A3412;}
.ded-cell.purple{background:#F3E8FF;color:#7C22BD;}
.ded-cell.blue{background:#DBEAFE;color:#1D4ED8;}
.ded-cell.green{background:#D1FAE5;color:#047857;}
.ded-label{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;opacity:.8;}
.ded-val{font-family:'Outfit',sans-serif;font-size:10pt;font-weight:700;}

/* Tables */
.tbl{width:100%;border-collapse:collapse;margin-bottom:10px;}
.tbl th{background:${C.crimson};color:#fff;padding:6px 8px;font-size:7.5pt;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:.5px;}
.tbl th.right{text-align:right;}
.tbl th.center{text-align:center;}
.tbl td{border-bottom:1px solid ${C.ash2};padding:5px 8px;font-size:9pt;}
.tbl tr:nth-child(even) td{background:${C.ash};}

/* Section headers */
.sec-title{font-size:9pt;font-weight:800;color:${C.slate};text-transform:uppercase;letter-spacing:1px;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid ${C.ash2};}

/* Footer */
.rf{margin-top:10px;font-size:8pt;text-align:center;color:${C.greyL};border-top:1px solid ${C.ash2};padding-top:6px;}
</style></head><body>
${FLAG_BAR}
<div style="margin-top:8px;" class="rh">
  <div class="rl">
    ${logo ? `<img src="${escapeHtml(logo)}" style="max-height:42px;max-width:90px;object-fit:contain;margin-bottom:4px;display:block;" alt="Logo">` : ''}
    <div class="rn">${name}</div>
    <div class="ri">${[address, phone ? 'Ph: ' + phone : '', email, taxNo ? 'GST/TPN/CID: ' + taxNo : ''].filter(Boolean).join(' · ')}</div>
  </div>
  <div class="rr">
    <div class="rt">${title}</div>
    <div class="rd">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
  </div>
</div>

<!-- Summary Cards -->
<div class="sum-row">
  <div class="sum-cell dark"><div class="sum-label">Total Payroll</div><div class="sum-val">${nu(totalPayroll)}</div></div>
  <div class="sum-cell purple"><div class="sum-label">Employees</div><div class="sum-val">${employeeCount}</div></div>
  <div class="sum-cell blue"><div class="sum-label">Payments</div><div class="sum-val">${paymentCount}</div></div>
  <div class="sum-cell green"><div class="sum-label">Average</div><div class="sum-val">${nu(avgPayment)}</div></div>
</div>

<!-- Deductions -->
<div class="ded-row">
  <div class="ded-cell amber"><div class="ded-label">Total Gross</div><div class="ded-val">${nu(totalGross)}</div></div>
  <div class="ded-cell orange"><div class="ded-label">Total PF</div><div class="ded-val">${nu(totalPf)}</div></div>
  <div class="ded-cell purple"><div class="ded-label">Total TDS</div><div class="ded-val">${nu(totalTds)}</div></div>
  <div class="ded-cell blue"><div class="ded-label">Total GIS</div><div class="ded-val">${nu(totalGis)}</div></div>
  <div class="ded-cell green"><div class="ded-label">Total HC</div><div class="ded-val">${nu(totalHc)}</div></div>
</div>

<!-- By Payment Mode -->
${byMode.length > 0 ? `<div class="sec-title">By Payment Mode</div><div style="margin-bottom:8px;">${modeRows}</div>` : ''}

<!-- By Department -->
${byDepartment.length > 0 ? `<div class="sec-title">By Department</div><div style="margin-bottom:8px;">${deptRows}</div>` : ''}

<!-- By Employee Summary -->
${byEmployee.length > 0 ? `
<div class="sec-title">Employee Summary</div>
<table class="tbl">
  <thead>
    <tr>
      <th>Employee</th>
      <th class="center">Position</th>
      <th class="right">Gross</th>
      <th class="right">PF</th>
      <th class="right">TDS</th>
      <th class="right">GIS</th>
      <th class="right">HC</th>
      <th class="center">#</th>
      <th class="right">Net Paid</th>
    </tr>
  </thead>
  <tbody>${empRows}</tbody>
</table>
` : ''}

<!-- Payment History -->
${records.length > 0 ? `
<div class="sec-title">Payment History</div>
<table class="tbl">
  <thead>
    <tr>
      <th>Transaction</th>
      <th>Employee</th>
      <th class="center">Period</th>
      <th class="center">Mode</th>
      <th class="right">Gross</th>
      <th class="right">PF</th>
      <th class="right">TDS</th>
      <th class="right">GIS</th>
      <th class="right">HC</th>
      <th class="right">Net</th>
    </tr>
  </thead>
  <tbody>${histRows}</tbody>
</table>
` : ''}

<div class="rf">© ${new Date().getFullYear()} ${name} · powered by Phojaa95 ☸</div>
</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  A4 ROUTER
  // ═══════════════════════════════════════════════════════════════════════════
  private generateA4InvoiceHTML(data: PrintInvoiceData, template: InvoiceTemplate): string {
    if (template === 'modern') return this.templateModern(data);
    if (template === 'professional') return this.templateProfessional(data);
    return this.templateStandard(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STANDARD TEMPLATE  ── Crimson Header + Clean Table Layout
  // ═══════════════════════════════════════════════════════════════════════════
  private templateStandard(data: PrintInvoiceData): string {
    const paid = data.balanceDue <= 0;
    const logo = data.businessLogo || '';

    // Build full addresses from structured fields
    const businessAddress = formatFullAddress(
      data.businessAddressStreet || data.businessAddress,
      data.businessAddressGewog,
      data.businessAddressDzongkhag
    );
    const customerAddress = formatFullAddress(
      data.customerAddressStreet || data.customerAddress,
      data.customerAddressGewog,
      data.customerAddressDzongkhag
    );

    const rows = data.items.map((it, i) => `
      <tr>
        <td style="text-align:center;color:${C.gold};font-weight:700;">${i + 1}</td>
        <td><div style="font-weight:600;">${escapeHtml(it.description)}</div><div style="font-size:8pt;color:${C.greyL};margin-top:1px;">Tax ${escapeHtml(String(it.gstRate))}% · Tax Amt: ${it.gstAmount.toFixed(2)}</div></td>
        <td style="text-align:center;">${escapeHtml(it.quantity)}</td>
        <td style="text-align:right;">${it.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;">${it.total.toFixed(2)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(data.invoiceNo)}</title>
${FONT_LINK}
<style>
${PAGE_CSS}

/* ── Header band ── */
.hdr { background:${C.crimson}; color:#fff; padding:9px 12px; }
.hdr-t { display:table; width:100%; }
.hdr-l { display:table-cell; vertical-align:middle; }
.hdr-r { display:table-cell; vertical-align:middle; text-align:right; width:160px; }
.logo  { max-height:44px; max-width:100px; object-fit:contain; vertical-align:middle; border-radius:3px; background:rgba(255,255,255,.12); padding:2px 4px; margin-right:10px; }
.bname { font-family:'Cinzel',serif; font-size:17pt; font-weight:700; display:inline; vertical-align:middle; }
.btag  { font-size:8pt; opacity:.75; margin-top:2px; }
.binfo { font-size:8pt; opacity:.7; margin-top:5px; line-height:1.5; }
.inv-word { font-family:'Outfit',sans-serif; font-size:28pt; font-weight:800; color:rgba(255,255,255,.18); line-height:1; letter-spacing:-1px; }
.inv-no   { font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; color:${C.saffronL}; margin-top:-4px; }
.inv-date { font-size:8.5pt; opacity:.75; margin-top:4px; }

/* ── Billing row ── */
.bill-wrap { background:${C.ash}; border-left:4px solid ${C.saffron}; border-right:4px solid ${C.saffron}; padding:7px 10px; margin:8px 0; }
.bill-t  { display:table; width:100%; }
.bill-cl { display:table-cell; vertical-align:top; width:50%; }
.bill-cr { display:table-cell; vertical-align:top; width:50%; text-align:right; }
.blbl  { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${C.gold}; margin-bottom:3px; }
.bname2{ font-family:'Outfit',sans-serif; font-size:12pt; font-weight:700; color:${C.slate}; }
.bdet  { font-size:8.5pt; color:${C.grey}; margin-top:2px; line-height:1.5; }
.pill  { display:inline-block; padding:2px 9px; border-radius:12px; font-size:8pt; font-weight:700; margin-top:5px; }
.paid  { background:#D5F5E3; color:#14532D; }
.due   { background:#FDEDEC; color:#922B21; }

/* ── Items table ── */
.tbl { width:100%; border-collapse:collapse; margin:4px 0 8px; }
.tbl thead th { background:${C.slate}; color:#fff; padding:7px 9px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
.tbl tbody td { padding:7px 9px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tbl tbody tr:nth-child(even) td { background:${C.ash}; }

/* ── Totals ── */
.tot-wrap { text-align:right; margin-bottom:8px; }
.tot-box  { display:inline-block; width:230px; border:1.5px solid ${C.saffron}; border-radius:4px; overflow:hidden; text-align:left; }
.tot-row  { display:table; width:100%; padding:5px 10px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tot-row:last-child { border:none; }
.tot-l    { display:table-cell; color:${C.grey}; }
.tot-v    { display:table-cell; text-align:right; font-weight:700; }
.tot-grand{ background:${C.crimson}; color:#fff; padding:9px 10px; display:table; width:100%; }
.tg-l     { display:table-cell; font-family:'Outfit',sans-serif; font-size:12pt; font-weight:800; }
.tg-v     { display:table-cell; text-align:right; font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; }
.tot-due  { background:#FDEDEC; color:#922B21; padding:5px 10px; display:table; width:100%; }
.td-l     { display:table-cell; font-weight:700; }
.td-v     { display:table-cell; text-align:right; font-weight:700; }

/* ── Footer ── */
.foot { display:table; width:100%; padding-top:7px; border-top:2px solid ${C.saffron}; margin-top:4px; }
.foot-l { display:table-cell; vertical-align:top; }
.foot-r { display:table-cell; vertical-align:bottom; text-align:right; width:200px; }
.flbl { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${C.gold}; margin-bottom:3px; }
.ftxt { font-size:8.5pt; color:${C.grey}; line-height:1.5; }
.sig-t { display:inline-table; }
.sig-td { display:table-cell; text-align:center; padding:0 10px; }
.sig-line { border-top:1.5px solid ${C.slate}; padding-top:4px; font-size:7.5pt; font-weight:700; text-transform:uppercase; color:${C.greyL}; min-width:90px; margin-top:24px; }
.credit { text-align:center; font-size:8pt; color:${C.greyL}; margin-top:8px; letter-spacing:.3px; }

.dup { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-family:'Cinzel',serif; font-size:80pt; font-weight:700; color:rgba(155,35,53,.05); pointer-events:none; z-index:0; letter-spacing:6px; }
</style></head><body>

${data.isDuplicate ? '<div class="dup">DUPLICATE</div>' : ''}

<div class="hdr">
  <div class="hdr-t">
    <div class="hdr-l">
      ${logo ? `<img src="${escapeHtml(logo)}" class="logo" alt="Logo">` : ''}
      <span class="bname">${escapeHtml(data.businessName)}</span>
      ${data.businessTagline ? `<div class="btag">${escapeHtml(data.businessTagline)}</div>` : ''}
      <div class="binfo">
        ${escapeHtml(businessAddress)}<br>
        ${data.businessPhone ? 'Ph: ' + escapeHtml(data.businessPhone) : ''}${data.businessEmail ? ' &bull; ' + escapeHtml(data.businessEmail) : ''}
        ${data.taxNo ? '<br>GST/TPN/CID: ' + escapeHtml(data.taxNo) : ''}
      </div>
    </div>
    <div class="hdr-r">
      <div class="inv-word" style="font-size:16pt;">Invoice Receipt</div>
      <div class="inv-no">#${escapeHtml(data.invoiceNo)}</div>
      <div class="inv-date">${escapeHtml(data.date)}</div>
    </div>
  </div>
</div>
${FLAG_BAR}

<div class="bill-wrap">
  <div class="bill-t">
    <div class="bill-cl">
      <div class="blbl">Billed To</div>
      <div class="bname2">${escapeHtml(data.customerName) || 'Cash Customer'}</div>
      <div class="bdet">
        ${escapeHtml(customerAddress)}<br>
        ${data.customerPhone ? 'Ph: ' + escapeHtml(data.customerPhone) + '<br>' : ''}
        ${data.customerGst ? 'GST/TPN/CID: ' + escapeHtml(data.customerGst) : ''}
      </div>
    </div>
    <div class="bill-cr">
      <div class="blbl">Payment</div>
      <div class="bdet"><strong>Mode:</strong> ${escapeHtml(data.paymentMode)}<br><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
      <span class="pill ${paid ? 'paid' : 'due'}">${paid ? '✓ Paid in Full' : '⚠ Payment Pending'}</span>
    </div>
  </div>
</div>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:28px;text-align:center;">#</th>
      <th>Description</th>
      <th style="width:40px;text-align:center;">Qty</th>
      <th style="width:72px;text-align:right;">Rate</th>
      <th style="width:78px;text-align:right;">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="tot-wrap">
  <div class="tot-box">
    <div class="tot-row"><span class="tot-l">Subtotal</span><span class="tot-v">${data.subtotal.toFixed(2)}</span></div>
    <div class="tot-row"><span class="tot-l">${data.taxType === 'domestic' ? 'Domestic GST' : 'GST / Tax'}</span><span class="tot-v">+ ${data.gstAmount.toFixed(2)}</span></div>
    ${data.discountAmount > 0 ? `<div class="tot-row"><span class="tot-l">Discount</span><span class="tot-v" style="color:#E53935;">- ${data.discountAmount.toFixed(2)}</span></div>` : ''}
    <div class="tot-grand"><span class="tg-l">GRAND TOTAL</span><span class="tg-v">${nu(data.totalAmount)}</span></div>
    ${data.balanceDue > 0 ? `
      <div class="tot-row"><span class="tot-l">Amount Paid</span><span class="tot-v">${data.amountPaid.toFixed(2)}</span></div>
      <div class="tot-due"><span class="td-l">Balance Due</span><span class="td-v">${nu(data.balanceDue)}</span></div>` : ''}
  </div>
</div>

<div class="foot">
  <div class="foot-l">
    <div class="flbl">Notes &amp; Terms</div>
    <div class="ftxt">${escapeHtml(data.notes || 'Thank you for your business. We value your trust and partnership.')}</div>
    <div class="ftxt" style="margin-top:4px;">${escapeHtml(data.terms || '')}</div>
  </div>
  <div class="foot-r">
    <div style="position:relative; display:inline-block;">
      ${data.businessSeal ? `<img src="${escapeHtml(data.businessSeal)}" style="position:absolute; bottom:20px; right:20px; width:80px; height:80px; opacity:0.8; z-index:1; pointer-events:none;">` : ''}
      <span class="sig-t" style="position:relative; z-index:2;">
        <span class="sig-td"><div class="sig-line">Customer Sign</div></span>
        <span class="sig-td">
          <div style="position:relative; display:inline-block;">
            ${data.businessSignature ? `<img src="${escapeHtml(data.businessSignature)}" style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); max-width:120px; max-height:50px;">` : ''}
            <div class="sig-line" style="border-color:${C.crimson};color:${C.crimson};">Authorised Signatory</div>
          </div>
        </span>
      </span>
    </div>
  </div>
</div>

<div class="credit">❖ &nbsp; powered by Phojaa95 &nbsp;·&nbsp; Kingdom of Bhutan ☸ &nbsp; ❖</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MODERN TEMPLATE  ── Navy Gradient Hero + Blue Cards
  // ═══════════════════════════════════════════════════════════════════════════
  private templateModern(data: PrintInvoiceData): string {
    const paid = data.balanceDue <= 0;
    const logo = data.businessLogo || '';

    // Build full addresses
    const businessAddress = formatFullAddress(
      data.businessAddressStreet || data.businessAddress,
      data.businessAddressGewog,
      data.businessAddressDzongkhag
    );
    const customerAddress = formatFullAddress(
      data.customerAddressStreet || data.customerAddress,
      data.customerAddressGewog,
      data.customerAddressDzongkhag
    );

    const rows = data.items.map((it, i) => `
      <tr>
        <td style="text-align:center;color:${C.sky};font-weight:700;font-size:9pt;">${String(i + 1).padStart(2, '0')}</td>
        <td><div style="font-weight:600;">${escapeHtml(it.description)}</div><div style="font-size:7.5pt;color:${C.greyL};margin-top:1px;">Tax ${escapeHtml(String(it.gstRate))}% (${it.gstAmount.toFixed(2)})</div></td>
        <td style="text-align:center;font-weight:700;">${it.quantity}</td>
        <td style="text-align:right;">${it.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;">${it.total.toFixed(2)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(data.invoiceNo)}</title>
${FONT_LINK}
<style>
${PAGE_CSS}

/* ── hero ── */
.hero { background:linear-gradient(135deg,${C.navy} 0%,#1B3A5C 55%,${C.sky} 100%); color:#fff; padding:11px 13px; position:relative; overflow:hidden; }
.hero::after { content:''; position:absolute; right:-30px; top:-30px; width:140px; height:140px; border-radius:50%; border:22px solid rgba(255,255,255,.05); }
.hero-t { display:table; width:100%; position:relative; z-index:1; }
.hero-l { display:table-cell; vertical-align:middle; }
.hero-r { display:table-cell; vertical-align:middle; text-align:right; width:150px; }
.hlogo  { max-height:44px; max-width:100px; object-fit:contain; vertical-align:middle; border-radius:3px; background:rgba(255,255,255,.12); padding:2px 4px; margin-right:8px; }
.hbiz   { display:inline-block; vertical-align:middle; }
.hbname { font-family:'Cinzel',serif; font-size:16pt; font-weight:700; }
.htag   { font-size:8pt; color:${C.saffronL}; letter-spacing:1.5px; text-transform:uppercase; margin-top:2px; }
.hinfo  { font-size:8pt; color:rgba(255,255,255,.65); margin-top:5px; line-height:1.5; }
.hinvw  { font-family:'Outfit',sans-serif; font-size:26pt; font-weight:800; color:rgba(255,255,255,.1); line-height:1; letter-spacing:-1px; }
.hinvno { font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; color:${C.saffronL}; margin-top:-3px; }
.hdate  { font-size:8.5pt; color:rgba(255,255,255,.65); margin-top:4px; }

/* ── saffron strip ── */
.saff { height:3px; background:linear-gradient(to right,${C.saffron},${C.saffronL},${C.saffron}); }

/* ── info cards ── */
.icards { display:table; width:100%; margin:7px 0; border-spacing:7px; }
.icard  { display:table-cell; border:1.5px solid ${C.ash2}; border-radius:6px; padding:8px 11px; background:${C.cream}; vertical-align:top; position:relative; }
.icard::before { content:''; position:absolute; top:0; left:0; width:4px; height:100%; background:${C.sky}; border-radius:3px 0 0 3px; }
.icard.gold::before { background:${C.saffron}; }
.iclbl  { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${C.sky}; margin-bottom:4px; }
.icard.gold .iclbl { color:${C.gold}; }
.icname { font-family:'Outfit',sans-serif; font-size:11.5pt; font-weight:700; color:${C.navy}; }
.icdet  { font-size:8.5pt; color:${C.grey}; margin-top:2px; line-height:1.5; }
.badge  { display:inline-block; padding:2px 9px; border-radius:12px; font-size:7.5pt; font-weight:700; margin-top:5px; }
.bpaid  { background:#D5F5E3; color:#14532D; }
.bdue   { background:#FDEDEC; color:#922B21; }

/* ── table ── */
.tbl { width:100%; border-collapse:collapse; margin-bottom:8px; border:1.5px solid ${C.ash2}; border-radius:5px; overflow:hidden; }
.tbl th { background:linear-gradient(to right,${C.navy},#1B3A5C); color:#fff; padding:8px 10px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
.tbl td { padding:8px 10px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tbl tbody tr:nth-child(even) td { background:${C.ash}; }
.tbl tbody tr:last-child td { border-bottom:none; }

/* ── totals ── */
.tot-wrap { text-align:right; margin-bottom:8px; }
.tot-box  { display:inline-block; width:235px; border:1.5px solid ${C.sky}; border-radius:6px; overflow:hidden; text-align:left; }
.tot-row  { display:table; width:100%; padding:5px 11px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tot-row:last-child { border:none; }
.tot-l  { display:table-cell; color:${C.grey}; }
.tot-v  { display:table-cell; text-align:right; font-weight:700; }
.tot-g  { background:linear-gradient(to right,${C.navy},${C.sky}); color:#fff; padding:10px 11px; display:table; width:100%; }
.tgl    { display:table-cell; font-family:'Outfit',sans-serif; font-size:12pt; font-weight:800; }
.tgv    { display:table-cell; text-align:right; font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; }
.tot-due{ background:#FDEDEC; color:#922B21; padding:5px 11px; display:table; width:100%; }
.tdl { display:table-cell; font-weight:700; }
.tdv { display:table-cell; text-align:right; font-weight:700; }

/* ── footer ── */
.foot { display:table; width:100%; padding-top:7px; border-top:2px solid ${C.ash2}; margin-top:4px; }
.fl   { display:table-cell; vertical-align:top; }
.fr   { display:table-cell; vertical-align:bottom; text-align:right; width:200px; }
.flbl { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${C.sky}; margin-bottom:3px; }
.ftxt { font-size:8.5pt; color:${C.grey}; line-height:1.5; }
.sig-t  { display:inline-table; }
.sig-td { display:table-cell; text-align:center; padding:0 10px; }
.sig-ln { border-top:1.5px solid ${C.navy}; padding-top:4px; font-size:7.5pt; font-weight:700; text-transform:uppercase; color:${C.greyL}; min-width:90px; margin-top:24px; }
.credit { text-align:center; font-size:8pt; color:${C.greyL}; margin-top:8px; }
.dup { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-family:'Cinzel',serif; font-size:80pt; font-weight:700; color:rgba(46,109,164,.05); pointer-events:none; z-index:0; }
</style></head><body>

${data.isDuplicate ? '<div class="dup">DUPLICATE</div>' : ''}

<div class="hero">
  <div class="hero-t">
    <div class="hero-l">
      ${logo ? `<img src="${escapeHtml(logo)}" class="hlogo" alt="Logo">` : ''}
      <span class="hbiz">
        <div class="hbname">${escapeHtml(data.businessName)}</div>
        ${data.businessTagline ? `<div class="htag">${escapeHtml(data.businessTagline)}</div>` : ''}
        <div class="hinfo">
          ${escapeHtml(businessAddress)}<br>
          ${data.businessPhone ? 'Ph: ' + escapeHtml(data.businessPhone) : ''}${data.businessEmail ? ' &bull; ' + escapeHtml(data.businessEmail) : ''}
          ${data.taxNo ? '<br>GST/TPN/CID: ' + escapeHtml(data.taxNo) : ''}
        </div>
      </span>
    </div>
    <div class="hero-r">
      <div class="hinvw" style="font-size:18pt;">Invoice Receipt</div>
      <div class="hinvno">#${escapeHtml(data.invoiceNo)}</div>
      <div class="hdate">${escapeHtml(data.date)}</div>
    </div>
  </div>
</div>
${FLAG_BAR}
<div class="saff"></div>

<div class="icards">
  <div class="icard" style="padding-left:15px;">
    <div class="iclbl">Billed To</div>
    <div class="icname">${escapeHtml(data.customerName || 'Cash Customer')}</div>
    <div class="icdet">
      ${escapeHtml(customerAddress)}<br>
      ${data.customerPhone ? 'Ph: ' + escapeHtml(data.customerPhone) + '<br>' : ''}
      ${data.customerGst ? 'GST/TPN/CID: ' + escapeHtml(data.customerGst) : ''}
    </div>
  </div>
  <div class="icard gold" style="padding-left:15px;">
    <div class="iclbl">Payment Details</div>
    <div class="icdet"><strong>Mode:</strong> ${escapeHtml(data.paymentMode)}<br><strong>Currency:</strong> Bhutanese Ngultrum (Nu.)<br><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
    <span class="badge ${paid ? 'bpaid' : 'bdue'}">${paid ? '✓ Fully Paid' : '⚠ Pending'}</span>
    ${data.balanceDue > 0 ? `<div style="font-size:8.5pt;color:#922B21;font-weight:700;margin-top:4px;">Due: ${nu(data.balanceDue)}</div>` : ''}
  </div>
</div>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:28px;text-align:center;">#</th>
      <th>Item &amp; Description</th>
      <th style="width:40px;text-align:center;">Qty</th>
      <th style="width:72px;text-align:right;">Rate</th>
      <th style="width:78px;text-align:right;">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="tot-wrap">
  <div class="tot-box">
    <div class="tot-row"><span class="tot-l">Subtotal</span><span class="tot-v">${data.subtotal.toFixed(2)}</span></div>
    <div class="tot-row"><span class="tot-l">${data.taxType === 'domestic' ? 'Domestic GST' : 'GST / Tax'}</span><span class="tot-v">+ ${data.gstAmount.toFixed(2)}</span></div>
    ${data.discountAmount > 0 ? `<div class="tot-row"><span class="tot-l">Discount</span><span class="tot-v" style="color:#E53935;">- ${data.discountAmount.toFixed(2)}</span></div>` : ''}
    <div class="tot-g"><span class="tgl">TOTAL</span><span class="tgv">${nu(data.totalAmount)}</span></div>
    ${data.balanceDue > 0 ? `
      <div class="tot-row"><span class="tot-l">Amount Paid</span><span class="tot-v">${data.amountPaid.toFixed(2)}</span></div>
      <div class="tot-due"><span class="tdl">Balance Due</span><span class="tdv">${nu(data.balanceDue)}</span></div>` : ''}
  </div>
</div>

<div class="foot">
  <div class="fl">
    <div class="flbl">Notes &amp; Terms</div>
    <div class="ftxt">${escapeHtml(data.notes || 'Thank you for choosing us. We appreciate your continued trust and business.')}</div>
    <div class="ftxt" style="margin-top:4px;">${escapeHtml(data.terms || '')}</div>
  </div>
  <div class="fr">
    <div style="position:relative; display:inline-block;">
      ${data.businessSeal ? `<img src="${escapeHtml(data.businessSeal)}" style="position:absolute; bottom:20px; right:10px; width:70px; height:70px; opacity:0.8; z-index:1; pointer-events:none;">` : ''}
      <span class="sig-t" style="position:relative; z-index:2;">
        <span class="sig-td"><div class="sig-ln">Customer</div></span>
        <span class="sig-td">
          <div style="position:relative; display:inline-block;">
            ${data.businessSignature ? `<img src="${escapeHtml(data.businessSignature)}" style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); max-width:110px; max-height:45px;">` : ''}
            <div class="sig-ln" style="border-color:${C.sky};color:${C.sky};">Authorised</div>
          </div>
        </span>
      </span>
    </div>
  </div>
</div>
<div class="credit">☸ &nbsp; powered by Phojaa95 &nbsp;·&nbsp; Kingdom of Bhutan 🇧🇹 &nbsp; ☸</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROFESSIONAL TEMPLATE  ── Saffron Gold Header + Bordered Parchment
  // ═══════════════════════════════════════════════════════════════════════════
  private templateProfessional(data: PrintInvoiceData): string {
    const paid = data.balanceDue <= 0;
    const logo = data.businessLogo || '';

    // Build full addresses
    const businessAddress = formatFullAddress(
      data.businessAddressStreet || data.businessAddress,
      data.businessAddressGewog,
      data.businessAddressDzongkhag
    );
    const customerAddress = formatFullAddress(
      data.customerAddressStreet || data.customerAddress,
      data.customerAddressGewog,
      data.customerAddressDzongkhag
    );

    const rows = data.items.map((it, i) => `
      <tr>
        <td style="text-align:center;color:${C.gold};font-weight:700;">${String(i + 1).padStart(2, '0')}</td>
        <td><div style="font-weight:700;color:${C.navy};">${escapeHtml(it.description)}</div><div style="font-size:7.5pt;color:${C.greyL};font-family:monospace;margin-top:1px;">Tax: ${escapeHtml(String(it.gstRate))}% (${it.gstAmount.toFixed(2)})</div></td>
        <td style="text-align:center;">${it.quantity}</td>
        <td style="text-align:right;">${it.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;">${it.total.toFixed(2)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(data.invoiceNo)}</title>
${FONT_LINK}
<style>
${PAGE_CSS}
body { border: 2px solid ${C.saffron}; padding: 0; }

/* corner ornaments */
.cnr { position:fixed; width:20px; height:20px; }
.cnr-tl { top:2px; left:2px; border-top:3.5px solid ${C.crimson}; border-left:3.5px solid ${C.crimson}; }
.cnr-tr { top:2px; right:2px; border-top:3.5px solid ${C.crimson}; border-right:3.5px solid ${C.crimson}; }
.cnr-bl { bottom:2px; left:2px; border-bottom:3.5px solid ${C.crimson}; border-left:3.5px solid ${C.crimson}; }
.cnr-br { bottom:2px; right:2px; border-bottom:3.5px solid ${C.crimson}; border-right:3.5px solid ${C.crimson}; }
.inner  { padding:10mm 13mm 8mm 13mm; }

/* ── header ── */
.hdr   { display:table; width:100%; border-bottom:2px solid ${C.saffron}; padding-bottom:10px; margin-bottom:0; }
.hl    { display:table-cell; vertical-align:middle; }
.hr    { display:table-cell; vertical-align:middle; text-align:right; background:${C.saffron}; padding:8px 12px; width:160px; border-radius:4px; }
.hlogo { max-height:46px; max-width:100px; object-fit:contain; vertical-align:middle; margin-right:8px; }
.hbn   { font-family:'Cinzel',serif; font-size:17pt; font-weight:700; color:${C.crimson}; display:inline; vertical-align:middle; }
.htag  { font-size:8pt; font-weight:600; color:${C.gold}; letter-spacing:1.5px; text-transform:uppercase; margin-top:2px; }
.hct   { font-size:8pt; color:${C.grey}; margin-top:5px; line-height:1.5; }
.hinvw { font-family:'Cinzel',serif; font-size:20pt; font-weight:700; color:rgba(255,255,255,.3); line-height:1; letter-spacing:2px; }
.hinvno{ font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; color:${C.navy}; margin-top:2px; }
.hdt-l { font-size:8pt; font-weight:700; color:rgba(30,43,60,.6); text-transform:uppercase; letter-spacing:1px; margin-top:7px; }
.hdt-v { font-size:11pt; font-weight:700; color:${C.navy}; }

/* ── billing ── */
.brow  { display:table; width:100%; border-bottom:1px solid ${C.ash2}; }
.bc    { display:table-cell; vertical-align:top; padding:7px 11px; }
.bc+.bc{ border-left:1px dashed ${C.goldL}; }
.bclbl { font-size:7.5pt; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:${C.gold}; border-bottom:1px solid ${C.ash2}; padding-bottom:3px; margin-bottom:5px; }
.bcname{ font-family:'Outfit',sans-serif; font-size:11.5pt; font-weight:700; color:${C.navy}; }
.bcdet { font-size:8.5pt; color:${C.grey}; margin-top:2px; line-height:1.5; }
.pill  { display:inline-block; padding:2px 9px; border-radius:3px; font-size:8pt; font-weight:700; margin-top:5px; }
.paid  { background:#D5F5E3; color:#14532D; border:1px solid #A9DFBF; }
.due   { background:#FDEDEC; color:#922B21; border:1px solid #F1948A; }

/* ── table ── */
.tbl { width:100%; border-collapse:collapse; margin:6px 0 8px; }
.tbl th { background:${C.navy}; color:#fff; padding:8px 10px; font-size:8pt; font-weight:700; text-transform:uppercase; }
.tbl td { padding:8px 10px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tbl tbody tr:nth-child(even) td { background:${C.ash}; }
.tbl tbody tr:last-child td { border-bottom:2px solid ${C.saffron}; }

/* ── totals ── */
.tot-wrap { text-align:right; margin-bottom:8px; }
.tot-box  { display:inline-block; width:240px; border:2px solid ${C.saffron}; border-radius:4px; overflow:hidden; text-align:left; }
.tot-row  { display:table; width:100%; padding:5px 11px; border-bottom:1px solid ${C.ash2}; font-size:9.5pt; }
.tot-row:last-child { border:none; }
.tl { display:table-cell; color:${C.grey}; }
.tv { display:table-cell; text-align:right; font-weight:700; }
.tot-g  { background:${C.saffron}; padding:10px 11px; display:table; width:100%; }
.tgl { display:table-cell; font-family:'Cinzel',serif; font-size:12pt; font-weight:700; color:${C.navy}; }
.tgv { display:table-cell; text-align:right; font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; color:${C.navy}; }
.tot-due { background:#FDEDEC; color:#922B21; padding:5px 11px; display:table; width:100%; }
.tdl { display:table-cell; font-weight:700; }
.tdv { display:table-cell; text-align:right; font-weight:700; }

/* ── footer ── */
.foot { display:table; width:100%; padding-top:7px; border-top:2px solid ${C.saffron}; margin-top:4px; }
.fl   { display:table-cell; vertical-align:top; }
.fr   { display:table-cell; vertical-align:bottom; text-align:right; width:200px; }
.flbl { font-size:7.5pt; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:${C.crimson}; margin-bottom:3px; }
.ftxt { font-size:8.5pt; color:${C.grey}; line-height:1.5; }
.sig-t  { display:inline-table; }
.sig-td { display:table-cell; text-align:center; padding:0 10px; }
.sig-ln { border-top:1.5px solid ${C.navy}; padding-top:4px; font-size:7.5pt; font-weight:700; text-transform:uppercase; color:${C.greyL}; min-width:90px; margin-top:24px; }
.credit { text-align:center; font-size:8pt; color:${C.greyL}; margin-top:8px; background:${C.ash}; padding:6px; border-top:1px solid ${C.ash2}; }
.credit strong { color:${C.crimson}; }
.dup { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-family:'Cinzel',serif; font-size:80pt; font-weight:700; color:rgba(155,35,53,.05); pointer-events:none; z-index:0; }
</style></head><body>

${data.isDuplicate ? '<div class="dup">DUPLICATE</div>' : ''}
<div class="cnr cnr-tl"></div><div class="cnr cnr-tr"></div>
<div class="cnr cnr-bl"></div><div class="cnr cnr-br"></div>

${FLAG_BAR}
<div class="inner">

<div class="hdr">
  <div class="hl">
    ${logo ? `<img src="${escapeHtml(logo)}" class="hlogo" alt="Logo">` : ''}
    <span class="hbn">${escapeHtml(data.businessName)}</span>
    ${data.businessTagline ? `<div class="htag">${escapeHtml(data.businessTagline)}</div>` : ''}
    <div class="hct">
      ${escapeHtml(businessAddress)}<br>
      ${data.businessPhone ? 'Ph: ' + escapeHtml(data.businessPhone) : ''}${data.businessEmail ? ' &bull; ' + escapeHtml(data.businessEmail) : ''}
      ${data.taxNo ? '<br>GST/TPN/CID: ' + escapeHtml(data.taxNo) : ''}
    </div>
  </div>
  <div class="hr">
    <div class="hinvw" style="font-size:18pt;">INVOICE RECEIPT</div>
    <div class="hinvno">#${escapeHtml(data.invoiceNo)}</div>
    <div class="hdt-l">Date Issued</div>
    <div class="hdt-v">${escapeHtml(data.date)}</div>
  </div>
</div>

${FLAG_BAR}

<div class="brow">
  <div class="bc">
    <div class="bclbl">Billed To</div>
    <div class="bcname">${escapeHtml(data.customerName || 'Cash Customer')}</div>
    <div class="bcdet">
      ${escapeHtml(customerAddress)}<br>
      ${data.customerPhone ? 'Ph: ' + escapeHtml(data.customerPhone) + '<br>' : ''}
      ${data.customerGst ? 'GST/TPN/CID: ' + escapeHtml(data.customerGst) : ''}
    </div>
  </div>
  <div class="bc">
    <div class="bclbl">Payment</div>
    <div class="bcdet"><strong>Mode:</strong> ${escapeHtml(data.paymentMode)}<br><strong>Currency:</strong> Ngultrum (Nu.)</div>
    <span class="pill ${paid ? 'paid' : 'due'}">${paid ? '✓ Paid' : '⚠ Pending'}</span>
  </div>
  <div class="bc" style="text-align:right;">
    <div class="bclbl">Summary</div>
    <div style="font-family:'Outfit',sans-serif;font-size:16pt;font-weight:800;color:${C.crimson};">${nu(data.totalAmount)}</div>
    <div style="font-size:8.5pt;color:${C.grey};">Grand Total</div>
  </div>
</div>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:28px;text-align:center;">#</th>
      <th>Service / Product</th>
      <th style="width:40px;text-align:center;">Qty</th>
      <th style="width:72px;text-align:right;">Rate</th>
      <th style="width:78px;text-align:right;">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="tot-wrap">
  <div class="tot-box">
    <div class="tot-row"><span class="tl">Subtotal</span><span class="tv">${data.subtotal.toFixed(2)}</span></div>
    <div class="tot-row"><span class="tl">${data.taxType === 'domestic' ? 'Domestic GST' : 'Tax / GST'}</span><span class="tv">+ ${data.gstAmount.toFixed(2)}</span></div>
    ${data.discountAmount > 0 ? `<div class="tot-row"><span class="tl">Discount</span><span class="tv" style="color:#E53935;">- ${data.discountAmount.toFixed(2)}</span></div>` : ''}
    <div class="tot-g"><span class="tgl">GRAND TOTAL</span><span class="tgv">${nu(data.totalAmount)}</span></div>
    ${data.balanceDue > 0 ? `
      <div class="tot-row"><span class="tl">Amount Paid</span><span class="tv">${data.amountPaid.toFixed(2)}</span></div>
      <div class="tot-due"><span class="tdl">Balance Due</span><span class="tdv">${nu(data.balanceDue)}</span></div>` : ''}
  </div>
</div>

<div class="foot">
  <div class="fl">
    <div class="flbl">Notes &amp; Terms</div>
    <div class="ftxt">${escapeHtml(data.notes || 'This is a computer-generated invoice. Please retain for your records.')}</div>
    <div class="ftxt" style="margin-top:4px;">${escapeHtml(data.terms || '')}</div>
  </div>
  <div class="fr">
    <div style="position:relative; display:inline-block;">
      ${data.businessSeal ? `<img src="${escapeHtml(data.businessSeal)}" style="position:absolute; bottom:20px; right:15px; width:85px; height:85px; opacity:0.8; z-index:1; pointer-events:none;">` : ''}
      <span class="sig-t" style="position:relative; z-index:2;">
        <span class="sig-td"><div class="sig-ln">Customer Seal</div></span>
        <span class="sig-td">
          <div style="position:relative; display:inline-block;">
            ${data.businessSignature ? `<img src="${escapeHtml(data.businessSignature)}" style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); max-width:130px; max-height:55px;">` : ''}
            <div class="sig-ln" style="border-color:${C.crimson};color:${C.crimson};">Authorised Signatory</div>
          </div>
        </span>
      </span>
    </div>
  </div>
</div>

</div><!-- /inner -->
<div class="credit">❖ &nbsp; powered by Phojaa95 &nbsp; ❖</div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  THERMAL TEMPLATE  ── 80mm Bhutanese Receipt
  // ═══════════════════════════════════════════════════════════════════════════
  private generateThermalHTML(data: PrintReceiptData): string {
    const paid = data.paymentMode !== 'credit' && data.paymentMode !== 'Credit';
    const items = data.items.map(it => `
      <div style="margin-bottom:7px;">
        <div style="font-weight:700;font-size:11pt;line-height:1.2;">${escapeHtml(it.description)}</div>
        <div style="display:flex;justify-content:space-between;font-size:10pt;margin-top:2px;color:#333;">
          <span>${it.quantity} &times; ${it.price.toFixed(2)}</span>
          <span style="font-weight:700;color:#111;">${(it.quantity * it.price).toFixed(2)}</span>
        </div>
      </div>`).join('');

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Receipt ${escapeHtml(data.invoiceNo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print { html,body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; background: #fff; }
  body {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 10pt;
    line-height: 1.4;
    color: #111;
    padding: 5mm 4mm 8mm 4mm;
    width: 80mm;
    margin: 0 auto;
  }

  /* flag bar */
  .flag { height:5px; background:linear-gradient(to right,#3A7BD5 0%,#3A7BD5 20%,#fff 20%,#fff 40%,#E8A020 40%,#E8A020 60%,#2EB85C 60%,#2EB85C 80%,#E53935 80%,#E53935 100%); margin-bottom:5px; border-radius:1px; }
  .center { text-align:center; }
  .bname  { font-family:'Outfit',sans-serif; font-size:16pt; font-weight:800; line-height:1.1; text-align:center; margin:4px 0; color:#9B2335; }
  .btag   { font-size:8.5pt; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .binfo  { font-size:8.5pt; color:#444; line-height:1.3; margin-bottom:6px; }
  .rlabel { display:inline-block; border:1.5px solid #111; padding:2px 10px; font-size:9pt; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; border-radius:2px; margin:6px 0; }
  .div  { border:none; border-top:1px dashed #999; margin:6px 0; }
  .divs { border:none; border-top:1.5px solid #111; margin:6px 0; }
  .meta { display:flex; justify-content:space-between; font-size:9.5pt; margin-bottom:2px; }
  .mval { font-weight:700; }
  .bill-to { margin:8px 0; }
  .blbl { font-size:8pt; font-weight:800; text-transform:uppercase; color:#777; margin-bottom:2px; }
  .bcname { font-weight:800; font-size:10.5pt; }
  .bcdet { font-size:9pt; color:#444; }
  .ihdr { display:flex; justify-content:space-between; font-size:8.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.5px; color:#555; margin-bottom:4px; }
  .grand { background:#111; color:#fff; padding:8px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; margin:8px 0; }
  .gl { font-family:'Outfit',sans-serif; font-size:12pt; font-weight:800; }
  .gv { font-family:'Outfit',sans-serif; font-size:15pt; font-weight:800; }
  .srow { display:flex; justify-content:space-between; font-size:10pt; margin-bottom:2px; }
  .slbl { color:#555; }
  .sval { font-weight:700; }
  .prow { display:flex; justify-content:space-between; align-items:center; font-size:10pt; margin-top:8px; }
  .sbadge { border:1.5px solid; padding:2px 8px; border-radius:3px; font-size:8.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.5px; }
  .spaid { border-color:#2EB85C; color:#14532D; background:#D5F5E3; }
  .sdue  { border-color:#E53935; color:#922B21; background:#FDEDEC; border-style:dashed; }
  .due-alert { display:flex; justify-content:space-between; font-size:11pt; font-weight:800; border-bottom:1.5px solid #111; padding-bottom:4px; margin-top:7px; color:#922B21; }
  .notes-box { margin-top:12px; font-size:8.5pt; color:#444; font-style:italic; border-left:2px solid #ddd; padding-left:8px; }
  .sig-row { display:flex; justify-content:space-between; margin-top:25px; padding:0 5px; }
  .sig-col { text-align:center; width:45%; }
  .sig-line { border-top:1px solid #111; padding-top:4px; font-size:7pt; font-weight:800; text-transform:uppercase; color:#777; }
  .dup  { text-align:center; font-size:13pt; font-weight:700; letter-spacing:2px; border:2px dashed #111; padding:4px; margin:10px 0; opacity:0.3; }
  .barcode { font-size:6pt; text-align:center; letter-spacing:4px; color:#333; margin:15px 0 5px 0; display:block; transform:scaleY(2); }
  .foot { text-align:center; margin-top:15px; }
  .ty  { font-family:'Outfit',sans-serif; font-size:13pt; font-weight:800; text-align:center; margin-bottom:4px; }
  .pw  { font-size:8pt; color:#777; margin-top:3px; text-align:center; }
</style></head><body>

<div class="flag"></div>
<div class="center">
  <div style="font-size:14pt;margin-bottom:2px;">☸</div>
  <div class="bname">${escapeHtml(data.businessName)}</div>
  ${data.businessTagline ? `<div class="btag">${escapeHtml(data.businessTagline)}</div>` : ''}
  <div class="binfo">
    ${data.businessAddress ? `${escapeHtml(data.businessAddress)}<br>` : ''}
    ${data.businessPhone ? `Ph: ${escapeHtml(data.businessPhone)}` : ''}${data.businessEmail ? ` &bull; ${escapeHtml(data.businessEmail)}` : ''}
    ${data.taxNo ? `<br>GST/TPN/CID: ${escapeHtml(data.taxNo)}` : ''}
  </div>
  <span class="rlabel">Invoice Receipt</span>
</div>

<hr class="divs" style="margin-top:8px;">

<div class="meta"><span>RCPT NO:</span><span class="mval">#${escapeHtml(data.invoiceNo)}</span></div>
<div class="meta"><span>DATE:</span><span class="mval">${escapeHtml(data.date)}</span></div>
<div class="meta"><span>TIME:</span><span class="mval">${new Date().toLocaleTimeString()}</span></div>

<hr class="div">

<div class="bill-to">
  <div class="blbl">Billed To</div>
  <div class="bcname">${escapeHtml(data.customerName || 'Walk-in Customer')}</div>
  ${data.customerPhone || data.customerGst ? `
    <div class="bcdet">
      ${data.customerPhone ? `Ph: ${escapeHtml(data.customerPhone)}<br>` : ''}
      ${data.customerGst ? `GST/TPN/CID: ${escapeHtml(data.customerGst)}` : ''}
    </div>
  ` : ''}
</div>

<hr class="divs">

<div class="ihdr"><span>Item Description</span><span>Total</span></div>
${items}

<hr class="divs">

<div class="srow"><span class="slbl">Subtotal</span><span class="sval">${data.subtotal.toFixed(2)}</span></div>
<div class="srow"><span class="slbl">${data.taxType === 'domestic' ? 'Domestic GST' : 'GST (Tax)'}</span><span class="sval">+ ${data.gstAmount.toFixed(2)}</span></div>
${data.discountAmount && data.discountAmount > 0 ? `<div class="srow"><span class="slbl">Discount</span><span class="sval" style="color:#E53935;">- ${data.discountAmount.toFixed(2)}</span></div>` : ''}

<div class="grand"><span class="gl">TOTAL</span><span class="gv">Nu. ${data.total.toFixed(2)}</span></div>

<div class="prow">
  <span>MODE: <strong style="text-transform:uppercase;">${escapeHtml(data.paymentMode)}</strong></span>
  <span class="sbadge ${paid ? 'spaid' : 'sdue'}">${paid ? '✓ PAID' : '⚠ CREDIT'}</span>
</div>

${!paid ? `<div class="due-alert"><span>BALANCE DUE</span><span>Nu. ${data.total.toFixed(2)}</span></div>` : ''}

${data.notes ? `<div class="notes-box"><strong>Note:</strong> ${escapeHtml(data.notes)}</div>` : ''}

<div class="sig-row">
  <div class="sig-col"><div class="sig-line">Customer</div></div>
  <div class="sig-col">
    <div style="position:relative; display:inline-block; width:100%;">
      ${data.businessSeal ? `<img src="${escapeHtml(data.businessSeal)}" style="position:absolute; bottom:5px; right:0; width:50px; height:50px; opacity:0.6; z-index:1; pointer-events:none;">` : ''}
      <div style="position:relative; z-index:2;">
        ${data.businessSignature ? `<img src="${escapeHtml(data.businessSignature)}" style="max-width:80px; max-height:35px; margin-bottom:-10px;">` : ''}
        <div class="sig-line">Authorized</div>
      </div>
    </div>
  </div>
</div>

${data.isDuplicate ? '<div class="dup">DUPLICATE COPY</div>' : ''}
<span class="barcode">| || ||| | ||| || || | ||| |</span>

<div class="foot">
  <div class="ty">THANK YOU!</div>
  <div class="pw">Kingdom of Bhutan 🇧🇹</div>
  <div class="pw">Jinda POS · powered by Phojaa95</div>
</div>

<div class="flag" style="margin-top:10px;"></div>

</body></html>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BARCODE LABEL PRINTING
  // ═══════════════════════════════════════════════════════════════════════════

  printBarcodes(mappings: any[]): ApiResponse {
    try {
      const html = this.generateBarcodeLabelsHTML(mappings);
      (global as any).lastPrintHTML = html;
      return { success: true, message: 'Barcode labels sent to printer' };
    } catch (error: any) {
      return { success: false, message: 'Failed to print barcodes: ' + error.message };
    }
  }

  private generateBarcodeLabelsHTML(mappings: any[]): string {
    const labels = mappings.map(m => `
      <div class="label-box">
        <div class="label-item-name">${m.itemName || 'Product'}</div>
        <div class="label-item-code">${m.itemCode || ''}</div>
        <div class="barcode-container">
          ${this.generateCode39SVG(m.barcode)}
        </div>
        <div class="barcode-text">${m.barcode}</div>
      </div>
    `).join('');

    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10mm; }
  .label-box { 
    height: 35mm; 
    border: 1px dashed #ccc; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    padding: 5mm; 
    text-align: center;
    overflow: hidden;
  }
  .label-item-name { font-size: 9pt; font-weight: 700; color: #000; margin-bottom: 2px; height: 2.8em; overflow: hidden; }
  .label-item-code { font-size: 7pt; color: #666; margin-bottom: 4px; }
  .barcode-container { width: 100%; height: 12mm; display: flex; align-items: center; justify-content: center; }
  .barcode-text { font-size: 8pt; font-family: monospace; margin-top: 2px; letter-spacing: 2px; }
  svg { width: 100%; height: 100%; }
  @media print { .label-box { border: 1px solid #eee; } }
</style></head><body>
<div class="grid">${labels}</div>
</body></html>`;
  }

  /**
   * Simple Code 39 Barcode Generator (SVG)
   * Supports: 0-9, A-Z, space, -, ., $, /, +, %
   */
  private generateCode39SVG(text: string): string {
    const code39: Record<string, string> = {
      '0': 'n n n w w n w n n', '1': 'w n n w n n n n w', '2': 'n n w w n n n n w', '3': 'w n w w n n n n n',
      '4': 'n n n w w n n n w', '5': 'w n n w w n n n n', '6': 'n n w w w n n n n', '7': 'n n n w n n w n w',
      '8': 'w n n w n n w n n', '9': 'n n w w n n w n n', 'A': 'w n n n n w n n w', 'B': 'n n w n n w n n w',
      'C': 'w n w n n w n n n', 'D': 'n n n n w w n n w', 'E': 'w n n n w w n n n', 'F': 'n n w n w w n n n',
      'G': 'n n n n n w w n w', 'H': 'w n n n n w w n n', 'I': 'n n w n n w w n n', 'J': 'n n n n w w w n n',
      'K': 'w n n n n n n w w', 'L': 'n n w n n n n w w', 'M': 'w n w n n n n w n', 'N': 'n n n n w n n w w',
      'O': 'w n n n w n n w n', 'P': 'n n w n w n n w n', 'Q': 'n n n n n n w w w', 'R': 'w n n n n n w w n',
      'S': 'n n w n n n w w n', 'T': 'n n n n w n w w n', 'U': 'w w n n n n n n w', 'V': 'n w w n n n n n w',
      'W': 'w w w n n n n n n', 'X': 'n w n n w n n n w', 'Y': 'w w n n w n n n n', 'Z': 'n w w n w n n n n',
      '-': 'n w n n n n w n w', '.': 'w w n n n n w n n', ' ': 'n w w n n n w n n', '*': 'n w n n w n w n n',
      '$': 'n w n w n w n n n', '/': 'n w n w n n n w n', '+': 'n w n n n w n w n', '%': 'n n n w n w n w n'
    };

    const fullText = `*${text.toUpperCase()}*`;
    let svgPath = '';
    let x = 0;
    const narrowWidth = 1;
    const wideWidth = 3;
    const height = 40;

    for (let i = 0; i < fullText.length; i++) {
      const char = fullText[i];
      const pattern = code39[char] || code39[' '];
      const bars = pattern.split(' ');

      for (let j = 0; j < bars.length; j++) {
        const isWide = bars[j] === 'w';
        const width = isWide ? wideWidth : narrowWidth;

        if (j % 2 === 0) { // Bar
          svgPath += `M${x},0 h${width} v${height} h-${width} Z `;
        }
        x += width;
      }
      x += narrowWidth; // Inter-character gap
    }

    return `<svg viewBox="0 0 ${x} ${height}" preserveAspectRatio="none"><path d="${svgPath}" fill="#000" /></svg>`;
  }
}
