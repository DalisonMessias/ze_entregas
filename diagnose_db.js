
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjnxrqemjozlpnvoxpmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbnhycWVtam96bHBudm94cG1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU2MDY2MSwiZXhwIjoyMDgwMTM2NjYxfQ.RLfxyeG4KML-YKYXUlNUwf10MTs1mRYk0W4K5nd7zHQ';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DIAGNÓSTICO DE BANCO DE DADOS ---');

    const tables = ['whatsapp_sessions', 'whatsapp_conversations', 'whatsapp_messages'];

    for (const table of tables) {
        console.log(`\nVerificando tabela: ${table}...`);
        const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);

        if (error) {
            console.error(`❌ Erro na tabela ${table}:`, error.message);
            console.error(`Dica: ${error.hint}`);
            console.error(`Código: ${error.code}`);
        } else {
            console.log(`✅ Tabela ${table} acessível.`);
            if (data.length > 0) {
                if ('store_id' in data[0]) {
                    console.log(`✅ Coluna 'store_id' encontrada em ${table}.`);
                } else {
                    console.error(`❌ Coluna 'store_id' NÃO encontrada em ${table}!`);
                }
            } else {
                console.log(`ℹ️ Tabela ${table} está vazia, não foi possível verificar colunas via select * result.`);
                // Tenta um select específico da coluna
                const { error: colError } = await supabaseAdmin.from(table).select('store_id').limit(0);
                if (colError) {
                    console.error(`❌ Erro ao tentar selecionar 'store_id' em ${table}:`, colError.message);
                } else {
                    console.log(`✅ Coluna 'store_id' existe em ${table}.`);
                }
            }
        }
    }
}

check();
