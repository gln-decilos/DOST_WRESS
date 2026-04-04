# check_postgres_connection.py
import psycopg2
from psycopg2 import OperationalError

# Replace with your PostgreSQL credentials
DB_NAME = "wress_db"
DB_USER = "wress_admin"
DB_PASSWORD = "postgres123!"
DB_HOST = "localhost"
DB_PORT = "5432"

def check_connection():
    try:
        # Establish connection
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        # Create a cursor to test a query
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print("Connected to PostgreSQL successfully!")
        print(f"PostgreSQL version: {version[0]}")
        cursor.close()
        conn.close()
    except OperationalError as e:
        print("Failed to connect to PostgreSQL!")
        print(e)

if __name__ == "__main__":
    check_connection()