
import os, sys

file_path = 'src/pages/POSPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes_applied = 0

# ── 1. Add taxType and domesticGstRate state declarations ───────────────────
old1 = "  const [defaultGstRate, setDefaultGstRate] = useState(5); // Will be overridden by settings"
new1 = (
    "  const [defaultGstRate, setDefaultGstRate] = useState(5); // Will be overridden by settings\n"
    "  const [domesticGstRate, setDomesticGstRate] = useState(0); // Domestic GST rate from settings\n"
    "  const [taxType, setTaxType] = useState<'standard' | 'domestic'>('standard');"
)
if old1 in content:
    content = content.replace(old1, new1)
    changes_applied += 1
    print("1. State declarations: OK")
else:
    print("1. FAIL - State not found")

# ── 2. Load domesticGstRate in loadDefaults ──────────────────────────────────
old2 = (
    "        if (defaults.defaultGstRate !== undefined) {\n"
    "          setDefaultGstRate(defaults.defaultGstRate);\n"
    "        }"
)
new2 = (
    "        if (defaults.defaultGstRate !== undefined) {\n"
    "          setDefaultGstRate(defaults.defaultGstRate);\n"
    "        }\n"
    "        if (defaults.domesticGstRate !== undefined) {\n"
    "          setDomesticGstRate(defaults.domesticGstRate);\n"
    "        }"
)
if old2 in content:
    content = content.replace(old2, new2)
    changes_applied += 1
    print("2. loadDefaults: OK")
else:
    print("2. FAIL - loadDefaults not found")

# ── 3. Update addToCart: effective GST rate based on taxType ──────────────────
old3 = (
    "      // Check if item is GST applicable - if not, set rate to 0\n"
    "      const gstRate = item.gstApplicable ? (item.gstRate ?? defaultGstRate) : 0;\n"
    "      const gstAmount = item.gstApplicable\n"
    "        ? (unitPrice * gstRate / 100)\n"
    "        : 0;"
)
new3 = (
    "      // Check if item is GST applicable - if not, set rate to 0\n"
    "      // For domestic tax type, override the GST rate with the domestic rate\n"
    "      const effectiveGstRate = taxType === 'domestic' ? domesticGstRate : (item.gstRate ?? defaultGstRate);\n"
    "      const gstRate = item.gstApplicable ? effectiveGstRate : 0;\n"
    "      const gstAmount = item.gstApplicable\n"
    "        ? (unitPrice * gstRate / 100)\n"
    "        : 0;"
)
if old3 in content:
    content = content.replace(old3, new3)
    changes_applied += 1
    print("3. addToCart gstRate: OK")
else:
    print("3. FAIL - addToCart gstRate not found")

# ── 4. Pass taxType in processSale saleData ──────────────────────────────────
old4 = (
    "        paymentMode,\n"
    "        discountAmount,\n"
    "        notes,\n"
    "      };\n"
    "\n"
    "      const result = await window.electronSecureAPI.pos.createSale(saleData);"
)
new4 = (
    "        paymentMode,\n"
    "        discountAmount,\n"
    "        notes,\n"
    "        taxType,\n"
    "      };\n"
    "\n"
    "      const result = await window.electronSecureAPI.pos.createSale(saleData);"
)
if old4 in content:
    content = content.replace(old4, new4)
    changes_applied += 1
    print("4. processSale saleData: OK")
else:
    print("4. FAIL - processSale saleData not found")

# ── 5. Pass taxType in printData ─────────────────────────────────────────────
old5 = (
    "              terms: '',\n"
    "              notes: notes || '',\n"
    "            };"
)
new5 = (
    "              terms: '',\n"
    "              notes: notes || '',\n"
    "              taxType,\n"
    "            };"
)
if old5 in content:
    content = content.replace(old5, new5)
    changes_applied += 1
    print("5. printData taxType: OK")
else:
    print("5. FAIL - printData not found")

# ── 6. Fix GST label in totals panel ──────────────────────────────────────────
old6 = "                <span>GST ({defaultGstRate}%)</span>"
new6 = (
    "                <span>\n"
    "                  {taxType === 'domestic' ? `Domestic GST (${domesticGstRate}%)` : `GST (${defaultGstRate}%)`}\n"
    "                </span>"
)
if old6 in content:
    content = content.replace(old6, new6)
    changes_applied += 1
    print("6. GST label: OK")
else:
    print("6. FAIL - GST label not found")

# ── 7. Insert GST toggle UI just before totals section ──────────────────────
old7 = (
    "          {/* Totals */}\n"
    "          <div className=\"p-6 border-t border-slate-50 bg-slate-50/50\">"
)
new7 = (
    "          {/* GST Type Toggle */}\n"
    "          <div className=\"px-4 py-3 border-t border-slate-50\">\n"
    "            <div className=\"flex items-center justify-between gap-2\">\n"
    "              <span className=\"text-[10px] font-black text-slate-400 uppercase tracking-widest\">Tax Mode</span>\n"
    "              <div className=\"flex bg-slate-100 rounded-lg p-0.5 gap-0.5\">\n"
    "                <button\n"
    "                  onClick={() => setTaxType('standard')}\n"
    "                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${\n"
    "                    taxType === 'standard'\n"
    "                      ? 'bg-white text-bhutan-maroon shadow-sm'\n"
    "                      : 'text-slate-500 hover:text-slate-700'\n"
    "                  }`}\n"
    "                >\n"
    "                  Standard GST ({defaultGstRate}%)\n"
    "                </button>\n"
    "                <button\n"
    "                  onClick={() => setTaxType('domestic')}\n"
    "                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${\n"
    "                    taxType === 'domestic'\n"
    "                      ? 'bg-white text-emerald-600 shadow-sm'\n"
    "                      : 'text-slate-500 hover:text-slate-700'\n"
    "                  }`}\n"
    "                >\n"
    "                  Domestic GST ({domesticGstRate}%)\n"
    "                </button>\n"
    "              </div>\n"
    "            </div>\n"
    "          </div>\n"
    "\n"
    "          {/* Totals */}\n"
    "          <div className=\"p-6 border-t border-slate-50 bg-slate-50/50\">"
)
if old7 in content:
    content = content.replace(old7, new7)
    changes_applied += 1
    print("7. GST toggle UI: OK")
else:
    print("7. FAIL - Totals header not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone: {changes_applied}/7 changes applied")
