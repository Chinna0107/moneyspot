with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/employee/EmployeeNavbar.jsx', 'r') as f:
    content = f.read()

if '/employee/due-dates' not in content:
    content = content.replace("  { to: '/employee/profile',       icon: <MdPerson />,                label: 'Profile' },", "  { to: '/employee/due-dates',     icon: <MdLeaderboard />,           label: '📅 Due Dates' },\n  { to: '/employee/profile',       icon: <MdPerson />,                label: 'Profile' },")
    with open('/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/employee/EmployeeNavbar.jsx', 'w') as f:
        f.write(content)
