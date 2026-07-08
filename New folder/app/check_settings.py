import sqlite3
import os

db_path = os.path.expandvars('%APPDATA%\\Jinda\\dhisum_tseyig.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings WHERE key LIKE '%gst%'")
    rows = cur.fetchall()
    for row in rows:
        print(f"{row[0]}: {row[1]}")
    conn.close()
else:
    print("DB not found")
