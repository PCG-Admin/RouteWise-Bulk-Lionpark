import type { Stockpile } from '@/lib/types';

export const stockpiles: Stockpile[] = [
  { id: 'island-view-e', name: 'Island View E', location: 'Island View', capacityTonnes: 20000, currentTonnes: 18400, product: 'Chrome', allocatedVesselId: 'spring-glory', pendingInboundTrucks: 8, pendingInboundTonnes: 312 },
  { id: 'yard-k-l', name: 'Yard K-L', location: 'Island View', capacityTonnes: 25000, currentTonnes: 18500, product: 'Iron Ore', allocatedVesselId: 'ocean-begonia', pendingInboundTrucks: 12, pendingInboundTonnes: 463 },
  { id: 'island-view-k', name: 'Island View K', location: 'Island View', capacityTonnes: 15000, currentTonnes: 9750, product: 'Chrome', allocatedVesselId: 'lowlands-amber', pendingInboundTrucks: 6, pendingInboundTonnes: 233 },
  { id: 'island-view-j', name: 'Island View J', location: 'Island View', capacityTonnes: 15000, currentTonnes: 5250, product: 'Thermal Coal', allocatedVesselId: 'kastelli-wave', pendingInboundTrucks: 4, pendingInboundTonnes: 155 },
  { id: 'island-view-p', name: 'Island View P', location: 'Island View', capacityTonnes: 15000, currentTonnes: 8700, product: 'Manganese Ore', allocatedVesselId: undefined, pendingInboundTrucks: 5, pendingInboundTonnes: 194 },
  { id: 'island-view-h', name: 'Island View H (Ferry Side)', location: 'Island View', capacityTonnes: 15000, currentTonnes: 13200, product: 'Chrome', allocatedVesselId: 'anastasia-k', pendingInboundTrucks: 7, pendingInboundTonnes: 272 },
  { id: 'island-view-n-o', name: 'Island View N-O', location: 'Island View', capacityTonnes: 15000, currentTonnes: 6300, product: 'Iron Ore', allocatedVesselId: undefined, pendingInboundTrucks: 3, pendingInboundTonnes: 116 },
  { id: 'bluff-a-b', name: 'Bluff A & B', location: 'Bluff', capacityTonnes: 15000, currentTonnes: 7200, product: 'Chrome', allocatedVesselId: 'tbn-samancor-1', pendingInboundTrucks: 9, pendingInboundTonnes: 349 },
  { id: 'island-view-r', name: 'Island View R', location: 'Island View', capacityTonnes: 15000, currentTonnes: 4200, product: 'Thermal Coal', allocatedVesselId: 'tbn-glencore-1', pendingInboundTrucks: 2, pendingInboundTonnes: 78 },
  { id: 'yard-n-island-s', name: 'Yard N & Island View S', location: 'Island View', capacityTonnes: 20000, currentTonnes: 3300, product: 'Vanadium', allocatedVesselId: undefined, pendingInboundTrucks: 0, pendingInboundTonnes: 0 },
  { id: 'yard-d-i', name: 'Yard D-I', location: 'Island View', capacityTonnes: 20000, currentTonnes: 9150, product: 'Chrome', allocatedVesselId: 'tbn-samancor-2', pendingInboundTrucks: 11, pendingInboundTonnes: 426 },
];
