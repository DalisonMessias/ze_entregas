import React from 'react';
import Joyride, { Step } from 'react-joyride';
import { useTour } from './TourContext';

/**
 * TourComponent é um componente "burro" que apenas renderiza a interface do Joyride.
 * Toda a lógica de estado (quais passos mostrar, quando rodar, etc.) é gerenciada
 * pelo TourProvider e consumida através do hook useTour.
 */
const TourComponent: React.FC = () => {
  const { run, steps, stepIndex, handleJoyrideCallback } = useTour();

  // Estilização do tour para combinar com a identidade visual do "Zé Entregas"
  const styling = {
    options: {
      arrowColor: '#e50039', // Cor da seta (tom do vermelho da marca)
      backgroundColor: '#ffffff', // Fundo do tooltip
      primaryColor: '#e50039', // Cor principal para botões e links
      textColor: '#1f2937', // Cor do texto (escuro, para contraste com fundo branco)
      zIndex: 10000, // Z-index alto para sobrepor outros elementos
    },
    tooltip: {
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    },
    buttonClose: {
      color: '#9ca3af', // Cinza para o botão de fechar
    },
    buttonNext: {
      backgroundColor: '#e50039',
      borderRadius: '6px',
      color: '#ffffff',
      fontWeight: 'bold',
      padding: '8px 16px',
    },
    buttonBack: {
      color: '#6b7280', // Cinza mais escuro para o botão de voltar
    },
    buttonSkip: {
      color: '#e50039', // Vermelho da marca para o link de pular
    },
    spotlight: {
      borderRadius: '8px',
    },
    tooltipTitle: {
      fontSize: '1.25rem', // Tamanho do título (equivalente a h5)
      fontWeight: 'bold',
      color: '#111827', // Preto para o título
      margin: '0 0 8px 0',
    },
  };

  // Se não houver passos, não renderiza nada para evitar erros.
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous // O tour avança para o próximo passo ao clicar em "Próximo"
      showProgress // Mostra o progresso (ex: 2/5)
      showSkipButton // Permite que o usuário pule o tour
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
      styles={styling}
      // Esta prop é crucial para permitir que o Joyride espere por alvos
      // que aparecem dinamicamente no DOM (ex: após uma navegação).
      disableScrollParentFix
      spotlightPadding={4}
    />
  );
};

export default TourComponent;

