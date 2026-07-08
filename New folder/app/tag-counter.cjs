const fs = require('fs');
const content = fs.readFileSync('src/pages/POSPage.tsx', 'utf8');

const divOpen = (content.match(/<div/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;
const braceOpen = (content.match(/{/g) || []).length;
const braceClose = (content.match(/}/g) || []).length;

console.log(`Divs: Open=${divOpen}, Close=${divClose}, Diff=${divOpen - divClose}`);
console.log(`Braces: Open=${braceOpen}, Close=${braceClose}, Diff=${braceOpen - braceClose}`);

// Find where the Customer Selection Modal starts and ends
const startMatch = content.indexOf('{/* Customer Selection Modal */}');
const endMatch = content.indexOf('{/* Held Carts Modal */}');

if (startMatch !== -1 && endMatch !== -1) {
    const modalSection = content.substring(startMatch, endMatch);
    const mDivOpen = (modalSection.match(/<div/g) || []).length;
    const mDivClose = (modalSection.match(/<\/div>/g) || []).length;
    const mBraceOpen = (modalSection.match(/{/g) || []).length;
    const mBraceClose = (modalSection.match(/}/g) || []).length;
    console.log(`Modal Section: DivDiff=${mDivOpen - mDivClose}, BraceDiff=${mBraceOpen - mBraceClose}`);
}
