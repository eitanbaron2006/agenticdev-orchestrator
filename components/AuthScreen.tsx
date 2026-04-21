'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  LogIn, 
  Layers, 
  ShieldCheck, 
  ArrowLeft,
  Bot,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';

interface AuthScreenProps {
  onLogin: () => Promise<any>;
  onBack: () => void;
}

export default function AuthScreen({ onLogin, onBack }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthErrorMessage = (error: unknown) => {
    const message = (error as Error | undefined)?.message || '';

    if (message.includes('Supabase is not configured')) {
      return message;
    }

    if (message.toLowerCase().includes('provider')) {
      return 'Google OAuth is not enabled for this Supabase project. Configure the Google provider and redirect URL in the selected local Supabase instance.';
    }

    return message || 'Google sign-in failed.';
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await onLogin();
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage(getAuthErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        disabled={isLoading}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono opacity-50 hover:opacity-100 transition-opacity uppercase tracking-widest disabled:opacity-20"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </motion.button>

      <div className="w-full max-w-md relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative"
        >
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 relative group">
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers className="w-10 h-10 text-accent terminal-glow relative" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-mono font-bold tracking-tighter uppercase">Initialize Session</h2>
              <p className="text-xs font-mono opacity-40 leading-relaxed">
                Connect your identity to access the autonomous development environment.
              </p>
            </div>

            <div className="w-full space-y-4">
              {errorMessage ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-red-200">
                    {errorMessage}
                  </p>
                </div>
              ) : null}

              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-accent/20 text-accent border border-accent/30 font-mono font-bold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsLoading(false);
                      setErrorMessage(null);
                      onBack();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 text-white font-mono text-xs hover:bg-white/10 transition-all border border-white/10"
                  >
                    <X className="w-4 h-4" />
                    <span>CANCEL</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-accent text-black font-mono font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  <LogIn className="w-5 h-5" />
                  <span>SIGN IN WITH GOOGLE</span>
                </button>
              )}
              
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest">Secure Access</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent/50" />
                  <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">Encrypted</span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                  <Bot className="w-4 h-4 text-accent/50" />
                  <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">AI Verified</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3 h-3 text-accent/30" />
          <p className="text-[10px] font-mono opacity-20 uppercase tracking-widest">
            Powered by Vertex AI
          </p>
        </motion.div>
      </div>
    </div>
  );
}
