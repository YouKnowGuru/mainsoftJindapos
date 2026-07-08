
import os

file_path = 'src/services/AccountingEngineService.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Add taxType to EngineEvent interface
old1 = "  createdBy?: number;\n  invoiceDetails?: {\n    dueDate?: string | null;"
new1 = "  createdBy?: number;\n  taxType?: 'standard' | 'domestic';\n  invoiceDetails?: {\n    dueDate?: string | null;"
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("1. EngineEvent updated")
else:
    print("1. FAIL - EngineEvent not found")

# 2. Update INSERT INTO invoices
old2 = """    const result = this.db.prepare(`
      INSERT INTO invoices 
      (invoice_no, transaction_id, contact_id, date, due_date, subtotal, gst_amount, discount_amount, total_amount, balance_due, payment_status, notes, terms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNo,
      transactionId,
      event.contactId || null,
      event.date,
      details.dueDate || null,
      event.subtotal,
      event.gstAmount,
      event.discountAmount,
      event.netAmount,
      event.paymentMode === 'credit' ? event.netAmount : 0,
      details.paymentStatus,
      details.notes || null,
      details.terms || null
    );"""

new2 = """    const result = this.db.prepare(`
      INSERT INTO invoices 
      (invoice_no, transaction_id, contact_id, date, due_date, subtotal, gst_amount, discount_amount, total_amount, balance_due, payment_status, notes, terms, tax_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNo,
      transactionId,
      event.contactId || null,
      event.date,
      details.dueDate || null,
      event.subtotal,
      event.gstAmount,
      event.discountAmount,
      event.netAmount,
      event.paymentMode === 'credit' ? event.netAmount : 0,
      details.paymentStatus,
      details.notes || null,
      details.terms || null,
      event.taxType || 'standard'
    );"""

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("2. Invoice insert updated")
else:
    print("2. FAIL - Invoice insert not found")
    idx = content.find("INSERT INTO invoices")
    if idx >= 0:
        print("Found nearby:")
        print(repr(content[idx-50:idx+400]))

if changes > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
print(f"Done: {changes}/2 changes")
