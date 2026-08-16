with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/App.jsx', 'r') as f:
    content = f.read()

# Add imports if they don't exist
if 'import SuperadminDueDates' not in content:
    content = content.replace("import SuperAdminTransactions from './pages/superadmin/Transactions'", "import SuperAdminTransactions from './pages/superadmin/Transactions'\nimport SuperadminDueDates from './pages/superadmin/BillDueDates'")
if 'import AdminDueDates' not in content:
    content = content.replace("import AdminTransactions from './pages/admin/Transactions'", "import AdminTransactions from './pages/admin/Transactions'\nimport AdminDueDates from './pages/admin/BillDueDates'")
if 'import EmployeeDueDates' not in content:
    content = content.replace("import Services from './pages/employee/Services'", "import Services from './pages/employee/Services'\nimport EmployeeDueDates from './pages/employee/BillDueDates'")

# Add routes if they don't exist
if 'path="/superadmin/due-dates"' not in content:
    content = content.replace('<Route path="/superadmin/transactions"    element={<SuperAdminRoute><SuperAdminTransactions /></SuperAdminRoute>} />', '<Route path="/superadmin/transactions"    element={<SuperAdminRoute><SuperAdminTransactions /></SuperAdminRoute>} />\n        <Route path="/superadmin/due-dates"       element={<SuperAdminRoute><SuperadminDueDates /></SuperAdminRoute>} />')

if 'path="/admin/due-dates"' not in content:
    content = content.replace('<Route path="/admin/transactions"    element={<AdminRoute><AdminTransactions /></AdminRoute>} />', '<Route path="/admin/transactions"    element={<AdminRoute><AdminTransactions /></AdminRoute>} />\n        <Route path="/admin/due-dates"       element={<AdminRoute><AdminDueDates /></AdminRoute>} />')

if 'path="/employee/due-dates"' not in content:
    content = content.replace('<Route path="/employee/services"     element={<EmployeeRoute><Services /></EmployeeRoute>} />', '<Route path="/employee/services"     element={<EmployeeRoute><Services /></EmployeeRoute>} />\n        <Route path="/employee/due-dates"     element={<EmployeeRoute><EmployeeDueDates /></EmployeeRoute>} />')

with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/App.jsx', 'w') as f:
    f.write(content)
