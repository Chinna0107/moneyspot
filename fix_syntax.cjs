const fs = require('fs');
const file = '/Users/hemanthkancharla/moneybe/middleware/auth.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("  } catch (err) { console.error('authMiddleware error:', err); res.status(401).json({ error: 'Invalid or expired token' }) }\n  }\n}", "  } catch (err) { console.error('authMiddleware error:', err); res.status(401).json({ error: 'Invalid or expired token' }) }\n}");
fs.writeFileSync(file, content);
