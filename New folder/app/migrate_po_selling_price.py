import sqlite3
import os

db_path = os.path.expandvars('%APPDATA%\\Jinda\\dhisum_tseyig.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("PRAGMA table_info(purchase_order_items)")
    columns = [col[1] for col in cur.fetchall()]
    
    if 'selling_price' not in columns:
        cur.execute("ALTER TABLE purchase_order_items ADD COLUMN selling_price REAL DEFAULT 0")
        print("Added selling_price column to purchase_order_items")
    else:
        print("selling_price column already exists")
        
    conn.commit()
    conn.close()
else:
    print("DB not found")
