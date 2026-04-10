export interface SettlementRow {
  neg: string;
  amount: number;
  cluster: string;
  siteId: string;
  originalRow: any;
}

export interface ComparisonResult {
  neg: string;
  cluster: string;
  siteId: string;
  pettyCashAmount: number;
  settlementAmount: number;
  difference: number;
  status: 'match' | 'diff' | 'missing_settlement' | 'missing_petty_cash';
}
