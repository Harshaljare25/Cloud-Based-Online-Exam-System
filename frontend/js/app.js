// SPA Application State & Routing Logic
const AppState = {
  currentUser: null,
  exams: [],
  currentExam: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {}, // Format: { questionId: "A/B/C/D" }
  timerInterval: null,
  secondsRemaining: 0,
  activeView: 'login'
};

// Application views initialization
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Listen to hash changes for routing
  window.addEventListener('hashchange', handleRoute);
  
  // Check if session token exists
  const savedUser = sessionStorage.getItem('oe_user');
  if (savedUser) {
    AppState.currentUser = JSON.parse(savedUser);
    updateNavUserBadge();
    navigateBasedOnRole();
  } else {
    window.location.hash = 'login';
  }
});

function initApp() {
  // Setup form submission listeners
  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('addQuestionForm').addEventListener('submit', handleAddQuestionSubmit);

  // General click actions
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('prevQuestionBtn').addEventListener('click', () => {
    if (AppState.currentQuestionIndex > 0) {
      loadQuestion(AppState.currentQuestionIndex - 1);
    }
  });
  document.getElementById('nextQuestionBtn').addEventListener('click', () => {
    if (AppState.currentQuestionIndex < AppState.currentQuestions.length - 1) {
      loadQuestion(AppState.currentQuestionIndex + 1);
    }
  });
  document.getElementById('submitExamBtn').addEventListener('click', confirmSubmitExam);
}

// Router routing handlers
function handleRoute() {
  const hash = window.location.hash.slice(1) || 'login';
  
  // Auth guard
  if (!AppState.currentUser && hash !== 'login' && hash !== 'register') {
    window.location.hash = 'login';
    return;
  }

  // Clear running timer if we navigate away from the exam view
  if (hash !== 'exam' && AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }

  // Hide all views first
  document.querySelectorAll('.app-view').forEach(view => {
    view.style.display = 'none';
  });

  // Display the target view
  const viewElement = document.getElementById(`${hash}View`);
  if (viewElement) {
    viewElement.style.display = 'block';
    AppState.activeView = hash;
  }

  // Route-specific data loading
  switch (hash) {
    case 'login':
      if (AppState.currentUser) {
        navigateBasedOnRole();
      }
      break;
    case 'student-dashboard':
      loadStudentDashboard();
      break;
    case 'admin-dashboard':
      loadAdminDashboard();
      break;
  }
}

function navigateBasedOnRole() {
  if (AppState.currentUser.role === 'admin') {
    window.location.hash = 'admin-dashboard';
  } else {
    window.location.hash = 'student-dashboard';
  }
}

function updateNavUserBadge() {
  const nav = document.getElementById('appNav');
  const navUserInfo = document.getElementById('navUserInfo');
  const nameSpan = document.getElementById('userNameBadge');
  const roleDot = document.getElementById('roleDot');
  
  if (nav) nav.style.display = 'flex';
  
  if (AppState.currentUser) {
    if (navUserInfo) navUserInfo.style.display = 'flex';
    if (nameSpan) nameSpan.innerText = AppState.currentUser.name;
    if (roleDot) roleDot.className = `user-role-dot ${AppState.currentUser.role}`;
  } else {
    if (navUserInfo) navUserInfo.style.display = 'none';
  }
}

// -------------------------------------------------------------------
// AUTH FLOWS
// -------------------------------------------------------------------
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorMsg = document.getElementById('loginError');
  errorMsg.style.display = 'none';

  try {
    const data = await API.login(email, password);
    AppState.currentUser = data.user;
    sessionStorage.setItem('oe_user', JSON.stringify(data.user));
    updateNavUserBadge();
    navigateBasedOnRole();
  } catch (err) {
    errorMsg.innerText = err.message;
    errorMsg.style.display = 'block';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const role = document.getElementById('registerRole').value;
  const successMsg = document.getElementById('registerSuccess');
  const errorMsg = document.getElementById('registerError');
  
  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';

  try {
    const data = await API.register(name, email, password, role);
    successMsg.innerText = `${data.message}! You can now login.`;
    successMsg.style.display = 'block';
    
    // Clear registration fields
    document.getElementById('registerForm').reset();
    setTimeout(() => {
      toggleAuthMode('login');
    }, 2000);
  } catch (err) {
    errorMsg.innerText = err.message;
    errorMsg.style.display = 'block';
  }
}

function handleLogout() {
  AppState.currentUser = null;
  sessionStorage.removeItem('oe_user');
  updateNavUserBadge();
  window.location.hash = 'login';
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginFormContainer');
  const registerForm = document.getElementById('registerFormContainer');
  if (mode === 'register') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  } else {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  }
}

