import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompareArrows } from 'lucide-react';
import { useCompare } from '@/contexts/CompareContext';

export default function CompareBar() {
  const navigate = useNavigate();
  const { compareList } = useCompare();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLengthRef = useRef(compareList.length);

  useEffect(() => {
    // Show bar when compareList changes (item added/removed)
    if (compareList.length > 0 && compareList.length !== prevLengthRef.current) {
      setVisible(true);
      // Clear existing timer
      if (timerRef.current) clearTimeout(timerRef.current);
      // Auto-hide after 3 seconds
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    } else if (compareList.length === 0) {
      setVisible(false);
    }
    prevLengthRef.current = compareList.length;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [compareList.length]);

  // Also show briefly on first render if items exist
  useEffect(() => {
    if (compareList.length > 0) {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (compareList.length === 0) return null;

  return (
    <div
      className={`fixed bottom-[70px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-40px)] max-w-[360px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <button
        onClick={() => navigate('/compare')}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 text-white rounded-[14px] shadow-lg shadow-indigo-300 touch-active"
      >
        <div className="flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4" />
          <span className="text-[13px] font-semibold">비교함</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {compareList.map(inst => (
              <img
                key={inst.id}
                src={inst.image}
                alt={inst.name}
                className="w-6 h-6 rounded-full border-2 border-indigo-600 object-cover"
              />
            ))}
          </div>
          <span className="text-[12px] bg-white/20 px-2 py-[2px] rounded-full font-bold">
            {compareList.length}/3
          </span>
        </div>
      </button>
    </div>
  );
}