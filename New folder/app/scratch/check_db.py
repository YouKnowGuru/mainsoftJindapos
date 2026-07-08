import sqlite3
import os

db_path = os.path.expanduser('~\\AppData\\Roaming\\Jinda\\dhisum_tseyig.db')
print(f"Checking DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n--- Settings ---")
    cursor.execute("SELECT key, value FROM settings")
    for row in cursor.fetchall():
        print(dict(row))

    print("\n--- GST Summary Logic Test ---")
    cursor.execute("""
        SELECT COALESCE(SUM(t.net_amount - t.gst_amount), 0) as total
        FROM transactions t
        JOIN invoices i ON i.transaction_id = t.id
        WHERE t.type = 'purchase' AND t.is_void = 0
        AND i.tax_type = 'domestic'
        AND t.id IN (SELECT DISTINCT transaction_id FROM gst_entries WHERE type = 'input' AND month = 5 AND year = 2026)
    """)
    print("Domestic Purchases (May 2026):", cursor.fetchone()['total'])

    conn.close()
except Exception as e:
    print(f"Error: {e}")
