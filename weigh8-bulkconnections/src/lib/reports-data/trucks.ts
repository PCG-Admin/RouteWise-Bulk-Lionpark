import type { Truck } from '@/lib/types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

export const trucks: Truck[] = [
  // ASAC001 — Completed Chrome trucks (Mogalakwena, Amadwala)
  { id: 'KYD896MP', registration: 'KYD 896 MP', orderId: 'ASAC001', driverId: 'drv-001', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1636, mineWeighbridgeKg: 38880, bcWeighbridgeKg: 38650, mineLoadTime: '2026-01-25T06:00:00Z', mineExitTime: '2026-01-25T07:45:00Z', lionsArrivalTime: '2026-01-25T15:30:00Z', lionsDepartureTime: '2026-01-25T16:00:00Z', bcArrivalTime: '2026-01-25T18:00:00Z', bcOffloadTime: '2026-01-25T19:15:00Z', bcExitTime: '2026-01-25T19:30:00Z', stockpileId: 'island-view-e', varianceKg: -230, variancePct: -0.59 },
  { id: 'LKZ482MP', registration: 'LKZ 482 MP', orderId: 'ASAC001', driverId: 'drv-002', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1637, mineWeighbridgeKg: 38640, bcWeighbridgeKg: 38400, mineLoadTime: '2026-01-25T06:30:00Z', mineExitTime: '2026-01-25T08:15:00Z', lionsArrivalTime: '2026-01-25T16:00:00Z', lionsDepartureTime: '2026-01-25T16:30:00Z', bcArrivalTime: '2026-01-25T18:30:00Z', bcOffloadTime: '2026-01-25T19:45:00Z', bcExitTime: '2026-01-25T20:00:00Z', stockpileId: 'island-view-e', varianceKg: -240, variancePct: -0.62 },
  { id: 'KZX922MP', registration: 'KZX 922 MP', orderId: 'ASAC001', driverId: 'drv-028', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1638, mineWeighbridgeKg: 38740, bcWeighbridgeKg: 38520, mineLoadTime: '2026-01-25T07:00:00Z', mineExitTime: '2026-01-25T08:45:00Z', lionsArrivalTime: '2026-01-25T16:30:00Z', lionsDepartureTime: '2026-01-25T17:00:00Z', bcArrivalTime: '2026-01-25T19:00:00Z', bcOffloadTime: '2026-01-25T20:15:00Z', bcExitTime: '2026-01-25T20:30:00Z', stockpileId: 'island-view-e', varianceKg: -220, variancePct: -0.57 },
  { id: 'KZX913MP', registration: 'KZX 913 MP', orderId: 'ASAC001', driverId: 'drv-001', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1639, mineWeighbridgeKg: 39200, bcWeighbridgeKg: 37260, mineLoadTime: '2026-01-26T06:00:00Z', mineExitTime: '2026-01-26T07:30:00Z', lionsArrivalTime: '2026-01-26T15:00:00Z', lionsDepartureTime: '2026-01-26T15:30:00Z', bcArrivalTime: '2026-01-26T17:30:00Z', bcOffloadTime: '2026-01-26T18:45:00Z', bcExitTime: '2026-01-26T19:00:00Z', stockpileId: 'island-view-e', varianceKg: -1940, variancePct: -4.95 },

  // GRTK002 — Thermal Coal (Grootegeluk, Comotrans) - various statuses
  { id: 'LDD982MP', registration: 'LDD 982 MP', orderId: 'GRTK002', driverId: 'drv-006', transporterId: 'comotrans', status: 'staging', product: 'Thermal Coal', ticket: 1670, mineWeighbridgeKg: 38800, bcWeighbridgeKg: 37340, mineLoadTime: hoursAgo(32), mineExitTime: hoursAgo(30), lionsArrivalTime: hoursAgo(26), stockpileId: 'yard-k-l', varianceKg: -1460, variancePct: -3.76 },
  { id: 'KRT441MP', registration: 'KRT 441 MP', orderId: 'GRTK002', driverId: 'drv-007', transporterId: 'comotrans', status: 'completed', product: 'Thermal Coal', ticket: 1671, mineWeighbridgeKg: 39320, bcWeighbridgeKg: 39100, mineLoadTime: '2026-02-10T06:00:00Z', mineExitTime: '2026-02-10T07:30:00Z', lionsArrivalTime: '2026-02-10T15:00:00Z', lionsDepartureTime: '2026-02-10T15:30:00Z', bcArrivalTime: '2026-02-10T17:30:00Z', bcOffloadTime: '2026-02-10T18:45:00Z', bcExitTime: '2026-02-10T19:00:00Z', stockpileId: 'yard-k-l', varianceKg: -220, variancePct: -0.56 },
  { id: 'LMR728MP', registration: 'LMR 728 MP', orderId: 'GRTK002', driverId: 'drv-029', transporterId: 'comotrans', status: 'in_transit_to_lions', product: 'Thermal Coal', ticket: 1672, mineWeighbridgeKg: 37340, mineLoadTime: hoursAgo(4), mineExitTime: hoursAgo(3), stockpileId: 'yard-k-l' },
  { id: 'KPX553MP', registration: 'KPX 553 MP', orderId: 'GRTK002', driverId: 'drv-006', transporterId: 'comotrans', status: 'in_transit_to_bc', product: 'Thermal Coal', ticket: 1673, mineWeighbridgeKg: 39100, mineLoadTime: hoursAgo(10), mineExitTime: hoursAgo(9), lionsArrivalTime: hoursAgo(3), lionsDepartureTime: hoursAgo(2.5), stockpileId: 'yard-k-l' },
  { id: 'LTN209MP', registration: 'LTN 209 MP', orderId: 'GRTK002', driverId: 'drv-007', transporterId: 'comotrans', status: 'at_bc', product: 'Thermal Coal', ticket: 1674, mineWeighbridgeKg: 37400, bcWeighbridgeKg: 37200, mineLoadTime: hoursAgo(14), mineExitTime: hoursAgo(12.5), lionsArrivalTime: hoursAgo(6), lionsDepartureTime: hoursAgo(5.5), bcArrivalTime: hoursAgo(3.5), stockpileId: 'yard-k-l', varianceKg: -200, variancePct: -0.53 },

  // SISH003 — Iron Ore (Sishen, LCS Logistics)
  { id: 'KWB334NC', registration: 'KWB 334 NC', orderId: 'SISH003', driverId: 'drv-009', transporterId: 'lcs-logistics', status: 'loading', product: 'Iron Ore', ticket: 1680, mineWeighbridgeKg: 38100, mineLoadTime: hoursAgo(1), stockpileId: 'island-view-r' },
  { id: 'KXM512NC', registration: 'KXM 512 NC', orderId: 'SISH003', driverId: 'drv-010', transporterId: 'lcs-logistics', status: 'in_transit_to_lions', product: 'Iron Ore', ticket: 1681, mineWeighbridgeKg: 37180, mineLoadTime: hoursAgo(6), mineExitTime: hoursAgo(5), stockpileId: 'island-view-r' },
  { id: 'KWR891NC', registration: 'KWR 891 NC', orderId: 'SISH003', driverId: 'drv-030', transporterId: 'lcs-logistics', status: 'completed', product: 'Iron Ore', ticket: 1682, mineWeighbridgeKg: 38500, bcWeighbridgeKg: 38280, mineLoadTime: '2026-02-12T06:00:00Z', mineExitTime: '2026-02-12T08:00:00Z', lionsArrivalTime: '2026-02-12T18:00:00Z', lionsDepartureTime: '2026-02-12T18:30:00Z', bcArrivalTime: '2026-02-12T20:30:00Z', bcOffloadTime: '2026-02-12T21:45:00Z', bcExitTime: '2026-02-12T22:00:00Z', stockpileId: 'island-view-r', varianceKg: -220, variancePct: -0.57 },

  // LUPS006 — Chrome (Impala Rustenburg, Pindulo) — staging breach
  { id: 'KZY170MP', registration: 'KZY 170 MP', orderId: 'LUPS006', driverId: 'drv-017', transporterId: 'pindulo', status: 'staging', product: 'Chrome', ticket: 1690, mineWeighbridgeKg: 38740, mineLoadTime: hoursAgo(18), mineExitTime: hoursAgo(16), lionsArrivalTime: hoursAgo(13), stockpileId: 'island-view-k' },
  { id: 'KZR448MP', registration: 'KZR 448 MP', orderId: 'LUPS006', driverId: 'drv-017', transporterId: 'pindulo', status: 'in_transit_to_lions', product: 'Chrome', ticket: 1691, mineWeighbridgeKg: 39840, mineLoadTime: hoursAgo(5), mineExitTime: hoursAgo(4), stockpileId: 'island-view-k' },

  // SISH003 — staging breach truck
  { id: 'KXR286MP', registration: 'KXR 286 MP', orderId: 'SISH003', driverId: 'drv-009', transporterId: 'lcs-logistics', status: 'staging', product: 'Iron Ore', ticket: 1683, mineWeighbridgeKg: 38440, mineLoadTime: hoursAgo(12), mineExitTime: hoursAgo(11), lionsArrivalTime: hoursAgo(7.5), stockpileId: 'island-view-r' },

  // KOLA004 — Iron Ore (Kolomela, Reinhardt)
  { id: 'KLM783NC', registration: 'KLM 783 NC', orderId: 'KOLA004', driverId: 'drv-018', transporterId: 'reinhardt', status: 'staging', product: 'Iron Ore', ticket: 1700, mineWeighbridgeKg: 38180, mineLoadTime: hoursAgo(11), mineExitTime: hoursAgo(9.5), lionsArrivalTime: hoursAgo(3), stockpileId: 'island-view-n-o' },
  { id: 'KLX291NC', registration: 'KLX 291 NC', orderId: 'KOLA004', driverId: 'drv-018', transporterId: 'reinhardt', status: 'completed', product: 'Iron Ore', ticket: 1701, mineWeighbridgeKg: 38480, bcWeighbridgeKg: 38300, mineLoadTime: '2026-02-14T06:00:00Z', mineExitTime: '2026-02-14T07:45:00Z', lionsArrivalTime: '2026-02-14T17:30:00Z', lionsDepartureTime: '2026-02-14T18:00:00Z', bcArrivalTime: '2026-02-14T20:00:00Z', bcOffloadTime: '2026-02-14T21:15:00Z', bcExitTime: '2026-02-14T21:30:00Z', stockpileId: 'island-view-n-o', varianceKg: -180, variancePct: -0.47 },

  // MGKW005 — Manganese Ore (Mponeng, Westmead)
  { id: 'KGT562GP', registration: 'KGT 562 GP', orderId: 'MGKW005', driverId: 'drv-024', transporterId: 'westmead', status: 'in_transit_to_lions', product: 'Manganese Ore', ticket: 1710, mineWeighbridgeKg: 38520, mineLoadTime: hoursAgo(5), mineExitTime: hoursAgo(4), stockpileId: 'island-view-p' },
  { id: 'KGR891GP', registration: 'KGR 891 GP', orderId: 'MGKW005', driverId: 'drv-024', transporterId: 'westmead', status: 'completed', product: 'Manganese Ore', ticket: 1711, mineWeighbridgeKg: 38600, bcWeighbridgeKg: 38350, mineLoadTime: '2026-02-11T06:00:00Z', mineExitTime: '2026-02-11T08:00:00Z', lionsArrivalTime: '2026-02-11T18:00:00Z', lionsDepartureTime: '2026-02-11T18:30:00Z', bcArrivalTime: '2026-02-11T20:30:00Z', bcOffloadTime: '2026-02-11T21:45:00Z', bcExitTime: '2026-02-11T22:00:00Z', stockpileId: 'island-view-p', varianceKg: -250, variancePct: -0.65 },

  // Unallocated truck — critical alert
  { id: 'KYD896UA', registration: 'KYD 896 UA', orderId: '', driverId: '', transporterId: 'gj-farms', status: 'staging', product: 'Chrome', ticket: 0, mineWeighbridgeKg: 38700, mineLoadTime: hoursAgo(8), mineExitTime: hoursAgo(7), lionsArrivalTime: hoursAgo(2), stockpileId: undefined },

  // MDKW008 — Chrome (Modikwa, Third Gen) — at BC
  { id: 'LPB271LP', registration: 'LPB 271 LP', orderId: 'MDKW008', driverId: 'drv-021', transporterId: 'third-gen', status: 'at_bc', product: 'Chrome', ticket: 1720, mineWeighbridgeKg: 38800, bcWeighbridgeKg: 38600, mineLoadTime: hoursAgo(14), mineExitTime: hoursAgo(12.5), lionsArrivalTime: hoursAgo(6), lionsDepartureTime: hoursAgo(5), bcArrivalTime: hoursAgo(3), stockpileId: 'island-view-h', varianceKg: -200, variancePct: -0.52 },
  { id: 'LPK482LP', registration: 'LPK 482 LP', orderId: 'MDKW008', driverId: 'drv-021', transporterId: 'third-gen', status: 'completed', product: 'Chrome', ticket: 1721, mineWeighbridgeKg: 38760, bcWeighbridgeKg: 38540, mineLoadTime: '2026-02-13T06:00:00Z', mineExitTime: '2026-02-13T07:30:00Z', lionsArrivalTime: '2026-02-13T15:00:00Z', lionsDepartureTime: '2026-02-13T15:30:00Z', bcArrivalTime: '2026-02-13T17:30:00Z', bcOffloadTime: '2026-02-13T18:45:00Z', bcExitTime: '2026-02-13T19:00:00Z', stockpileId: 'island-view-h', varianceKg: -220, variancePct: -0.57 },

  // TWEE009 — Chrome (Two Rivers, Transmac) — convoy
  { id: 'LRK583LP', registration: 'LRK 583 LP', orderId: 'TWEE009', driverId: 'drv-022', transporterId: 'transmac', status: 'in_transit_to_bc', product: 'Chrome', ticket: 1730, mineWeighbridgeKg: 38920, mineLoadTime: hoursAgo(11), mineExitTime: hoursAgo(9.5), lionsArrivalTime: hoursAgo(3), lionsDepartureTime: hoursAgo(2), stockpileId: 'bluff-a-b' },
  { id: 'LRN761LP', registration: 'LRN 761 LP', orderId: 'TWEE009', driverId: 'drv-022', transporterId: 'transmac', status: 'in_transit_to_bc', product: 'Chrome', ticket: 1731, mineWeighbridgeKg: 38820, mineLoadTime: hoursAgo(11.5), mineExitTime: hoursAgo(10), lionsArrivalTime: hoursAgo(3.5), lionsDepartureTime: hoursAgo(2), stockpileId: 'bluff-a-b' },

  // MARK010 — Chrome (Marikana, Assegal) — in transit
  { id: 'KWJ334NW', registration: 'KWJ 334 NW', orderId: 'MARK010', driverId: 'drv-003', transporterId: 'assegal', status: 'in_transit_to_lions', product: 'Chrome', ticket: 1740, mineWeighbridgeKg: 38900, mineLoadTime: hoursAgo(4), mineExitTime: hoursAgo(3), stockpileId: 'yard-d-i' },
  { id: 'KWM891NW', registration: 'KWM 891 NW', orderId: 'MARK010', driverId: 'drv-004', transporterId: 'assegal', status: 'completed', product: 'Chrome', ticket: 1741, mineWeighbridgeKg: 38760, bcWeighbridgeKg: 38530, mineLoadTime: '2026-02-14T06:00:00Z', mineExitTime: '2026-02-14T07:30:00Z', lionsArrivalTime: '2026-02-14T16:00:00Z', lionsDepartureTime: '2026-02-14T16:30:00Z', bcArrivalTime: '2026-02-14T18:30:00Z', bcOffloadTime: '2026-02-14T19:45:00Z', bcExitTime: '2026-02-14T20:00:00Z', stockpileId: 'yard-d-i', varianceKg: -230, variancePct: -0.59 },

  // KHUT012 — Thermal Coal (Khutala, Winberg)
  { id: 'KMP221MP', registration: 'KMP 221 MP', orderId: 'KHUT012', driverId: 'drv-025', transporterId: 'winberg', status: 'in_transit_to_lions', product: 'Thermal Coal', ticket: 1750, mineWeighbridgeKg: 38660, mineLoadTime: hoursAgo(3), mineExitTime: hoursAgo(2), stockpileId: 'island-view-j' },
  { id: 'KMP443MP', registration: 'KMP 443 MP', orderId: 'KHUT012', driverId: 'drv-025', transporterId: 'winberg', status: 'staging', product: 'Thermal Coal', ticket: 1751, mineWeighbridgeKg: 37260, mineLoadTime: hoursAgo(9), mineExitTime: hoursAgo(8), lionsArrivalTime: hoursAgo(2), stockpileId: 'island-view-j' },

  // NVAA013 — Thermal Coal (New Vaal, Zen Holdings)
  { id: 'KFS762FS', registration: 'KFS 762 FS', orderId: 'NVAA013', driverId: 'drv-026', transporterId: 'zen-holdings', status: 'loading', product: 'Thermal Coal', ticket: 1760, mineWeighbridgeKg: 38580, mineLoadTime: hoursAgo(1.5), stockpileId: 'island-view-r' },

  // DRIF015 — Vanadium (Driefontein, VDM)
  { id: 'KGP481GP', registration: 'KGP 481 GP', orderId: 'DRIF015', driverId: 'drv-023', transporterId: 'vdm', status: 'in_transit_to_lions', product: 'Vanadium', ticket: 1770, mineWeighbridgeKg: 38980, mineLoadTime: hoursAgo(5), mineExitTime: hoursAgo(4), stockpileId: 'yard-n-island-s' },

  // SDEP016 — Vanadium (South Deep, Leeuspruit) — delayed order
  { id: 'KGD223GP', registration: 'KGD 223 GP', orderId: 'SDEP016', driverId: 'drv-011', transporterId: 'leeuspruit', status: 'staging', product: 'Vanadium', ticket: 1780, mineWeighbridgeKg: 37100, mineLoadTime: hoursAgo(15), mineExitTime: hoursAgo(13), lionsArrivalTime: hoursAgo(5), stockpileId: 'island-view-e' },

  // MOGK017 — Chrome (Mogalakwena, Parsons)
  { id: 'LPT928LP', registration: 'LPT 928 LP', orderId: 'MOGK017', driverId: 'drv-016', transporterId: 'parsons', status: 'loading', product: 'Chrome', ticket: 1790, mineWeighbridgeKg: 38960, mineLoadTime: hoursAgo(1), stockpileId: 'island-view-e' },
  { id: 'LPR671LP', registration: 'LPR 671 LP', orderId: 'MOGK017', driverId: 'drv-016', transporterId: 'parsons', status: 'dispatched', product: 'Chrome', ticket: 1791, mineWeighbridgeKg: 0, stockpileId: 'island-view-e' },

  // KLOF019 — Manganese Ore (Kloof, RS Regal)
  { id: 'KGM892GP', registration: 'KGM 892 GP', orderId: 'KLOF019', driverId: 'drv-019', transporterId: 'rs-regal', status: 'in_transit_to_bc', product: 'Manganese Ore', ticket: 1800, mineWeighbridgeKg: 38540, mineLoadTime: hoursAgo(10), mineExitTime: hoursAgo(8.5), lionsArrivalTime: hoursAgo(2.5), lionsDepartureTime: hoursAgo(2), stockpileId: 'island-view-p' },

  // BARB020 — Chrome (Barberton, Sekusile) — at BC
  { id: 'KMP193MP', registration: 'KMP 193 MP', orderId: 'BARB020', driverId: 'drv-020', transporterId: 'sekusile', status: 'at_bc', product: 'Chrome', ticket: 1810, mineWeighbridgeKg: 38700, bcWeighbridgeKg: 38450, mineLoadTime: hoursAgo(13), mineExitTime: hoursAgo(11.5), lionsArrivalTime: hoursAgo(5), lionsDepartureTime: hoursAgo(4.5), bcArrivalTime: hoursAgo(2.5), stockpileId: 'island-view-k', varianceKg: -250, variancePct: -0.65 },

  // IMPA021 — Chrome (Impala Rustenburg, GJ Farms) — staging
  { id: 'KWN441NW', registration: 'KWN 441 NW', orderId: 'IMPA021', driverId: 'drv-008', transporterId: 'gj-farms', status: 'staging', product: 'Chrome', ticket: 1820, mineWeighbridgeKg: 38800, mineLoadTime: hoursAgo(10), mineExitTime: hoursAgo(8.5), lionsArrivalTime: hoursAgo(2), stockpileId: 'island-view-e' },

  // GROO022 — Thermal Coal (Grootegeluk, Amadwala) — convoy
  { id: 'KYD521MP', registration: 'KYD 521 MP', orderId: 'GROO022', driverId: 'drv-001', transporterId: 'amadwala', status: 'in_transit_to_bc', product: 'Thermal Coal', ticket: 1830, mineWeighbridgeKg: 38760, mineLoadTime: hoursAgo(12), mineExitTime: hoursAgo(10.5), lionsArrivalTime: hoursAgo(4), lionsDepartureTime: hoursAgo(3), stockpileId: 'yard-k-l' },
  { id: 'LKZ119MP', registration: 'LKZ 119 MP', orderId: 'GROO022', driverId: 'drv-028', transporterId: 'amadwala', status: 'completed', product: 'Thermal Coal', ticket: 1831, mineWeighbridgeKg: 38920, bcWeighbridgeKg: 38700, mineLoadTime: '2026-02-12T06:00:00Z', mineExitTime: '2026-02-12T07:45:00Z', lionsArrivalTime: '2026-02-12T16:00:00Z', lionsDepartureTime: '2026-02-12T16:30:00Z', bcArrivalTime: '2026-02-12T18:30:00Z', bcOffloadTime: '2026-02-12T19:45:00Z', bcExitTime: '2026-02-12T20:00:00Z', stockpileId: 'yard-k-l', varianceKg: -220, variancePct: -0.57 },

  // MPNG024 — Chrome (Mogalakwena, Macdonalds) — in transit
  { id: 'LPG382LP', registration: 'LPG 382 LP', orderId: 'MPNG024', driverId: 'drv-012', transporterId: 'macdonalds', status: 'staging', product: 'Chrome', ticket: 1840, mineWeighbridgeKg: 38660, mineLoadTime: hoursAgo(11), mineExitTime: hoursAgo(9.5), lionsArrivalTime: hoursAgo(3), stockpileId: 'island-view-n-o' },
  { id: 'LPH291LP', registration: 'LPH 291 LP', orderId: 'MPNG024', driverId: 'drv-013', transporterId: 'macdonalds', status: 'in_transit_to_lions', product: 'Chrome', ticket: 1841, mineWeighbridgeKg: 37100, mineLoadTime: hoursAgo(4), mineExitTime: hoursAgo(3), stockpileId: 'island-view-n-o' },

  // MARK025 — Chrome (Marikana, Third Gen) — loading
  { id: 'KWP193NW', registration: 'KWP 193 NW', orderId: 'MARK025', driverId: 'drv-021', transporterId: 'third-gen', status: 'loading', product: 'Chrome', ticket: 1850, mineWeighbridgeKg: 38580, mineLoadTime: hoursAgo(1.5), stockpileId: 'island-view-r' },

  // TWEE026 — Chrome (Two Rivers, Transmac) — in transit
  { id: 'LRT448LP', registration: 'LRT 448 LP', orderId: 'TWEE026', driverId: 'drv-022', transporterId: 'transmac', status: 'in_transit_to_lions', product: 'Chrome', ticket: 1860, mineWeighbridgeKg: 38480, mineLoadTime: hoursAgo(3), mineExitTime: hoursAgo(2), stockpileId: 'island-view-k' },

  // MODI027 — Chrome (Modikwa, Reinhardt) — convoy
  { id: 'LPN572LP', registration: 'LPN 572 LP', orderId: 'MODI027', driverId: 'drv-018', transporterId: 'reinhardt', status: 'in_transit_to_bc', product: 'Chrome', ticket: 1870, mineWeighbridgeKg: 38520, mineLoadTime: hoursAgo(10.5), mineExitTime: hoursAgo(9), lionsArrivalTime: hoursAgo(3), lionsDepartureTime: hoursAgo(2.5), stockpileId: 'bluff-a-b' },

  // SISH029 — Iron Ore (Sishen, Winberg) — delayed
  { id: 'KWD442NC', registration: 'KWD 442 NC', orderId: 'SISH029', driverId: 'drv-025', transporterId: 'winberg', status: 'in_transit_to_lions', product: 'Iron Ore', ticket: 1880, mineWeighbridgeKg: 38600, mineLoadTime: hoursAgo(5), mineExitTime: hoursAgo(4), stockpileId: 'yard-k-l' },

  // GOED030 — Met Coal (Goedgevonden, Leeuspruit)
  { id: 'KMP821MP', registration: 'KMP 821 MP', orderId: 'GOED030', driverId: 'drv-011', transporterId: 'leeuspruit', status: 'staging', product: 'Metallurgical Coal', ticket: 1890, mineWeighbridgeKg: 38180, mineLoadTime: hoursAgo(10), mineExitTime: hoursAgo(9), lionsArrivalTime: hoursAgo(2.5), stockpileId: 'island-view-j' },

  // LEEW031 — Thermal Coal (Leeuwpan, Pindulo) — at BC
  { id: 'KMR562MP', registration: 'KMR 562 MP', orderId: 'LEEW031', driverId: 'drv-017', transporterId: 'pindulo', status: 'at_bc', product: 'Thermal Coal', ticket: 1900, mineWeighbridgeKg: 38760, bcWeighbridgeKg: 38500, mineLoadTime: hoursAgo(13), mineExitTime: hoursAgo(11.5), lionsArrivalTime: hoursAgo(5.5), lionsDepartureTime: hoursAgo(5), bcArrivalTime: hoursAgo(3), stockpileId: 'island-view-e', varianceKg: -260, variancePct: -0.67 },

  // NVAA032 — Manganese Ore (New Vaal, NWB)
  { id: 'KFS993FS', registration: 'KFS 993 FS', orderId: 'NVAA032', driverId: 'drv-015', transporterId: 'nwb-carriers', status: 'loading', product: 'Manganese Ore', ticket: 1910, mineWeighbridgeKg: 36880, mineLoadTime: hoursAgo(1), stockpileId: 'island-view-p' },

  // THAB034 — Iron Ore (Thabazimbi, Sekusile)
  { id: 'LPZ771LP', registration: 'LPZ 771 LP', orderId: 'THAB034', driverId: 'drv-020', transporterId: 'sekusile', status: 'in_transit_to_lions', product: 'Iron Ore', ticket: 1920, mineWeighbridgeKg: 36720, mineLoadTime: hoursAgo(4.5), mineExitTime: hoursAgo(3.5), stockpileId: 'island-view-n-o' },

  // Additional completed trucks for volume
  { id: 'KYD111MP', registration: 'KYD 111 MP', orderId: 'ASAC001', driverId: 'drv-002', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1640, mineWeighbridgeKg: 39320, bcWeighbridgeKg: 39100, mineLoadTime: '2026-01-26T06:30:00Z', mineExitTime: '2026-01-26T08:15:00Z', lionsArrivalTime: '2026-01-26T16:30:00Z', lionsDepartureTime: '2026-01-26T17:00:00Z', bcArrivalTime: '2026-01-26T19:00:00Z', bcOffloadTime: '2026-01-26T20:15:00Z', bcExitTime: '2026-01-26T20:30:00Z', stockpileId: 'island-view-e', varianceKg: -220, variancePct: -0.56 },
  { id: 'KYD222MP', registration: 'KYD 222 MP', orderId: 'ASAC001', driverId: 'drv-028', transporterId: 'amadwala', status: 'completed', product: 'Chrome', ticket: 1641, mineWeighbridgeKg: 37340, bcWeighbridgeKg: 37120, mineLoadTime: '2026-01-26T07:00:00Z', mineExitTime: '2026-01-26T08:45:00Z', lionsArrivalTime: '2026-01-26T17:00:00Z', lionsDepartureTime: '2026-01-26T17:30:00Z', bcArrivalTime: '2026-01-26T19:30:00Z', bcOffloadTime: '2026-01-26T20:45:00Z', bcExitTime: '2026-01-26T21:00:00Z', stockpileId: 'island-view-e', varianceKg: -220, variancePct: -0.59 },
  { id: 'KYD333MP', registration: 'KYD 333 MP', orderId: 'BRKV007', driverId: 'drv-012', transporterId: 'macdonalds', status: 'completed', product: 'Manganese Ore', ticket: 1650, mineWeighbridgeKg: 39100, bcWeighbridgeKg: 38880, mineLoadTime: '2026-01-20T06:00:00Z', mineExitTime: '2026-01-20T07:30:00Z', lionsArrivalTime: '2026-01-20T15:00:00Z', lionsDepartureTime: '2026-01-20T15:30:00Z', bcArrivalTime: '2026-01-20T17:30:00Z', bcOffloadTime: '2026-01-20T18:45:00Z', bcExitTime: '2026-01-20T19:00:00Z', stockpileId: 'yard-n-island-s', varianceKg: -220, variancePct: -0.56 },
  { id: 'KYD444MP', registration: 'KYD 444 MP', orderId: 'BRKV007', driverId: 'drv-013', transporterId: 'macdonalds', status: 'completed', product: 'Manganese Ore', ticket: 1651, mineWeighbridgeKg: 37400, bcWeighbridgeKg: 37180, mineLoadTime: '2026-01-20T06:30:00Z', mineExitTime: '2026-01-20T08:00:00Z', lionsArrivalTime: '2026-01-20T15:30:00Z', lionsDepartureTime: '2026-01-20T16:00:00Z', bcArrivalTime: '2026-01-20T18:00:00Z', bcOffloadTime: '2026-01-20T19:15:00Z', bcExitTime: '2026-01-20T19:30:00Z', stockpileId: 'yard-n-island-s', varianceKg: -220, variancePct: -0.59 },
  { id: 'KYD555MP', registration: 'KYD 555 MP', orderId: 'MPON023', driverId: 'drv-027', transporterId: 'zjg', status: 'completed', product: 'Manganese Ore', ticket: 1660, mineWeighbridgeKg: 38100, bcWeighbridgeKg: 37880, mineLoadTime: '2026-01-28T06:00:00Z', mineExitTime: '2026-01-28T08:00:00Z', lionsArrivalTime: '2026-01-28T18:00:00Z', lionsDepartureTime: '2026-01-28T18:30:00Z', bcArrivalTime: '2026-01-28T20:30:00Z', bcOffloadTime: '2026-01-28T21:45:00Z', bcExitTime: '2026-01-28T22:00:00Z', stockpileId: 'yard-n-island-s', varianceKg: -220, variancePct: -0.58 },
  { id: 'KYD666MP', registration: 'KYD 666 MP', orderId: 'THAB014', driverId: 'drv-014', transporterId: 'mg-jacobs', status: 'completed', product: 'Iron Ore', ticket: 1661, mineWeighbridgeKg: 38500, bcWeighbridgeKg: 38280, mineLoadTime: '2026-01-22T06:00:00Z', mineExitTime: '2026-01-22T07:45:00Z', lionsArrivalTime: '2026-01-22T16:00:00Z', lionsDepartureTime: '2026-01-22T16:30:00Z', bcArrivalTime: '2026-01-22T18:30:00Z', bcOffloadTime: '2026-01-22T19:45:00Z', bcExitTime: '2026-01-22T20:00:00Z', stockpileId: 'yard-k-l', varianceKg: -220, variancePct: -0.57 },
];
