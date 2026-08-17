const fs = require('fs');
const file = '/Users/hemanthkancharla/moneybe/middleware/auth.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/catch \{.*?error: 'Invalid or expired token' \}\)/s, "catch (err) { console.error('authMiddleware error:', err); res.status(401).json({ error: 'Invalid or expired token' }) }");
if (content === fs.readFileSync(file, 'utf8')) {
  // If replace failed, fallback to replacing the specific string I used last time
  content = content.replace(/catch \{ console.error\('JWT Error for token:', token\); res.status\(401\)\.json\(\{ error: 'Invalid or expired token' \}\) \}/g, "catch (err) { console.error('authMiddleware error:', err.message, err.stack); res.status(401).json({ error: 'Invalid or expired token' }) }");
}
fs.writeFileSync(file, content);
