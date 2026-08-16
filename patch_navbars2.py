import re

# 3. SuperAdmin Sidebar
path_super = '/Users/hemanthkancharla/Documents/zewotech/moneyspot/src/components/superadmin/Sidebar.jsx'
with open(path_super, 'r') as f:
    content = f.read()
if 'to="/superadmin/due-dates"' not in content:
    search_str = '          <Link to="/superadmin/branches" className={`sa-menu-item ${location.pathname.includes(\'/branches\') ? \'active\' : \'\'}`}>\n            <span className="sa-menu-icon">🏢</span> Branches\n          </Link>'
    rep_str = search_str + '\n          <Link to="/superadmin/due-dates" className={`sa-menu-item ${location.pathname.includes(\'/due-dates\') ? \'active\' : \'\'}`}>\n            <span className="sa-menu-icon">📅</span> Bill Due Dates\n          </Link>'
    content = content.replace(search_str, rep_str)
    with open(path_super, 'w') as f:
        f.write(content)
