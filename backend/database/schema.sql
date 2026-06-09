-- Cloud-Based Online Exam System Database Schema
-- Database: online_exam_db

CREATE DATABASE IF NOT EXISTS online_exam_db;
USE online_exam_db;

-- 1. Users Table (Supports Students and Admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Exams Table (Timed exam definitions)
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    question_text TEXT NOT NULL,
    option_a VARCHAR(255) NOT NULL,
    option_b VARCHAR(255) NOT NULL,
    option_c VARCHAR(255) NOT NULL,
    option_d VARCHAR(255) NOT NULL,
    correct_option CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Results / Submissions Table (Records student exam results)
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    score INT NOT NULL, -- Number of correct answers
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    status ENUM('pass', 'fail') NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Seeding Initial Sample Data (Optional, for easy startup)
-- Default admin password: admin123 (would normally be bcrypt hashed)
-- Default student password: student123
INSERT INTO users (name, email, password_hash, role) VALUES
('System Admin', 'admin@exam.com', 'admin123', 'admin'),
('John Doe', 'john@exam.com', 'student123', 'student');

INSERT INTO exams (title, description, duration_minutes) VALUES
('Python Programming Basics', 'Test your knowledge on core Python fundamentals, loops, data structures, and OOP concepts.', 10),
('Cloud Computing & AWS Essentials', 'A timed quiz covering serverless architecture, S3, RDS, IAM, and Lambda triggers.', 15);

-- Python Exam Questions
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES
(1, 'Which of the following is an immutable data structure in Python?', 'List', 'Dictionary', 'Tuple', 'Set', 'C'),
(1, 'What is the correct syntax to output the type of a variable x in Python?', 'print(typeof(x))', 'print(type(x))', 'print(x.type())', 'print(typeOf(x))', 'B'),
(1, 'How do you insert an element at the end of a list in Python?', 'list.add(item)', 'list.insert(item)', 'list.append(item)', 'list.push(item)', 'C'),
(1, 'Which keyword is used to create a function in Python?', 'function', 'void', 'def', 'define', 'C'),
(1, 'What does PEP 8 represent in Python coding?', 'A python package manager', 'A style guide for Python code', 'A debugger utility', 'A compiler speed optimizer', 'B');

-- AWS Exam Questions
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES
(2, 'Which AWS service allows you to run code without provisioning or managing servers?', 'EC2', 'ECS', 'Lambda', 'LightSail', 'C'),
(2, 'What type of database service is Amazon RDS?', 'NoSQL Database', 'Relational Database', 'Graph Database', 'Key-Value Store', 'B'),
(2, 'What does "S3" stand for?', 'Simple System Storage', 'Secure Storage Service', 'Simple Storage Service', 'System Server Storage', 'C'),
(2, 'Which AWS service is used to manage access keys and permissions for users?', 'IAM', 'CloudTrail', 'KMS', 'VPC', 'A');
