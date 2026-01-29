
// Script de teste da API Brasil Aberto (Compatível com ESM/Node 18+)

async function testApi() {
    console.log('Iniciando diagnótico da API Brasil Aberto (Node.js ' + process.version + ')');

    // Teste 1: Buscar ID de uma cidade conhecida (ex: Rio de Janeiro - RJ)
    console.log('\n--- Teste 1: Buscar Rio de Janeiro ---');
    const cityUrl = 'https://api.brasilaberto.com/v1/cities/RJ';
    let cityId = null;

    try {
        const res = await fetch(cityUrl);
        if (!res.ok) {
            console.log('ERRO ao buscar cidades:', res.status, res.statusText);
            const text = await res.text();
            console.log('Body:', text);
            return;
        }

        const data = await res.json();
        const city = data.result.find(c => c.name === 'Rio de Janeiro');

        if (!city) {
            console.log('Cidade Rio de Janeiro não encontrada na lista.');
            return;
        }

        cityId = city.id;
        console.log('ID do Rio de Janeiro encontrado:', city.id);

        // Teste 2: Buscar endpoints para o ID encontrado
        await testEndpoint('Distritos (endpoint atual)', `https://api.brasilaberto.com/v1/districts/${cityId}`);
        await testEndpoint('Bairros (endpoint /neighborhoods)', `https://api.brasilaberto.com/v1/neighborhoods/${cityId}`);
        await testEndpoint('Bairros (endpoint /bairros)', `https://api.brasilaberto.com/v1/bairros/${cityId}`);
        await testEndpoint('Bairros (endpoint /districts-by-city)', `https://api.brasilaberto.com/v1/districts-by-city/${cityId}`);

    } catch (e) {
        console.error('Exceção fatal no script:', e);
    }
}

async function testEndpoint(name, url) {
    console.log(`\n--- Testando: ${name} ---`);
    console.log(`URL: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);

        const contentType = res.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);

        if (res.ok) {
            try {
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();

                    if (data.result && Array.isArray(data.result)) {
                        console.log(`SUCESSO! Retornou ${data.result.length} itens.`);
                        if (data.result.length > 0) {
                            console.log('Exemplo do primeiro item:', JSON.stringify(data.result[0], null, 2));
                        }
                    } else {
                        console.log('Retornou JSON, mas formato inesperado:', JSON.stringify(data, null, 2));
                    }
                } else {
                    const text = await res.text();
                    console.log('Resposta não é JSON. Início do corpo:', text.substring(0, 100));
                }
            } catch (jsonErr) {
                console.log('Erro ao parsear JSON:', jsonErr.message);
            }
        } else {
            // Em caso de erro, tenta ler body
            try {
                const text = await res.text();
                console.log('Corpo erro:', text.substring(0, 200));
            } catch (e) { }
        }

    } catch (e) {
        console.log('Erro na requisição:', e.message);
    }
}

testApi();
