import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
}

export function parseAmount(amountStr: any): number {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = String(amountStr).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
