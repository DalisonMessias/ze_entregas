
import { supabaseAdmin } from './supabaseClient.js';
import {
  AuthenticationState,
  initAuthCreds,
  BufferJSON,
  SignalKeyStore,
} from '@whiskeysockets/baileys';

const SESSION_ID = 'main_session'; // ID fixo para uma única instância/sessão

/**
 * Limpa a sessão de autenticação do banco de dados.
 * Isso força a geração de um novo QR code na próxima inicialização.
 */
export const clearDatabaseSession = async () => {
  try {
    await supabaseAdmin
      .from('whatsapp_sessions')
      .delete()
      .eq('session_id', SESSION_ID);
    console.log('Sessão do WhatsApp limpa do banco de dados.');
  } catch (error) {
    console.error('Erro ao limpar a sessão do banco de dados:', error);
  }
};


/**
 * Carrega e salva o estado de autenticação do WhatsApp utilizando o Supabase
 * como armazenamento. Esta função imita a interface de `useMultiFileAuthState`
 * mas consolida tudo em uma única entrada JSON no banco de dados para simplicidade.
 */
export const useDatabaseAuth = async (): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  let creds = initAuthCreds();
  const keys: { [key: string]: any } = {};

  // Tenta carregar a sessão existente do banco de dados
  const { data: sessionData, error: fetchError } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('session_data')
    .eq('session_id', SESSION_ID)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('⚠️ Erro ao carregar sessão do Supabase (Verifique se a tabela whatsapp_sessions existe):', fetchError);
  }

  if (sessionData && sessionData.session_data) {
    console.log('✅ Sessão do WhatsApp carregada do banco de dados.');
    // A função reviver do BufferJSON converte os dados de volta para o formato que o Baileys espera
    const parsed = JSON.parse(JSON.stringify(sessionData.session_data), BufferJSON.reviver);
    creds = parsed.creds;
    Object.assign(keys, parsed.keys);
  } else {
    console.log('ℹ️ Nenhuma sessão salva encontrada. Novo QR Code será necessário.');
  }

  /**
   * Salva o estado de autenticação atualizado no banco de dados.
   */
  const saveCreds = async () => {
    const sessionToSave = { creds, keys };

    // A função replacer do BufferJSON garante que os Buffers sejam serializados corretamente
    const value = JSON.parse(JSON.stringify(sessionToSave, BufferJSON.replacer));

    try {
      const { error } = await supabaseAdmin.from('whatsapp_sessions').upsert({
        session_id: SESSION_ID,
        session_data: value,
      });

      if (error) {
        console.error('Erro ao salvar credenciais da sessão no Supabase:', error);
      }
    } catch (e) {
      console.error('Exceção ao tentar salvar credenciais no Supabase:', e);
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
