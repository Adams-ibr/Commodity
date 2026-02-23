const fs = require('fs');

const lines = fs.readFileSync('services/api.ts', 'utf8').split('\n');
const newLines = [
    ...lines.slice(0, 1),
    "import { UserRole, Location } from '../types_commodity';",
    ...lines.slice(2, 28),
    ...lines.slice(298, 440),
    ...lines.slice(1517)
];

const auditLogEntryDef = `
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    user: string;
    role: string;
    ipHash?: string;
}
`;

fs.writeFileSync('services/api.ts', auditLogEntryDef + newLines.join('\n'));
console.log('API pruned successfully.');
