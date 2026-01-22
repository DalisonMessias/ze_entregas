
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'cloud.ts');
const content = fs.readFileSync(filePath, 'utf8');

// The functions to remove (first occurrence only)
const funcs = [
    'export const getStoreDeliverySettings = async (): Promise<StoreDeliverySettings | null> => {',
    'export const updateStoreDeliverySettings = async (settings: Partial<StoreDeliverySettings>) => {',
    'export const getStoreNeighborhoodFees = async (): Promise<StoreNeighborhoodFee[]> => {',
    'export const upsertStoreNeighborhoodFee = async (fee: Partial<StoreNeighborhoodFee>) => {',
    'export const deleteStoreNeighborhoodFee = async (id: string) => {'
];

let newContent = content;

funcs.forEach(signature => {
    // Find first index
    const firstIdx = newContent.indexOf(signature);
    const lastIdx = newContent.lastIndexOf(signature);

    if (firstIdx !== -1 && firstIdx !== lastIdx) {
        console.log(`Removing duplicate for: ${signature.substring(0, 30)}...`);
        // We need to find the end of this function block to remove it cleanly.
        // Heuristic: Count braces from the start of the match.

        let braceCount = 0;
        let inBlock = false;
        let endIndex = -1;

        for (let i = firstIdx; i < newContent.length; i++) {
            if (newContent[i] === '{') {
                braceCount++;
                inBlock = true;
            } else if (newContent[i] === '}') {
                braceCount--;
            }

            if (inBlock && braceCount === 0) {
                endIndex = i + 1; // Include the closing brace
                break;
            }
        }

        if (endIndex !== -1) {
            // Remove from firstIdx to endIndex
            const before = newContent.substring(0, firstIdx);
            const after = newContent.substring(endIndex);

            // Check if there is a 'updated_at' update logic block inside that might confuse brace counting? 
            // TS/JS syntax is usually balanced.

            newContent = before + "\n// Duplicate removed\n" + after;
        } else {
            console.log("Could not find end of block for " + signature);
        }
    } else {
        console.log(`No duplicate found for ${signature.substring(0, 30)}... (Indexes: ${firstIdx}, ${lastIdx})`);
    }
});

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Finished fixing cloud.ts');
