// Mock database seed for testing when live AWS Lambda endpoints are inactive
const MOCK_EXAMS = [
  {
    id: 1,
    title: "Python Programming Basics",
    description: "Test your knowledge on core Python fundamentals, loops, data structures, and OOP concepts.",
    duration_minutes: 10
  },
  {
    id: 2,
    title: "Cloud Computing & AWS Essentials",
    description: "A timed quiz covering serverless architecture, S3, RDS, IAM, and Lambda triggers.",
    duration_minutes: 15
  },
  {
    id: 3,
    title: "SQL & Relational Databases",
    description: "Evaluate your skills in writing SELECT statements, joins, indexing, and normal forms.",
    duration_minutes: 20
  }
];

const MOCK_QUESTIONS = {
  1: [
    {
      id: 101,
      exam_id: 1,
      question_text: "Which of the following is an immutable data structure in Python?",
      option_a: "List",
      option_b: "Dictionary",
      option_c: "Tuple",
      option_d: "Set",
      correct_option: "C"
    },
    {
      id: 102,
      exam_id: 1,
      question_text: "What is the correct syntax to output the type of a variable x in Python?",
      option_a: "print(typeof(x))",
      option_b: "print(type(x))",
      option_c: "print(x.type())",
      option_d: "print(typeOf(x))",
      correct_option: "B"
    },
    {
      id: 103,
      exam_id: 1,
      question_text: "How do you insert an element at the end of a list in Python?",
      option_a: "list.add(item)",
      option_b: "list.insert(item)",
      option_c: "list.append(item)",
      option_d: "list.push(item)",
      correct_option: "C"
    },
    {
      id: 104,
      exam_id: 1,
      question_text: "Which keyword is used to create a function in Python?",
      option_a: "function",
      option_b: "void",
      option_c: "def",
      option_d: "define",
      correct_option: "C"
    },
    {
      id: 105,
      exam_id: 1,
      question_text: "What does PEP 8 represent in Python coding?",
      option_a: "A python package manager",
      option_b: "A style guide for Python code",
      option_c: "A debugger utility",
      option_d: "A compiler speed optimizer",
      correct_option: "B"
    }
  ],
  2: [
    {
      id: 201,
      exam_id: 2,
      question_text: "Which AWS service allows you to run code without provisioning or managing servers?",
      option_a: "EC2",
      option_b: "ECS",
      option_c: "Lambda",
      option_d: "LightSail",
      correct_option: "C"
    },
    {
      id: 202,
      exam_id: 2,
      question_text: "What type of database service is Amazon RDS?",
      option_a: "NoSQL Database",
      option_b: "Relational Database",
      option_c: "Graph Database",
      option_d: "Key-Value Store",
      correct_option: "B"
    },
    {
      id: 203,
      exam_id: 2,
      question_text: "What does 'S3' stand for?",
      option_a: "Simple System Storage",
      option_b: "Secure Storage Service",
      option_c: "Simple Storage Service",
      option_d: "System Server Storage",
      correct_option: "C"
    },
    {
      id: 204,
      exam_id: 2,
      question_text: "Which AWS service is used to manage access keys and permissions for users?",
      option_a: "IAM",
      option_b: "CloudTrail",
      option_c: "KMS",
      option_d: "VPC",
      correct_option: "A"
    }
  ],
  3: [
    {
      id: 301,
      exam_id: 3,
      question_text: "Which SQL clause is used to filter records in a group statement?",
      option_a: "WHERE",
      option_b: "HAVING",
      option_c: "FILTER",
      option_d: "GROUP BY",
      correct_option: "B"
    },
    {
      id: 302,
      exam_id: 3,
      question_text: "What does acid stand for in database transactions?",
      option_a: "Automated, Consistent, Integrated, Durable",
      option_b: "Atomicity, Consistency, Isolation, Durability",
      option_c: "Access, Control, Index, Data",
      option_d: "Agreement, Correlation, Identity, Dependency",
      correct_option: "B"
    },
    {
      id: 303,
      exam_id: 3,
      question_text: "Which join returns all records from the left table even if there are no matches in the right?",
      option_a: "INNER JOIN",
      option_b: "RIGHT JOIN",
      option_c: "LEFT JOIN",
      option_d: "FULL OUTER JOIN",
      correct_option: "C"
    }
  ]
};

const MOCK_RESULTS = [
  {
    id: 501,
    student_name: "John Doe",
    student_email: "john@exam.com",
    exam_title: "Python Programming Basics",
    score: 4,
    total_questions: 5,
    percentage: 80.00,
    status: "pass",
    submitted_at: "2026-06-08T14:35:00Z"
  },
  {
    id: 502,
    student_name: "Alice Smith",
    student_email: "alice@exam.com",
    exam_title: "Python Programming Basics",
    score: 2,
    total_questions: 5,
    percentage: 40.00,
    status: "fail",
    submitted_at: "2026-06-09T09:15:00Z"
  },
  {
    id: 503,
    student_name: "Bob Jones",
    student_email: "bob@exam.com",
    exam_title: "Cloud Computing & AWS Essentials",
    score: 3,
    total_questions: 4,
    percentage: 75.00,
    status: "pass",
    submitted_at: "2026-06-09T10:05:00Z"
  }
];

const MOCK_USERS = [
  { id: 1, name: "System Admin", email: "admin@exam.com", password_hash: "admin123", role: "admin" },
  { id: 2, name: "John Doe", email: "john@exam.com", password_hash: "student123", role: "student" },
  { id: 3, name: "Alice Smith", email: "alice@exam.com", password_hash: "student123", role: "student" },
  { id: 4, name: "Bob Jones", email: "bob@exam.com", password_hash: "student123", role: "student" }
];
