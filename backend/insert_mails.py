import mysql.connector
from datetime import datetime, timedelta
import random

def run():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="gmail_clone"
    )
    cursor = db.cursor()

    def insert_mails(folder, count):
        for i in range(count):
            subject = f"Sample {folder} Email #{i+1}"
            desc = f"This is an auto-generated email for the {folder} folder. It contains some text to simulate a real email message."
            ts = datetime.now() - timedelta(minutes=random.randint(1, 10000))
            
            sql = """
                INSERT INTO mails 
                (folder, subject, description, is_read, timestamp, receiver_id, sender_id, is_important, is_starred, is_scheduled, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            # We set both folder and category just in case backend uses either
            val = (folder, subject, desc, 0, ts, 3, 2, 0, 0, 0, folder)
            cursor.execute(sql, val)

    insert_mails("INBOX", 5)
    insert_mails("PROMOTIONS", 10)
    insert_mails("SOCIAL", 15)
    insert_mails("UPDATES", 12)

    db.commit()
    print("Successfully inserted 42 emails.")
    db.close()

if __name__ == '__main__':
    run()
