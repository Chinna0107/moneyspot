const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const SENDER_ID = process.env.MSG91_SENDER_ID || 'MNYSPT';

// Map of all 10 approved MSG91 templates
const TEMPLATES = {
  CUSTOMER_REG_OTP: '1077068950023879683', // Vars: {#num#}
  KYC_PENDING: '1077192510023609362',      // Vars: None
  SUPPORT_REQUEST: '1077575780024079808',  // Vars: {#alp#} (Ticket ID)
  PROFILE_UPDATE: '1077000770024095056',   // Vars: None
  EMP_LOGIN_OTP: '1077031300024113490',    // Vars: {#num#}
  CUSTOMER_LOGIN_OTP: '1077079180024138644', // Vars: {#num#}
  KYC_RESUBMIT: '1077100860024153829',     // Vars: None
  PWD_RESET_OTP: '1077128000024178229',    // Vars: {#num#}
  BRANCH_LOGIN_OTP: '1077160540024193817', // Vars: {#num#}
  KYC_APPROVED: '1077231470028892140',     // Vars: {#urg#} (Login URL)
};

/**
 * Send SMS using MSG91 Flow API
 * 
 * @param {string} mobile - Mobile number with country code (e.g., '919876543210')
 * @param {string} templateKey - Key from the TEMPLATES object (e.g., 'CUSTOMER_REG_OTP')
 * @param {object} variables - Variables required by the template (e.g., { num: '1234' })
 * @returns {Promise<object>} - MSG91 API Response
 */
async function sendSMS(mobile, templateKey, variables = {}) {
  const templateId = TEMPLATES[templateKey];
  
  if (!templateId) {
    throw new Error(`Invalid MSG91 Template Key: ${templateKey}`);
  }
  
  if (!MSG91_AUTH_KEY) {
    console.warn('MSG91_AUTH_KEY is not set in environment variables. SMS will not be sent.');
    return;
  }

  try {
    const payload = {
      template_id: templateId,
      sender: SENDER_ID,
      short_url: '0',
      recipients: [
        {
          mobiles: mobile,
          ...variables // Unpack variables like { num: '1234' } directly into the recipient object
        }
      ]
    };

    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      payload,
      {
        headers: {
          'authkey': MSG91_AUTH_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('MSG91 SMS Sending Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendSMS, TEMPLATES };
