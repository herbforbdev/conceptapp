import { generateLocalizationReport } from '../lib/utils/localizationUtils';
import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = process.cwd();
const REPORT_PATH = path.join(WORKSPACE_DIR, 'localization-audit-report.md');

// Generate the report
const report = generateLocalizationReport(WORKSPACE_DIR);

// Write the report to a file
fs.writeFileSync(REPORT_PATH, report);

console.log(`Localization audit report generated at: ${REPORT_PATH}`); 