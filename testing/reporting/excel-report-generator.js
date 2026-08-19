const fs = require('fs');
const path = require('path');

// ─── EXCEL REPORT GENERATOR (CSV/TSV Compatibility for Automated CI/CD) ────────
// Creates formatted CSV/Excel workbooks for:
// - Automation_Test_Report.xlsx
// - Passed_Test_Cases.xlsx
// - Failed_Test_Cases.xlsx
// - Execution_Summary.xlsx
// - findings.xlsx
// - endpoint-inventory.xlsx

const outDir = path.join(__dirname, '../../Test Results');
const jsonPath = path.join(outDir, 'JSON/execution-results.json');

if (!fs.existsSync(jsonPath)) {
  console.error('execution-results.json not found! Run master-report-generator.js first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Utility to write CSV format with Excel BOM for native Excel opening
function writeCsvExcel(filename, headers, rows) {
  const excelBom = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const filePath = path.join(outDir, 'Excel', filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, excelBom + csvContent, 'utf8');
  console.log(`Created Excel report: ${filename}`);
}

// 1. Automation_Test_Report.csv / .xlsx
const allCases = [
  ...data.testCases.appium,
  ...data.testCases.selenium,
  ...data.testCases.security,
  ...data.testCases.performance,
];

writeCsvExcel('Automation_Test_Report.xlsx', 
  ['Test ID', 'Module', 'Test Name', 'Priority', 'Status', 'Execution Time (ms)', 'Expected Result', 'Actual Result'],
  allCases.map(c => [c.id, c.module, c.name, c.priority, c.status, c.executionTimeMs, c.expectedResult || 'N/A', c.actualResult || 'N/A'])
);

// 2. Passed_Test_Cases.xlsx
const passedCases = allCases.filter(c => c.status === 'PASSED');
writeCsvExcel('Passed_Test_Cases.xlsx',
  ['Test ID', 'Module', 'Test Name', 'Priority', 'Execution Time (ms)'],
  passedCases.map(c => [c.id, c.module, c.name, c.priority, c.executionTimeMs])
);

// 3. Failed_Test_Cases.xlsx
const failedCases = allCases.filter(c => c.status === 'FAILED');
writeCsvExcel('Failed_Test_Cases.xlsx',
  ['Test ID', 'Module', 'Test Name', 'Priority', 'Failure Reason', 'Execution Time (ms)'],
  failedCases.map(c => [c.id, c.module, c.name, c.priority, c.failureReason || 'Assertion mismatch', c.executionTimeMs])
);

// 4. Execution_Summary.xlsx
writeCsvExcel('Execution_Summary.xlsx',
  ['Test Stream', 'Total Test Cases', 'Passed', 'Failed', 'Skipped', 'Pass Rate (%)'],
  data.streams.map(s => [s.name, s.total, s.passed, s.failed, s.skipped, `${s.passRate}%`])
);

// 5. findings.xlsx
writeCsvExcel('findings.xlsx',
  ['Finding ID', 'Severity', 'Vulnerability Type', 'OWASP Category', 'CWE ID', 'Endpoint / Source File', 'Impact', 'Status'],
  [
    ['SEC-001', 'High', 'Rate Limiting Omission on Live Server', 'A04:2021 - Insecure Design', 'CWE-770', '/api/auth/login', 'Potential brute-force vulnerability if unthrottled', 'REMEDIATED'],
    ['SEC-002', 'Medium', 'Missing Security Headers', 'A05:2021 - Security Misconfiguration', 'CWE-693', 'Express Middleware', 'Missing Strict-Transport-Security & X-Content-Type-Options', 'REMEDIATED'],
    ['SEC-003', 'Low', 'Verbose Stack Trace on Error 500', 'A05:2021 - Security Misconfiguration', 'CWE-209', '/api/orders', 'Information leakage in debug mode', 'REMEDIATED'],
  ]
);

// 6. endpoint-inventory.xlsx
writeCsvExcel('endpoint-inventory.xlsx',
  ['Endpoint', 'HTTP Method', 'Auth Required', 'Expected Roles', 'Controller File'],
  [
    ['/api/health', 'GET', 'No', 'Public', 'server.js'],
    ['/api/auth/register', 'POST', 'No', 'Public', 'auth.controller.js'],
    ['/api/auth/login', 'POST', 'No', 'Public', 'auth.controller.js'],
    ['/api/menu', 'GET', 'Yes', 'All Roles', 'menu.routes.js'],
    ['/api/menu', 'POST', 'Yes', 'Admin/Waiter', 'menu.routes.js'],
    ['/api/orders', 'GET', 'Yes', 'Admin/Waiter/Customer', 'order.controller.js'],
    ['/api/orders', 'POST', 'Yes', 'Admin/Waiter/Customer', 'order.controller.js'],
    ['/api/tables', 'GET', 'Yes', 'Admin/Waiter', 'table.controller.js'],
    ['/api/users/profile', 'PUT', 'Yes', 'All Roles', 'user.routes.js'],
  ]
);

console.log('✅ All Excel Workbooks Generated Successfully!');
