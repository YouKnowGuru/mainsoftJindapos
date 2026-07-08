import * as XLSX from 'xlsx';
import type { ApiResponse } from '../types';
import { AccountingService } from './AccountingService';
import { InventoryService } from './InventoryService';

export class CSVImportService {
  private accountingService: AccountingService;
  private inventoryService: InventoryService;

  constructor(accountingService: AccountingService, inventoryService: InventoryService) {
    this.accountingService = accountingService;
    this.inventoryService = inventoryService;
  }

  /**
   * Parse uploaded CSV/Excel file and return data
   */
  parseFile(fileBuffer: ArrayBuffer, sheetIndex = 0): ApiResponse<any[]> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
      const data = XLSX.utils.sheet_to_json(sheet);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, message: 'Failed to parse file: ' + error.message };
    }
  }

  /**
   * Import contacts from CSV/Excel
   */
  importContacts(data: any[], type: 'customer' | 'supplier'): ApiResponse<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const row of data) {
      try {
        if (!row.name) {
          errors.push(`Row ${imported + errors.length + 1}: Missing name`);
          continue;
        }

        const result = this.accountingService.createContact({
          type,
          name: String(row.name || '').trim(),
          contactPerson: row.contactPerson ? String(row.contactPerson).trim() : '',
          phone: row.phone ? String(row.phone).trim() : '',
          email: row.email ? String(row.email).trim() : '',
          address: row.address ? String(row.address).trim() : undefined,
          gstNumber: row.gstNumber ? String(row.gstNumber).trim().toUpperCase() : '',
          creditLimit: row.creditLimit !== undefined ? Number(row.creditLimit) : 50000,
          creditDays: row.creditDays !== undefined ? Number(row.creditDays) : 30,
          openingBalance: row.openingBalance !== undefined ? Number(row.openingBalance) : 0,
        });

        if (result.success) {
          imported++;
        } else {
          errors.push(`Row ${imported + errors.length + 1}: ${result.message}`);
        }
      } catch (error: any) {
        errors.push(`Row ${imported + errors.length + 1}: ${error.message}`);
      }
    }

    return { 
      success: errors.length === 0, 
      message: errors.length === 0 
        ? `Successfully imported ${imported} contacts` 
        : `Imported ${imported} contacts with ${errors.length} errors`, 
      data: { imported, errors } 
    };
  }

  /**
   * Import items from CSV/Excel
   */
  importItems(data: any[]): ApiResponse<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const row of data) {
      try {
        if (!row.name) {
          errors.push(`Row ${imported + errors.length + 1}: Missing name`);
          continue;
        }

        const result = this.inventoryService.createItem({
          code: row.code ? String(row.code).trim() : undefined,
          name: String(row.name).trim(),
          description: row.description ? String(row.description).trim() : undefined,
          category: row.category ? String(row.category).trim() : undefined,
          unit: row.unit ? String(row.unit).trim() : 'pcs',
          purchasePrice: row.purchasePrice !== undefined ? Number(row.purchasePrice) : 0,
          sellingPrice: row.sellingPrice !== undefined ? Number(row.sellingPrice) : 0,
          reorderLevel: row.reorderLevel !== undefined ? Number(row.reorderLevel) : 10,
          gstApplicable: row.gstApplicable !== undefined ? (String(row.gstApplicable).toLowerCase() === 'true' || row.gstApplicable === 1 || row.gstApplicable === '1' || row.gstApplicable === 'Yes') : true,
          gstRate: row.gstRate !== undefined ? Number(row.gstRate) : 5.0,
          openingStock: row.quantityInStock !== undefined ? Number(row.quantityInStock) : 0,
          openingPurchasePrice: row.purchasePrice !== undefined ? Number(row.purchasePrice) : 0,
        });

        if (result.success) {
          imported++;
        } else {
          errors.push(`Row ${imported + errors.length + 1}: ${result.message}`);
        }
      } catch (error: any) {
        errors.push(`Row ${imported + errors.length + 1}: ${error.message}`);
      }
    }

    return { 
      success: errors.length === 0, 
      message: errors.length === 0 
        ? `Successfully imported ${imported} items` 
        : `Imported ${imported} items with ${errors.length} errors`, 
      data: { imported, errors } 
    };
  }
}
