// API Client for the Online Exam System
// Supports toggling between local mock mode and live AWS Gateway / Lambda mode

// Set this to true to connect to local python server (http://localhost:5000)
// Otherwise, it runs on browser-only local storage mock mode
let LIVE_API_MODE = true;
const API_BASE_URL = "https://cloud-based-online-exam-system.onrender.com";

// Helper to initialize local storage mock DB
function initMockDB() {
  if (!localStorage.getItem('oe_users')) {
    localStorage.setItem('oe_users', JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem('oe_exams')) {
    localStorage.setItem('oe_exams', JSON.stringify(MOCK_EXAMS));
  }
  if (!localStorage.getItem('oe_questions')) {
    localStorage.setItem('oe_questions', JSON.stringify(MOCK_QUESTIONS));
  }
  if (!localStorage.getItem('oe_results')) {
    localStorage.setItem('oe_results', JSON.stringify(MOCK_RESULTS));
  }
}

// Initialize mock DB on script load
initMockDB();

const API = {
  // Check API status/mode
  isLiveMode: () => LIVE_API_MODE,
  setLiveMode: (val) => { LIVE_API_MODE = val; },

  // Auth Operations
  login: async (email, password) => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      return data;
    } else {
      // Local mock login
      const users = JSON.parse(localStorage.getItem('oe_users'));
      const user = users.find(u => u.email === email && u.password_hash === password);
      if (!user) throw new Error("Invalid email or password");
      return {
        message: "Login successful",
        token: `session_token_for_user_${user.id}`,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      };
    }
  },

  register: async (name, email, password, role = 'student') => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");
      return data;
    } else {
      // Local mock registration
      const users = JSON.parse(localStorage.getItem('oe_users'));
      if (users.some(u => u.email === email)) {
        throw new Error("Email is already registered");
      }
      const newUser = { id: users.length + 1, name, email, password_hash: password, role };
      users.push(newUser);
      localStorage.setItem('oe_users', JSON.stringify(users));
      return {
        message: "User registered successfully",
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
      };
    }
  },

  // Exam Operations
  getExams: async () => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/exams`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch exams");
      return data;
    } else {
      // Local mock exams fetch
      return JSON.parse(localStorage.getItem('oe_exams'));
    }
  },

  getQuestions: async (examId) => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch questions");
      return data;
    } else {
      // Local mock questions fetch
      const exams = JSON.parse(localStorage.getItem('oe_exams'));
      const exam = exams.find(e => e.id === Number(examId));
      if (!exam) throw new Error("Exam not found");

      const allQuestions = JSON.parse(localStorage.getItem('oe_questions'));
      const examQuestions = allQuestions[examId] || [];

      // Strip 'correct_option' for students to prevent cheating
      const sanitizedQuestions = examQuestions.map(q => ({
        id: q.id,
        exam_id: q.exam_id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d
      }));

      return {
        exam,
        questions: sanitizedQuestions
      };
    }
  },

  submitExam: async (examId, userId, answers) => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");
      return data;
    } else {
      // Local mock exam evaluation
      const exams = JSON.parse(localStorage.getItem('oe_exams'));
      const exam = exams.find(e => e.id === Number(examId));
      if (!exam) throw new Error("Exam not found");

      const allQuestions = JSON.parse(localStorage.getItem('oe_questions'));
      const examQuestions = allQuestions[examId] || [];
      const totalQuestions = examQuestions.length;

      if (totalQuestions === 0) throw new Error("This exam contains no questions");

      let correctAnswers = 0;
      const breakdown = [];

      examQuestions.forEach(q => {
        const correctOpt = q.correct_option;
        const submittedOpt = answers[q.id] || null;
        const isCorrect = (submittedOpt === correctOpt);
        
        if (isCorrect) correctAnswers++;

        breakdown.push({
          questionId: q.id,
          questionText: q.question_text,
          submittedOption: submittedOpt || "Unanswered",
          correctOption: correctOpt,
          isCorrect
        });
      });

      const score = correctAnswers;
      const percentage = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
      const status = percentage >= 50.0 ? "pass" : "fail";

      // Save result in mock DB
      const results = JSON.parse(localStorage.getItem('oe_results'));
      const users = JSON.parse(localStorage.getItem('oe_users'));
      const currentUser = users.find(u => u.id === Number(userId)) || { name: "Unknown", email: "" };
      
      const newResult = {
        id: results.length + 501,
        student_name: currentUser.name,
        student_email: currentUser.email,
        exam_title: exam.title,
        score,
        total_questions: totalQuestions,
        percentage,
        status,
        submitted_at: new Date().toISOString()
      };
      
      results.push(newResult);
      localStorage.setItem('oe_results', JSON.stringify(results));

      return {
        resultId: newResult.id,
        examId: Number(examId),
        examTitle: exam.title,
        score,
        totalQuestions,
        correctAnswers,
        percentage,
        status,
        breakdown
      };
    }
  },

  // Admin Dashboard Operations
  getAdminResults: async () => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/admin/results`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch admin results");
      return data;
    } else {
      return JSON.parse(localStorage.getItem('oe_results'));
    }
  },

  getAdminAnalytics: async () => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/admin/analytics`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch analytics");
      return data;
    } else {
      // Compute mock analytics locally from mock DB
      const users = JSON.parse(localStorage.getItem('oe_users'));
      const results = JSON.parse(localStorage.getItem('oe_results'));
      const exams = JSON.parse(localStorage.getItem('oe_exams'));

      const totalStudents = users.filter(u => u.role === 'student').length;
      const totalExamsTaken = results.length;
      
      let totalPercent = 0;
      let passCount = 0;
      results.forEach(r => {
        totalPercent += r.percentage;
        if (r.status === 'pass') passCount++;
      });

      const averageScore = totalExamsTaken > 0 ? Number((totalPercent / totalExamsTaken).toFixed(2)) : 0.0;
      const passRate = totalExamsTaken > 0 ? Number((passCount / totalExamsTaken * 100).toFixed(2)) : 0.0;

      // Group attempts by exam
      const examStats = exams.map(e => {
        const examResults = results.filter(r => r.exam_title === e.title);
        const attempts = examResults.length;
        let sumScore = 0;
        examResults.forEach(r => sumScore += r.percentage);
        const avg_score = attempts > 0 ? Number((sumScore / attempts).toFixed(2)) : 0.0;

        return {
          exam_title: e.title,
          attempts,
          avg_score
        };
      });

      return {
        totalStudents,
        totalExamsTaken,
        averageScore,
        passRate,
        examStats
      };
    }
  },

  addQuestion: async (examId, questionText, optionA, optionB, optionC, optionD, correctOption) => {
    if (LIVE_API_MODE) {
      const response = await fetch(`${API_BASE_URL}/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, questionText, optionA, optionB, optionC, optionD, correctOption })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add question");
      return data;
    } else {
      // Local mock add question
      const allQuestions = JSON.parse(localStorage.getItem('oe_questions'));
      if (!allQuestions[examId]) {
        allQuestions[examId] = [];
      }
      
      const examQuestions = allQuestions[examId];
      const newId = examQuestions.length > 0 ? Math.max(...examQuestions.map(q => q.id)) + 1 : Number(examId) * 100 + 1;
      
      const newQuestion = {
        id: newId,
        exam_id: Number(examId),
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption
      };
      
      examQuestions.push(newQuestion);
      allQuestions[examId] = examQuestions;
      localStorage.setItem('oe_questions', JSON.stringify(allQuestions));
      
      return {
        message: "Question added successfully",
        questionId: newId
      };
    }
  }
};
