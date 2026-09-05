import React, { useState, useEffect, useMemo } from 'react'
import { getCustomerTier } from '../../utils/tierUtils'
import { getActivityStatus } from '../../utils/customerBehaviorUtils'

const PRESET_RANGES = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
]

export default function CustomerFilterPanel({ customers, onFilterChange, isEmployee = false, initialTier = '', initialActivity = '' }) {
  const [tierFilter, setTierFilter] = useState(initialTier ? [initialTier] : [])
  const [activityFilter, setActivityFilter] = useState(initialActivity ? [initialActivity] : [])
  const [branchFilter, setBranchFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState([])
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [volumeRange, setVolumeRange] = useState({ min: '', max: '' })
  
  const [expanded, setExpanded] = useState(false)

  // Derive dynamic options from the raw customer list
  const branches = useMemo(() => [...new Set(customers.map(c => c.branch).filter(Boolean))].sort(), [customers])
  const employees = useMemo(() => [...new Set(customers.map(c => c.added_by_name).filter(Boolean))].sort(), [customers])
  
  const services = useMemo(() => {
    const allServices = new Set()
    customers.forEach(c => {
      if (Array.isArray(c.services_used)) {
        c.services_used.forEach(s => s && allServices.add(s))
      }
    })
    return [...allServices].sort()
  }, [customers])

  // Common UI components for dropdowns
  const toggleArrayItem = (setter, val) => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])

  const applyPresetDate = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  // Trigger filtering whenever inputs change
  useEffect(() => {
    let result = customers

    // 1. Tier Filter
    if (tierFilter.length > 0) {
      result = result.filter(c => tierFilter.includes(getCustomerTier(parseFloat(c.total_amount) || 0).label))
    }

    // 2. Activity Status Filter
    if (activityFilter.length > 0) {
      result = result.filter(c => {
        const stats = getActivityStatus(c, []) // We only need c.last_txn_date, c.created_at, and c.txn_count which are in c
        return activityFilter.includes(stats.label)
      })
    }

    // 3. Branch Filter
    if (branchFilter) {
      result = result.filter(c => c.branch === branchFilter)
    }

    // 4. Employee Filter
    if (employeeFilter) {
      result = result.filter(c => c.added_by_name === employeeFilter)
    }

    // 5. Service Filter
    if (serviceFilter.length > 0) {
      result = result.filter(c => {
        if (!c.services_used || !Array.isArray(c.services_used)) return false
        return serviceFilter.some(s => c.services_used.includes(s))
      })
    }

    // 6. Last Txn Date Range
    if (dateRange.start) {
      const s = new Date(dateRange.start)
      result = result.filter(c => {
        const d = c.last_txn_date ? new Date(c.last_txn_date) : null
        return d && d >= s
      })
    }
    if (dateRange.end) {
      const e = new Date(dateRange.end)
      e.setHours(23, 59, 59, 999)
      result = result.filter(c => {
        const d = c.last_txn_date ? new Date(c.last_txn_date) : null
        return d && d <= e
      })
    }

    // 7. Volume Range
    if (volumeRange.min !== '') {
      const min = parseFloat(volumeRange.min)
      result = result.filter(c => (parseFloat(c.total_amount) || 0) >= min)
    }
    if (volumeRange.max !== '') {
      const max = parseFloat(volumeRange.max)
      result = result.filter(c => (parseFloat(c.total_amount) || 0) <= max)
    }

    onFilterChange(result)
  }, [customers, tierFilter, activityFilter, branchFilter, employeeFilter, serviceFilter, dateRange, volumeRange, onFilterChange])

  const clearFilters = () => {
    setTierFilter([])
    setActivityFilter([])
    setBranchFilter('')
    setEmployeeFilter('')
    setServiceFilter([])
    setDateRange({ start: '', end: '' })
    setVolumeRange({ min: '', max: '' })
  }

  const activeFiltersCount = tierFilter.length + activityFilter.length + (branchFilter ? 1 : 0) + (employeeFilter ? 1 : 0) + serviceFilter.length + (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0) + (volumeRange.min ? 1 : 0) + (volumeRange.max ? 1 : 0)

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expanded ? '#f8fafc' : '#fff' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <span style={{ background: '#402070', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
              {activeFiltersCount} Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {activeFiltersCount > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              Clear All
            </button>
          )}
          <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: 12 }}>▼</span>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          
          {/* Tiers */}
          <div className="filter-group">
            <div className="filter-label">🏆 Customer Tier</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Elite Plus', 'Elite', 'Platinum', 'Premium', 'Gold', 'Regular', 'Starter'].map(t => (
                <button key={t} onClick={() => toggleArrayItem(setTierFilter, t)}
                  style={{ padding: '4px 10px', borderRadius: 14, border: `1px solid ${tierFilter.includes(t) ? '#402070' : '#e2e8f0'}`, background: tierFilter.includes(t) ? '#f3e8ff' : '#fff', color: tierFilter.includes(t) ? '#402070' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="filter-group">
            <div className="filter-label">🚦 Activity Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Active', 'Irregular', 'At Risk', 'Inactive', 'Dormant', 'Reactivated', 'New'].map(a => (
                <button key={a} onClick={() => toggleArrayItem(setActivityFilter, a)}
                  style={{ padding: '4px 10px', borderRadius: 14, border: `1px solid ${activityFilter.includes(a) ? '#059669' : '#e2e8f0'}`, background: activityFilter.includes(a) ? '#d1fae5' : '#fff', color: activityFilter.includes(a) ? '#059669' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="filter-group">
              <div className="filter-label">🏢 Branch</div>
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            {!isEmployee && (
              <div className="filter-group">
                <div className="filter-label">👤 Employee</div>
                <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}>
                  <option value="">All Employees</option>
                  {employees.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="filter-group">
              <div className="filter-label">💳 Service Used</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.map(s => (
                  <button key={s} onClick={() => toggleArrayItem(setServiceFilter, s)}
                    style={{ padding: '4px 10px', borderRadius: 14, border: `1px solid ${serviceFilter.includes(s) ? '#2563eb' : '#e2e8f0'}`, background: serviceFilter.includes(s) ? '#dbeafe' : '#fff', color: serviceFilter.includes(s) ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="filter-group">
            <div className="filter-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📅 Last Txn Range</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRESET_RANGES.map(p => (
                  <button key={p.label} onClick={() => applyPresetDate(p.days)} style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#333', outline: 'none' }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#333', outline: 'none' }} />
            </div>
          </div>

          {/* Volume Range */}
          <div className="filter-group">
            <div className="filter-label">💰 Lifetime Volume (₹)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" placeholder="Min ₹" value={volumeRange.min} onChange={e => setVolumeRange(prev => ({ ...prev, min: e.target.value }))} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
              <input type="number" placeholder="Max ₹" value={volumeRange.max} onChange={e => setVolumeRange(prev => ({ ...prev, max: e.target.value }))} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .filter-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
      `}</style>
    </div>
  )
}
