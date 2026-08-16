import re

# 1. EmployeeNavbar.jsx
path_emp = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/employee/EmployeeNavbar.jsx'
with open(path_emp, 'r') as f:
    content = f.read()
if 'to="/employee/due-dates"' not in content:
    # Add next to services or reports
    search_str = '            <Link to="/employee/services" className="emp-nav-item">\n              <span className="nav-icon">🚀</span> Services\n            </Link>'
    rep_str = search_str + '\n            <Link to="/employee/due-dates" className="emp-nav-item">\n              <span className="nav-icon">📅</span> Due Dates\n            </Link>'
    content = content.replace(search_str, rep_str)
    with open(path_emp, 'w') as f:
        f.write(content)

# 2. AdminSidebar.jsx
path_admin = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/admin/AdminSidebar.jsx'
with open(path_admin, 'r') as f:
    content = f.read()
if 'to="/admin/due-dates"' not in content:
    search_str = '            <Link to="/admin/customers" className={`admin-menu-item ${location.pathname.includes(\'/admin/customers\') ? \'active\' : \'\'}`}>\n              <span className="menu-icon">👥</span> Customers\n            </Link>'
    rep_str = search_str + '\n            <Link to="/admin/due-dates" className={`admin-menu-item ${location.pathname.includes(\'/admin/due-dates\') ? \'active\' : \'\'}`}>\n              <span className="menu-icon">📅</span> Bill Due Dates\n            </Link>'
    content = content.replace(search_str, rep_str)
    with open(path_admin, 'w') as f:
        f.write(content)

# 3. SuperAdminSidebar.jsx
path_super = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/superadmin/SuperAdminSidebar.jsx'
with open(path_super, 'r') as f:
    content = f.read()
if 'to="/superadmin/due-dates"' not in content:
    search_str = '          <Link to="/superadmin/branches" className={`sa-menu-item ${location.pathname.includes(\'/branches\') ? \'active\' : \'\'}`}>\n            <span className="sa-menu-icon">🏢</span> Branches\n          </Link>'
    rep_str = search_str + '\n          <Link to="/superadmin/due-dates" className={`sa-menu-item ${location.pathname.includes(\'/due-dates\') ? \'active\' : \'\'}`}>\n            <span className="sa-menu-icon">📅</span> Bill Due Dates\n          </Link>'
    content = content.replace(search_str, rep_str)
    with open(path_super, 'w') as f:
        f.write(content)
