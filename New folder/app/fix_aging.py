
import os
import sys

file_path = 'src/services/AgedReportService.ts'
if not os.path.exists(file_path):
    print(f"Error: {file_path} not found")
    sys.exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "julianday(?) - julianday(COALESCE(i.due_date, i.date)) <= 30"
replacement = "julianday(?) - julianday(COALESCE(i.due_date, i.date)) BETWEEN 0 AND 30"

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
