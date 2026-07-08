
import os
import sys

file_path = 'src/pages/POSPage.tsx'
if not os.path.exists(file_path):
    print(f"Error: {file_path} not found")
    sys.exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    try {
      if (result?.success) {"""

replacement = """    try {
      const result = await window.electronSecureAPI.emailInvoice?.send({
        ...printData,
        customerEmail: emailInvoiceData.customerEmail,
        businessName: emailInvoiceData.businessName || printData?.businessName || 'Jinda',
      });
      if (result?.success) {"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
