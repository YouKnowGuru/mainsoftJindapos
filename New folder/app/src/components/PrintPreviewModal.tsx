import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Printer, Layout, FileText, Smartphone } from 'lucide-react';
import { PrintingService } from '../services/PrintingService';
import type { InvoiceTemplate } from '../services/PrintingService';
import type { PrintInvoiceData } from '../types';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PrintInvoiceData | null;
}

const printingService = new PrintingService();

export function PrintPreviewModal({ isOpen, onClose, data }: PrintPreviewModalProps) {
    const [template, setTemplate] = useState<InvoiceTemplate>('standard');
    const [previewHtml, setPreviewHtml] = useState<string>('');

    useEffect(() => {
        if (data && isOpen) {
            const html = printingService.generatePreviewHTML(data, template);
            setPreviewHtml(html);
        }
    }, [data, template, isOpen]);

    const handlePrint = async () => {
        if (!data) return;

        try {
            if (template === 'thermal') {
                await window.electronAPI.print.thermalReceipt({
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
                });
            } else {
                await window.electronAPI.print.invoice(data, template);
            }
            onClose();
        } catch (error) {
            console.error('Print failed:', error);
        }
    };

    if (!data) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 backdrop-blur-2xl rounded-[40px] border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
                <DialogHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 bg-white/50">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">Print Preview</DialogTitle>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Visualization & Layout Selection</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-[24px] border border-slate-200/50">
                        {[
                            { id: 'standard', icon: FileText, label: 'Standard' },
                            { id: 'modern', icon: Layout, label: 'Modern' },
                            { id: 'professional', icon: FileText, label: 'Pro' },
                            { id: 'thermal', icon: Smartphone, label: 'Thermal' }
                        ].map((t) => {
                            const Icon = t.icon;
                            const isActive = template === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTemplate(t.id as InvoiceTemplate)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${isActive
                                        ? 'bg-bhutan-maroon text-white shadow-lg shadow-bhutan-maroon/20 scale-105'
                                        : 'text-slate-500 hover:bg-white hover:text-bhutan-maroon'}`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </DialogHeader>

                <div className="flex-1 bg-slate-50/50 overflow-auto p-12 flex justify-center custom-scrollbar">
                    <div
                        className={`bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 origin-top overflow-hidden border border-slate-200/50 rounded-sm ${template === 'thermal' ? 'w-[80mm]' : 'w-[210mm]'
                            }`}
                        style={{
                            minHeight: template === 'thermal' ? '150mm' : '297mm',
                            height: 'fit-content'
                        }}
                    >
                        <iframe
                            srcDoc={previewHtml}
                            title="Print Preview"
                            className="w-full h-full min-h-[600px]"
                            style={{ border: 'none', height: template === 'thermal' ? '1000px' : '1200px' }}
                        />
                    </div>
                </div>

                <DialogFooter className="p-8 border-t border-slate-100 bg-white/50 backdrop-blur-md flex items-center justify-between sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            {template === 'thermal' ? '80mm Thermal Engine Ready' : 'A4 Vector PDF Engine Ready'}
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="rounded-2xl border-slate-200 text-xs font-black uppercase tracking-widest py-6 px-8 hover:bg-slate-50 transition-all"
                        >
                            Dismiss
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="bg-bhutan-maroon hover:bg-bhutan-maroon/90 text-white gap-3 rounded-2xl py-6 px-10 shadow-xl shadow-bhutan-maroon/20 transition-all active:scale-95 group"
                        >
                            <Printer className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Execute Print</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
