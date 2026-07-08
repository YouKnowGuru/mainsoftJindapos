
import os

file_path = 'src/services/PrintingService.ts'
with open(file_path, 'rb') as f:
    content = f.read()

changes = 0

# A4 templates: "GST / Tax</span><span class="tot-v">+ ${data.gstAmount.toFixed(2)}</span></div>"
old_a = b'class="tot-l">GST / Tax</span><span class="tot-v">+ ${data.gstAmount.toFixed(2)}</span></div>'
new_a = b'class="tot-l">${data.taxType === \'domestic\' ? \'Domestic GST\' : \'GST / Tax\'}</span><span class="tot-v">+ ${data.gstAmount.toFixed(2)}</span></div>'
count_a = content.count(old_a)
if count_a > 0:
    content = content.replace(old_a, new_a)
    changes += count_a
    print(f"A4 'GST / Tax' labels: {count_a} replaced OK")
else:
    print("FAIL - 'GST / Tax' label not found")

# Professional template: 'GST</span><span class="tv">'
old_b = b'class="tl">GST</span><span class="tv">+ ${data.gstAmount.toFixed(2)}</span></div>'
new_b = b'class="tl">${data.taxType === \'domestic\' ? \'Domestic GST\' : \'GST\'}</span><span class="tv">+ ${data.gstAmount.toFixed(2)}</span></div>'
count_b = content.count(old_b)
if count_b > 0:
    content = content.replace(old_b, new_b)
    changes += count_b
    print(f"Professional 'GST' label: {count_b} replaced OK")
else:
    # Try alternate class
    old_b2 = b'>GST</span><span class="tv">+ ${data.gstAmount.toFixed(2)}</span></div>'
    count_b2 = content.count(old_b2)
    print(f"FAIL - Professional 'GST' not found (tried alt: {count_b2} matches)")

# Thermal template: 'GST (Tax)</span><span class="sval">'
old_c = b'GST (Tax)</span><span class="sval">+ ${data.gstAmount.toFixed(2)}</span></div>'
new_c = b'${data.taxType === \'domestic\' ? \'Domestic GST\' : \'GST (Tax)\'}</span><span class="sval">+ ${data.gstAmount.toFixed(2)}</span></div>'
count_c = content.count(old_c)
if count_c > 0:
    content = content.replace(old_c, new_c)
    changes += count_c
    print(f"Thermal 'GST (Tax)' label: {count_c} replaced OK")
else:
    print("FAIL - Thermal 'GST (Tax)' label not found")

with open(file_path, 'wb') as f:
    f.write(content)

print(f"\nDone: {changes} total replacements")
