
import os

file_path = 'src/services/PrintingService.ts'
with open(file_path, 'rb') as f:
    content = f.read()

old = b'class="tl">Tax / GST</span><span class="tv">+ ${data.gstAmount.toFixed(2)}</span></div>'
new = b"class=\"tl\">${data.taxType === 'domestic' ? 'Domestic GST' : 'Tax / GST'}</span><span class=\"tv\">+ ${data.gstAmount.toFixed(2)}</span></div>"

count = content.count(old)
print(f"Found: {count}")
if count:
    content = content.replace(old, new)
    with open(file_path, 'wb') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
