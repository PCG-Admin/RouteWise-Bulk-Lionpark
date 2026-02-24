import type { Vessel } from '@/lib/types';

export const vessels: Vessel[] = [
  { id: 'spring-glory', name: 'Spring Glory', clientId: 'chrome-traders', product: 'Chrome', stockpileId: 'island-view-e', plannedVolumeTonnes: 25000, loadedTonnes: 18400, eta: '2026-03-05', etd: '2026-03-12', status: 'accumulating' },
  { id: 'ocean-begonia', name: 'Ocean Begonia', clientId: 'metal-line', product: 'Iron Ore', stockpileId: 'yard-k-l', plannedVolumeTonnes: 35000, loadedTonnes: 18500, eta: '2026-03-15', etd: '2026-03-22', status: 'accumulating' },
  { id: 'lia', name: 'LIA', clientId: 'connect-logistics', product: 'Thermal Coal', stockpileId: 'island-view-j', plannedVolumeTonnes: 20000, loadedTonnes: 5250, eta: '2026-03-25', etd: '2026-04-01', status: 'nominated' },
  { id: 'lowlands-amber', name: 'Lowlands Amber', clientId: 'barplats', product: 'Chrome', stockpileId: 'island-view-k', plannedVolumeTonnes: 18000, loadedTonnes: 9750, eta: '2026-03-10', etd: '2026-03-17', status: 'accumulating' },
  { id: 'kastelli-wave', name: 'Kastelli Wave', clientId: 'sca', product: 'Thermal Coal', stockpileId: 'island-view-j', plannedVolumeTonnes: 22000, loadedTonnes: 5250, eta: '2026-04-02', etd: '2026-04-09', status: 'tbn' },
  { id: 'anastasia-k', name: 'Anastasia K', clientId: 'samancor', product: 'Chrome', stockpileId: 'island-view-h', plannedVolumeTonnes: 20000, loadedTonnes: 13200, eta: '2026-03-01', etd: '2026-03-08', status: 'loading' },
  { id: 'tbn-samancor-1', name: 'TBN Samancor', clientId: 'samancor', product: 'Chrome', stockpileId: 'bluff-a-b', plannedVolumeTonnes: 15000, loadedTonnes: 7200, eta: '2026-03-20', etd: '2026-03-27', status: 'accumulating' },
  { id: 'tbn-samancor-2', name: 'TBN Samancor II', clientId: 'samancor', product: 'Chrome', stockpileId: 'yard-d-i', plannedVolumeTonnes: 18000, loadedTonnes: 9150, eta: '2026-04-05', etd: '2026-04-12', status: 'tbn' },
  { id: 'tbn-connect', name: 'TBN Connect Logistics', clientId: 'connect-logistics', product: 'Thermal Coal', stockpileId: 'island-view-r', plannedVolumeTonnes: 15000, loadedTonnes: 4200, eta: '2026-04-10', etd: '2026-04-17', status: 'tbn' },
  { id: 'tbn-sca', name: 'TBN SCA', clientId: 'sca', product: 'Metallurgical Coal', stockpileId: 'island-view-j', plannedVolumeTonnes: 20000, loadedTonnes: 0, eta: '2026-04-20', etd: '2026-04-27', status: 'tbn' },
  { id: 'tbn-glencore-1', name: 'TBN Glencore', clientId: 'glencore', product: 'Chrome', stockpileId: 'island-view-r', plannedVolumeTonnes: 22000, loadedTonnes: 4200, eta: '2026-03-18', etd: '2026-03-25', status: 'nominated' },
  { id: 'tbn-glencore-2', name: 'TBN Glencore II', clientId: 'glencore', product: 'Chrome', stockpileId: 'island-view-e', plannedVolumeTonnes: 25000, loadedTonnes: 0, eta: '2026-04-15', etd: '2026-04-22', status: 'tbn' },
  { id: 'tbn-wma', name: 'TBN WMA', clientId: 'wma', product: 'Iron Ore', stockpileId: 'island-view-n-o', plannedVolumeTonnes: 18000, loadedTonnes: 6300, eta: '2026-03-28', etd: '2026-04-04', status: 'nominated' },
  { id: 'tbn-hullblyth', name: 'TBN Hullblyth', clientId: 'hullblyth', product: 'Manganese Ore', stockpileId: 'island-view-p', plannedVolumeTonnes: 16000, loadedTonnes: 8700, eta: '2026-03-12', etd: '2026-03-19', status: 'accumulating' },
  { id: 'tbn-vlink', name: 'TBN V Link', clientId: 'v-link', product: 'Vanadium', stockpileId: 'yard-n-island-s', plannedVolumeTonnes: 12000, loadedTonnes: 3300, eta: '2026-04-01', etd: '2026-04-08', status: 'nominated' },
];
