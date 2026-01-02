import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Step, CallBackProps, STATUS } from '@list-labs/react-joyride';

// Define o formato do estado do tour e as ações
interface TourContextType {
  steps: Step[];
  run: boolean;
  stepIndex: number;
  startTour: (steps: Step[], tourKey: string, stepIndex?: number) => void;
  stopTour: () => void;
  handleJoyrideCallback: (data: CallBackProps) => void;
  isTourRunning: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentTourKey, setCurrentTourKey] = useState<string>('');

  const startTour = useCallback((tourSteps: Step[], tourKey: string, index = 0) => {
    setSteps(tourSteps);
    setStepIndex(index);
    setCurrentTourKey(tourKey);
    setRun(true);
    console.log(`Tour: Iniciando tour '${tourKey}' com ${tourSteps.length} passos.`);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
    setCurrentTourKey('');
    console.log('Tour: Parado manualmente.');
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      if (currentTourKey) {
        console.log(`Tour: Marcando tour '${currentTourKey}' como concluído.`);
        localStorage.setItem(`tour-completed-${currentTourKey}`, 'true');
      }
      setRun(false);
      setCurrentTourKey('');
    } else if (type === 'step:after' || type === 'error:target_not_found') {
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }
  };

  const value = {
    steps,
    run,
    stepIndex,
    startTour,
    stopTour,
    handleJoyrideCallback,
    isTourRunning: run,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};
