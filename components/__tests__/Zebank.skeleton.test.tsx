import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { ZebankSkeleton } from '../../components/Zebank';

describe('ZebankSkeleton visual consistency', () => {
  test('normal driver skeleton renders with expected structure', () => {
    const { container, queryAllByText } = render(<ZebankSkeleton isNormalDriver={true} />);
    expect(queryAllByText('Atividade Recente').length).toBeGreaterThan(0);
    expect(container).toMatchSnapshot();
  });

  test('partner skeleton renders with expected structure', () => {
    const { container, queryAllByText } = render(<ZebankSkeleton isNormalDriver={false} />);
    expect(queryAllByText('Meus Cartões').length).toBeGreaterThan(0);
    expect(queryAllByText('Atividade Recente').length).toBeGreaterThan(0);
    expect(container).toMatchSnapshot();
  });

  test('render performance is acceptable', () => {
    const start = performance.now();
    render(<ZebankSkeleton isNormalDriver={false} />);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
