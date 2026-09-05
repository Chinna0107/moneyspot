import React, { useState } from 'react';
import api from '../../utils/api';

const AadhaarVerification = ({ onVerifySuccess }) => {
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [clientId, setClientId] = useState(null); // ID returned after sending OTP
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      setError('Invalid Aadhaar length (must be 12 digits)');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/kyc/aadhaar/send-otp', { aadhaar_number: aadhaar });
      const id = response.data.data?.session_id || response.data.data?.client_id || response.data.data?.tranx_id;
      if (response.data.success && id) {
        setClientId(id); 
      } else {
        setError(response.data.data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Invalid OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/kyc/aadhaar/verify-otp', { 
        client_id: clientId, 
        otp 
      });
      if (response.data.success) {
        setResult(response.data.data);
        if (onVerifySuccess) onVerifySuccess(response.data.data);
      } else {
        setError('OTP Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kyc-verification-box" style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '16px' }}>
      <h3 style={{ marginTop: 0 }}>Aadhaar Verification</h3>
      
      {!clientId && !result && (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              placeholder="Enter Aadhaar Number" 
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value.replace(/\\D/g, '').slice(0, 12))}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              maxLength={12}
              required
            />
            {error && <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
          </div>
          <button 
            type="submit" 
            disabled={loading || aadhaar.length !== 12}
            style={{ padding: '10px 20px', background: '#402070', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      )}

      {clientId && !result && (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              placeholder="Enter OTP sent to Aadhaar linked mobile" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              maxLength={6}
              required
            />
            {error && <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
          </div>
          <button 
            type="submit" 
            disabled={loading || otp.length < 4}
            style={{ padding: '10px 20px', background: '#402070', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
      )}

      {result && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5fff5', border: '1px solid #c3e6c3', borderRadius: '4px' }}>
          <p style={{ margin: 0, color: 'green', fontWeight: 'bold' }}>✅ Aadhaar Verified Successfully</p>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}><strong>Name:</strong> {result.name || result.full_name || 'N/A'}</p>
          {result.care_of && <p style={{ margin: '4px 0 0', fontSize: '14px' }}><strong>C/O:</strong> {result.care_of}</p>}
        </div>
      )}
    </div>
  );
};

export default AadhaarVerification;
