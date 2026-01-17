import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração absoluta do dotenv para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

console.log('📦 Carregando .env de:', envPath);
console.log('🌐 SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ NÃO DEFINIDA');
console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ NÃO DEFINIDA');
console.log('🔌 PORT:', process.env.PORT || '3001 (Padrão)');
