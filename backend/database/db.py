import os
import pymysql
import sys

# Database Configuration (Read from environment variables, common in AWS Lambda)
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'root')
DB_NAME = os.environ.get('DB_NAME', 'online_exam_db')

def get_db_connection():
    """
    Establishes and returns a connection to the MySQL database.
    If database connection fails, prints warning and raises exception or mock connection logic.
    """
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5
        )
        return connection
    except Exception as e:
        print(f"Error connecting to MySQL Database ({DB_HOST}): {e}", file=sys.stderr)
        raise e
