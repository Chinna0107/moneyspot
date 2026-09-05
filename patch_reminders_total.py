import sys
import os

file_path = '/Users/hemanthkancharla/moneybe/routes/customers.js'

with open(file_path, 'r') as f:
    content = f.read()

# The target line we want to replace
target = "SELECT c.id, c.name, c.phone, c.email, c.branch, COALESCE(MAX(t.created_at), c.created_at) as last_visited"
replacement = "SELECT c.id, c.name, c.phone, c.email, c.branch, COALESCE(MAX(t.created_at), c.created_at) as last_visited, COALESCE(SUM(t.amount), 0) as total_amount"

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully added total_amount to /reminders route.")
else:
    if replacement in content:
        print("total_amount already added to /reminders route.")
    else:
        print("Could not find the target line to replace.")
        sys.exit(1)
