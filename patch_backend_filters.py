import sys

file_path = '/Users/hemanthkancharla/moneybe/routes/customers.js'
content = open(file_path).read()

# First, extract the reminders route
start_idx = content.find('// Get Customer Reminders (35 days or more)')
end_idx = content.find("router.get('/:id'", start_idx)

if start_idx != -1 and end_idx != -1:
    old_route = content[start_idx:end_idx]
    
    new_route = '''// Get Customer Reminders (35 days or more)
router.get('/reminders', authMiddleware, async (req, res) => {
  try {
    let branchFilter = ''
    let queryParams = []
    
    const days = parseInt(req.query.days) || 35
    const exact = req.query.exact === 'false' ? false : true
    const operator = exact ? '=' : '>='
    
    queryParams.push(days)

    if (req.user.role === 'employee') {
      branchFilter = 'AND c.branch = $2'
      queryParams.push(req.user.branch)
    }

    const query = `
      SELECT c.id, c.name, c.phone, c.email, c.branch, COALESCE(MAX(t.created_at), c.created_at) as last_visited
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE c.status = 'approved' ${branchFilter}
      GROUP BY c.id
      HAVING CURRENT_DATE - DATE(COALESCE(MAX(t.created_at), c.created_at)) ${operator} $1
      ORDER BY last_visited ASC
    `
    const r = await pool.query(query, queryParams)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

'''
    content = content.replace(old_route, new_route)
    with open(file_path, 'w') as f:
        f.write(content)
    print('Updated route successfully!')
else:
    print('Failed to find route bounds.')
