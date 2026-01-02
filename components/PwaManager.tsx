import React from 'react';
import { usePwaSettings } from '../src/hooks/usePwaSettings';

export const PwaManager: React.FC = () => {
    usePwaSettings();
    return null;
};
