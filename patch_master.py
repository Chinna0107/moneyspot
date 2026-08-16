with open('/Users/hemanthkancharla/moneybe/routes/master.js', 'r') as f:
    content = f.read()

search_str = "    bill_platform, bill_amount, bill_remaining, total_collected, received_mode, acc_no\n  } = req.body"
rep_str = "    bill_platform, bill_amount, bill_remaining, total_collected, received_mode, acc_no, bill_due_date\n  } = req.body"

if search_str in content:
    content = content.replace(search_str, rep_str)
    with open('/Users/hemanthkancharla/moneybe/routes/master.js', 'w') as f:
        f.write(content)
        print("Success")
else:
    print("Search string not found")
