
async function checkApi() {
    const urls = [
        'https://brasilaberto.com/api/v1/cities/MG',
        'https://api.brasilaberto.com/v1/cities/MG'
    ];

    for (const url of urls) {
        console.log(`\nTesting: ${url}`);
        try {
            const res = await fetch(url);
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                const json = await res.json();
                console.log('Success! Sample:', JSON.stringify(json.result ? json.result[0] : json, null, 2));
                return; // Stop if success
            } else {
                console.log('Body:', await res.text());
            }
        } catch (e) {
            console.error('Fetch error:', e.message);
        }
    }
}

checkApi();
