import json
import sys
import os
import re

# Adjust path to import db
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.db import get_db_connection

def lambda_handler(event, context):
    """
    AWS Lambda handler for Admin Dashboard operations: questions CRUD and results analytics.
    Expected endpoints:
      - POST /admin/questions
      - DELETE /admin/questions/{id}
      - GET /admin/results
      - GET /admin/analytics
    """
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE"
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": "CORS preflight ok"})
        }

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')
    
    # Simple auth check (in a real-world scenario, you would decode a JWT or header)
    # For now, we rely on basic path routing

    # 1. GET /admin/results
    if path == "/admin/results" or path == "/admin/results/":
        return get_student_results(headers)

    # 2. GET /admin/analytics
    if path == "/admin/analytics" or path == "/admin/analytics/":
        return get_analytics(headers)

    # 3. POST /admin/questions
    if path == "/admin/questions" and method == 'POST':
        body_str = event.get('body', '{}') or '{}'
        try:
            body = json.loads(body_str)
        except Exception:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Invalid JSON request body"})
            }
        return add_question(body, headers)

    # 4. DELETE /admin/questions/{id}
    delete_match = re.match(r'^/admin/questions/(\d+)/?$', path)
    if delete_match and method == 'DELETE':
        question_id = int(delete_match.group(1))
        return delete_question(question_id, headers)

    return {
        "statusCode": 404,
        "headers": headers,
        "body": json.dumps({"error": f"Endpoint '{method} {path}' not found"})
    }

def get_student_results(headers):
    """Fetches list of all student exam attempt logs."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """
                SELECT r.id, u.name as student_name, u.email as student_email, 
                       e.title as exam_title, r.score, r.total_questions, 
                       r.percentage, r.status, r.submitted_at
                FROM results r
                JOIN users u ON r.user_id = u.id
                JOIN exams e ON r.exam_id = e.id
                ORDER BY r.submitted_at DESC
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            
            # Format timestamps to ISO strings for JSON safety
            for r in results:
                if 'submitted_at' in r and r['submitted_at']:
                    r['submitted_at'] = r['submitted_at'].isoformat()
            
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(results)
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

def get_analytics(headers):
    """Computes exam portal aggregate metrics and trends."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Metric A: Total Registered Students
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'")
            total_students = cursor.fetchone()['count']

            # Metric B: Total Exams Conducted
            cursor.execute("SELECT COUNT(*) as count FROM results")
            total_exams_taken = cursor.fetchone()['count']

            # Metric C: Average Score & Pass Rate
            cursor.execute("""
                SELECT 
                    AVG(percentage) as avg_percent,
                    SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as pass_count
                FROM results
            """)
            result_stats = cursor.fetchone()
            
            avg_percentage = round(float(result_stats['avg_percent'] or 0.0), 2)
            pass_count = result_stats['pass_count'] or 0
            pass_rate = round((pass_count / total_exams_taken * 100), 2) if total_exams_taken > 0 else 0.0

            # Metric D: Attempt Counts grouped by Exam (for visualization)
            sql_by_exam = """
                SELECT e.title as exam_title, COUNT(r.id) as attempts, AVG(r.percentage) as avg_score
                FROM exams e
                LEFT JOIN results r ON e.id = r.exam_id
                GROUP BY e.id, e.title
            """
            cursor.execute(sql_by_exam)
            exam_stats = cursor.fetchall()
            for row in exam_stats:
                row['avg_score'] = round(float(row['avg_score'] or 0.0), 2)

            analytics_payload = {
                "totalStudents": total_students,
                "totalExamsTaken": total_exams_taken,
                "averageScore": avg_percentage,
                "passRate": pass_rate,
                "examStats": exam_stats
            }

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(analytics_payload)
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

def add_question(body, headers):
    """Inserts a new question into the database."""
    exam_id = body.get('examId')
    question_text = body.get('questionText')
    option_a = body.get('optionA')
    option_b = body.get('optionB')
    option_c = body.get('optionC')
    option_d = body.get('optionD')
    correct_option = body.get('correctOption')

    if not all([exam_id, question_text, option_a, option_b, option_c, option_d, correct_option]):
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "All fields are required to create a question"})
        }

    if correct_option not in ['A', 'B', 'C', 'D']:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Correct option must be 'A', 'B', 'C', or 'D'"})
        }

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Verify exam exists
            cursor.execute("SELECT id FROM exams WHERE id = %s", (exam_id,))
            if not cursor.fetchone():
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Exam ID does not exist"})
                }

            sql = """
                INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option))
            conn.commit()
            q_id = cursor.lastrowid

            return {
                "statusCode": 201,
                "headers": headers,
                "body": json.dumps({
                    "message": "Question added successfully",
                    "questionId": q_id
                })
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

def delete_question(question_id, headers):
    """Deletes a question by ID."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Check if question exists
            cursor.execute("SELECT id FROM questions WHERE id = %s", (question_id,))
            if not cursor.fetchone():
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Question not found"})
                }

            cursor.execute("DELETE FROM questions WHERE id = %s", (question_id,))
            conn.commit()

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"message": "Question deleted successfully"})
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
