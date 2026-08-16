import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import config from '../../config'
import { getTokenByRole } from '../../utils/tokenUtils'

export default function TakeAssignment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { question_id: selected_index }
  const [timeLeft, setTimeLeft] = useState(null)
  const [started, setStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [cheated, setCheated] = useState(false)
  
  const timerRef = useRef(null)

  useEffect(() => {
    fetchAssignment()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleVisibilityChange = () => {
    if (document.hidden && started && !result && !submitting) {
      setCheated(true)
      submitQuiz(true)
    }
  }

  const fetchAssignment = async () => {
    try {
      const token = getTokenByRole('employee')
      const res = await fetch(`${config.API_URL}/assignments/${id}/take`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setAssignment(data.assignment)
        setQuestions(data.questions)
        setTimeLeft(data.assignment.time_limit_minutes * 60)
      } else {
        alert(data.error)
        navigate('/employee/profile')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    // Request full screen
    const docElm = document.documentElement
    if (docElm.requestFullscreen) docElm.requestFullscreen()
    else if (docElm.webkitRequestFullScreen) docElm.webkitRequestFullScreen()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    setStarted(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          submitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleOptionSelect = (qId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }))
  }

  const submitQuiz = async (isCheated = false) => {
    if (submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    
    // Exit full screen
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen()
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen()
    
    document.removeEventListener('visibilitychange', handleVisibilityChange)

    try {
      const token = getTokenByRole('employee')
      const res = await fetch(`${config.API_URL}/assignments/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers, cheated: isCheated || cheated })
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        alert(data.error || 'Failed to submit')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Assignment...</div>

  if (result) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ fontSize: 24, color: '#1e293b', marginBottom: 10 }}>Assignment Completed</h2>
          
          {result.cheated ? (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '15px', borderRadius: 8, marginBottom: 20, fontWeight: 600 }}>
              ⚠️ Tab switching detected. Your quiz was automatically submitted.
            </div>
          ) : (
            <div style={{ fontSize: 48, fontWeight: 900, color: result.score === result.total ? '#10b981' : '#402070', margin: '20px 0' }}>
              {result.score} <span style={{ fontSize: 24, color: '#94a3b8' }}>/ {result.total}</span>
            </div>
          )}
          
          <button onClick={() => navigate('/employee/profile')} style={{ background: '#402070', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            Return to Profile
          </button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: 500 }}>
          <h1 style={{ fontSize: 28, color: '#1e293b', marginBottom: 10 }}>{assignment?.title}</h1>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 20 }}>{assignment?.description}</p>
          
          <div style={{ background: '#f1f5f9', padding: 20, borderRadius: 8, marginBottom: 30 }}>
            <h3 style={{ fontSize: 16, color: '#0f172a', margin: '0 0 10px 0' }}>Rules & Instructions</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>You have <strong>{assignment?.time_limit_minutes} minutes</strong> to complete this assignment.</li>
              <li>There are <strong>{questions.length} multiple-choice questions</strong>.</li>
              <li style={{ color: '#dc2626', fontWeight: 600 }}>Do NOT switch tabs or minimize the browser. Doing so will automatically submit your quiz and flag it as cheating.</li>
              <li>The quiz will automatically submit when the timer runs out.</li>
            </ul>
          </div>

          <button onClick={startQuiz} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer', width: '100%' }}>
            I understand, Start Quiz
          </button>
          <button onClick={() => navigate('/employee/profile')} style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '14px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 10 }}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 80 }}>
      {/* Header Bar */}
      <div style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #e2e8f0', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 20, color: '#0f172a', margin: 0 }}>{assignment?.title}</h2>
        <div style={{ background: timeLeft < 60 ? '#fee2e2' : '#f1f5f9', color: timeLeft < 60 ? '#dc2626' : '#0f172a', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 18, border: `1px solid ${timeLeft < 60 ? '#fca5a5' : '#cbd5e1'}`, transition: 'all 0.3s' }}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        {questions.map((q, qIndex) => (
          <div key={q.id} style={{ background: '#fff', padding: 30, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 18, color: '#1e293b', marginBottom: 20, lineHeight: 1.5 }}>
              <span style={{ color: '#94a3b8', marginRight: 10 }}>{qIndex + 1}.</span> {q.question_text}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {q.options.map((opt, oIndex) => (
                <label key={oIndex} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: 8, border: `2px solid ${answers[q.id] === oIndex ? '#402070' : '#e2e8f0'}`, background: answers[q.id] === oIndex ? '#f3f0ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input 
                    type="radio" 
                    name={`q_${q.id}`} 
                    checked={answers[q.id] === oIndex} 
                    onChange={() => handleOptionSelect(q.id, oIndex)} 
                    style={{ width: 18, height: 18, marginRight: 15, accentColor: '#402070' }} 
                  />
                  <span style={{ fontSize: 15, color: answers[q.id] === oIndex ? '#402070' : '#334155', fontWeight: answers[q.id] === oIndex ? 600 : 400 }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 40 }}>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to submit your answers?')) {
                submitQuiz()
              }
            }} 
            disabled={submitting}
            style={{ background: '#402070', color: '#fff', border: 'none', padding: '16px 40px', borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 4px 14px rgba(64,32,112,0.3)' }}
          >
            {submitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}
