import { useState } from 'react';
import { X, Calendar, Clock, Baby, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase, TABLES, logAdminAction } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  institutionName: string;
}

const TIME_SLOTS = ['오전 10:00', '오전 11:00', '오후 1:00', '오후 2:00', '오후 3:00', '오후 4:00'];

export default function ReservationModal({ isOpen, onClose, institutionId, institutionName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [childAge, setChildAge] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ description: '로그인이 필요합니다', variant: 'destructive' });
      return;
    }
    if (!date || !timeSlot || !childAge) {
      toast({ description: '날짜, 시간, 아이 연령을 모두 입력해주세요', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from(TABLES.reservations).insert({
        user_id: user.id,
        institution_id: institutionId,
        institution_name: institutionName,
        reservation_date: date,
        time_slot: timeSlot,
        child_age: childAge,
        memo,
        status: 'pending',
      });

      if (error) {
        toast({ description: '예약에 실패했습니다', variant: 'destructive' });
        return;
      }

      toast({ description: '상담 예약이 완료되었습니다! 📅' });
      onClose();
      setDate('');
      setTimeSlot('');
      setChildAge('');
      setMemo('');
    } finally {
      setIsLoading(false);
    }
  };

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-[24px] p-5 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-slate-800">상담 예약하기</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="bg-indigo-50 rounded-[12px] px-3 py-2 mb-4">
          <p className="text-[12px] text-indigo-700 font-medium">📍 {institutionName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-[6px] uppercase tracking-wide">
              <Calendar className="w-3 h-3" /> 상담 날짜 *
            </label>
            <Input
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[12px] h-[44px] text-[13px]"
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-[6px] uppercase tracking-wide">
              <Clock className="w-3 h-3" /> 시간대 *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`py-[8px] rounded-[10px] text-[11px] font-medium transition-all touch-active ${
                    timeSlot === slot
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Child Age */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-[6px] uppercase tracking-wide">
              <Baby className="w-3 h-3" /> 아이 연령 *
            </label>
            <select
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              className="w-full rounded-[12px] border border-slate-200 px-3 py-[10px] text-[13px] h-[44px]"
            >
              <option value="">선택해주세요</option>
              <option value="만 2세">만 2세</option>
              <option value="만 3세">만 3세</option>
              <option value="만 4세">만 4세</option>
              <option value="만 5세">만 5세</option>
              <option value="만 6세">만 6세</option>
              <option value="만 7세">만 7세</option>
            </select>
          </div>

          {/* Memo */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-[6px] uppercase tracking-wide">
              <FileText className="w-3 h-3" /> 메모 (선택)
            </label>
            <Textarea
              placeholder="궁금한 점이나 요청사항을 적어주세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="rounded-[12px] text-[13px] min-h-[60px]"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[48px] rounded-[14px] bg-indigo-600 text-white text-[14px] font-semibold shadow-md shadow-indigo-200 touch-active disabled:opacity-50 mt-2"
          >
            {isLoading ? '예약 중...' : '상담 예약 신청'}
          </button>
        </form>
      </div>
    </div>
  );
}