import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type VerifyEmailLocationState = {
  email?: string;
};

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resendVerificationEmail } = useAuth();
  const state = (location.state as VerifyEmailLocationState | null) ?? {};

  const [email, setEmail] = useState(state.email || '');
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) {
      toast({ description: '이메일을 입력해주세요', variant: 'destructive' });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendVerificationEmail(email);
      if (error) {
        toast({ description: error, variant: 'destructive' });
        return;
      }
      toast({ description: '인증 메일을 다시 보냈습니다. 받은편지함을 확인해주세요.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="app-container bg-white">
      <header className="flex-shrink-0 px-5 pt-4 safe-top">
        <button
          onClick={() => navigate('/login')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 touch-active"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
      </header>

      <div className="page-content">
        <div className="px-6 pt-6 pb-8 animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-[60px] h-[60px] bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[18px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-[22px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              이메일 인증
            </h1>
            <p className="text-[13px] text-slate-400 mt-[6px] leading-relaxed">
              가입하신 이메일로 인증 링크를 보냈습니다.
              <br />
              메일함을 확인하고 인증을 완료해주세요.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">
                이메일
              </label>
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
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="w-full h-[50px] rounded-[14px] bg-indigo-600 text-white text-[15px] font-semibold shadow-md shadow-indigo-200 touch-active disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? '발송 중...' : '인증 메일 다시 보내기'}
            </button>

            <Link
              to="/login"
              className="block w-full h-[50px] rounded-[14px] border border-slate-200 text-slate-600 text-[15px] font-semibold touch-active flex items-center justify-center"
            >
              로그인 화면으로
            </Link>
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-[14px]">
            <p className="text-[11px] text-indigo-600 text-center font-medium leading-relaxed">
              인증을 완료한 뒤 로그인하면 커뮤니티 글 작성과 신고를 이용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
