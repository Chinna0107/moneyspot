with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/AppRoutes.jsx', 'r') as f:
    content = f.read()

# Add imports
if 'import SuperadminDueDates' not in content:
    content = content.replace('// Admin Pages', 'import SuperadminDueDates from \'./pages/superadmin/BillDueDates\';\n\n// Admin Pages')
if 'import AdminDueDates' not in content:
    content = content.replace('// Employee Pages', 'import AdminDueDates from \'./pages/admin/BillDueDates\';\n\n// Employee Pages')
if 'import EmployeeDueDates' not in content:
    content = content.replace('export default function AppRoutes()', 'import EmployeeDueDates from \'./pages/employee/BillDueDates\';\n\nexport default function AppRoutes()')

# Add routes
sa_route = '<Route path="/superadmin/transactions" element={<SuperAdminRoute><SuperAdminTransactions /></SuperAdminRoute>} />'
if sa_route in content and 'path="/superadmin/due-dates"' not in content:
    content = content.replace(sa_route, sa_route + '\n      <Route path="/superadmin/due-dates"   element={<SuperAdminRoute><SuperadminDueDates /></SuperAdminRoute>} />')

admin_route = '<Route path="/admin/transactions"   element={<AdminRoute><AdminTransactions /></AdminRoute>} />'
if admin_route in content and 'path="/admin/due-dates"' not in content:
    content = content.replace(admin_route, admin_route + '\n      <Route path="/admin/due-dates"      element={<AdminRoute><AdminDueDates /></AdminRoute>} />')

emp_route = '<Route path="/employee/services"     element={<EmployeeRoute><Services /></EmployeeRoute>} />'
if emp_route in content and 'path="/employee/due-dates"' not in content:
    content = content.replace(emp_route, emp_route + '\n      <Route path="/employee/due-dates"    element={<EmployeeRoute><EmployeeDueDates /></EmployeeRoute>} />')

with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/AppRoutes.jsx', 'w') as f:
    f.write(content)
