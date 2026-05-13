import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Institution } from '@/lib/supabase';

interface CompareContextType {
  compareList: Institution[];
  addToCompare: (inst: Institution) => boolean;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const STORAGE_KEY = 'dreamkids_compare';
const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<Institution[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = (inst: Institution): boolean => {
    if (compareList.length >= MAX_COMPARE) return false;
    if (compareList.find(i => i.id === inst.id)) return false;
    setCompareList(prev => [...prev, inst]);
    return true;
  };

  const removeFromCompare = (id: string) => {
    setCompareList(prev => prev.filter(i => i.id !== id));
  };

  const clearCompare = () => setCompareList([]);

  const isInCompare = (id: string) => compareList.some(i => i.id === id);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within CompareProvider');
  return context;
}