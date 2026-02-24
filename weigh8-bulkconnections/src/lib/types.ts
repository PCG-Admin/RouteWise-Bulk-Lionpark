// Common types for reports

export interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ProductType {
  id: string;
  name: string;
  category?: string;
}

export interface Driver {
  id: string;
  name: string;
  status?: string;
  trips?: number;
  onTimePct?: number;
}

export interface Transporter {
  id: string;
  name: string;
  activeFleet?: number;
  onTimePct?: number;
  avgTurnaround?: number;
}

export interface Vessel {
  id: string;
  name: string;
  capacity?: number;
  loaded?: number;
  status?: string;
  eta?: string;
}

export interface StockpileAuditEntry {
  id: string;
  timestamp: string;
  stockpileName: string;
  operation: 'addition' | 'removal' | 'adjustment';
  quantity: number;
  product: string;
  user: string;
  notes?: string;
}