// -------------------------------------------------------------------
// STUDENT DASHBOARD FLOWS
// -------------------------------------------------------------------
async function loadStudentDashboard() {
  const examsGrid = document.getElementById('availableExamsGrid');
  const resultsTableBody = document.getElementById('studentPreviousResults');
  
  examsGrid.innerHTML = '<div class="text-secondary">Loading exams...</div>';
  resultsTableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';

  try {
    // 1. Fetch available exams
    const exams = await API.getExams();
    examsGrid.innerHTML = '';
    
    if (exams.length === 0) {
      examsGrid.innerHTML = '<div class="text-secondary">No exams available currently.</div>';
    } else {
      exams.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'glass-panel exam-card';
        card.innerHTML = `
          <h3>${exam.title}</h3>
          <p>${exam.description || 'No description provided.'}</p>
          <div class="exam-meta">
            <div class="meta-item">
              <span class="material-icons meta-icon">timer</span>
              <span>${exam.duration_minutes} Mins</span>
            </div>
            <button class="btn btn-primary" onclick="startExamConfirmation(${exam.id})">Start Exam</button>
          </div>
        `;
        examsGrid.appendChild(card);
      });
    }

    // 2. Fetch student's attempt logs (filter admin results for local simplicity)
    const results = await API.getAdminResults();
    const studentAttempts = results.filter(r => r.student_email === AppState.currentUser.email);
    resultsTableBody.innerHTML = '';

    if (studentAttempts.length === 0) {
      resultsTableBody.innerHTML = '<tr><td colspan="5" class="text-secondary" style="text-align: center;">No exam records found.</td></tr>';
    } else {
      studentAttempts.forEach(attempt => {
        const tr = document.createElement('tr');
        const dateStr = new Date(attempt.submitted_at).toLocaleDateString();
        tr.innerHTML = `
          <td style="font-weight: 600;">${attempt.exam_title}</td>
          <td>${attempt.score} / ${attempt.total_questions}</td>
          <td>${attempt.percentage}%</td>
          <td><span class="badge-status ${attempt.status}">${attempt.status.toUpperCase()}</span></td>
          <td>${dateStr}</td>
        `;
        resultsTableBody.appendChild(tr);
      });
    }

  } catch (err) {
    examsGrid.innerHTML = `<div class="color-error">Error loading dashboard: ${err.message}</div>`;
  }
}

// -------------------------------------------------------------------
// TIMED EXAM WORKSPACE FLOWS
// -------------------------------------------------------------------
async function startExamConfirmation(examId) {
  if (confirm("Are you ready to start this exam? The timer will start immediately upon loading.")) {
    try {
      const data = await API.getQuestions(examId);
      
      // Seed AppState
      AppState.currentExam = data.exam;
      AppState.currentQuestions = data.questions;
      AppState.currentQuestionIndex = 0;
      AppState.selectedAnswers = {};
      
      if (AppState.currentQuestions.length === 0) {
        alert("This exam has no questions available yet.");
        return;
      }

      // Initialize route & view
      window.location.hash = 'exam';
      loadQuestion(0);
      setupTimer(data.exam.duration_minutes);
      buildQuestionGridSelector();
    } catch (err) {
      alert(`Failed to retrieve exam: ${err.message}`);
    }
  }
}

