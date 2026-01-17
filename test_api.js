
async function checkApi() {
    const state = 'MG';
    const url = `https://api.brasilaberto.com/v1/cities/${state}`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Error:', res.status, res.statusText);
            const text = await res.text();
            console.error('Body:', text);
            return;
        }
        const json = await res.json();
        console.log('Sample city:', JSON.stringify(json.result[0], null, 2));

        // Check specific city
        const target = "Santo Antônio do Amparo";
        const found = json.result.find(c => c.name.includes('Amparo'));
        console.log('Found similar:', JSON.stringify(found, null, 2));

        // Check keys
        if (json.result.length > 0) {
            console.log('Keys available:', Object.keys(json.result[0]));
        }
    } catch (e) {
        console.error(e);
    }
}

checkApi();
