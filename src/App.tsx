/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/Table';
import { parseExcelFile, processSettlements, ComparisonResult } from './lib/excel-utils';
import { Calculator, Download, RefreshCw, Search, PlusCircle, FileCode } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [pettyCashData, setPettyCashData] = useState<any[] | null>(null);
  const [settlementData, setSettlementData] = useState<any[] | null>(null);
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handlePettyCashSelect = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      setPettyCashData(data);
      toast.success('Petty Cash file loaded successfully');
    } catch (error) {
      toast.error('Error parsing Petty Cash file');
      console.error(error);
    }
  };

  const handleSettlementSelect = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      setSettlementData(data);
      toast.success('Settlement file loaded successfully');
    } catch (error) {
      toast.error('Error parsing Settlement file');
      console.error(error);
    }
  };

  const runAnalysis = () => {
    if (!pettyCashData || !settlementData) {
      toast.error('Please upload both files first');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const comparisonResults = processSettlements(pettyCashData, settlementData);
      setResults(comparisonResults);
      setIsProcessing(false);
      toast.success('Analysis complete!');
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

  const exportStandalone = async () => {
    try {
      const response = await fetch('/standalone.html');
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SettlementDiffPro_Standalone.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Standalone HTML exported! You can open this file anywhere.');
    } catch (error) {
      toast.error('Failed to export standalone version');
      console.error(error);
    }
  };

  const reset = () => {
    setPettyCashData(null);
    setSettlementData(null);
    setResults(null);
    setSearchTerm('');
  };

  const filteredResults = results?.filter(r => 
    r.neg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.siteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cluster.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = results ? {
    total: results.length,
    matches: results.filter(r => r.status === 'match').length,
    mismatches: results.filter(r => r.status === 'mismatch').length,
    missing: results.filter(r => r.status.startsWith('missing')).length,
    totalDiff: results.reduce((acc, r) => acc + r.difference, 0)
  } : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 font-sans text-zinc-900 dark:text-zinc-50">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 dark:bg-zinc-50 p-3 rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none">
              <Calculator className="w-7 h-7 text-zinc-50 dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Settlement Diff Pro
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Automated reconciliation for petty-cash and settlement records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <Button onClick={handleInstall} variant="outline" className="gap-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-900">
                <PlusCircle className="w-4 h-4" /> Install App
              </Button>
            )}
            <Button variant="outline" onClick={exportStandalone} className="gap-2">
              <FileCode className="w-4 h-4" /> Export Standalone
            </Button>
            {results && (
              <>
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Reset
                </Button>
                <Button onClick={downloadResults} className="gap-2 shadow-sm">
                  <Download className="w-4 h-4" /> Export Excel
                </Button>
              </>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">1. Petty Cash File</CardTitle>
                  <CardDescription>Upload the source petty cash excel sheet</CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload 
                    label="Petty Cash Sheet" 
                    onFileSelect={handlePettyCashSelect} 
                    accept=".xlsx, .xls"
                  />
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">2. Settlement File</CardTitle>
                  <CardDescription>Upload the target settlement excel sheet</CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload 
                    label="Settlement Sheet" 
                    onFileSelect={handleSettlementSelect} 
                    accept=".xlsx, .xls"
                  />
                </CardContent>
              </Card>

              <div className="md:col-span-2 flex justify-center pt-4">
                <Button 
                  size="lg" 
                  className="w-full md:w-64 h-14 text-lg font-semibold shadow-xl"
                  disabled={!pettyCashData || !settlementData || isProcessing}
                  onClick={runAnalysis}
                >
                  {isProcessing ? (
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Calculator className="w-5 h-5 mr-2" />
                  )}
                  Run Analysis
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Rows</span>
                  <span className="text-2xl font-bold">{stats?.total}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Matches</span>
                  <span className="text-2xl font-bold text-emerald-600">{stats?.matches}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Mismatches</span>
                  <span className="text-2xl font-bold text-amber-600">{stats?.mismatches}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Missing</span>
                  <span className="text-2xl font-bold text-red-600">{stats?.missing}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                  <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Total Diff</span>
                  <span className="text-2xl font-bold">EGP {stats?.totalDiff.toLocaleString()}</span>
                </Card>
              </div>

              {/* Results Table */}
              <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <CardTitle className="text-xl">Analysis Results</CardTitle>
                    <CardDescription>Comparison based on Neg, Cluster/Mission, and Site ID</CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      placeholder="Search by Neg, Site ID or Cluster..."
                      className="pl-10 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/50 dark:border-zinc-800 px-3 py-1 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-zinc-50/5"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-zinc-50/50 dark:bg-zinc-950/50">
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
                          <TableRow key={i} className="group">
                            <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{row.neg}</TableCell>
                            <TableCell className="text-zinc-600 dark:text-zinc-400">{row.cluster}</TableCell>
                            <TableCell>
                              <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
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
                              {row.status === 'match' && (
                                <Badge variant="success" className="h-6 px-3">
                                  Match
                                </Badge>
                              )}
                              {row.status === 'mismatch' && (
                                <Badge variant="destructive" className="h-6 px-3">
                                  Mismatch
                                </Badge>
                              )}
                              {row.status === 'missing-in-settlement' && (
                                <Badge variant="secondary" className="h-6 px-3 opacity-70">
                                  No Settlement
                                </Badge>
                              )}
                              {row.status === 'missing-in-petty-cash' && (
                                <Badge variant="secondary" className="h-6 px-3 opacity-70">
                                  No Petty Cash
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredResults?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-zinc-500 italic">
                              No matching records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
