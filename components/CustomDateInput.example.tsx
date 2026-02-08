
import React, { useState } from 'react';
import CustomDateInput from './CustomDateInput';

const CustomDateInputExample = () => {
  const [date, setDate] = useState<string | null>('2024-01-15');
  const [errorDate, setErrorDate] = useState<string | null>(null);
  const [validatedDate, setValidatedDate] = useState<string | null>(null);

  const handleDateChange = (newDate: string | null) => {
    console.log('Data ISO alterada:', newDate);
    setDate(newDate);
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">Exemplos de CustomDateInput</h1>

      {/* Exemplo 1: Uso Básico */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">1. Uso Básico</h2>
        <p className="mb-2 text-sm text-gray-600">
          Um input de data simples com um valor inicial. O valor é controlado pelo estado do componente pai e emitido no formato ISO (`YYYY-MM-DD`).
        </p>
        <CustomDateInput
          id="basic-date"
          name="basic-date"
          label="Data de Nascimento"
          value={date}
          onChange={handleDateChange}
        />
        <div className="mt-4 p-2 bg-gray-100 rounded">
          <p className="text-xs text-gray-500">Valor no estado (ISO): <code className="font-mono bg-gray-200 p-1 rounded">{date || 'null'}</code></p>
        </div>
      </div>

      {/* Exemplo 2: Com Placeholder e Limpeza */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">2. Com Placeholder e Botão de Limpar</h2>
        <p className="mb-2 text-sm text-gray-600">
          Mostra um placeholder quando o campo está vazio e permite que o usuário limpe a data.
        </p>
        <CustomDateInput
          id="placeholder-date"
          name="placeholder-date"
          label="Data de Agendamento"
          placeholder="Escolha uma data"
          value={null}
          onChange={(newDate) => console.log('Nova data de agendamento:', newDate)}
          allowClear={true}
        />
      </div>

      {/* Exemplo 3: Validação (Obrigatório e Min/Max) */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">3. Validação (Obrigatório e Min/Max)</h2>
        <p className="mb-2 text-sm text-gray-600">
          Este campo é obrigatório e aceita apenas datas entre 01/01/2023 e 31/12/2025. Mensagens de erro são exibidas automaticamente.
        </p>
        <CustomDateInput
          id="validated-date"
          name="validated-date"
          label="Data da Fatura"
          value={validatedDate}
          onChange={setValidatedDate}
          required={true}
          min="2023-01-01" // Formato ISO
          max={new Date('2025-12-31')} // Objeto Date
        />
         <div className="mt-4 p-2 bg-gray-100 rounded">
          <p className="text-xs text-gray-500">Valor no estado (ISO): <code className="font-mono bg-gray-200 p-1 rounded">{validatedDate || 'null'}</code></p>
        </div>
      </div>

      {/* Exemplo 4: Estado de Erro e Texto de Ajuda */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">4. Estado de Erro e Texto de Ajuda</h2>
        <p className="mb-2 text-sm text-gray-600">
          Um exemplo de como o componente se parece quando um erro é passado externamente.
        </p>
        <CustomDateInput
          id="error-date"
          name="error-date"
          label="Data de Expiração"
          value={errorDate}
          onChange={setErrorDate}
          error={true}
          helperText="O formato da data está incorreto ou a data expirou."
        />
      </div>

      {/* Exemplo 5: Desabilitado */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">5. Desabilitado</h2>
        <p className="mb-2 text-sm text-gray-600">
          O input pode ser desabilitado, impedindo qualquer interação do usuário.
        </p>
        <CustomDateInput
          id="disabled-date"
          name="disabled-date"
          label="Data de Início (Fixa)"
          value="2020-05-20"
          onChange={() => {}}
          disabled={true}
        />
      </div>
    </div>
  );
};

export default CustomDateInputExample;

