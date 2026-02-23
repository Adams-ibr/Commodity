const fs = require('fs');
const path = require('path');

const dirs = ['components', 'context', 'services', 'utils', 'constants', '.'];

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return;
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (content.includes("from '../types'") || content.includes('from "../types"')) {
        content = content.replace(/from '\.\.\/types'/g, "from '../types_commodity'")
            .replace(/from "\.\.\/types"/g, 'from "../types_commodity"');
        changed = true;
    }

    if (content.includes("from './types'") || content.includes('from "./types"')) {
        content = content.replace(/from '\.\/types'/g, "from './types_commodity'")
            .replace(/from "\.\/types"/g, 'from "./types_commodity"');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walk(fullPath);
            }
        } else {
            replaceInFile(fullPath);
        }
    }
}

dirs.forEach(d => walk(d));
console.log('Done replacing types imports.');
