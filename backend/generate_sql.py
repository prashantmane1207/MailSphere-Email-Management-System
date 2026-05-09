import random
from datetime import datetime, timedelta

def run():
    sql = "USE gmail_clone;\n"
    
    def insert_mails(folder, count):
        nonlocal sql
        for i in range(count):
            subject = f"Sample {folder} Email #{i+1}"
            desc = f"This is an auto-generated email for the {folder} folder. It contains some text to simulate a real email message."
            ts = (datetime.now() - timedelta(minutes=random.randint(1, 10000))).strftime('%Y-%m-%d %H:%M:%S')
            sql += f"INSERT INTO mails (folder, subject, description, is_read, timestamp, receiver_id, sender_id, is_important, is_starred, is_scheduled, category) VALUES ('{folder}', '{subject}', '{desc}', 0, '{ts}', 3, 2, 0, 0, 0, '{folder}');\n"

    insert_mails("INBOX", 5)
    insert_mails("PROMOTIONS", 10)
    insert_mails("SOCIAL", 15)
    insert_mails("UPDATES", 12)

    with open("insert_mails.sql", "w") as f:
        f.write(sql)

if __name__ == '__main__':
    run()
