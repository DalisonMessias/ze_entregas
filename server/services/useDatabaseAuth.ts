
import { supabaseAdmin } from './supabaseClient.js';
import {
  AuthenticationState,
  initAuthCreds,
  BufferJSON,
  SignalKeyStore,
} from '@whiskeysockets/baileys';

/**
 * Limpa a sessão de autenticação do banco de dados para uma loja específica.
 */
export const clearDatabaseSession = async (storeId: string) => {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('store_id', storeId);

    if (error) {
      // Ignora erros de tabela/coluna inexistente
      if (error.message?.includes('does not exist')) return true;
      console.error(`❌ Erro ao limpar sessão no banco (Loja ${storeId}):`, error.message);
      return false;
    }
    console.log(`✅ Sessão do WhatsApp para a loja ${storeId} limpa com sucesso.`);
    return true;
  } catch (e) {
    return true; // Se der erro de conexão/driver, assumimos falha mas não travamos
  }
};

/**
 * Carrega e salva o estado de autenticação do WhatsApp utilizando o Supabase
 * como armazenamento, isolado por loja.
 */
export const useDatabaseAuth = async (storeId: string): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  let creds = initAuthCreds();
  const keys: { [key: string]: any } = {};

  // Tenta carregar a sessão existente do banco de dados para a loja específica
  const { data: sessionData, error: fetchError } = await supabaseAdmin
    .from('chat_sessions')
    .select('session_data')
    .eq('store_id', storeId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`⚠️ Erro ao carregar sessão da loja ${storeId} do Supabase:`, fetchError);
  }

  if (sessionData && sessionData.session_data) {
    console.log(`✅ Sessão do WhatsApp para a loja ${storeId} carregada.`);
    const parsed = JSON.parse(JSON.stringify(sessionData.session_data), BufferJSON.reviver);
    creds = parsed.creds;
    Object.assign(keys, parsed.keys);
  } else {
    console.log(`ℹ️ Nenhuma sessão salva encontrada para a loja ${storeId}. Novo QR Code será necessário.`);
  }

  /**
   * Salva o estado de autenticação atualizado no banco de dados para a loja.
   */
  const saveCreds = async () => {
    const sessionToSave = { creds, keys };
    const value = JSON.parse(JSON.stringify(sessionToSave, BufferJSON.replacer));

    try {
      const { error } = await supabaseAdmin.from('chat_sessions').upsert({
        store_id: storeId,
        session_id: `session_${storeId}`, // Mantemos um ID de sessão baseado no store_id
        session_data: value,
      }, { onConflict: 'store_id' }); // Garantimos que cada loja tenha apenas uma sessão ativa

      if (error) {
        console.error(`Erro ao salvar credenciais da loja ${storeId} no Supabase:`, error);
      }
    } catch (e) {
      console.error(`Exceção ao tentar salvar credenciais da loja ${storeId} no Supabase:`, e);
    }
  };

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data: { [key: string]: any } = {};
          for (const id of ids) {
            const key = `${type}-${id}`;
            if (keys[key]) {
              data[id] = keys[key];
            }
          }
          return data;
        },
        set: (newKeys) => {
          Object.assign(keys, newKeys);
          saveCreds();
        },
      } as SignalKeyStore,
    },
    saveCreds,
  };
};

