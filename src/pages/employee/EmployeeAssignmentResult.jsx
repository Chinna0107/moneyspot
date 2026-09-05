import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import config from '../../config'
import { getTokenByRole } from '../../utils/tokenUtils'

export default function EmployeeAssignmentResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchResult()
  }, [])

  const fetchResult = async () => {
    try {
      const token = getTokenByRole('employee')
      const res = await fetch(`${config.API_URL}/assignments/${id}/my-result`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data.result)
        setQuestions(data.questions)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Result Details...</div>
  if (error) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'red' }}>Error: {error}</div>

  const total = result.total_marks || result.total_questions
  const percentage = Math.round((result.score / total) * 100)
  
  let message = ""
  let messageColor = ""
  let messageBg = ""
  let icon = ""

  if (percentage < 50) {
    message = "Additional training required, please reattempt."
    messageColor = "#dc2626"
    messageBg = "#fee2e2"
    icon = "📚"
  } else if (percentage < 60) {
    message = "Needs improvement."
    messageColor = "#ea580c"
    messageBg = "#ffedd5"
    icon = "📈"
  } else if (percentage < 70) {
    message = "Good."
    messageColor = "#eab308"
    messageBg = "#fef9c3"
    icon = "👍"
  } else if (percentage < 80) {
    message = "Very Good."
    messageColor = "#0284c7"
    messageBg = "#e0f2fe"
    icon = "🌟"
  } else {
    message = "Excellent work!"
    messageColor = "#16a34a"
    messageBg = "#dcfce7"
    icon = "🏆"
  }

  const answers = result.answers || {}

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header Summary Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 30, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: 30, textAlign: 'center', borderTop: `8px solid ${messageColor}`, position: 'relative' }}>
          <button onClick={() => navigate('/employee/profile')} style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: '#64748b', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
            ← Back to Profile
          </button>
          
          <h1 style={{ fontSize: 24, color: '#1e293b', marginTop: 10, marginBottom: 5 }}>{result.title}</h1>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Submitted on {new Date(result.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>

          <div style={{ fontSize: 56, fontWeight: 900, color: messageColor, margin: '20px 0', lineHeight: 1 }}>
            {result.score} <span style={{ fontSize: 24, color: '#94a3b8' }}>/ {total}</span>
          </div>

          <div style={{ 
            background: messageBg, 
            color: messageColor, 
            padding: '12px 20px', 
            borderRadius: 12, 
            fontWeight: 700,
            fontSize: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span> {message}
          </div>
          
          {result.cheated && (
            <div style={{ marginTop: 15, color: '#dc2626', fontWeight: 'bold', fontSize: 14 }}>
              ⚠️ Marked as Cheated (Tab Switching Detected)
            </div>
          )}
        </div>

        {/* Detailed Answers Section */}
        <h2 style={{ fontSize: 20, color: '#1e293b', marginBottom: 20 }}>Detailed Analysis</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.length === 0 && <div style={{ color: '#64748b' }}>No question details available. (This may be an older submission)</div>}
          
          {questions.map((q, i) => {
            const selectedIdx = answers[q.id]
            const isCorrect = selectedIdx === q.correct_option_index
            const hasAnswered = selectedIdx !== undefined && selectedIdx !== null
            const qMarks = q.marks || 1
            const earnedMarks = isCorrect ? qMarks : 0

            return (
              <div key={q.id} style={{ 
                background: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${isCorrect ? '#10b981' : '#f43f5e'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <h3 style={{ fontSize: 16, color: '#1e293b', margin: 0, lineHeight: 1.4, flex: 1 }}>
                    <span style={{ color: '#64748b', marginRight: 8 }}>Q{i + 1}.</span> 
                    {q.question_text}
                  </h3>
                  <div style={{ background: isCorrect ? '#dcfce7' : '#fee2e2', color: isCorrect ? '#059669' : '#e11d48', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginLeft: 15, whiteSpace: 'nowrap' }}>
                    {earnedMarks} / {qMarks} Marks
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedIdx === optIdx
                    const isActualCorrect = q.correct_option_index === optIdx
                    
                    let bg = '#f8fafc'
                    let border = '1px solid #e2e8f0'
                    let color = '#475569'
                    let badge = null

                    if (isActualCorrect) {
                      bg = '#ecfdf5'
                      border = '1px solid #10b981'
                      color = '#065f46'
                      badge = <span style={{ marginLeft: 'auto', background: '#10b981', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>Correct Answer</span>
                    } else if (isSelected && !isActualCorrect) {
                      bg = '#fff1f2'
                      border = '1px solid #f43f5e'
                      color = '#9f1239'
                      badge = <span style={{ marginLeft: 'auto', background: '#f43f5e', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>Your Answer</span>
                    } 

                    return (
                      <div key={optIdx} style={{ 
                        padding: '12px 16px', 
                        borderRadius: 8, 
                        background: bg, 
                        border: border,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 15
                      }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: isSelected ? 'none' : '2px solid #cbd5e1', background: isSelected ? (isActualCorrect ? '#10b981' : '#f43f5e') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                          {isSelected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                        </div>
                        {opt}
                        {badge}
                      </div>
                    )
                  })}
                </div>
                {!hasAnswered && (
                  <div style={{ marginTop: 12, color: '#f59e0b', fontSize: 13, fontWeight: 'bold', background: '#fef3c7', padding: '8px 12px', borderRadius: 6, display: 'inline-block' }}>
                    ⚠️ You did not answer this question.
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