function setupTimer(durationMinutes) {
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
  }
  
  AppState.secondsRemaining = durationMinutes * 60;
  updateTimerDisplay();

  AppState.timerInterval = setInterval(() => {
    AppState.secondsRemaining--;
    updateTimerDisplay();

    if (AppState.secondsRemaining <= 0) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
      alert("Time is up! Your exam will be submitted automatically.");
      autoSubmitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerBox = document.getElementById('countdownTimer');
  const minutes = Math.floor(AppState.secondsRemaining / 60);
  const seconds = AppState.secondsRemaining % 60;
  
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  
  timerBox.innerHTML = `<span class="material-icons">schedule</span> ${formattedMinutes}:${formattedSeconds}`;
  
  // Highlight when less than 1 minute remains
  if (AppState.secondsRemaining < 60) {
    timerBox.classList.add('urgent');
  } else {
    timerBox.classList.remove('urgent');
  }
}

function buildQuestionGridSelector() {
  const grid = document.getElementById('examQuestionGrid');
  grid.innerHTML = '';
  
  AppState.currentQuestions.forEach((q, idx) => {
    const cell = document.createElement('div');
    cell.id = `grid-cell-${idx}`;
    cell.className = 'grid-cell';
    cell.innerText = idx + 1;
    cell.addEventListener('click', () => loadQuestion(idx));
    grid.appendChild(cell);
  });
}

function loadQuestion(index) {
  AppState.currentQuestionIndex = index;
  const q = AppState.currentQuestions[index];
  
  // Highlight active cell in sidebar grid
  document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('active'));
  const activeCell = document.getElementById(`grid-cell-${index}`);
  if (activeCell) activeCell.classList.add('active');

  // Load question text
  document.getElementById('currentQuestionText').innerText = `${index + 1}. ${q.question_text}`;
  document.getElementById('questionCounterText').innerText = `Question ${index + 1} of ${AppState.currentQuestions.length}`;

  // Configure navigation buttons
  document.getElementById('prevQuestionBtn').disabled = (index === 0);
  
  const nextBtn = document.getElementById('nextQuestionBtn');
  if (index === AppState.currentQuestions.length - 1) {
    nextBtn.style.display = 'none';
  } else {
    nextBtn.style.display = 'inline-flex';
  }

  // Populate options
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  
  const options = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d }
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    if (AppState.selectedAnswers[q.id] === opt.key) {
      btn.classList.add('selected');
    }
    
    btn.innerHTML = `
      <div class="option-badge">${opt.key}</div>
      <div class="option-label-text">${opt.text}</div>
    `;
    
    btn.addEventListener('click', () => selectOption(q.id, opt.key));
    container.appendChild(btn);
  });
}

function selectOption(questionId, optionKey) {
  // Update state
  AppState.selectedAnswers[questionId] = optionKey;
  
  // Update UI selection classes
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.querySelector('.option-badge').innerText === optionKey) {
      btn.classList.add('selected');
    }
  });

  // Mark cell in grid as answered
  const activeCell = document.getElementById(`grid-cell-${AppState.currentQuestionIndex}`);
  if (activeCell) activeCell.classList.add('answered');
}

function confirmSubmitExam() {
  const answeredCount = Object.keys(AppState.selectedAnswers).length;
  const totalCount = AppState.currentQuestions.length;
  
  if (confirm(`You have answered ${answeredCount} out of ${totalCount} questions. Are you sure you want to submit?`)) {
    submitExamResult();
  }
}

function autoSubmitExam() {
  submitExamResult();
}

async function submitExamResult() {
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }

  try {
    const response = await API.submitExam(
      AppState.currentExam.id,
      AppState.currentUser.id,
      AppState.selectedAnswers
    );

    renderResultScreen(response);
  } catch (err) {
    alert(`Error submitting exam: ${err.message}`);
    window.location.hash = 'student-dashboard';
  }
}

// -------------------------------------------------------------------
// RESULT SCREEN FLOWS
// -------------------------------------------------------------------
function renderResultScreen(result) {
  window.location.hash = 'result';

  // Draw percentage gauge (radial SVG path animation)
  const scorePercent = result.percentage;
  document.getElementById('resultPercentText').textContent = `${scorePercent}%`;
  
  const dashoffset = 440 - (440 * scorePercent) / 100;
  document.getElementById('gaugeCircleFill').style.strokeDashoffset = dashoffset;

  // Set title & status
  const title = document.getElementById('resultStatusTitle');
  const badge = document.getElementById('resultStatusBadge');
  
  badge.className = `badge-status ${result.status}`;
  badge.innerText = result.status.toUpperCase();
  
  if (result.status === 'pass') {
    title.innerText = "Congratulations! You Passed.";
    title.style.color = "var(--color-success)";
  } else {
    title.innerText = "Exam Failed.";
    title.style.color = "var(--color-error)";
  }

  // Summary box numbers
  document.getElementById('resExamTitle').innerText = result.examTitle;
  document.getElementById('resTotalQuestions').innerText = result.totalQuestions;
  document.getElementById('resCorrectAnswers').innerText = result.correctAnswers;
  document.getElementById('resScore').innerText = `${result.correctAnswers}/${result.totalQuestions}`;

  // Breakdown lists
  const list = document.getElementById('resultQuestionsReviewList');
  list.innerHTML = '';

  result.breakdown.forEach((item, index) => {
    const itemPanel = document.createElement('div');
    itemPanel.className = 'glass-panel review-item';
    
    const statusClass = item.isCorrect ? 'pass' : 'fail';
    const statusText = item.isCorrect ? 'Correct' : 'Incorrect';
    
    itemPanel.innerHTML = `
      <div class="review-status-header">
        <h4 style="font-size: 1.1rem; max-width: 80%;">${index + 1}. ${item.questionText}</h4>
        <span class="badge-status ${statusClass}">${statusText}</span>
      </div>
      <div class="review-options">
        <div class="review-opt-box">
          <strong>Your Answer:</strong> ${item.submittedOption}
        </div>
        <div class="review-opt-box correct">
          <strong>Correct Answer:</strong> ${item.correctOption}
        </div>
      </div>
    `;
    list.appendChild(itemPanel);
  });
}

