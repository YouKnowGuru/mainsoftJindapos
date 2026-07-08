import sqlite3
import os

db_path = os.path.expandvars('%APPDATA%\\Jinda\\dhisum_tseyig.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE purchase_orders ADD COLUMN tax_type TEXT DEFAULT 'standard'")
        conn.commit()
        print("Success: Added tax_type to purchase_orders")
    except Exception as e:
        print(f"Notice: {e}")
    conn.close()
else:
    print("Error: DB not found")
