import { PartnerFeeSettings } from '../types';

const haversineTop = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => v * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const estimateDeliveryCosts = (
  points: Array<{ lat: number; lng: number }>,
  stops: number,
  f: PartnerFeeSettings
) => {
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalKm += haversineTop(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  const baseKm = Number(f.base_delivery_km || 0);
  const baseValue = Number(f.base_delivery_value || 0);
  const extraPerKm = Number(f.extra_km_value || 0);
  const stopFeeTotal = Number(f.additional_stop_fee || 0) * Math.max(0, stops);
  const extraKm = Math.max(0, totalKm - baseKm);
  const partnerNetCalc = baseValue + (extraKm * extraPerKm) + stopFeeTotal;
  const feeFixed = Number(f.global_tax_fixed || 0);
  const feePercentValue = Number(f.global_tax_percent || 0) * partnerNetCalc;
  const storeTotal = partnerNetCalc + feeFixed + feePercentValue;
  return {
    distanceKm: Number(totalKm.toFixed(2)),
    partnerNet: Number(partnerNetCalc.toFixed(2)),
    total: Number(storeTotal.toFixed(2))
  };
};