// -------------------------------------------------------------------
// ADMIN DASHBOARD FLOWS
// -------------------------------------------------------------------
async function loadAdminDashboard() {
  const metricsStudents = document.getElementById('adminTotalStudents');
  const metricsExams = document.getElementById('adminTotalExams');
  const metricsAvgScore = document.getElementById('adminAvgScore');
  const metricsPassRate = document.getElementById('adminPassRate');
  const attemptsTableBody = document.getElementById('adminStudentAttempts');
  const examSelect = document.getElementById('questionExamSelect');

  try {
    // 1. Fetch metrics & analytics
    const analytics = await API.getAdminAnalytics();
    
    metricsStudents.innerText = analytics.totalStudents;
    metricsExams.innerText = analytics.totalExamsTaken;
    metricsAvgScore.innerText = `${analytics.averageScore}%`;
    metricsPassRate.innerText = `${analytics.passRate}%`;

    // Render SVG / CSS analytics chart
    renderAnalyticsChart(analytics.examStats);

    // 2. Fetch attempts log
    const attempts = await API.getAdminResults();
    attemptsTableBody.innerHTML = '';
    
    if (attempts.length === 0) {
      attemptsTableBody.innerHTML = '<tr><td colspan="6" class="text-secondary" style="text-align: center;">No attempts recorded yet.</td></tr>';
    } else {
      attempts.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.submitted_at).toLocaleString();
        tr.innerHTML = `
          <td style="font-weight: 600;">${item.student_name}</td>
          <td>${item.student_email}</td>
          <td>${item.exam_title}</td>
          <td>${item.score} / ${item.total_questions} (${item.percentage}%)</td>
          <td><span class="badge-status ${item.status}">${item.status.toUpperCase()}</span></td>
          <td>${dateStr}</td>
        `;
        attemptsTableBody.appendChild(tr);
      });
    }

    // 3. Populate Exam Select drop down in the form
    const exams = await API.getExams();
    examSelect.innerHTML = '<option value="">-- Select Exam --</option>';
    exams.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.innerText = e.title;
      examSelect.appendChild(opt);
    });

  } catch (err) {
    console.error("Admin dashboard error:", err);
  }
}

function renderAnalyticsChart(examStats) {
  const container = document.getElementById('analyticsChartContainer');
  container.innerHTML = '';
  
  if (examStats.length === 0) {
    container.innerHTML = '<div class="text-secondary" style="margin: auto;">No exam metrics to display.</div>';
    return;
  }

  const chartVisual = document.createElement('div');
  chartVisual.className = 'chart-visual';

  examStats.forEach(stat => {
    // Height percent relative to max score percentage
    const heightPercent = stat.attempts > 0 ? stat.avg_score : 10;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';
    
    wrapper.innerHTML = `
      <div class="chart-bar" style="height: ${heightPercent}%;" data-val="${stat.avg_score}% score (${stat.attempts} attempts)"></div>
      <div class="chart-label" title="${stat.exam_title}">${stat.exam_title}</div>
    `;
    chartVisual.appendChild(wrapper);
  });

  container.appendChild(chartVisual);
}

async function handleAddQuestionSubmit(e) {
  e.preventDefault();
  const examId = document.getElementById('questionExamSelect').value;
  const questionText = document.getElementById('questionTextVal').value.trim();
  const optA = document.getElementById('questionOptA').value.trim();
  const optB = document.getElementById('questionOptB').value.trim();
  const optC = document.getElementById('questionOptC').value.trim();
  const optD = document.getElementById('questionOptD').value.trim();
  const correctOpt = document.getElementById('questionCorrectOption').value;

  const successMsg = document.getElementById('addQuestionSuccess');
  const errorMsg = document.getElementById('addQuestionError');

  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';

  if (!examId) {
    errorMsg.innerText = "Please select an exam.";
    errorMsg.style.display = 'block';
    return;
  }

  try {
    const data = await API.addQuestion(examId, questionText, optA, optB, optC, optD, correctOpt);
    successMsg.innerText = `${data.message} (ID: ${data.questionId})`;
    successMsg.style.display = 'block';
    
    // Reset form fields
    document.getElementById('addQuestionForm').reset();
    
    // Reload dashboard metrics to reflect changes
    loadAdminDashboard();
  } catch (err) {
    errorMsg.innerText = err.message;
    errorMsg.style.display = 'block';
  }
}
