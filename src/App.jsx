import { useState, useEffect, useRef } from 'react';
import './index.css';

const OptionLetters = ['A', 'B', 'C', 'D'];
const PROJECT_ID = "mcquiz-f39a5";
const LEADERBOARD_URL = "https://mcquiz-f39a5.web.app/leaderboard";

// Helper to shuffle an array
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

function App() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState('start'); // start, difficulty_select, playing, feedback, result
  const [difficulty, setDifficulty] = useState('easy');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [feedback, setFeedback] = useState(null); // 'correct' or 'incorrect'
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Score submission state
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [isScoreSubmitted, setIsScoreSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/quiz.json')
      .then(res => res.json())
      .then(data => {
        setAllQuestions(data.questions);
      })
      .catch(err => console.error("Failed to load quiz JSON", err));
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      } else {
        handleAnswer(-1); 
      }
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, gameState, currentIndex, questions]);

  const handleDifficultySelect = (selectedDiff) => {
    setDifficulty(selectedDiff);
    
    // Filter by difficulty
    const filtered = allQuestions.filter(q => q.difficulty === selectedDiff);
    
    // Randomly select up to 10 questions
    const shuffled = shuffleArray(filtered);
    const selectedQuestions = shuffled.slice(0, 10);
    
    setQuestions(selectedQuestions);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(selectedQuestions[0]?.timeLimit || 15);
    setSelectedOption(null);
    setFeedback(null);
    setIsScoreSubmitted(false);
    setStudentId('');
    setName('');
  };

  const startGame = () => {
    setGameState('difficulty_select');
  };

  const handleAnswer = (selectedIndex) => {
    clearTimeout(timerRef.current);
    setSelectedOption(selectedIndex);
    
    const isCorrect = selectedIndex === questions[currentIndex].answerIndex;
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / questions[currentIndex].timeLimit) * 500);
      setScore(s => s + 500 + timeBonus);
      setCorrectCount(c => c + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    setGameState('feedback');

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
        setTimeLeft(questions[currentIndex + 1].timeLimit || 15);
        setGameState('playing');
        setSelectedOption(null);
      } else {
        setGameState('result');
      }
      setFeedback(null);
    }, 1500);
  };

  const submitScoreREST = async () => {
    if (!studentId.trim() || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/leaderboard`;
      
      const payload = {
        fields: {
          studentId: { stringValue: studentId.trim() },
          name: { stringValue: name.trim() },
          score: { integerValue: score },
          difficulty: { stringValue: difficulty },
          correctCount: { integerValue: correctCount },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setIsScoreSubmitted(true);
    } catch (err) {
      console.error("Error submitting score via REST API:", err);
      alert("점수 등록에 실패했습니다. (네트워크 문제 또는 데이터베이스 보안 규칙을 확인하세요!)");
    }
    setIsSubmitting(false);
  };

  if (allQuestions.length === 0) {
    return <div className="app-container"><div className="loading-text">시스템 준비 중...</div></div>;
  }

  const renderStart = () => (
    <div className="landing-card">
      <div className="landing-content-wrapper">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo-image" onError={(e) => e.target.style.display = 'none'} />
        </div>
        
        <div className="landing-text-area">
          <h1 className="main-title">
            마인크래프트<br/>
            <span className="title-highlight">상식 퀴즈</span>
          </h1>
          <p className="subtitle">시스템 준비 완료. 당신의 지식을 테스트해보세요.</p>
          
          <div className="quiz-meta-panel">
            <div className="meta-box">
              <span className="meta-label">전체 문제 수</span>
              <span className="meta-value">10문항 (랜덤)</span>
            </div>
            <div className="meta-divider"></div>
            <div className="meta-box">
              <span className="meta-label">문제당 시간</span>
              <span className="meta-value">15초</span>
            </div>
          </div>

          <div className="landing-buttons">
            <button className="action-button" onClick={startGame}>
              <span className="btn-text">퀴즈 시작하기</span>
              <span className="btn-icon">→</span>
            </button>
            <a href={LEADERBOARD_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button className="action-button secondary-btn">
                <span className="btn-text">웹 리더보드 보기</span>
                <span className="btn-icon">🏆</span>
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDifficultySelect = () => (
    <div className="landing-card" style={{ textAlign: 'center' }}>
      <h2 className="main-title" style={{ marginBottom: '50px', fontSize: '2rem' }}>난이도 선택</h2>
      
      <div className="difficulty-grid">
        <div 
          className="diff-card easy"
          onClick={() => handleDifficultySelect('easy')}
        >
          <div className="diff-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="diff-text-area">
            <div className="diff-title">Easy</div>
            <div className="diff-desc">초보자를 위한 가벼운 문제</div>
          </div>
        </div>
        
        <div 
          className="diff-card medium"
          onClick={() => handleDifficultySelect('medium')}
        >
          <div className="diff-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <div className="diff-text-area">
            <div className="diff-title">Medium</div>
            <div className="diff-desc">적당한 난이도의 중간 문제</div>
          </div>
        </div>

        <div 
          className="diff-card hard"
          onClick={() => handleDifficultySelect('hard')}
        >
          <div className="diff-icon-wrapper">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>
          </div>
          <div className="diff-text-area">
            <div className="diff-title">Hard</div>
            <div className="diff-desc">고인물을 위한 극악무도한 문제</div>
          </div>
        </div>
      </div>
      
      <button 
        className="text-button" 
        style={{ marginTop: '50px' }}
        onClick={() => setGameState('start')}
      >
        뒤로 가기
      </button>
    </div>
  );

  const renderResult = () => {
    const accuracy = Math.round((correctCount / questions.length) * 100) || 0;
    
    let rank = "초보자";
    if (accuracy === 100) rank = "네더라이트";
    else if (accuracy >= 80) rank = "다이아몬드";
    else if (accuracy >= 60) rank = "철";
    else if (accuracy >= 40) rank = "나무";

    return (
      <div className="result-card">
        <div className="result-header">
          <h2 className="result-title">퀴즈 종료 ({difficulty.toUpperCase()})</h2>
          <div className="rank-badge">{rank} 등급</div>
        </div>

        <div className="score-dashboard">
          <div className="accuracy-ring">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="circle"
                strokeDasharray={`${accuracy}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="accuracy-text">{accuracy}%</div>
          </div>
          
          <div className="score-details">
            <span className="score-label">최종 점수</span>
            <span className="score-value">{score.toLocaleString()}</span>
          </div>
        </div>

        {!isScoreSubmitted ? (
          <div className="score-submission">
            <p className="submission-prompt">이벤트 기록을 위해 학번과 이름을 남겨주세요.</p>
            <div className="submission-form">
              <input 
                type="text" 
                className="input-field" 
                placeholder="학번 (예: 20241234)" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                maxLength={12}
              />
              <input 
                type="text" 
                className="input-field" 
                placeholder="이름" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={6}
              />
              <button 
                className="action-button submit-btn" 
                onClick={submitScoreREST}
                disabled={isSubmitting || !studentId.trim() || !name.trim()}
              >
                {isSubmitting ? '등록 중...' : '원격 리더보드에 등록'}
              </button>
            </div>
            <button className="text-button" onClick={() => setGameState('start')}>메인으로 가기</button>
          </div>
        ) : (
          <div className="leaderboard-section">
            <h3 className="leaderboard-subtitle">점수가 웹 리더보드에 등록되었습니다!</h3>
            <p style={{textAlign: 'center', marginBottom: '20px'}}>실시간 순위는 리더보드 페이지에서 확인하세요.</p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
              <a href={LEADERBOARD_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button className="action-button">
                  <span className="btn-text">리더보드 확인</span>
                  <span className="btn-icon">🏆</span>
                </button>
              </a>
              <button className="action-button secondary-btn" onClick={() => setGameState('start')}>
                <span className="btn-text">메인으로</span>
                <span className="btn-icon">🏠</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlaying = () => {
    const q = questions[currentIndex];
    const timeProgress = (timeLeft / (q.timeLimit || 15)) * 100;

    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <span>문제 {currentIndex + 1} / {questions.length} ({difficulty.toUpperCase()})</span>
          <span className="score">점수: {score}</span>
        </div>
        
        <div className="time-bar-container">
          <div 
            className={`time-bar ${timeLeft <= 3 ? 'warning' : ''}`} 
            style={{ width: `${timeProgress}%` }}
          ></div>
        </div>

        <div className="question-container">
          <div className="q-prefix">Q.</div>
          <div className="question-text">{q.question}</div>
        </div>

        <div className="options-grid">
          {q.options.map((option, idx) => {
            let btnClass = "option-button";
            if (gameState === 'feedback') {
              if (idx === q.answerIndex) {
                btnClass += " correct";
              } else if (idx === selectedOption) {
                btnClass += " incorrect";
              }
            }
            
            return (
              <button 
                key={idx} 
                className={btnClass}
                onClick={() => handleAnswer(idx)}
                disabled={gameState === 'feedback'}
              >
                <div className="option-icon-box">{OptionLetters[idx]}</div>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {gameState === 'start' && renderStart()}
      {gameState === 'difficulty_select' && renderDifficultySelect()}
      {(gameState === 'playing' || gameState === 'feedback') && renderPlaying()}
      {gameState === 'result' && renderResult()}
      
      {gameState === 'feedback' && (
        <div className={`feedback-overlay ${feedback}`}>
          {feedback === 'correct' ? '정답!' : '오답!'}
        </div>
      )}
    </div>
  );
}

export default App;
