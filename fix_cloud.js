
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'cloud.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the first occurrence (the duplicate) and remove it, keeping the second one (at the end of file).
// We know duplicates are between lines 4000 and 5000 approx, and the good ones are at >5000.
// Or simply find ALL occurrences and keep the LAST one.

const functionsToRemove = [
    'export const getStoreDeliverySettings',
    'export const updateStoreDeliverySettings',
    'export const getStoreNeighborhoodFees',
    'export const upsertStoreNeighborhoodFee',
    'export const deleteStoreNeighborhoodFee'
];

// Helper to remove block
function removeFirstOccurrenceBlock(funcName) {
    const startIndex = content.indexOf(funcName);
    const lastIndex = content.lastIndexOf(funcName);

    if (startIndex !== -1 && startIndex !== lastIndex) {
        console.log(`Fixing duplicate: ${funcName}`);
        // Find closing brace of function? Hard with nested blocks.
        // But we know standard formatting.
        // Let's verify if the first occurrence is indeed the old one (it should be earlier in file).

        if (startIndex < lastIndex) {
            // We need to cut out the function body.
            // Simplified approach: Identify the block boundaries using indentation or simple brace counting
            let openBraces = 0;
            let i = startIndex;
            let foundStartObj = false;

            // Find '{'
            while (i < content.length) {
                if (content[i] === '{') {
                    openBraces++;
                    foundStartObj = true;
                } else if (content[i] === '}') {
                    openBraces--;
                }

                i++;
                if (foundStartObj && openBraces === 0) break;
            }

            // i is now at the end of the function block
            // Also remove trailing newline/semicolon if needed
            const before = content.substring(0, startIndex);
            const after = content.substring(i);
            content = before + "\n// Duplicate removed by fix script\n" + after;
        }
    } else {
        console.log(`No duplicate found for ${funcName} (or only one exists)`);
    }
}

functionsToRemove.forEach(f => removeFirstOccurrenceBlock(f));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done.');
