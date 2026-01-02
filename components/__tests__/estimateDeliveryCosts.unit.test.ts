import { describe, it, expect } from 'vitest';
import { estimateDeliveryCosts } from '../../utils/estimateDeliveryCosts';

describe('estimateDeliveryCosts', () => {
  it('calcula corretamente distância, líquido e total', () => {
    // dois pontos próximos ~1.5km (depende de coords exatas)
    const points = [
      { lat: -20.0, lng: -44.0 },
      { lat: -20.01, lng: -44.01 },
    ];
    const fees = {
      base_delivery_value: 10,
      base_delivery_km: 1,
      extra_km_value: 2,
      additional_stop_fee: 3,
      global_tax_fixed: 1,
      global_tax_percent: 0.1,
    } as any;
    const { distanceKm, partnerNet, total } = estimateDeliveryCosts(points, 0, fees);
    expect(distanceKm).toBeGreaterThan(0);
    expect(partnerNet).toBeGreaterThan(10);
    expect(total).toBeGreaterThan(partnerNet);
  });
});
