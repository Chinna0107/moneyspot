import sys

file_path = '/Users/hemanthkancharla/moneybe/routes/customers.js'
content = open(file_path).read()

new_route = """
// Get Customer Reminders (35 days or more)
router.get('/reminders', authMiddleware, async (req, res) => {
  try {
    let branchFilter = ''
    let queryParams = []
    if (req.user.role === 'employee') {
      branchFilter = 'AND c.branch = $1'
      queryParams.push(req.user.branch)
    }

    const query = `
      SELECT c.id, c.name, c.phone, c.email, c.branch, COALESCE(MAX(t.created_at), c.created_at) as last_visited
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE c.status = 'approved' ${branchFilter}
      GROUP BY c.id
      HAVING CURRENT_DATE - DATE(COALESCE(MAX(t.created_at), c.created_at)) >= 35
      ORDER BY last_visited ASC
    `
    const r = await pool.query(query, queryParams)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

"""

if "router.get('/reminders'" not in content:
    content = content.replace("module.exports = router", new_route + "module.exports = router")
    with open(file_path, 'w') as f:
        f.write(content)
    print("Added /reminders route")
else:
    print("Route /reminders already exists")
