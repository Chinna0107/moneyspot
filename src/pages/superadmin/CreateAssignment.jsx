import { useState, useEffect } from 'react'
import config from '../../config'
import { getTokenByRole } from '../../utils/tokenUtils'
import Sidebar from '../../components/superadmin/Sidebar'
import './superadmin.css'
import './Dashboard.css'

export default function CreateAssignment() {
  const [viewMode, setViewMode] = useState('list') // 'list' | 'form'
  const [loading, setLoading] = useState(false)
  
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  
  const [editingId, setEditingId] = useState(null)
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    time_limit_minutes: 10,
    assigned_to: [], // array of employee IDs
    is_active: true
  })

  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_option_index: 0 }
  ])

  useEffect(() => {
    fetchEmployees()
    fetchAssignments()
  }, [])

  const fetchEmployees = async () => {
    try {
      const token = getTokenByRole('superadmin')
      const res = await fetch(`${config.API_URL}/assignments/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
    }
  }

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
    }
  }

  const handleCreateNew = () => {
    setEditingId(null)
    setForm({ title: '', description: '', time_limit_minutes: 10, assigned_to: [], is_active: true })
    setQuestions([{ question_text: '', options: ['', '', '', ''], correct_option_index: 0 }])
    setViewMode('form')
  }

  const handleEdit = async (id) => {
    try {
      const token = getTokenByRole('superadmin')
      const res = await fetch(`${config.API_URL}/assignments/${id}/edit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setForm({
          title: data.title,
          description: data.description,
          time_limit_minutes: data.time_limit_minutes,
          assigned_to: data.assigned_to || [],
          is_active: data.is_active
        })
        setQuestions(data.questions.map(q => ({
          question_text: q.question_text,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          correct_option_index: q.correct_option_index
        })))
        setEditingId(id)
        setViewMode('form')
      }
    } catch (err) {
      alert('Error fetching assignment details')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment? All associated results will be lost!')) return
    try {
      const token = getTokenByRole('superadmin')
      const res = await fetch(`${config.API_URL}/assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchAssignments()
      } else {
        alert('Failed to delete')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddQuestion = () => {
    setQuestions([
      ...questions, 
      { question_text: '', options: ['', '', '', ''], correct_option_index: 0 }
    ])
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) return alert('At least one question is required.')
    const newQ = [...questions]
    newQ.splice(index, 1)
    setQuestions(newQ)
  }

  const handleQuestionChange = (index, field, value) => {
    const newQ = [...questions]
    newQ[index][field] = value
    setQuestions(newQ)
  }

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQ = [...questions]
    newQ[qIndex].options[optIndex] = value
    setQuestions(newQ)
  }

  const handleToggleEmployee = (empId) => {
    const isSelected = form.assigned_to.includes(empId)
    if (isSelected) {
      setForm({ ...form, assigned_to: form.assigned_to.filter(id => id !== empId) })
    } else {
      setForm({ ...form, assigned_to: [...form.assigned_to, empId] })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.title) return alert('Title is required')
    if (form.assigned_to.length === 0) return alert('Please assign to at least one employee')
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text) return alert(`Question ${i + 1} text is missing`)
      if (q.options.some(o => !o.trim())) return alert(`Question ${i + 1} has empty options`)
    }

    setLoading(true)
    try {
      const token = getTokenByRole('superadmin')
      const payload = { ...form, questions }
      
      const url = editingId ? `${config.API_URL}/assignments/${editingId}` : `${config.API_URL}/assignments`
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save assignment')
      
      alert(editingId ? 'Assignment updated successfully!' : 'Assignment created successfully!')
      fetchAssignments()
      setViewMode('list')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sa-page">
      <Sidebar />
      <div className="sa-content">
        <div className="dash-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="dash-topbar-title">📝 Manage Assignments</h1>
            <p className="dash-topbar-sub">Create and organize employee quizzes</p>
          </div>
          {viewMode === 'list' ? (
            <button onClick={handleCreateNew} style={{ background: 'linear-gradient(135deg, #402070, #c02040)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(64,32,112,0.3)' }}>
              + Create New
            </button>
          ) : (
            <button onClick={() => setViewMode('list')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              ← Back to List
            </button>
          )}
        </div>

        <div className="dash-main">
          {viewMode === 'list' && (
            <div className="sa-card">
              <div className="sa-card-body" style={{ padding: 24 }}>
                {assignments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: 40, background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>No assignments created yet. Click '+ Create New' to get started!</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time Limit</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Questions</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                        <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#402070', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{a.title}</td>
                          <td style={{ padding: '16px 20px', color: '#475569', fontSize: 14 }}>⏱️ {a.time_limit_minutes} mins</td>
                          <td style={{ padding: '16px 20px', color: '#475569', fontSize: 14 }}>👥 {a.assigned_to?.length || 0}</td>
                          <td style={{ padding: '16px 20px', color: '#475569', fontSize: 14 }}>📝 {a.question_count}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: a.is_active ? '#dcfce7' : '#f1f5f9', color: a.is_active ? '#059669' : '#64748b' }}>
                              {a.is_active ? '● Active' : '○ Draft'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button onClick={() => handleEdit(a.id)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 6, marginRight: 8, cursor: 'pointer', color: '#402070', fontWeight: 600 }}>Edit</button>
                            <button onClick={() => handleDelete(a.id)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {viewMode === 'form' && (
            <div className="sa-card">
              <div className="sa-card-body" style={{ padding: 30 }}>
                <h3 style={{ marginBottom: 24, color: '#1e293b', fontSize: 20, borderBottom: '2px solid #f1f5f9', paddingBottom: 16 }}>{editingId ? '✏️ Edit Assignment' : '✨ Create New Assignment'}</h3>
                <form onSubmit={handleSubmit}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Assignment Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} placeholder="e.g. Compliance Training Q3" />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Time Limit (Minutes) *</label>
                <input type="number" required min={1} value={form.time_limit_minutes} onChange={e => setForm({...form, time_limit_minutes: parseInt(e.target.value)})} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} placeholder="Optional instructions for the employees..." />
            </div>

            <div style={{ marginBottom: 30 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} style={{ width: 18, height: 18 }} />
                Assignment is Active (Visible to Employees)
              </label>
            </div>

            <div style={{ marginBottom: 30 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Assign To Employees *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 15, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', maxHeight: 200, overflowY: 'auto' }}>
                {employees.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>No active employees found.</span>}
                {employees.map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '6px 12px', borderRadius: 20, border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.assigned_to.includes(emp.id)} onChange={() => handleToggleEmployee(emp.id)} />
                    {emp.name} ({emp.branch})
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={() => setForm({...form, assigned_to: employees.map(e => e.id)})} style={{ background: 'none', border: 'none', color: '#402070', fontSize: 12, cursor: 'pointer', fontWeight: 600, marginRight: 15 }}>Select All</button>
                <button type="button" onClick={() => setForm({...form, assigned_to: []})} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Clear All</button>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 30, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, color: '#1e293b', margin: 0 }}>Questions</h3>
                <button type="button" onClick={handleAddQuestion} style={{ background: '#402070', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add Question</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {questions.map((q, qIndex) => (
                  <div key={qIndex} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, position: 'relative' }}>
                    <button type="button" onClick={() => handleRemoveQuestion(qIndex)} style={{ position: 'absolute', top: 15, right: 15, background: '#fee2e2', color: '#dc2626', border: 'none', width: 28, height: 28, borderRadius: 14, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    
                    <div style={{ marginBottom: 15 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Question {qIndex + 1}</label>
                      <input type="text" required value={q.question_text} onChange={e => handleQuestionChange(qIndex, 'question_text', e.target.value)} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} placeholder="Enter the question..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="radio" name={`correct_${qIndex}`} checked={q.correct_option_index === optIndex} onChange={() => handleQuestionChange(qIndex, 'correct_option_index', optIndex)} style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }} title="Mark as correct answer" />
                          <input type="text" required value={opt} onChange={e => handleOptionChange(qIndex, optIndex, e.target.value)} 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: `1px solid ${q.correct_option_index === optIndex ? '#10b981' : '#cbd5e1'}`, background: q.correct_option_index === optIndex ? '#ecfdf5' : '#fff' }} placeholder={`Option ${optIndex + 1}`} />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, fontStyle: 'italic' }}>* Select the radio button next to the correct option.</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setViewMode('list')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #402070, #c02040)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(64,32,112,0.3)' }}>
                {loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Publish Assignment')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}
        </div>
      </div>
    </div>
  )
}
