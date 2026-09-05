import sys
import os

file_path = '/Users/hemanthkancharla/moneybe/routes/dashboard.js'

with open(file_path, 'r') as f:
    content = f.read()

target = """SELECT t.*, u.name as employee_name, u.branch 
       FROM transactions t
       JOIN users u ON t.employee_id = u.id
       WHERE u.branch = $1 
       ORDER BY t.created_at DESC LIMIT 300"""

replacement = """SELECT t.*, u.name as employee_name, u.branch, COALESCE(c_totals.total_amount, 0) as customer_total_amount
       FROM transactions t
       JOIN users u ON t.employee_id = u.id
       LEFT JOIN (SELECT customer_id, SUM(amount) as total_amount FROM transactions GROUP BY customer_id) c_totals ON t.customer_id = c_totals.customer_id
       WHERE u.branch = $1 
       ORDER BY t.created_at DESC LIMIT 300"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Patched /employee-features/transactions")
else:
    print("Could not find target query in dashboard.js or already patched.")
