import sqlite3
db = sqlite3.connect('D:/Project/project_ml_uas/backend/finance.db')
c = db.cursor()
c.execute("UPDATE expenses SET category = 'Transportation' WHERE category = 'Transportasi'")
c.execute("UPDATE expenses SET category = 'Other' WHERE category IN ('Lain-lain', 'Lain2')")
c.execute("UPDATE expenses SET category = 'Shopping' WHERE category IN ('Belanja', 'Kebutuhan')")
c.execute("UPDATE expenses SET category = 'Food & Dining' WHERE category = 'Makanan'")
c.execute("DELETE FROM categories WHERE name NOT IN ('Transportation', 'Food & Dining', 'Shopping', 'Other')")
existing = [row[0] for row in c.execute("SELECT name FROM categories").fetchall()]
for cat in ['Transportation', 'Food & Dining', 'Shopping', 'Other']:
    if cat not in existing:
        c.execute("INSERT INTO categories (name) VALUES (?)", (cat,))
db.commit()
db.close()
print('DB Updated')
