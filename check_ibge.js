
const STATES_MAP = { 'minas gerais': 'MG', 'sao paulo': 'SP' };
async function checkApi() {
    const url = 'https://api.brasilaberto.com/v1/cities/MG';
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Error:', res.status);
            return;
        }
        const json = await res.json();
        const city = json.result[0];
        console.log('City Keys:', Object.keys(city));
        console.log('Sample City:', JSON.stringify(city, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkApi();
