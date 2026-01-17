import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Shield, Package, ShoppingBag, ArrowLeft } from 'lucide-react';
import * as cloud from '../services/cloud';

interface StoreApiDocsProps {
    onNavigate: (tab: any) => void;
}

export const StoreApiDocs: React.FC<StoreApiDocsProps> = ({ onNavigate }) => {
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const host = window.location.origin;
    const baseUrl = `${host}/api/v1`;

    const [activeLang, setActiveLang] = useState('Node.js');
    const [activeMethod, setActiveMethod] = useState('GET_PRODUCTS');

    const codeSnippets: any = {
        'Node.js': {
            GET_ORDERS: `const fetch = require('node-fetch');

const API_KEY = 'sua_chave_aqui';
const BASE_URL = '${baseUrl}';

async function getOrders() {
  const response = await fetch(\`\${BASE_URL}/orders\`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    }
  });

  const data = await response.json();
  // console.log(data);
}

getOrders();`,
            POST_ORDERS: `const fetch = require('node-fetch');

const API_KEY = 'sua_chave_aqui';
const BASE_URL = '${baseUrl}';

async function createOrder() {
  const response = await fetch(\`\${BASE_URL}/orders\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({
      customer_name: 'João Silva',
      delivery_address: 'Rua das Flores, 123',
      total_amount: 50.00,
      items: [{ name: 'X-Bacon', quantity: 1, price: 25.00 }]
    })
  });

  const data = await response.json();
  // console.log(data);
}

createOrder();`,
            GET_PRODUCTS: `const fetch = require('node-fetch');

const API_KEY = 'sua_chave_aqui';
const BASE_URL = '${baseUrl}';

async function getProducts() {
  const response = await fetch(\`\${BASE_URL}/products\`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    }
  });

  const data = await response.json();
  // console.log(data);
}

getProducts();`
        },
        'PHP': {
            GET_ORDERS: `<?php

$apiKey = 'sua_chave_aqui';
$url = '${baseUrl}/orders';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`,
            POST_ORDERS: `<?php

$apiKey = 'sua_chave_aqui';
$url = '${baseUrl}/orders';

$data = [
    'customer_name' => 'João Silva',
    'delivery_address' => 'Rua das Flores, 123',
    'total_amount' => 50.00,
    'items' => [
        ['name' => 'X-Bacon', 'quantity' => 1, 'price' => 25.00]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`,
            GET_PRODUCTS: `<?php

$apiKey = 'sua_chave_aqui';
$url = '${baseUrl}/products';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`
        },
        'Python': {
            GET_ORDERS: `import requests

API_KEY = 'sua_chave_aqui'
URL = '${baseUrl}/orders'

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.get(URL, headers=headers)

print(response.status_code)
print(response.json())`,
            POST_ORDERS: `import requests

API_KEY = 'sua_chave_aqui'
URL = '${baseUrl}/orders'

payload = {
    "customer_name": "João Silva",
    "delivery_address": "Rua das Flores, 123",
    "total_amount": 50.00,
    "items": [
        {"name": "X-Bacon", "quantity": 1, "price": 25.00}
    ]
}

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.post(URL, json=payload, headers=headers)

print(response.status_code)
print(response.json())`,
            GET_PRODUCTS: `import requests

API_KEY = 'sua_chave_aqui'
URL = '${baseUrl}/products'

headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

response = requests.get(URL, headers=headers)

print(response.status_code)
print(response.json())`
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 animate-in fade-in space-y-8">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => onNavigate('store_integrations')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Voltar para Integrações
                    </button>
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Documentação da API de Entregas</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Integre seu e-commerce ou PDV para enviar pedidos automaticamente para nossa plataforma de entregas.
                </p>
            </div>

            {/* Authentication */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-600" /> Autenticação
                </h2>
                <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300">
                    <p>
                        Todas as requisições devem incluir o cabeçalho <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-brand-600">x-api-key</code> com sua chave secreta.
                        Você pode obter sua chave na página de <button onClick={() => onNavigate('store_integrations')} className="text-brand-600 hover:underline font-bold">Integrações</button>.
                    </p>
                </div>
                <div className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-sm relative border border-gray-800 shadow-lg">
                    <div className="absolute top-2 right-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">HEADERS</div>
                    <div className="flex gap-4">
                        <span className="text-blue-400 font-bold">x-api-key:</span>
                        <span className="text-green-400">sk_seu_token_aqui...</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-blue-400 font-bold">Content-Type:</span>
                        <span className="text-green-400">application/json</span>
                    </div>
                </div>
            </section>

            {/* Endpoints */}
            <section className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-brand-600" /> Endpoints
                </h2>

                {/* GET /orders */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold font-mono">GET</span>
                            <code className="text-sm font-bold dark:text-white">/orders</code>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Listar pedidos recentes</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Retorna uma lista dos últimos 50 pedidos da loja.</p>

                        <div className="relative">
                            <button
                                onClick={() => handleCopy(`curl -X GET "${baseUrl}/orders" \\
  -H "x-api-key: SUA_CHAVE" \\
  -H "Content-Type: application/json"`, 'curl-get')}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                {copied === 'curl-get' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                {`curl -X GET "${baseUrl}/orders" \\
  -H "x-api-key: SUA_CHAVE" \\
  -H "Content-Type: application/json"`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* POST /orders */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold font-mono">POST</span>
                            <code className="text-sm font-bold dark:text-white">/orders</code>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Criar novo pedido</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Cria um novo pedido de entrega para um motoboy aceitar.</p>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Body (JSON)</h4>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                {`{
  "customer_name": "João Silva",
  "delivery_address": "Rua das Flores, 123, Centro",
  "total_amount": 50.00,
  "items": [
    { "name": "X-Bacon", "quantity": 2, "price": 25.00 }
  ]
}`}
                            </pre>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => handleCopy(`curl -X POST "${baseUrl}/orders" \\
  -H "x-api-key: SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "João Silva",
    "delivery_address": "Rua das Flores, 123 - Centro",
    "total_amount": 50.00
  }'`, 'curl-post')}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                {copied === 'curl-post' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                {`curl -X POST "${baseUrl}/orders" \\
  -H "x-api-key: SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "João Silva",
    "delivery_address": "Rua das Flores, 123 - Centro",
    "total_amount": 50.00
  }'`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* GET /products */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold font-mono">GET</span>
                            <code className="text-sm font-bold dark:text-white">/products</code>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">Listar produtos</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Retorna a lista de produtos cadastrados na sua loja.</p>
                        <div className="relative">
                            <button
                                onClick={() => handleCopy(`curl -X GET "${baseUrl}/products" \\
  -H "x-api-key: SUA_CHAVE"`, 'curl-get-prod')}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                {copied === 'curl-get-prod' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                {`curl -X GET "${baseUrl}/products" \\
  -H "x-api-key: SUA_CHAVE"`}
                            </pre>
                        </div>
                    </div>
                </div>

            </section>

            {/* Code Examples */}
            <section className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-brand-600" /> Exemplos de Integração
                    </h2>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveMethod('GET_ORDERS')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeMethod === 'GET_ORDERS' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}
                        >
                            Pedidos (GET)
                        </button>
                        <button
                            onClick={() => setActiveMethod('POST_ORDERS')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeMethod === 'POST_ORDERS' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}
                        >
                            Pedidos (POST)
                        </button>
                        <button
                            onClick={() => setActiveMethod('GET_PRODUCTS')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeMethod === 'GET_PRODUCTS' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}
                        >
                            Produtos (GET)
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        {['Node.js', 'PHP', 'Python'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => setActiveLang(lang)}
                                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeLang === lang ? 'text-brand-600 border-brand-600 bg-white dark:bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <div className="p-0 relative">
                        <div className="block">
                            <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs font-mono m-0">
                                {codeSnippets[activeLang][activeMethod]}
                            </pre>
                        </div>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(codeSnippets[activeLang][activeMethod]);
                                alert('Código copiado!');
                            }}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors bg-gray-800/50"
                            title="Copiar código"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </section>

            {/* API Playground */}
            <section className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-brand-600" /> Playground de Teste
                </h2>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Teste sua chave de API diretamente aqui para verificar se tudo está funcionando.
                    </p>

                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rota e Método</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-1/3 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold"
                                        id="playground-method"
                                        onChange={(e) => {
                                            const bodyField = document.getElementById('playground-body-container');
                                            if (bodyField) bodyField.style.display = e.target.value === 'POST' ? 'block' : 'none';
                                        }}
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                    </select>
                                    <select
                                        className="w-2/3 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                                        id="playground-route"
                                    >
                                        <option value="/orders">/orders</option>
                                        <option value="/products">/products</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sua API Key</label>
                                <input
                                    type="text"
                                    id="playground-key"
                                    placeholder="sk_..."
                                    className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div id="playground-body-container" style={{ display: 'none' }}>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Corpo da Requisição (JSON)
                                <span className="ml-2 text-[10px] text-gray-400 normal-case font-normal">(Cole aqui o JSON que seu código gerou)</span>
                            </label>
                            <textarea
                                id="playground-body"
                                rows={6}
                                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-mono"
                                defaultValue={`{\n  "customer_name": "Teste Playground",\n  "delivery_address": "Rua Teste, 123",\n  "total_amount": 10.00,\n  "items": []\n}`}
                            />
                        </div>

                        <button
                            onClick={async () => {
                                const method = (document.getElementById('playground-method') as HTMLSelectElement).value;
                                const route = (document.getElementById('playground-route') as HTMLSelectElement).value;
                                const key = (document.getElementById('playground-key') as HTMLInputElement).value;
                                const body = (document.getElementById('playground-body') as HTMLTextAreaElement).value;
                                const output = document.getElementById('playground-output');

                                if (!key) {
                                    if (output) output.innerText = "Erro: Insira uma Chave de API.";
                                    return;
                                }

                                if (output) output.innerText = "Carregando...";

                                const handleTestRequest = async () => {
                                    // Simulação da API no Frontend com Dados Reais
                                    if (output) output.innerText = "Carregando dados reais...";

                                    try {
                                        const sb = cloud.getClient();
                                        if (!sb) throw new Error("Cliente Supabase não inicializado.");

                                        // 1. Validar Token e Pegar Store ID
                                        let storeId = "store_simulated_offline_mode";
                                        let keyData = null;

                                        try {
                                            // Usar Promise.race para evitar travamento
                                            const timeoutPromise = new Promise((_, reject) =>
                                                setTimeout(() => reject(new Error("Timeout verificação")), 5000)
                                            );

                                            const fetchKeyPromise = sb
                                                .from('api_keys')
                                                .select('user_id, is_active, permissions')
                                                .eq('key_token', key)
                                                .single();

                                            const result: any = await Promise.race([fetchKeyPromise, timeoutPromise]);

                                            if (result.error) throw result.error;
                                            keyData = result.data;

                                            if (!keyData) throw new Error("API Key inválida.");
                                            if (!keyData.is_active) throw new Error("API Key inativa.");

                                            storeId = keyData.user_id;

                                        } catch (e: any) {
                                            // console.warn("Falha na validação online da chave:", e.message);

                                            // Se for GET, precisamos do banco, então repassamos o erro
                                            if (method === 'GET') {
                                                if (e.message.includes("Timeout")) {
                                                    throw new Error("Timeout: Banco de dados demorou para responder. Tente novamente.");
                                                }
                                                throw new Error(e.message || "Erro ao validar chave.");
                                            }

                                            // Se for POST, aceitamos rodar em modo 100% OFF-LINE (Simulação)
                                            // Apenas avisamos no log
                                            if (method === 'POST') {
                                                // console.log("Prosseguindo com POST em modo offline/simulado.");
                                            }
                                        }

                                        // Atualizar visualmente o Store ID se houver onde mostrar (vou adicionar no log)
                                        // console.log("Store ID Identificado:", storeId);

                                        let responseData: any;
                                        let status = 200;
                                        const selectedRoute = `${method} ${route}`;

                                        if (selectedRoute === 'GET /orders') {
                                            // Buscar dados REAIS da loja
                                            const { data: orders, error: ordersError } = await sb
                                                .from('orders')
                                                .select('*')
                                                .eq('store_id', storeId) // Filtra pela loja da chave
                                                .order('created_at', { ascending: false })
                                                .limit(10); // Limite de 10 para exemplo

                                            if (ordersError) throw ordersError;
                                            responseData = orders || [];

                                        } else if (selectedRoute === 'GET /products') {
                                            // Buscar dados REAIS de produtos
                                            const { data: products, error: prodError } = await sb
                                                .from('products')
                                                .select('*')
                                                .eq('store_id', storeId)
                                                .limit(10);

                                            if (prodError) throw prodError;
                                            responseData = products || [];

                                        } else if (selectedRoute === 'POST /orders') {
                                            // POST mantém simulação (DRY RUN) para não sujar banco
                                            try {
                                                const requestBody = body;
                                                const parsedBody = JSON.parse(requestBody);

                                                // Validar campos básicos
                                                if (!parsedBody.customer_name || !parsedBody.total_amount) {
                                                    status = 400;
                                                    responseData = { error: "Campos obrigatórios ausentes: customer_name, total_amount" };
                                                } else {
                                                    responseData = {
                                                        success: true,
                                                        message: "Pedido simulado com sucesso (DRY RUN - Não salvo no banco)",
                                                        store_id_resolved: storeId, // Mostrando que identificamos a loja
                                                        order_id: `ord_${Math.random().toString(36).substring(7)}`,
                                                        status: "PENDING",
                                                        received_data: parsedBody
                                                    };
                                                }
                                            } catch (e) {
                                                status = 400;
                                                responseData = { error: "JSON inválido no corpo da requisição" };
                                            }
                                        } else {
                                            status = 404;
                                            responseData = { error: "Rota não encontrada." };
                                        }

                                        // Montar resposta final com metadados úteis para debug
                                        const finalOutput = {
                                            meta: {
                                                store_id: storeId, // Exibindo ID da Loja como pedido
                                                key_active: true,
                                                timestamp: new Date().toISOString()
                                            },
                                            status: status,
                                            data: responseData
                                        };

                                        if (output) output.innerText = JSON.stringify(finalOutput, null, 2);

                                    } catch (error: any) {
                                        // console.error(error);
                                        // Se for erro de permissão (RLS bloqueando leitura de chave de outro user)
                                        // Mas aqui o usuário deve estar logado como ele mesmo, então deve ver as próprias chaves.
                                        let msg = error.message;
                                        if (error.code === 'PGRST116') msg = "Chave não encontrada ou não pertence ao usuário logado.";

                                        if (output) output.innerText = JSON.stringify({
                                            status: error.code || 500,
                                            data: {
                                                error: msg,
                                                hint: "Verifique se a chave está correta e pertence à sua loja."
                                            }
                                        }, null, 2);
                                    }
                                };
                                await handleTestRequest();
                            }}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <Terminal className="w-4 h-4" />
                            Testar Requisição
                        </button>

                        <div className="mt-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resposta da API</label>
                            <pre
                                id="playground-output"
                                className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono min-h-[100px] border border-gray-800"
                            >
                                Aguardando teste...
                            </pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
