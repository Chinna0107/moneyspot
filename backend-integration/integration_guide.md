# MSG91 Backend Integration Guide

Please follow these steps to integrate MSG91 into your `moneybe` backend repository.

## Step 1: Install Dependencies
If you haven't already, install `axios` in your backend project:
```bash
npm install axios
```

## Step 2: Set Environment Variables
Add the following to your backend's `.env` file:
```env
# MSG91 Integration
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_SENDER_ID=MNYSPT
```

## Step 3: Copy the Utility Service
Copy the `msg91Service.js` file from this folder into your backend's `src/utils/` directory (or wherever you keep utility functions).

## Step 4: Import and Use in Controllers

Here are examples of how to trigger the SMS in your various controllers.

### 1. Customer OTP (Login/Register)
```javascript
const { sendSMS } = require('../utils/msg91Service');

// In your OTP sending function:
const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP

// To send Customer Registration OTP:
await sendSMS('91' + userMobile, 'CUSTOMER_REG_OTP', { num: otp });

// To send Customer Login OTP:
await sendSMS('91' + userMobile, 'CUSTOMER_LOGIN_OTP', { num: otp });
```

### 2. KYC Approval
```javascript
const { sendSMS } = require('../utils/msg91Service');

// When an admin approves KYC
const loginUrl = 'https://moneyspot.in/login'; // Replace with actual URL
await sendSMS('91' + userMobile, 'KYC_APPROVED', { urg: loginUrl });
```

### 3. Support Ticket Creation
```javascript
const { sendSMS } = require('../utils/msg91Service');

// When a new support ticket is created
const ticketId = 'TKT-12345'; // Example ticket ID
await sendSMS('91' + userMobile, 'SUPPORT_REQUEST', { alp: ticketId });
```

## Step 5: Test
Run your backend server and trigger the events from your frontend or Postman to ensure the SMS is sent properly!
