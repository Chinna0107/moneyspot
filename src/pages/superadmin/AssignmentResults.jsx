import { useState, useEffect } from 'react'
import config from '../../config'
import { getTokenByRole } from '../../utils/tokenUtils'
import Sidebar from '../../components/superadmin/Sidebar'
import './superadmin.css'
import './Dashboard.css'
import certBg from '../../certificates/image.png'
import fullLogo from '../../assets/icons png/Full Logo.png'

export default function AssignmentResults() {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [results, setResults] = useState([])
  const [questions, setQuestions] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const token = getTokenByRole('superadmin')
      const res = await fetch(`${config.API_URL}/assignments/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (err) {
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async (id) => {
    setLoadingResults(true)
    try {
      const token = getTokenByRole('superadmin')
      const res = await fetch(`${config.API_URL}/assignments/${id}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error('Error fetching results:', err)
    } finally {
      setLoadingResults(false)
    }
  }

  const handleAssignmentChange = (e) => {
    const id = e.target.value
    setSelectedId(id)
    fetchResults(id)
  }

  const handleDownloadCert = async (employeeName, submittedAt) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const bg = new Image()
    bg.src = certBg
    const logo = new Image()
    logo.src = fullLogo
    
    await Promise.all([
      new Promise(res => { bg.onload = res; bg.onerror = res }),
      new Promise(res => { logo.onload = res; logo.onerror = res })
    ])
    
    canvas.width = bg.width
    canvas.height = bg.height
    ctx.drawImage(bg, 0, 0, bg.width, bg.height)
    
    const logoWidth = bg.width * 0.35
    const logoHeight = (logo.height / logo.width) * logoWidth
    const logoX = (bg.width - logoWidth) / 2
    const logoY = bg.height * 0.08
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
    
    ctx.font = 'italic 700 110px "Brush Script MT", "Lucida Handwriting", cursive'
    ctx.fillStyle = '#2c1e4a'
    ctx.textAlign = 'center'
    ctx.fillText(employeeName, bg.width / 2, bg.height * 0.53)
    
    const dateObj = new Date(submittedAt)
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    
    ctx.font = '700 22px "Montserrat", "Arial", sans-serif'
    ctx.fillStyle = '#311b5e' // Deep purple to match "TEAM MONEYSPOT"
    ctx.textAlign = 'center'
    ctx.fillText("DATE", bg.width * 0.232, bg.height * 0.915)
    
    ctx.font = '500 18px "Montserrat", "Arial", sans-serif'
    ctx.fillStyle = '#4a4453' // Lighter dark color to match "Together We Grow"
    ctx.fillText(dateStr, bg.width * 0.232, bg.height * 0.94)
    
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `Certificate_${employeeName.replace(/\s+/g, '_')}.png`
    link.href = dataUrl
    link.click()
  }

  if (loading) return <div className="sa-page"><Sidebar /><div className="sa-content" style={{ padding: 40 }}>Loading assignments...</div></div>

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">📊 Assignment Results</h1>
            <p className="dash-topbar-sub">View scores and detect cheating</p>
          </div>
        </div>

        <div className="dash-main">
          <div className="sa-card" style={{ marginBottom: 24 }}>
            <div className="sa-card-body" style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Select Assignment to View Results</label>
              <select value={selectedId} onChange={handleAssignmentChange} 
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '2px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8fafc', color: '#1e293b', fontWeight: 600 }}>
                <option value="">-- Choose an assignment --</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title} ({a.completions} completions)</option>
                ))}
              </select>
            </div>
          </div>

          {selectedId && (
            <div className="sa-card">
              <div className="sa-card-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, color: '#1e293b', margin: 0 }}>Leaderboard & Submissions</h3>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Submissions: {results.length}</div>
                </div>

                {loadingResults ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading results...</div>
                ) : results.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '2px dashed #e2e8f0' }}>No employees have completed this assignment yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rank</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Employee</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Submitted</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Integrity</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, idx) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: '#1e293b', fontSize: 15 }}>#{idx + 1}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{r.employee_name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>🏢 {r.branch}</div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, color: r.score === (r.total_marks || r.total_questions) ? '#059669' : '#402070', fontSize: 16 }}>{r.score} <span style={{ fontSize: 13, color: '#94a3b8' }}>/ {r.total_marks || r.total_questions}</span></div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{Math.round((r.score / (r.total_marks || r.total_questions)) * 100)}%</div>
                          </td>
                          <td style={{ padding: '16px 20px', color: '#475569', fontSize: 13 }}>
                            {new Date(r.submitted_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {r.cheated ? (
                              <span style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>⚠️ Cheating Detected</span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#059669', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>✅ Clean</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleDownloadCert(r.employee_name, r.submitted_at)} style={{ background: '#402070', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: '0.2s', boxShadow: '0 2px 4px rgba(64,32,112,0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                              🎓 Certificate
                            </button>
                            <button onClick={() => setSelectedResult(r)} style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: '0.2s', boxShadow: '0 2px 4px rgba(14,165,233,0.2)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                              👀 View Answers
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#402070' }}>Detailed Results: {selectedResult.employee_name}</h3>
              <button onClick={() => setSelectedResult(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 10 }}>
              {!selectedResult.answers || Object.keys(selectedResult.answers).length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '2px dashed #e2e8f0' }}>
                  No detailed answers available for this submission.<br/>
                  <span style={{ fontSize: 13 }}>(Answers are only saved for new submissions going forward)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {questions.map((q, i) => {
                    const selectedIdx = selectedResult.answers[q.id]
                    const isCorrect = selectedIdx === q.correct_option_index
                    return (
                      <div key={q.id} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                          {i + 1}. {q.question_text}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {q.options.map((opt, optIdx) => {
                            let bg = '#fff'
                            let border = '1px solid #e2e8f0'
                            let color = '#475569'
                            let icon = ''

                            if (optIdx === selectedIdx && isCorrect) {
                              bg = '#dcfce7'; border = '1px solid #22c55e'; color = '#166534'; icon = '✅ '
                            } else if (optIdx === selectedIdx && !isCorrect) {
                              bg = '#fee2e2'; border = '1px solid #ef4444'; color = '#991b1b'; icon = '❌ '
                            } else if (optIdx === q.correct_option_index && !isCorrect) {
                              bg = '#f0fdf4'; border = '1px dashed #22c55e'; color = '#166534'; icon = '✔️ '
                            }

                            return (
                              <div key={optIdx} style={{ padding: '8px 12px', background: bg, border, borderRadius: 6, fontSize: 14, color, display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: 24, fontWeight: 'bold' }}>{icon}</span> {opt}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
