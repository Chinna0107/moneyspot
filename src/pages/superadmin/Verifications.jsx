import React, { useState } from 'react';
import config from '../../config';
import Sidebar from '../../components/superadmin/Sidebar';
import { toast } from 'react-hot-toast';
import './Dashboard.css';
import './Verifications.css';

const Verifications = () => {
  const [activeTab, setActiveTab] = useState('PAN');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // PAN state
  const [panNumber, setPanNumber] = useState('');

  // Aadhaar state
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarSession, setAadhaarSession] = useState(null);
  const [aadhaarOtp, setAadhaarOtp] = useState('');

  // Bank state
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  // CIBIL state
  const [cibilName, setCibilName] = useState('');
  const [cibilMobile, setCibilMobile] = useState('');
  const [cibilPan, setCibilPan] = useState('');

  const handleVerifyPAN = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (panNumber.length !== 10) throw new Error('Invalid PAN format');
      const res = await fetch(`${config.API_URL}/api/kyc/pan/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan: panNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'PAN verification failed');
      if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'PAN verification failed');
      
      setResult({ type: 'PAN', data: data.data.data });
      toast.success('PAN verified successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAadhaarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (aadhaarNumber.length !== 12) throw new Error('Invalid Aadhaar format');
      const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar_number: aadhaarNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to send OTP');
      if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'Failed to send OTP');
      
      setAadhaarSession(data.data.data.session_id);
      toast.success('OTP sent successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (!aadhaarOtp) throw new Error('Please enter the OTP');
      const res = await fetch(`${config.API_URL}/api/kyc/aadhaar/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: aadhaarSession, otp: aadhaarOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to verify OTP');
      if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'Failed to verify OTP');
      
      setResult({ type: 'AADHAAR', data: data.data.data });
      setAadhaarSession(null);
      toast.success('Aadhaar verified successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBank = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (!accountNumber || !ifsc) throw new Error('Account number and IFSC are required');
      const res = await fetch(`${config.API_URL}/api/kyc/bank/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: accountNumber, ifsc_code: ifsc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Bank verification failed');
      if (!data.success || data.data?.status !== 'success' || data.data?.error_code) throw new Error(data.data?.message || 'Bank verification failed');
      
      setResult({ type: 'BANK', data: data.data.data });
      toast.success('Bank Account verified successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCibil = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (!cibilName || cibilMobile.length !== 10 || cibilPan.length !== 10) {
        throw new Error('Please enter valid Name, Mobile (10 digits), and PAN');
      }
      const res = await fetch(`${config.API_URL}/api/kyc/cibil/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cibilName, mobile: cibilMobile, pan: cibilPan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'CIBIL verification failed');
      if (!data.success || (data.data && data.data.status !== 'success')) {
        throw new Error(data.data?.message || data.message || 'CIBIL verification failed');
      }
      
      setResult({ type: 'CIBIL', data: data.data?.result || data.data?.data || data.data || data });
      toast.success('CIBIL Report fetched successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCibilReport = (report) => {
    if (!report || !report.credit_report) return (
      <div style={{ marginTop: 20, padding: 10, background: '#f8f9fa', borderRadius: 4, fontSize: 11, overflowX: 'auto', gridColumn: '1 / -1' }}>
        <strong>Raw Report Data:</strong>
        <pre>{JSON.stringify(report, null, 2)}</pre>
      </div>
    );
    
    const cr = report.credit_report;
    const summary = cr.CAIS_Account?.CAIS_Summary;
    const accountsObj = cr.CAIS_Account?.CAIS_Account_DETAILS || {};
    const accounts = Object.values(accountsObj);

    return (
      <div style={{ gridColumn: '1 / -1', marginTop: 24 }}>
        <h4 style={{ fontSize: 16, color: '#402070', marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>Credit Report Summary</h4>
        
        {/* Summary Boxes */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Accounts</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{summary.Credit_Account?.CreditAccountTotal || 0}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Active: {summary.Credit_Account?.CreditAccountActive || 0} | Closed: {summary.Credit_Account?.CreditAccountClosed || 0}</div>
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Outstanding Balance</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>₹{parseInt(summary.Total_Outstanding_Balance?.Outstanding_Balance_All || 0).toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Defaults: {summary.Credit_Account?.CreditAccountDefault || 0}</div>
            </div>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length > 0 && (
          <div>
            <h5 style={{ fontSize: 14, color: '#334155', marginBottom: 12, fontWeight: 600 }}>Active Credit Accounts</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {accounts.map((acc, idx) => (
                <div key={idx} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                    <strong style={{ color: '#0f172a', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.Subscriber_Name || 'Unknown Bank'}</strong>
                    <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap' }}>A/c: {acc.Account_Number}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#475569' }}>
                    <div><strong>Loan:</strong> ₹{parseInt(acc.Highest_Credit_or_Original_Loan_Amount || 0).toLocaleString('en-IN')}</div>
                    <div><strong>Balance:</strong> ₹{parseInt(acc.Current_Balance || 0).toLocaleString('en-IN')}</div>
                    <div><strong>Opened:</strong> {acc.Open_Date ? `${acc.Open_Date.slice(6,8)}-${acc.Open_Date.slice(4,6)}-${acc.Open_Date.slice(0,4)}` : 'N/A'}</div>
                    <div><strong>Status:</strong> {acc.Payment_Rating || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="hide-on-print" style={{ marginTop: 24, padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 11 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>View Full Raw Data (Technical)</summary>
          <pre style={{ marginTop: 12, overflowX: 'auto' }}>{JSON.stringify(report, null, 2)}</pre>
        </details>
      </div>
    );
  };

  return (
    <div className="sa-page font-sans">
      <Sidebar />
      <div className="sa-content">
        <div className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">Manual Verifications</h1>
            <p className="dash-topbar-sub">Instantly verify PAN, Aadhaar, and Bank Account details via IDTO.</p>
          </div>
        </div>

        <div className="dash-main">
          
          <div className="dash-card" style={{ maxWidth: 700, margin: '0 auto' }}>
            {/* Tabs */}
            <div className="verifications-tabs">
              {['PAN', 'Aadhaar', 'Bank', 'CIBIL'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setResult(null);
                    setAadhaarSession(null);
                  }}
                  className={`verifications-tab ${activeTab === tab ? 'active' : ''}`}
                >
                  {tab === 'Bank' ? 'Bank Account' : tab} Verification
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="dash-card-body" style={{ padding: '32px' }}>
              {activeTab === 'PAN' && (
                <form onSubmit={handleVerifyPAN}>
                  <div className="verifications-form-group">
                    <label className="verifications-label">PAN Number</label>
                    <input
                      type="text"
                      className="verifications-input uppercase"
                      placeholder="ABCDE1234F"
                      value={panNumber}
                      onChange={e => setPanNumber(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || panNumber.length !== 10}
                    className="verifications-btn"
                  >
                    {loading ? 'Verifying...' : 'Verify PAN'}
                  </button>
                </form>
              )}

              {activeTab === 'Aadhaar' && (
                <div>
                  {!aadhaarSession ? (
                    <form onSubmit={handleSendAadhaarOtp}>
                      <div className="verifications-form-group">
                        <label className="verifications-label">Aadhaar Number</label>
                        <input
                          type="text"
                          className="verifications-input"
                          placeholder="1234 5678 9012"
                          value={aadhaarNumber}
                          onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                          maxLength={12}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || aadhaarNumber.length !== 12}
                        className="verifications-btn"
                      >
                        {loading ? 'Sending OTP...' : 'Send OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyAadhaarOtp}>
                      <div className="verifications-form-group">
                        <label className="verifications-label">Enter OTP</label>
                        <input
                          type="text"
                          className="verifications-input otp"
                          placeholder="000000"
                          value={aadhaarOtp}
                          onChange={e => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                          maxLength={6}
                        />
                        <p style={{ fontSize: 12, color: '#059669', marginTop: 8 }}>OTP sent to Aadhaar linked mobile number.</p>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          type="button"
                          onClick={() => setAadhaarSession(null)}
                          className="verifications-btn verifications-btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || aadhaarOtp.length < 4}
                          className="verifications-btn"
                        >
                          {loading ? 'Verifying...' : 'Submit OTP'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeTab === 'Bank' && (
                <form onSubmit={handleVerifyBank}>
                  <div className="verifications-form-group">
                    <label className="verifications-label">Account Number</label>
                    <input
                      type="text"
                      className="verifications-input"
                      placeholder="e.g. 1234567890"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="verifications-form-group">
                    <label className="verifications-label">IFSC Code</label>
                    <input
                      type="text"
                      className="verifications-input uppercase"
                      placeholder="e.g. HDFC0001234"
                      value={ifsc}
                      onChange={e => setIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !accountNumber || !ifsc}
                    className="verifications-btn"
                  >
                    {loading ? 'Verifying...' : 'Verify Bank Account'}
                  </button>
                </form>
              )}

              {activeTab === 'CIBIL' && (
                <form onSubmit={handleVerifyCibil}>
                  <div className="verifications-form-group">
                    <label className="verifications-label">Full Name</label>
                    <input
                      type="text"
                      className="verifications-input"
                      placeholder="Jane Doe"
                      value={cibilName}
                      onChange={e => setCibilName(e.target.value)}
                    />
                  </div>
                  <div className="verifications-form-group">
                    <label className="verifications-label">Mobile Number</label>
                    <input
                      type="text"
                      className="verifications-input"
                      placeholder="9876543210"
                      value={cibilMobile}
                      onChange={e => setCibilMobile(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                    />
                  </div>
                  <div className="verifications-form-group">
                    <label className="verifications-label">PAN Number</label>
                    <input
                      type="text"
                      className="verifications-input uppercase"
                      placeholder="ABCDE1234F"
                      value={cibilPan}
                      onChange={e => setCibilPan(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !cibilName || cibilMobile.length !== 10 || cibilPan.length !== 10}
                    className="verifications-btn"
                  >
                    {loading ? 'Fetching...' : 'Check CIBIL Score'}
                  </button>
                </form>
              )}
            </div>
          </div>
            
          {/* Results Section */}
          {result && (
            <div style={{ maxWidth: 700, margin: '0 auto', animation: 'fade-in-right 0.4s ease both' }} className="verifications-printable-area">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="verifications-results-header">
                <div>Verification Results</div>
                <button onClick={() => window.print()} className="verifications-btn verifications-btn-secondary hide-on-print" style={{ padding: '6px 12px', fontSize: 12, width: 'auto', borderRadius: 6 }}>
                  🖨️ Print / Save PDF
                </button>
              </div>
              <div className="dash-card">
                <div className="dash-card-body" style={{ padding: '24px' }}>
                  
                  {result.type === 'PAN' && (
                    <div className="dash-kv-list">
                      <div className="dash-kv"><span>Full Name</span><span className="kv-gold">{result.data.full_name || 'N/A'}</span></div>
                      <div className="dash-kv"><span>PAN Number</span><strong>{result.data.pan_number || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Date of Birth</span><strong>{result.data.dob || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Gender</span><strong>{result.data.gender || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Masked Aadhaar</span><strong>{result.data.masked_aadhaar || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Aadhaar Linked</span>
                        <span className={`dash-badge ${result.data.aadhaar_linked ? 'badge-green' : 'badge-red'}`}>
                          {result.data.aadhaar_linked ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  )}

                  {result.type === 'AADHAAR' && (
                    <div className="dash-kv-list">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 20, borderBottom: '1px solid #f0f2f8', marginBottom: 12 }}>
                        {(result.data.photo_base64 || result.data.profile_image) && (
                          <img src={`data:image/jpeg;base64,${result.data.photo_base64 || result.data.profile_image}`} alt="Aadhaar Photo" className="verifications-photo" />
                        )}
                        <div>
                          <h4 style={{ fontSize: 18, fontWeight: 800, color: '#402070', margin: '0 0 4px' }}>{result.data.full_name || result.data.name || result.data.user_full_name || 'Name not provided'}</h4>
                          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Aadhaar: {result.data.aadhaar_number || result.data.aadhar_number || result.data.aadhar || result.data.uid || result.data.masked_aadhaar || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="dash-kv"><span>Date of Birth</span><strong>{result.data.dob || result.data.date_of_birth || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Gender</span><strong>{result.data.gender || 'N/A'}</strong></div>
                      <div className="dash-kv"><span>Address</span><strong style={{ maxWidth: '60%', textAlign: 'right', lineHeight: 1.4 }}>
                        {typeof result.data.address === 'string' ? result.data.address : 
                          (result.data.address?.full || result.data.address?.combined_address || result.data.address?.complete_address || 
                           (result.data.address ? JSON.stringify(result.data.address) : 'N/A'))}
                      </strong></div>
                      <div className="dash-kv"><span>Care Of (C/O)</span><strong>{result.data.care_of || result.data.co || 'N/A'}</strong></div>
                    </div>
                  )}
                  {result.type === 'AADHAAR' && (
                    <div style={{ marginTop: 20, padding: 10, background: '#f8f9fa', borderRadius: 4, fontSize: 11, overflowX: 'auto' }}>
                      <strong>Debug Data:</strong>
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  )}

                  {result.type === 'BANK' && (
                    <div className="dash-kv-list">
                      <div className="dash-kv"><span>Account Holder Name</span><span className="kv-gold" style={{ fontSize: 16 }}>{result.data.account_holder_name || 'N/A'}</span></div>
                      <div className="dash-kv"><span>Account Status</span>
                        <span className={`dash-badge ${result.data.account_status === 'VALID' ? 'badge-green' : 'badge-red'}`}>
                          {result.data.account_status || 'N/A'}
                        </span>
                      </div>
                      <div className="dash-kv"><span>Account Number</span><strong>{result.data.account_number || 'N/A'}</strong></div>
                    </div>
                  )}

                  {result.type === 'CIBIL' && (
                    <div className="dash-kv-list">
                      <div className="dash-kv"><span>Name</span><span className="kv-gold" style={{ fontSize: 16 }}>{result.data.name || result.data.full_name || cibilName}</span></div>
                      <div className="dash-kv"><span>CIBIL Score</span>
                        <strong style={{ fontSize: 18, color: (result.data.credit_score || result.data.score) >= 700 ? '#059669' : (result.data.credit_score || result.data.score) >= 600 ? '#d97706' : '#dc2626' }}>
                          {result.data.credit_score || result.data.score || result.data.cibil_score || 'N/A'}
                        </strong>
                      </div>
                      <div className="dash-kv"><span>Status</span><strong>{result.data.status || 'Success'}</strong></div>
                      {renderCibilReport(result.data)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verifications;
