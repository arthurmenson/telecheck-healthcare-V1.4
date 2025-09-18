import fs from 'fs/promises'
import path from 'path'

interface CoverageData {
  total: {
    lines: { total: number; covered: number; skipped: number; pct: number }
    functions: { total: number; covered: number; skipped: number; pct: number }
    statements: { total: number; covered: number; skipped: number; pct: number }
    branches: { total: number; covered: number; skipped: number; pct: number }
  }
  [key: string]: any
}

interface CoverageReport {
  timestamp: string
  overall: {
    lines: number
    functions: number
    statements: number
    branches: number
  }
  thresholds: {
    lines: number
    functions: number
    statements: number
    branches: number
  }
  passed: boolean
  files: Array<{
    path: string
    lines: number
    functions: number
    statements: number
    branches: number
  }>
}

async function generateCoverageReport(): Promise<void> {
  try {
    const coverageDir = path.join(process.cwd(), 'coverage')
    const summaryPath = path.join(coverageDir, 'coverage-summary.json')

    const summaryExists = await fs.access(summaryPath).then(() => true).catch(() => false)
    if (!summaryExists) {
      console.error('Coverage summary not found. Run tests with coverage first.')
      process.exit(1)
    }

    const summaryData = await fs.readFile(summaryPath, 'utf-8')
    const coverage: CoverageData = JSON.parse(summaryData)

    const thresholds = {
      lines: 90,
      functions: 90,
      statements: 90,
      branches: 90
    }

    const overall = {
      lines: coverage.total.lines.pct,
      functions: coverage.total.functions.pct,
      statements: coverage.total.statements.pct,
      branches: coverage.total.branches.pct
    }

    const passed = overall.lines >= thresholds.lines &&
                  overall.functions >= thresholds.functions &&
                  overall.statements >= thresholds.statements &&
                  overall.branches >= thresholds.branches

    const files = Object.entries(coverage)
      .filter(([key]) => key !== 'total')
      .map(([filePath, data]: [string, any]) => ({
        path: filePath.replace(process.cwd(), ''),
        lines: data.lines.pct,
        functions: data.functions.pct,
        statements: data.statements.pct,
        branches: data.branches.pct
      }))

    const report: CoverageReport = {
      timestamp: new Date().toISOString(),
      overall,
      thresholds,
      passed,
      files
    }

    const reportPath = path.join(coverageDir, 'coverage-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    const htmlReport = generateHtmlReport(report)
    const htmlPath = path.join(coverageDir, 'coverage-summary.html')
    await fs.writeFile(htmlPath, htmlReport)

    console.log('\n📊 Coverage Report Generated')
    console.log('==========================================')
    console.log(`Overall Coverage: ${passed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Lines:      ${overall.lines.toFixed(1)}% (threshold: ${thresholds.lines}%)`)
    console.log(`Functions:  ${overall.functions.toFixed(1)}% (threshold: ${thresholds.functions}%)`)
    console.log(`Statements: ${overall.statements.toFixed(1)}% (threshold: ${thresholds.statements}%)`)
    console.log(`Branches:   ${overall.branches.toFixed(1)}% (threshold: ${thresholds.branches}%)`)
    console.log(`\nDetailed report: ${htmlPath}`)

    if (!passed) {
      console.log('\n⚠️  Coverage thresholds not met!')
      process.exit(1)
    }

  } catch (error) {
    console.error('Error generating coverage report:', error)
    process.exit(1)
  }
}

function generateHtmlReport(report: CoverageReport): string {
  const statusBadge = report.passed ?
    '<span class="badge success">✅ PASSED</span>' :
    '<span class="badge failed">❌ FAILED</span>'

  const fileRows = report.files.map(file => `
    <tr>
      <td>${file.path}</td>
      <td class="${getCoverageClass(file.lines)}">${file.lines.toFixed(1)}%</td>
      <td class="${getCoverageClass(file.functions)}">${file.functions.toFixed(1)}%</td>
      <td class="${getCoverageClass(file.statements)}">${file.statements.toFixed(1)}%</td>
      <td class="${getCoverageClass(file.branches)}">${file.branches.toFixed(1)}%</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { margin-bottom: 30px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .success { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .high { background-color: #d4edda; }
        .medium { background-color: #fff3cd; }
        .low { background-color: #f8d7da; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .metric { padding: 20px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Code Coverage Report</h1>
        <p>Generated: ${report.timestamp}</p>
        ${statusBadge}
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value ${getCoverageClass(report.overall.lines)}">${report.overall.lines.toFixed(1)}%</div>
            <div>Lines</div>
            <div>(threshold: ${report.thresholds.lines}%)</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageClass(report.overall.functions)}">${report.overall.functions.toFixed(1)}%</div>
            <div>Functions</div>
            <div>(threshold: ${report.thresholds.functions}%)</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageClass(report.overall.statements)}">${report.overall.statements.toFixed(1)}%</div>
            <div>Statements</div>
            <div>(threshold: ${report.thresholds.statements}%)</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageClass(report.overall.branches)}">${report.overall.branches.toFixed(1)}%</div>
            <div>Branches</div>
            <div>(threshold: ${report.thresholds.branches}%)</div>
        </div>
    </div>

    <h2>File Coverage Details</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Lines</th>
                <th>Functions</th>
                <th>Statements</th>
                <th>Branches</th>
            </tr>
        </thead>
        <tbody>
            ${fileRows}
        </tbody>
    </table>
</body>
</html>
  `
}

function getCoverageClass(percentage: number): string {
  if (percentage >= 90) return 'high'
  if (percentage >= 75) return 'medium'
  return 'low'
}

if (require.main === module) {
  generateCoverageReport()
}

export { generateCoverageReport }