
import os
import sys

file_path = 'src/services/ReportService.ts'
if not os.path.exists(file_path):
    print(f"Error: {file_path} not found")
    sys.exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace julianday('now') with julianday(date('now'))
new_content = content.replace("julianday('now')", "julianday(date('now'))")

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("NO CHANGES MADE")
