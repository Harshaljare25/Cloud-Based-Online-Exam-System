import json
import sys
import os
import re

# Adjust path to import db
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database.db import get_db_connection

def lambda_handler(event, context):
    """
    AWS Lambda handler for exam management: listing, loading questions, and evaluation.
    Expected endpoints:
      - GET /exams
      - GET /exams/{id}/questions
      - POST /exams/{id}/submit
    """
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"message": "CORS preflight ok"})
        }

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    # Parse path to match endpoints
    # 1. /exams
    if path == "/exams" or path == "/exams/":
        return list_exams(headers)

    # 2. /exams/{id}/questions
    questions_match = re.match(r'^/exams/(\d+)/questions/?$', path)
    if questions_match:
        exam_id = int(questions_match.group(1))
        return get_questions(exam_id, headers)

    # 3. /exams/{id}/submit
    submit_match = re.match(r'^/exams/(\d+)/submit/?$', path)
    if submit_match and method == 'POST':
        exam_id = int(submit_match.group(1))
        body_str = event.get('body', '{}') or '{}'
        try:
            body = json.loads(body_str)
        except Exception:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({"error": "Invalid JSON request body"})
            }
        return submit_exam(exam_id, body, headers)

    return {
        "statusCode": 404,
        "headers": headers,
        "body": json.dumps({"error": f"Endpoint '{method} {path}' not found"})
    }

def list_exams(headers):
    """Retrieves all exams list."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, title, description, duration_minutes FROM exams ORDER BY id DESC")
            exams = cursor.fetchall()
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(exams)
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

def get_questions(exam_id, headers):
    """Retrieves questions for an exam. Filters out correct_option for integrity."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # First check if exam exists
            cursor.execute("SELECT id, title, duration_minutes FROM exams WHERE id = %s", (exam_id,))
            exam = cursor.fetchone()
            if not exam:
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Exam not found"})
                }

            # Fetch questions for the exam (excluding 'correct_option' for students)
            sql = """
                SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d 
                FROM questions 
                WHERE exam_id = %s
            """
            cursor.execute(sql, (exam_id,))
            questions = cursor.fetchall()
            
            payload = {
                "exam": exam,
                "questions": questions
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

def submit_exam(exam_id, body, headers):
    """Evaluates student submission, logs to DB, and returns results summary."""
    user_id = body.get('userId')
    student_answers = body.get('answers', {})  # Dict structure: {"question_id_str": "A/B/C/D"}

    if not user_id:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "User ID is required"})
        }

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # 1. Fetch exam info to confirm existence
            cursor.execute("SELECT id, title FROM exams WHERE id = %s", (exam_id,))
            exam = cursor.fetchone()
            if not exam:
                return {
                    "statusCode": 404,
                    "headers": headers,
                    "body": json.dumps({"error": "Exam not found"})
                }

            # 2. Fetch the correct options for all questions in this exam
            sql = "SELECT id, question_text, correct_option FROM questions WHERE exam_id = %s"
            cursor.execute(sql, (exam_id,))
            db_questions = cursor.fetchall()
            
            total_questions = len(db_questions)
            if total_questions == 0:
                return {
                    "statusCode": 400,
                    "headers": headers,
                    "body": json.dumps({"error": "This exam contains no questions."})
                }

            correct_answers = 0
            breakdown = []

            # 3. Evaluate each answer
            for q in db_questions:
                q_id = q['id']
                correct_opt = q['correct_option']
                
                # Check what the student submitted (question keys can be string due to JSON)
                submitted_opt = student_answers.get(str(q_id)) or student_answers.get(q_id)
                
                is_correct = (submitted_opt == correct_opt)
                if is_correct:
                    correct_answers += 1
                
                breakdown.append({
                    "questionId": q_id,
                    "questionText": q['question_text'],
                    "submittedOption": submitted_opt if submitted_opt else "Unanswered",
                    "correctOption": correct_opt,
                    "isCorrect": is_correct
                })

            # Calculate score and percentage
            score = correct_answers
            percentage = round((correct_answers / total_questions) * 100, 2)
            
            # Simple passing grade criteria: >= 50%
            status = 'pass' if percentage >= 50.0 else 'fail'

            # 4. Save result to database
            insert_sql = """
                INSERT INTO results (user_id, exam_id, score, total_questions, correct_answers, percentage, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_sql, (user_id, exam_id, score, total_questions, correct_answers, percentage, status))
            conn.commit()
            result_id = cursor.lastrowid

            # 5. Build response payload
            result_payload = {
                "resultId": result_id,
                "examId": exam_id,
                "examTitle": exam['title'],
                "score": score,
                "totalQuestions": total_questions,
                "correctAnswers": correct_answers,
                "percentage": percentage,
                "status": status,
                "breakdown": breakdown
            }

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(result_payload)
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
