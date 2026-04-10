import React, { useState, useRef } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { cn } from '@/src/lib/utils';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, accept, className }) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      simulateUpload(selectedFile);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all flex flex-col items-center justify-center gap-4",
          file ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        )}
      >
        {!file ? (
          <>
            <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Upload className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-zinc-500 mt-1">Excel files only (.xlsx, .xls)</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="mt-2"
            >
              Select File
            </Button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="w-4 h-4" />
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
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept={accept}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
