import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Upload, 
  FileCheck, 
  X, 
  RefreshCw, 
  Download, 
  Search,
  PlusCircle,
  FileCode
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Utility ---
function cn(...inputs: (string | boolean | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

// --- UI Components ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants: Record<string, string> = {
      default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90",
      destructive: "bg-red-500 text-zinc-50 hover:bg-red-500/90",
      outline: "border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900",
      secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80",
      ghost: "hover:bg-zinc-100 hover:text-zinc-900",
      link: "text-zinc-900 underline-offset-4 hover:underline",
    };
    const sizes: Record<string, string> = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-sm", className)} {...props} />
);
const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />;
const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className={cn("text-sm text-zinc-500", className)} {...props} />;
const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("p-6 pt-0", className)} {...props} />;

const Badge = ({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) => {
  const variants: Record<string, string> = {
    default: "border-transparent bg-zinc-900 text-zinc-50",
    secondary: "border-transparent bg-zinc-100 text-zinc-900",
    destructive: "border-transparent bg-red-500 text-zinc-50",
    outline: "text-zinc-950",
    success: "border-transparent bg-emerald-500 text-zinc-50",
  };
  return (
    <div className={cn("inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)} {...props} />
  );
};

const Progress = ({ className, value, ...props }: React.HTMLAttributes<HTMLDivElement> & { value?: number }) => (
  <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-zinc-100", className)} {...props}>
    <div className="h-full bg-zinc-900 transition-all" style={{ width: `${value || 0}%` }} />
  </div>
);

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => <div className="relative w-full overflow-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>;
const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn("[&_tr]:border-b", className)} {...props} />;
const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn("border-b transition-colors hover:bg-zinc-100/50", className)} {...props} />;
const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => <th className={cn("h-12 px-4 text-left align-middle font-medium text-zinc-500", className)} {...props} />;
const TableCell = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => <td className={cn("p-4 align-middle", className)} {...props} />;

// --- Excel Utils ---
const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        const targetHeaders = ['neg', 'amount', 'cluster', 'mission', 'site id'];
        let headerRowIndex = -1;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          let matchCount = 0;
          row.forEach(cell => {
            if (typeof cell === 'string') {
              const normalized = cell.toLowerCase().trim();
              if (targetHeaders.some(target => normalized.includes(target))) matchCount++;
            }
          });
          if (matchCount >= 3) {
            headerRowIndex = i;
            break;
          }
        }
        
        const jsonData = headerRowIndex === -1 
          ? XLSX.utils.sheet_to_json(worksheet)
          : XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        resolve(jsonData as any[]);
      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

