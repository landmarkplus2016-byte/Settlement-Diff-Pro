import * as XLSX from 'xlsx';

export interface SettlementRow {
  neg: string;
  amount: number;
  cluster: string;
  siteId: string;
  source: 'petty-cash' | 'settlement';
}

export interface ComparisonResult {
  neg: string;
  cluster: string;
  siteId: string;
  pettyCashAmount: number;
  settlementAmount: number;
  difference: number;
  status: 'match' | 'mismatch' | 'missing-in-settlement' | 'missing-in-petty-cash';
}

export const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get all rows as array of arrays to find the header
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        // Find the header row by looking for a row that contains at least 3 of our key columns
        const targetHeaders = ['neg', 'amount', 'cluster', 'mission', 'site id'];
        let headerRowIndex = -1;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          let matchCount = 0;
          row.forEach(cell => {
            if (typeof cell === 'string') {
              const normalized = cell.toLowerCase().trim();
              if (targetHeaders.some(target => normalized.includes(target))) {
                matchCount++;
              }
            }
          });
          
          // If we find a row with 3 or more matches, it's likely our header
          if (matchCount >= 3) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          // Fallback to default if no header found
          resolve(XLSX.utils.sheet_to_json(worksheet));
          return;
        }
        
        // Convert to JSON using the found header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const processSettlements = (pettyCashData: any[], settlementData: any[]): ComparisonResult[] => {
  const pettyCashMap = new Map<string, { amount: number; originalRow: any }>();
  const settlementMap = new Map<string, { amount: number; originalRow: any }>();

  // Helper to find a value by flexible key matching
  const findVal = (row: any, keys: string[]) => {
    const foundKey = Object.keys(row).find(k => 
      keys.some(key => {
        const normalizedK = k.toLowerCase().replace(/[.\s]/g, '');
        const normalizedTarget = key.toLowerCase().replace(/[.\s]/g, '');
        return normalizedK === normalizedTarget;
      })
    );
    return foundKey ? row[foundKey] : null;
  };

  // Helper to normalize keys for comparison
  const getRowKey = (row: any) => {
    // Remove all spaces for the comparison key to handle "Amin El Gendy" vs "Amin ElGendy"
    const neg = String(findVal(row, ['Neg']) || '').trim().replace(/\s+/g, '');
    // Look for either Cluster or Mission in both files
    const cluster = String(findVal(row, ['Cluster', 'Mission']) || '').trim().replace(/\s+/g, '');
    const siteId = String(findVal(row, ['Site ID', 'SiteID']) || '').trim().replace(/\s+/g, '');
    
    // If all key fields are empty, return null to ignore this row
    if (!neg && !cluster && !siteId) return null;
    
    return `${neg}|${cluster}|${siteId}`.toLowerCase();
  };

  // Helper to parse amount (handle "EGP 1,000" or just "1000")
  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove currency symbols, commas, and spaces
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  pettyCashData.forEach(row => {
    const key = getRowKey(row);
    if (key) {
      const amount = parseAmount(findVal(row, ['Amount']));
      const existing = pettyCashMap.get(key) || { amount: 0, originalRow: row };
      pettyCashMap.set(key, { 
        amount: existing.amount + amount, 
        originalRow: existing.originalRow // Keep the first one for display
      });
    }
  });

  settlementData.forEach(row => {
    const key = getRowKey(row);
    if (key) {
      const amount = parseAmount(findVal(row, ['Amount']));
      const existing = settlementMap.get(key) || { amount: 0, originalRow: row };
      settlementMap.set(key, { 
        amount: existing.amount + amount, 
        originalRow: existing.originalRow // Keep the first one for display
      });
    }
  });

  const allKeys = new Set([...pettyCashMap.keys(), ...settlementMap.keys()]);
  const results: ComparisonResult[] = [];

  allKeys.forEach(key => {
    const pcData = pettyCashMap.get(key);
    const sData = settlementMap.get(key);

    const pcAmount = pcData ? pcData.amount : 0;
    const sAmount = sData ? sData.amount : 0;
    
    const [neg, cluster, siteId] = key.split('|');
    const displayRow = pcData?.originalRow || sData?.originalRow;

    let status: ComparisonResult['status'] = 'match';
    if (!pcData) status = 'missing-in-petty-cash';
    else if (!sData) status = 'missing-in-settlement';
    else if (Math.abs(pcAmount - sAmount) > 0.01) status = 'mismatch';

    results.push({
      neg: String(findVal(displayRow, ['Neg']) || neg),
      cluster: String(findVal(displayRow, ['Cluster', 'Mission']) || cluster),
      siteId: String(findVal(displayRow, ['Site ID']) || siteId),
      pettyCashAmount: pcAmount,
      settlementAmount: sAmount,
      difference: sAmount - pcAmount,
      status
    });
  });

  return results;
};
