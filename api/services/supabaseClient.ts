import { createClient } from '@supabase/supabase-js';

// As chaves são carregadas a partir de variáveis de ambiente,
// seguindo o padrão encontrado em outros locais do backend (ex: api/middleware/auth.ts).
// Em um ambiente de produção, essas variáveis devem ser configuradas no provedor de hospedagem.
// Seguindo a regra do projeto: chaves do Supabase são colocadas diretamente no arquivo.
const supabaseUrl = 'https://pjnxrqemjozlpnvoxpmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbnhycWVtam96bHBudm94cG1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU2MDY2MSwiZXhwIjoyMDgwMTM2NjYxfQ.RLfxyeG4KML-YKYXUlNUwf10MTs1mRYk0W4K5nd7zHQ';

/**
 * Cliente Supabase com privilégios de administrador (service_role).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
