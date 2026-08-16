# 1. AdminSidebar
path_admin = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/admin/AdminSidebar.jsx'
with open(path_admin, 'r') as f:
    content = f.read()

if '/admin/due-dates' not in content:
    content = content.replace(
        "{ to: '/admin/transactions', icon: <MdReceipt />,      label: 'Transactions' },",
        "{ to: '/admin/transactions', icon: <MdReceipt />,      label: 'Transactions' },\n      { to: '/admin/due-dates',    icon: <MdCalendarToday />,label: 'Bill Due Dates' },"
    )
    with open(path_admin, 'w') as f:
        f.write(content)

# 2. Superadmin Sidebar
path_super = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/superadmin/Sidebar.jsx'
with open(path_super, 'r') as f:
    content = f.read()

if '/superadmin/due-dates' not in content:
    content = content.replace(
        "{ to: '/superadmin/transactions', icon: <MdReceipt />,      label: 'Transactions' },",
        "{ to: '/superadmin/transactions', icon: <MdReceipt />,      label: 'Transactions' },\n      { to: '/superadmin/due-dates',    icon: <MdCalendarToday />,label: 'Bill Due Dates' },"
    )
    with open(path_super, 'w') as f:
        f.write(content)
