import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ description: '이메일을 입력해주세요', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin-login`,
      });
      if (error) {
        toast({ description: error.message, variant: 'destructive' });
        return;
      }
      setSent(true);
      toast({ description: '비밀번호 재설정 이메일이 전송되었습니다 📧' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container bg-white">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-4 safe-top">
        <button
          onClick={() => navigate('/admin-login')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 touch-active"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
      </header>

      {/* Content */}
      <div className="page-content">
        <div className="px-6 pt-6 pb-8 animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-[60px] h-[60px] bg-gradient-to-br from-slate-700 to-slate-900 rounded-[18px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-300">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-[22px] font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              비밀번호 재설정
            </h1>
            <p className="text-[13px] text-slate-400 mt-[6px]">
              가입한 이메일로 재설정 링크를 보내드립니다
            </p>
          </div>

          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-[16px] font-bold text-slate-800 mb-2">이메일 전송 완료!</h2>
              <p className="text-[13px] text-slate-500 mb-6">
                <span className="font-semibold text-slate-700">{email}</span>로<br />
                비밀번호 재설정 링크를 보냈습니다.
              </p>
              <p className="text-[11px] text-slate-400 mb-6">
                이메일이 도착하지 않으면 스팸 폴더를 확인해주세요.
              </p>
              <button
                onClick={() => navigate('/admin-login')}
                className="w-full h-[50px] rounded-[14px] bg-slate-800 text-white text-[15px] font-semibold shadow-md shadow-slate-300 touch-active"
              >
                로그인으로 돌아가기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <Input
                    type="email"
                    placeholder="가입한 이메일을 입력하세요"
                    className="pl-10 rounded-[14px] h-[48px] border-slate-200 text-[14px]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[50px] rounded-[14px] bg-slate-800 text-white text-[15px] font-semibold mt-6 shadow-md shadow-slate-300 touch-active disabled:opacity-50"
              >
                {isLoading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-[12px] text-indigo-500 font-medium"
            >
              ← 관리자 로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}