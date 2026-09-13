const fs = require('fs');
const parser = require('@babel/parser');
const file = fs.readFileSync('/Users/hemanthkancharla/Documents/zewotech/money/moneyspot/src/pages/admin/EmployeeDetails.jsx', 'utf8');

try {
  parser.parse(file, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("Parse Successful!");
} catch (e) {
  console.log("Parse Error at line " + e.loc.line + ", col " + e.loc.column);
  console.log(e.message);
}
