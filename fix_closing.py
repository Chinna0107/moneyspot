import os
import re

files = [
    'src/pages/shared/PendingPayments.jsx',
    'src/pages/shared/CustomerReminders.jsx',
    'src/pages/employee/BranchAttendance.jsx',
    'src/pages/employee/Leads.jsx',
    'src/pages/employee/EmployeeExpenses.jsx',
    'src/pages/employee/AddCustomer.jsx',
    'src/pages/employee/EmployeeReports.jsx',
    'src/pages/employee/Requests.jsx',
    'src/pages/employee/Dashboard.jsx',
    'src/pages/employee/CustomerInfo.jsx',
    'src/pages/employee/EmployeeTransactions.jsx',
    'src/pages/employee/BillDueDates.jsx',
    'src/pages/employee/Services.jsx',
]

for file_path in files:
    full_path = os.path.join('/Users/hemanthkancharla/Documents/zewotech/moneyspot', file_path)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r') as f:
        content = f.read()

    # We need to replace the last </div> before the final </div> that closes the dashboard div.
    # Usually it looks like:
    #       </div>
    #     </div>
    #   )
    # }
    
    # Let's try regex substitution: find the last occurrence of </div>\n    </div>
    # and replace with </main>\n    </div>
    
    last_idx = content.rfind("</div>\n    </div>")
    if last_idx != -1:
        content = content[:last_idx] + "</main>\n    </div>" + content[last_idx + len("</div>\n    </div>"):]
    else:
        # Fallback 1: might have different indentation
        last_idx2 = content.rfind("</div>\n  </div>")
        if last_idx2 != -1:
            content = content[:last_idx2] + "</main>\n  </div>" + content[last_idx2 + len("</div>\n  </div>"):]
        else:
            print(f"Could not find matching closing div in {file_path}")
            
    with open(full_path, 'w') as f:
        f.write(content)

print("Done fixing closing tags.")
