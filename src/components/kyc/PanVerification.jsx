import React, { useState } from 'react';
import axios from 'axios';
import api from '../../utils/api'; // Or use axios directly if api instance isn't configured for this

const PanVerification = ({ onVerifySuccess }) => {
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (pan.length !== 10) {
      setError('Invalid PAN length');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/kyc/pan/verify', { pan });
      if (response.data.success) {
        setResult(response.data.data);
        if (onVerifySuccess) onVerifySuccess(response.data.data);
      } else {
        setError('Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error verifying PAN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kyc-verification-box" style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '16px' }}>
      <h3 style={{ marginTop: 0 }}>PAN Verification</h3>
      <form onSubmit={handleVerify} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input 
            type="text" 
            placeholder="Enter PAN Number (e.g. ABCDE1234F)" 
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            maxLength={10}
            required
          />
          {error && <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
        </div>
        <button 
          type="submit" 
          disabled={loading || pan.length !== 10}
          style={{ padding: '10px 20px', background: '#402070', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      
      {result && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f5fff5', border: '1px solid #c3e6c3', borderRadius: '4px' }}>
          <p style={{ margin: 0, color: 'green', fontWeight: 'bold' }}>✅ PAN Verified Successfully</p>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}><strong>Name:</strong> {result.name || result.full_name || 'N/A'}</p>
        </div>
      )}
    </div>
  );
};

export default PanVerification;
