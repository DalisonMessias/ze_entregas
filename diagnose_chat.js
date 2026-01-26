import axios from 'axios';

const testApi = async () => {
    const baseUrl = 'http://localhost:4000';
    const endpoints = [
        '/api/chat/status',
        '/api/chat/conversations?storeId=123e4567-e89b-12d3-a456-426614174000',
        '/api/chat/conversations/order?storeId=123e4567-e89b-12d3-a456-426614174000&attendantId=123e4567-e89b-12d3-a456-426614174000'
    ];

    for (const endpoint of endpoints) {
        console.log(`\nTesting ${endpoint}...`);
        try {
            const res = await axios.get(`${baseUrl}${endpoint}`);
            console.log(`Status: ${res.status}`);
            console.log(`Response:`, res.data);
        } catch (error) {
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Error body:`, error.response.data);
            } else {
                console.log(`Error: ${error.message}`);
            }
        }
    }
};

testApi();
