import https from 'https';
import * as xlsx from 'xlsx';

const url = 'https://docs.google.com/spreadsheets/d/1j4NPC3zqygl6JAGikJqg0wRnopWS1IXk/export?format=xlsx';

https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, handleResponse);
    } else {
        handleResponse(res);
    }
}).on('error', (e) => {
    console.error(e);
});

function handleResponse(res) {
    const data = [];
    res.on('data', (chunk) => {
        data.push(chunk);
    });

    res.on('end', () => {
        const buffer = Buffer.concat(data);
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        workbook.SheetNames.forEach(sheetName => {
            console.log(`\n==================== SHEET: ${sheetName} ====================`);
            const sheet = workbook.Sheets[sheetName];
            const json = xlsx.utils.sheet_to_json(sheet, { defval: "" });
            console.log(JSON.stringify(json, null, 2));
        });
    });
}
