import { useState, useEffect } from 'react';

export const useDynamicFont = (text: string, baseSize: number = 16, minSize: number = 10, charsPerStep: number = 5) => {
    const [fontSize, setFontSize] = useState(baseSize);

    useEffect(() => {
        if (!text) {
            setFontSize(baseSize);
            return;
        }

        const length = text.length;
        if (length <= 10) {
            setFontSize(baseSize);
        } else {
            // Calculate reduction steps
            const extraChars = length - 10;
            const steps = Math.ceil(extraChars / charsPerStep);
            const newSize = Math.max(minSize, baseSize - steps);
            setFontSize(newSize);
        }
    }, [text, baseSize, minSize, charsPerStep]);

    return fontSize;
};