const processSettlements = (pettyCashData: any[], settlementData: any[]) => {
  const pettyCashMap = new Map();
  const settlementMap = new Map();

  const findVal = (row: any, keys: string[]) => {
    const foundKey = Object.keys(row).find(k => 
      keys.some(key => k.toLowerCase().replace(/[.\s]/g, '') === key.toLowerCase().replace(/[.\s]/g, ''))
    );
    return foundKey ? row[foundKey] : null;
  };

  const getRowKey = (row: any) => {
    const neg = String(findVal(row, ['Neg']) || '').trim().replace(/\s+/g, '');
    const cluster = String(findVal(row, ['Cluster', 'Mission']) || '').trim().replace(/\s+/g, '');
    const siteId = String(findVal(row, ['Site ID', 'SiteID']) || '').trim().replace(/\s+/g, '');
    if (!neg && !cluster && !siteId) return null;
    return `${neg}|${cluster}|${siteId}`.toLowerCase();
  };

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  pettyCashData.forEach(row => {
    const key = getRowKey(row);
    if (key) {
      const amount = parseAmount(findVal(row, ['Amount']));
      const existing = pettyCashMap.get(key) || { amount: 0, originalRow: row };
      pettyCashMap.set(key, { amount: existing.amount + amount, originalRow: existing.originalRow });
    }
  });

  settlementData.forEach(row => {
    const key = getRowKey(row);
    if (key) {
      const amount = parseAmount(findVal(row, ['Amount']));
      const existing = settlementMap.get(key) || { amount: 0, originalRow: row };
      settlementMap.set(key, { amount: existing.amount + amount, originalRow: existing.originalRow });
    }
  });

  const allKeys = new Set([...pettyCashMap.keys(), ...settlementMap.keys()]);
  const results: any[] = [];

  allKeys.forEach(key => {
    const pcData = pettyCashMap.get(key);
    const sData = settlementMap.get(key);
    const pcAmount = pcData ? pcData.amount : 0;
    const sAmount = sData ? sData.amount : 0;
    const [neg, cluster, siteId] = key.split('|');
    const displayRow = pcData?.originalRow || sData?.originalRow;

    let status = 'match';
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

// --- Components ---
const FileUpload = ({ label, onFileSelect, accept, className }: { label: string; onFileSelect: (file: File) => void; accept: string; className?: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) simulateUpload(selectedFile);
  };

  const simulateUpload = (selectedFile: File) => {
    setIsUploading(true);
    setProgress(0);
    setFile(selectedFile);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onFileSelect(selectedFile);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn("space-y-4", className)}>
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <div className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-all flex flex-col items-center justify-center gap-4",
        file ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
      )}>
        {!file ? (
          <>
            <div className="p-4 rounded-full bg-zinc-100">
              <Upload className="text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-zinc-500 mt-1">Excel files only (.xlsx, .xls)</p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mt-2">
              Select File
            </Button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileCheck className="text-emerald-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X size={16} />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>{isUploading ? 'Uploading...' : 'Complete'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleFileChange} />
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [pettyCashData, setPettyCashData] = useState<any[] | null>(null);
  const [settlementData, setSettlementData] = useState<any[] | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handlePettyCashSelect = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      setPettyCashData(data);
    } catch (error) {
      alert('Error parsing Petty Cash file');
      console.error(error);
    }
  };

  const handleSettlementSelect = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      setSettlementData(data);
    } catch (error) {
      alert('Error parsing Settlement file');
      console.error(error);
    }
  };

  const runAnalysis = () => {
    if (!pettyCashData || !settlementData) {
      alert('Please upload both files first');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const comparisonResults = processSettlements(pettyCashData, settlementData);
      setResults(comparisonResults);
      setIsProcessing(false);
    }, 800);
  };

  const downloadResults = () => {
    if (!results) return;
    const worksheet = XLSX.utils.json_to_sheet(results.map(r => ({
      'Neg.': r.neg,
      'Cluster/Mission': r.cluster,
      'Site ID': r.siteId,
      'Petty Cash Amount': r.pettyCashAmount,
      'Settlement Amount': r.settlementAmount,
      'Difference': r.difference,
      'Status': r.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison Results");
    XLSX.writeFile(workbook, "Settlement_Difference_Analysis.xlsx");
  };

  const exportStandalone = () => {
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SettlementDiffPro_Standalone.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setPettyCashData(null);
    setSettlementData(null);
    setResults(null);
    setSearchTerm('');
  };

  const filteredResults = results?.filter(r => 
    (r.neg || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.siteId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.cluster || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = results ? {
    total: results.length,
    matches: results.filter(r => r.status === 'match').length,
    mismatches: results.filter(r => r.status === 'mismatch').length,
    missing: results.filter(r => r.status.startsWith('missing')).length,
    totalDiff: results.reduce((acc, r) => acc + r.difference, 0)
  } : null;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 p-3 rounded-2xl shadow-lg shadow-zinc-200">
              <Calculator className="text-zinc-50" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Settlement Diff Pro
              </h1>
              <p className="text-zinc-500 text-sm">
                Automated reconciliation for petty-cash and settlement records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <Button onClick={handleInstall} variant="outline" className="gap-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white">
                <PlusCircle size={16} /> Install App
              </Button>
            )}
            {results && (
              <>
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RefreshCw size={16} /> Reset
                </Button>
                <Button onClick={downloadResults} className="gap-2 shadow-sm">
                  <Download size={16} /> Export Excel
                </Button>
              </>
            )}
          </div>
        </div>

        {!results ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Petty Cash File</CardTitle>
                <CardDescription>Upload the source petty cash excel sheet</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload label="Petty Cash Sheet" onFileSelect={handlePettyCashSelect} accept=".xlsx, .xls" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Settlement File</CardTitle>
                <CardDescription>Upload the target settlement excel sheet</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload label="Settlement Sheet" onFileSelect={handleSettlementSelect} accept=".xlsx, .xls" />
              </CardContent>
            </Card>

            <div className="md:col-span-2 flex justify-center pt-4">
              <Button 
                size="lg" 
                className="w-full md:w-64 h-14 text-lg font-semibold shadow-xl"
                disabled={!pettyCashData || !settlementData || isProcessing}
                onClick={runAnalysis}
              >
                {isProcessing ? <RefreshCw className="animate-spin mr-2" /> : <Calculator className="mr-2" />}
                Run Analysis
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Rows</span>
                <span className="text-2xl font-bold">{stats?.total}</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Matches</span>
                <span className="text-2xl font-bold text-emerald-600">{stats?.matches}</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Mismatches</span>
                <span className="text-2xl font-bold text-amber-600">{stats?.mismatches}</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Missing</span>
                <span className="text-2xl font-bold text-red-600">{stats?.missing}</span>
              </Card>
              <Card className="p-4 flex flex-col items-center justify-center text-center bg-zinc-900 text-white">
                <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Total Diff</span>
                <span className="text-2xl font-bold">EGP {stats?.totalDiff.toLocaleString()}</span>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100">
                <div>
                  <CardTitle className="text-xl">Analysis Results</CardTitle>
                  <CardDescription>Comparison based on Neg, Cluster/Mission, and Site ID</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Search size={16} className="text-zinc-400" />
                  </div>
                  <input
                    placeholder="Search by Neg, Site ID or Cluster..."
                    className="pl-10 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-1 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/50">
                        <TableHead className="w-[200px]">Neg.</TableHead>
                        <TableHead>Cluster/Mission</TableHead>
                        <TableHead>Site ID</TableHead>
                        <TableHead className="text-right">Petty Cash</TableHead>
                        <TableHead className="text-right">Settlement</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults?.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-zinc-900">{row.neg}</TableCell>
                          <TableCell className="text-zinc-600">{row.cluster}</TableCell>
                          <TableCell>
                            <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              {row.siteId}
                            </code>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.pettyCashAmount.toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.settlementAmount.toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-bold font-mono text-xs",
                            row.difference > 0 ? "text-emerald-600" : row.difference < 0 ? "text-red-600" : "text-zinc-400"
                          )}>
                            {row.difference > 0 ? '+' : ''}{row.difference.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.status === 'match' && <Badge variant="success">Match</Badge>}
                            {row.status === 'mismatch' && <Badge variant="destructive">Mismatch</Badge>}
                            {row.status === 'missing-in-settlement' && <Badge variant="secondary">No Settlement</Badge>}
                            {row.status === 'missing-in-petty-cash' && <Badge variant="secondary">No Petty Cash</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
