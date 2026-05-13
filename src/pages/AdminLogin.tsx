import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ description: '이메일과 비밀번호를 입력해주세요', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await adminSignIn(email, password);
      if (error) {
        toast({ description: error, variant: 'destructive' });
        return;
      }
      toast({ description: '관리자 로그인 되었습니다! 🔑' });
      navigate('/admin/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container bg-white">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-4 safe-top">
        <button
          onClick={() => navigate('/')}
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
              관리자 로그인
            </h1>
            <p className="text-[13px] text-slate-400 mt-[6px]">
              관리자 계정으로 로그인하세요
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-[6px] block uppercase tracking-wide">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <Input
                  type="email"
                  placeholder="관리자 이메일을 입력하세요"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] rounded-[14px] bg-slate-800 text-white text-[15px] font-semibold mt-6 shadow-md shadow-slate-300 touch-active disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : '관리자 로그인'}
            </button>
          </form>

          {/* Forgot password */}
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/reset-password')}
              className="text-[12px] text-slate-500 font-medium"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center mt-4">
            <p className="text-[13px] text-slate-400">
              관리자 계정이 없으신가요?
              <button
                onClick={() => navigate('/admin/signup')}
                className="text-slate-700 font-semibold ml-1"
              >
                관리자 회원가입
              </button>
            </p>
          </div>

          <div className="text-center mt-3">
            <button
              onClick={() => navigate('/login')}
              className="text-[12px] text-indigo-500 font-medium"
            >
              일반 사용자 로그인으로 이동 →
            </button>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-[14px]">
            <p className="text-[11px] text-slate-600 text-center font-medium">
              🔒 관리자 전용 페이지입니다. 승인된 관리자만 접근 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}