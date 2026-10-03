import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SignupConsent from '@/components/SignupConsent';
import {
  emptySignupConsent,
  requiredConsentsAccepted,
  validateSignupConsent,
  type SignupConsentState,
} from '@/lib/consent';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [consent, setConsent] = useState<SignupConsentState>(emptySignupConsent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ description: '이메일과 비밀번호를 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!isLogin && !name) {
      toast({ description: '이름을 입력해주세요', variant: 'destructive' });
      return;
    }
    if (!isLogin) {
      const consentError = validateSignupConsent(consent);
      if (consentError) {
        toast({ description: consentError, variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (result.error) {
          toast({ description: result.error, variant: 'destructive' });
          return;
        }
        if (result.deletionPending) {
          toast({
            description:
              '탈퇴 요청이 접수된 계정입니다. 서비스 이용은 제한되며, 마이페이지에서 30일 이내 철회할 수 있습니다.',
          });
          navigate('/mypage');
          return;
        }
        toast({ description: '로그인 되었습니다! 👋' });
        navigate('/');
      } else {
        const result = await signUp(email, password, name, consent);
        if (result.error) {
          toast({ description: result.error, variant: 'destructive' });
          return;
        }
        if (result.needsEmailVerification) {
          toast({ description: '인증 메일을 보냈습니다. 이메일을 확인해주세요.' });
          navigate('/verify-email', { state: { email: result.email || email } });
          return;
        }
        toast({ description: '회원가입이 완료되었습니다! 🎉' });
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container bg-white">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-4 safe-top">
        <button
          onClick={() => navigate(-1)}
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
            <div className="w-[60px] h-[60px] bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[18px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <span className="text-[26px]">🎒</span>
            </div>
            <h1 className="text-[22px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              드림키즈
            </h1>
            <p className="text-[13px] text-slate-400 mt-[6px]">
              {isLogin ? '로그인하고 우리 아이 유치원을 찾아보세요' : '회원가입하고 서비스를 이용해보세요'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">이름</label>
                <Input
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-[14px] h-[48px] border-slate-200 text-[14px]"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <Input
                  type="email"
                  placeholder="이메일을 입력하세요"
                  className="pl-10 rounded-[14px] h-[48px] border-slate-200 text-[14px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  className="pl-10 pr-10 rounded-[14px] h-[48px] border-slate-200 text-[14px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px] text-slate-400" />
                  ) : (
                    <Eye className="w-[18px] h-[18px] text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <SignupConsent value={consent} onChange={setConsent} variant="parent" />
            )}

            <button
              type="submit"
              disabled={isLoading || (!isLogin && !requiredConsentsAccepted(consent))}
              className="w-full h-[50px] rounded-[14px] bg-indigo-600 text-white text-[15px] font-semibold mt-6 shadow-md shadow-indigo-200 touch-active disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* Forgot password */}
          {isLogin && (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate('/reset-password')}
                className="text-[12px] text-slate-500 font-medium"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}

          {/* Toggle */}
          <div className="text-center mt-4">
            <p className="text-[13px] text-slate-400">
              {isLogin ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setConsent(emptySignupConsent());
                }}
                className="text-indigo-600 font-semibold ml-1"
              >
                {isLogin ? '회원가입' : '로그인'}
              </button>
            </p>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-[14px]">
            <p className="text-[11px] text-indigo-600 text-center font-medium">
              학부모님의 개인정보는 관련 법령에 따라 안전하게 보호됩니다
            </p>
            <p className="text-[10px] text-indigo-500/90 text-center mt-2">
              <Link to="/privacy" className="font-semibold underline underline-offset-2">
                개인정보처리방침
              </Link>
              {' · '}
              <Link to="/terms" className="font-semibold underline underline-offset-2">
                이용약관
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}