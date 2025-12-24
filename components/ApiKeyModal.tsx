
import React, { useState, useEffect } from 'react';
import { Key, Lock, ArrowRight, ExternalLink, LogIn, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [hasAiStudio, setHasAiStudio] = useState(false);

  useEffect(() => {
    // Check if running in an environment with native key selection (e.g., IDX/Project IDX)
    if (typeof window !== 'undefined' && window.aistudio) {
      setHasAiStudio(true);
    }
  }, []);

  const handleAiStudioLogin = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // We assume success if no error, key is injected into env
        // We pass a placeholder string to bypass the App's check, 
        // the service will look for process.env.API_KEY
        onSave("MANAGED_ENV_KEY"); 
      } catch (e) {
        console.error(e);
        setError("Não foi possível conectar automaticamente. Tente o método manual.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim() || !inputKey.startsWith('AIza')) {
      setError('Chave inválida. Certifique-se de que copiou a chave correta do Google.');
      return;
    }
    onSave(inputKey.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-primary/20">
            <LogIn className="w-8 h-8 text-primary" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Bem-vindo ao DarkPill</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Para acessar o Studio, conecte sua conta Google com plano Gemini Pro.
            </p>
          </div>

          {hasAiStudio ? (
            <div className="space-y-4">
               <button
                onClick={handleAiStudioLogin}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-wide text-xs shadow-lg shadow-white/10"
              >
                <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" className="w-5 h-5" alt="Gemini" />
                Entrar com Google Gemini
              </button>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="bg-black/20 rounded-lg p-4 border border-border space-y-3">
                <div className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                   <div>
                     <p className="text-xs text-gray-300 font-medium">Obtenha sua credencial de acesso.</p>
                     <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Gerar Chave no Google AI Studio <ExternalLink className="w-2 h-2" />
                      </a>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                   <div>
                     <p className="text-xs text-gray-300 font-medium">Cole a chave abaixo para conectar.</p>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setError('');
                    }}
                    placeholder="Cole sua chave aqui (começa com AIza...)"
                    className="w-full bg-background border border-border rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs ml-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs shadow-lg shadow-white/10"
              >
                Conectar Conta <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <p className="text-[10px] text-gray-600 text-center mt-6 max-w-xs mx-auto">
            Sua chave é usada apenas localmente para conectar diretamente aos servidores do Google.
          </p>
        </div>
      </div>
    </div>
  );
};
