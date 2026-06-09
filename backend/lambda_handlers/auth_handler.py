import json
import sys
import os

# Adjust path to import db
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.db import get_db_connection

def lambda_handler(event, context):
    """
    AWS Lambda handler for authentication: registration and login.
    Expected paths: /auth/login, /auth/register
    """
    # Enable CORS headers for cross-origin frontend requests
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    }

    # Handle API Gateway preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": "CORS preflight ok"})
        }

    path = event.get('path', '')
    body_str = event.get('body', '{}') or '{}'
    
    try:
        body = json.loads(body_str)
    except Exception:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Invalid JSON request body"})
        }

    # Route: /auth/login
    if "/auth/login" in path:
        return handle_login(body, headers)
        
    # Route: /auth/register
    elif "/auth/register" in path:
        return handle_register(body, headers)
        
    else:
        return {
            "statusCode": 404,
            "headers": headers,
            "body": json.dumps({"error": f"Path '{path}' not found"})
        }

def handle_login(body, headers):
    email = body.get('email')
    password = body.get('password')

    if not email or not password:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Email and password are required"})
        }

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Query for the user by email
            sql = "SELECT id, name, email, password_hash, role FROM users WHERE email = %s"
            cursor.execute(sql, (email,))
            user = cursor.fetchone()

            if not user:
                return {
                    "statusCode": 401,
                    "headers": headers,
                    "body": json.dumps({"error": "Invalid email or password"})
                }

            # Verify password (in a real app, hash checking e.g., bcrypt.checkpw should be used)
            if user['password_hash'] != password:
                return {
                    "statusCode": 401,
                    "headers": headers,
                    "body": json.dumps({"error": "Invalid email or password"})
                }

            # Return success response with user profile details
            payload = {
                "message": "Login successful",
                "token": f"session_token_for_user_{user['id']}",
                "user": {
                    "id": user['id'],
                    "name": user['name'],
                    "email": user['email'],
                    "role": user['role']
                }
            }
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(payload)
            }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Database error: {str(e)}"})
        }
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def handle_register(body, headers):
    name = body.get('name')
    email = body.get('email')
    password = body.get('password')
    role = body.get('role', 'student') # default role is student

    if not name or not email or not password:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Name, email, and password are required"})
        }

    if role not in ['student', 'admin']:
        role = 'student'

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Check if email exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return {
                    "statusCode": 409,
                    "headers": headers,
                    "body": json.dumps({"error": "Email is already registered"})
                }

            # Insert new user
            sql = "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (name, email, password, role))
            conn.commit()
            
            user_id = cursor.lastrowid
            
            payload = {
                "message": "User registered successfully",
                "user": {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "role": role
                }
            }
            return {
                "statusCode": 201,
                "headers": headers,
                "body": json.dumps(payload)
            }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": f"Database error: {str(e)}"})
        }
    finally:
        if 'conn' in locals() and conn:
            conn.close()
