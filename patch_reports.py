import sys
import os

file_path = '/Users/hemanthkancharla/moneybe/routes/dashboard.js'

with open(file_path, 'r') as f:
    content = f.read()

# I will replace "u.name as employee_name" with "u.name as employee_name, COALESCE(c_totals.total_amount, 0) as customer_total_amount"
# and "JOIN users u ON t.employee_id = u.id" with "JOIN users u ON t.employee_id = u.id LEFT JOIN (SELECT customer_id, SUM(amount) as total_amount FROM transactions GROUP BY customer_id) c_totals ON t.customer_id = c_totals.customer_id"

# Wait, there are multiple occurrences of this in /reports. I should use regex or careful replacement.
import re

content = re.sub(
    r'(SELECT t\.\*, u\.name as employee_name.*?FROM transactions t)',
    r'\1',
    content,
    flags=re.DOTALL
)

def patch_query(q):
    if "customer_total_amount" in q: return q
    q = q.replace("u.name as employee_name", "u.name as employee_name, COALESCE(c_totals.total_amount, 0) as customer_total_amount")
    q = q.replace("JOIN users u ON t.employee_id = u.id", "JOIN users u ON t.employee_id = u.id LEFT JOIN (SELECT customer_id, SUM(amount) as total_amount FROM transactions GROUP BY customer_id) c_totals ON t.customer_id = c_totals.customer_id")
    return q

# split by 'router.get' and patch the reports route specifically if possible
# Let's just do a naive replace for the specific lines in the /reports route.

if "customer_total_amount" not in content:
    content = content.replace("u.name as employee_name", "u.name as employee_name, COALESCE(c_totals.total_amount, 0) as customer_total_amount")
    content = content.replace("JOIN users u ON t.employee_id = u.id", "JOIN users u ON t.employee_id = u.id\n       LEFT JOIN (SELECT customer_id, SUM(amount) as total_amount FROM transactions GROUP BY customer_id) c_totals ON t.customer_id = c_totals.customer_id")
    with open(file_path, 'w') as f:
        f.write(content)
    print("Patched dashboard.js for all transactions queries")
else:
    print("dashboard.js already contains customer_total_amount")
