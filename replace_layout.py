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
    'src/App.jsx',
    'src/AppRoutes.jsx',
]

for file_path in files:
    full_path = os.path.join('/Users/hemanthkancharla/Documents/zewotech/moneyspot', file_path)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("import EmployeeNavbar from '../../components/employee/EmployeeNavbar'", "import EmployeeSidebar from '../../components/employee/EmployeeSidebar'")
    content = content.replace("import EmployeeNavbar from '../../components/employee/EmployeeNavbar';", "import EmployeeSidebar from '../../components/employee/EmployeeSidebar';")
    content = content.replace("import EmployeeNavbar from './components/employee/EmployeeNavbar'", "import EmployeeSidebar from './components/employee/EmployeeSidebar'")
    content = content.replace("import EmployeeNavbar from './components/employee/EmployeeNavbar';", "import EmployeeSidebar from './components/employee/EmployeeSidebar';")

    # Layout changes
    content = content.replace('<div className="emp-page">', '<div className="dashboard">')
    content = content.replace('<div className="emp-page-content">', '<main className="dash-main">')
    content = content.replace('<div className="emp-page-content"', '<main className="dash-main"')
    
    # In some pages, they might use dash-content
    content = content.replace('<div className="dash-content">', '<main className="dash-main">')
    
    content = content.replace('<EmployeeNavbar />', '<EmployeeSidebar />')
    content = content.replace('{role === \'employee\' && <EmployeeNavbar />}', '{role === \'employee\' && <EmployeeSidebar />}')
    content = content.replace('<Profile Sidebar={EmployeeNavbar} />', '<Profile Sidebar={EmployeeSidebar} />')
    
    # Close main instead of div for the page-content
    # This requires looking for the ending div. It's tricky to do with simple replace if there are nested divs.
    # Instead, we just replaced the opening tag to <main>, so we must replace the corresponding closing tag.
    # Since we replaced <div className="emp-page-content"> with <main className="dash-main">,
    # the closing tag is </div>. We will do this manually or assume it's fine for now and fix specific files.
    
    with open(full_path, 'w') as f:
        f.write(content)

print("Done replacing basic tags.")
