
import os

file_path = 'src/pages/SettingsPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes_applied = 0

# ── 1. Add domesticGstRate to gstForm state ───────────────────────────────────
old1 = "  const [gstForm, setGstForm] = useState({\n    gstRate: 5,\n    invoicePrefix: 'DT',\n  });"
new1 = "  const [gstForm, setGstForm] = useState({\n    gstRate: 5,\n    domesticGstRate: 0,\n    invoicePrefix: 'DT',\n  });"
if old1 in content:
    content = content.replace(old1, new1)
    changes_applied += 1
    print("1. gstForm state: OK")
else:
    print("1. FAIL - gstForm state not found")

# ── 2. Load domesticGstRate in loadSettings ──────────────────────────────────
old2 = "setGstForm({\n          gstRate: parseFloat(result.gst_rate) || 5,\n          invoicePrefix: result.invoice_prefix || 'DT',\n        });"
new2 = "setGstForm({\n          gstRate: parseFloat(result.gst_rate) || 5,\n          domesticGstRate: parseFloat(result.gst_rate_domestic) || 0,\n          invoicePrefix: result.invoice_prefix || 'DT',\n        });"
if old2 in content:
    content = content.replace(old2, new2)
    changes_applied += 1
    print("2. loadSettings: OK")
else:
    print("2. FAIL - loadSettings not found")

# ── 3. Include domesticGstRate in saveGSTSettings ────────────────────────────
old3 = "const result = await window.electronSecureAPI.settings.update({\n        gst_rate: gstForm.gstRate.toString(),\n        invoice_prefix: gstForm.invoicePrefix,\n      });"
new3 = "const result = await window.electronSecureAPI.settings.update({\n        gst_rate: gstForm.gstRate.toString(),\n        gst_rate_domestic: gstForm.domesticGstRate.toString(),\n        invoice_prefix: gstForm.invoicePrefix,\n      });"
if old3 in content:
    content = content.replace(old3, new3)
    changes_applied += 1
    print("3. saveGSTSettings: OK")
else:
    print("3. FAIL - saveGSTSettings not found")

# ── 4. Add domestic rate input field in the GST form UI ──────────────────────
# Find the invoice prefix input block to insert before it
old4 = "case 'gst':\n        return (\n          <form onSubmit={saveGSTSettings} className=\"space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500\">\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-8\">\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-black text-slate-400 uppercase tracking-widest ml-1\">Universal GST Ratio (%)</label>\n                <input\n                  type=\"number\"\n                  value={gstForm.gstRate}\n                  onChange={(e) => setGstForm({ ...gstForm, gstRate: Number(e.target.value) })}\n                  className=\"w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-slate-900 text-2xl\"\n                  min={0}\n                  max={100}\n                  step={0.01}\n                />"

new4 = "case 'gst':\n        return (\n          <form onSubmit={saveGSTSettings} className=\"space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500\">\n            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-8\">\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-black text-slate-400 uppercase tracking-widest ml-1\">Standard GST Rate (%)</label>\n                <input\n                  type=\"number\"\n                  value={gstForm.gstRate}\n                  onChange={(e) => setGstForm({ ...gstForm, gstRate: Number(e.target.value) })}\n                  className=\"w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bhutan-maroon/10 focus:bg-white transition-all font-black text-slate-900 text-2xl\"\n                  min={0}\n                  max={100}\n                  step={0.01}\n                />\n                <p className=\"text-xs text-slate-400 font-bold uppercase tracking-widest ml-1\">Applied to standard/retail sales</p>\n              </div>\n              <div className=\"space-y-2\">\n                <label className=\"block text-xs font-black text-slate-400 uppercase tracking-widest ml-1\">Domestic GST Rate (%)</label>\n                <input\n                  type=\"number\"\n                  value={gstForm.domesticGstRate}\n                  onChange={(e) => setGstForm({ ...gstForm, domesticGstRate: Number(e.target.value) })}\n                  className=\"w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-600/10 focus:bg-white transition-all font-black text-slate-900 text-2xl\"\n                  min={0}\n                  max={100}\n                  step={0.01}\n                />\n                <p className=\"text-xs text-slate-400 font-bold uppercase tracking-widest ml-1\">Applied to domestic/exempt sales (usually 0%)</p>\n              </div>"

if old4 in content:
    content = content.replace(old4, new4)
    changes_applied += 1
    print("4. GST UI fields: OK")
else:
    # Try finding without the trailing part to see if it differs
    test = "case 'gst':\n        return (\n          <form onSubmit={saveGSTSettings}"
    if test in content:
        print("4. FAIL - outer match found but inner content differs")
        idx = content.find(test)
        print(repr(content[idx:idx+600]))
    else:
        print("4. FAIL - GST UI section not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone: {changes_applied}/4 changes applied")
