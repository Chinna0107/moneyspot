import { useState, useEffect } from 'react'
import config from '../../config'
import { getTokenByRole } from '../../utils/tokenUtils'
import Sidebar from '../../components/superadmin/Sidebar'
import './superadmin.css'
import './Dashboard.css'

export default function AssignmentResults() {
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [results, setResults] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)

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
        setResults(data)
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
                            <div style={{ fontWeight: 800, color: r.score === r.total_questions ? '#059669' : '#402070', fontSize: 16 }}>{r.score} <span style={{ fontSize: 13, color: '#94a3b8' }}>/ {r.total_questions}</span></div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{Math.round((r.score / r.total_questions) * 100)}%</div>
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
    </div>
  )
}
