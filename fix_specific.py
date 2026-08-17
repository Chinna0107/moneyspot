import os

files = {
    'src/pages/employee/Services.jsx': [
        ('<main className="dash-main"><div className="dash-loading">Loading services...</div></div>', '<main className="dash-main"><div className="dash-loading">Loading services...</div></main>'),
        ('        </div>\n      </div>\n    </div>\n  )\n', '        </div>\n      </main>\n    </div>\n  )\n'),
        ('        </div>\n      </div>\n    </div>\n', '        </div>\n      </main>\n    </div>\n')
    ],
    'src/pages/employee/Requests.jsx': [
        ('        </div>\n      )}\n    </div>\n  )\n}', '        </div>\n      )}\n    </main>\n  )\n}')
    ],
    'src/pages/employee/EmployeeReports.jsx': [
        ('      </main>\n    </div>\n  )\n}', '      </div>\n    </div>\n  )\n}')
    ],
    'src/pages/employee/Dashboard.jsx': [
        ('      </main>\n    </div>\n  )\n}', '      </div>\n    </div>\n  )\n}')
    ],
    'src/pages/employee/CustomerInfo.jsx': [
        ('          </div>\n        )}\n      </div>\n    </div>\n  )\n}', '          </div>\n        )}\n      </main>\n    </div>\n  )\n}')
    ]
}

for file_path, replacements in files.items():
    full_path = os.path.join('/Users/hemanthkancharla/Documents/zewotech/moneyspot', file_path)
    if not os.path.exists(full_path): continue
    
    with open(full_path, 'r') as f:
        content = f.read()

    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(full_path, 'w') as f:
        f.write(content)

print("Done fixing specific files.")
