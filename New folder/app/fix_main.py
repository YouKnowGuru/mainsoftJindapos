
import os
import sys

file_path = 'electron/main.ts'
if not os.path.exists(file_path):
    print(f"Error: {file_path} not found")
    sys.exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "    return { success, message: success ? 'Email client opened' : 'Failed to open email client' };"
replacement = "    const success = emailInvoiceService.sendInvoiceViaEmail(data.customerEmail, data);\n    return { success, message: success ? 'Email client opened' : 'Failed to open email client' };"

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
