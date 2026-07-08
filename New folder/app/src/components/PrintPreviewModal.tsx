import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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

const TEMPLATES = [
    { id: 'standard',     icon: FileText,   label: 'Standard',     desc: 'Classic A4' },
    { id: 'modern',       icon: Layout,      label: 'Modern',       desc: 'Hero A4' },
    { id: 'professional', icon: FileText,    label: 'Professional', desc: 'Bordered A4' },
    { id: 'thermal',      icon: Smartphone,  label: 'Thermal',      desc: '80mm Receipt' },
] as const;

export function PrintPreviewModal({ isOpen, onClose, data }: PrintPreviewModalProps) {
    const [template, setTemplate] = useState<InvoiceTemplate>('standard');
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const enrichAndPreview = async () => {
            if (data && isOpen) {
                try {
                    // Enrich data with seal and signature from settings if not present
                    const enrichedData = { ...data };
                    
                    // Always try to get latest assets from settings for preview
                    const [sealRes, sigRes] = await Promise.all([
                        window.electronSecureAPI.settings.getSeal(),
                        window.electronSecureAPI.settings.getSignature()
                    ]);
                    
                    if (sealRes?.success && sealRes.data) enrichedData.businessSeal = sealRes.data;
                    if (sigRes?.success && sigRes.data) enrichedData.businessSignature = sigRes.data;

                    const html = printingService.generatePreviewHTML(enrichedData, template);
                    setPreviewHtml(html);
                } catch (e) {
                    console.error('Preview error:', e);
                }
            }
        };
        
        enrichAndPreview();
    }, [data, template, isOpen]);

    // Handle responsive scaling
    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('preview-container');
            if (!container) return;

            const isThermal = template === 'thermal';
            const baseWidth = isThermal ? 340 : 794;
            const containerWidth = container.clientWidth - 32; // padding

            if (containerWidth < baseWidth) {
                setScale(containerWidth / baseWidth);
            } else {
                setScale(1);
            }
        };

        if (isOpen) {
            handleResize();
            window.addEventListener('resize', handleResize);
            // Also trigger after a short delay to ensure DOM is ready
            setTimeout(handleResize, 100);
        }
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, template]);

    const handlePrint = async () => {
        if (!data) return;

        // Check if running in Electron
        if (typeof window === 'undefined' || !window.electronSecureAPI?.print) {
            console.error('Print API not available. Ensure you are running in Electron.');
            alert('Printing is only available in the desktop application.');
            return;
        }

        try {
            // Fetch current assets to ensure print matches settings
            const [sealRes, sigRes] = await Promise.all([
                window.electronSecureAPI.settings.getSeal(),
                window.electronSecureAPI.settings.getSignature()
            ]);
            
            const enrichedData = { 
                ...data,
                businessSeal: sealRes?.success && sealRes.data ? sealRes.data : data.businessSeal,
                businessSignature: sigRes?.success && sigRes.data ? sigRes.data : data.businessSignature
            };

            if (template === 'thermal') {
                await window.electronSecureAPI.print.thermalReceipt({
                    invoiceNo: enrichedData.invoiceNo,
                    date: enrichedData.date,
                    businessName: enrichedData.businessName,
                    businessTagline: enrichedData.businessTagline,
                    businessAddress: enrichedData.businessAddressStreet || enrichedData.businessAddress,
                    businessPhone: enrichedData.businessPhone,
                    businessEmail: enrichedData.businessEmail,
                    taxNo: enrichedData.taxNo,
                    businessSeal: enrichedData.businessSeal,
                    businessSignature: enrichedData.businessSignature,
                    customerName: enrichedData.customerName,
                    customerPhone: enrichedData.customerPhone,
                    customerGst: enrichedData.customerGst,
                    items: enrichedData.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        price: item.unitPrice,
                    })),
                    subtotal: enrichedData.subtotal,
                    gstAmount: enrichedData.gstAmount,
                    discountAmount: enrichedData.discountAmount,
                    total: enrichedData.totalAmount,
                    paymentMode: enrichedData.paymentMode,
                    isDuplicate: enrichedData.isDuplicate,
                    notes: enrichedData.notes,
                    terms: enrichedData.terms,
                    taxType: enrichedData.taxType,
                });
            } else {
                await window.electronSecureAPI.print.invoice(enrichedData, template);
            }
            onClose();
        } catch (error) {
            console.error('Print failed:', error);
            alert('Print failed. Please check your printer connection and try again.');
        }
    };

    if (!data) return null;

    const isThermal = template === 'thermal';

    // Preview dimensions
    const baseWidth = isThermal ? 340 : 794;
    const previewWidth = `${baseWidth}px`;
    const previewHeight = isThermal ? 'auto' : '1123px';
    const iframeHeight = isThermal ? '700px' : '1200px';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="w-[98vw] max-w-6xl h-[96vh] flex flex-col p-0 overflow-hidden rounded-2xl border-white shadow-2xl bg-white"
                style={{ background: '#F8F7F4' }}
            >
                {/* ── Header ── */}
                <DialogHeader className="shrink-0 px-4 sm:px-12 py-3 sm:py-4 border-b border-stone-200 bg-white flex flex-col items-center justify-center gap-4">
                    <div className="flex flex-col items-center">
                        <DialogTitle className="text-base sm:text-lg font-black text-stone-900 tracking-tight uppercase font-sans">
                            Print Preview
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Preview your invoice before printing and select a template.
                        </DialogDescription>
                        <p className="text-[9px] sm:text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">
                            Select template · Preview · Execute Print
                        </p>
                    </div>

                    {/* Template Selection - Centered & Professional */}
                    <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                        {TEMPLATES.map((t) => {
                            const Icon = t.icon;
                            const active = template === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTemplate(t.id as InvoiceTemplate)}
                                    style={{
                                        background: active ? '#9B2335' : 'transparent',
                                        color: active ? '#fff' : '#78716c',
                                        boxShadow: active ? '0 2px 8px rgba(155,35,53,0.15)' : 'none',
                                    }}
                                    className={`
                                        relative px-3 sm:px-5 py-2 rounded-xl transition-all duration-200
                                        flex items-center justify-center gap-2
                                        min-w-[80px] sm:min-w-[120px]
                                    `}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
                                        {t.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </DialogHeader>

                {/* ── Preview Area ── */}
                <div 
                    id="preview-container"
                    className="flex-1 overflow-auto flex justify-center items-start p-4 sm:p-8" 
                    style={{ background: '#EDEAE3' }}
                >
                    {/* Page shadow wrapper with dynamic scaling */}
                    <div
                        className="transition-all duration-300 origin-top"
                        style={{
                            width: previewWidth,
                            minHeight: previewHeight,
                            background: '#fff',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            transform: `scale(${scale})`,
                        }}
                    >
                        <iframe
                            key={template}          /* force remount on template change */
                            srcDoc={previewHtml}
                            title="Print Preview"
                            style={{
                                border: 'none',
                                width: '100%',
                                height: iframeHeight,
                                display: 'block',
                            }}
                        />
                    </div>
                </div>

                {/* ── Footer ── */}
                <DialogFooter className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">
                            {isThermal ? '80mm Thermal Ready' : 'A4 Print Ready'}
                        </span>
                        {isThermal && (
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: '#FEF3C7', color: '#92400E' }}
                            >
                                ☸ Thermal
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 sm:flex-none rounded-xl border-stone-200 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 sm:px-6 py-4 sm:py-5"
                        >
                            Dismiss
                        </Button>
                        <Button
                            onClick={handlePrint}
                            style={{ background: '#9B2335' }}
                            className="flex-1 sm:flex-none text-white gap-2 rounded-xl py-4 sm:py-5 px-6 sm:px-8 shadow-lg transition-all active:scale-95 hover:opacity-90"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Print Now</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
