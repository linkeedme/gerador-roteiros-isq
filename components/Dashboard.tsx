
import React, { useState } from 'react';
import { Channel } from '../types';
import { APP_NAME, CHANNELS } from '../constants';
import { ChevronRight } from 'lucide-react';

interface DashboardProps {
  onSelectChannel: (channel: Channel) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectChannel }) => {
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-primary/5 transition-colors duration-1000"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-purple-900/10 transition-colors duration-1000"></div>
      </div>

      <div className="z-10 w-full max-w-6xl">
        <header className="mb-16 flex flex-col items-center text-center space-y-6">
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tighter">
              {APP_NAME}
            </h1>
          </div>

          <p className="text-gray-500 text-lg uppercase tracking-[0.2em] font-light animate-in fade-in slide-in-from-bottom-2">
            Selecione o Agente de Criação de Roteiros
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {CHANNELS.map((channel) => {
            const isHovered = hoveredChannelId === channel.id;
            const activeColor = channel.primaryColor;

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                onMouseEnter={() => setHoveredChannelId(channel.id)}
                onMouseLeave={() => setHoveredChannelId(null)}
                style={{
                  borderColor: isHovered ? activeColor : undefined,
                  boxShadow: isHovered ? `0 20px 40px -10px ${activeColor}33` : undefined,
                  transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                }}
                className={`group relative bg-surface border border-border rounded-2xl p-8 flex flex-col items-center text-center overflow-hidden transition-all duration-300 ease-out`}
              >
                {/* Card Glow on Hover */}
                <div 
                  className="absolute inset-0 opacity-0 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to bottom, ${activeColor}00, ${activeColor}10)`,
                    opacity: isHovered ? 1 : 0
                  }}
                ></div>

                <div className="relative mb-6">
                  <div 
                    className="w-32 h-32 rounded-full p-1 border-2 border-dashed border-gray-700 transition-all duration-500 ease-in-out"
                    style={{
                      borderColor: isHovered ? activeColor : undefined
                    }}
                  >
                     <div className="w-full h-full rounded-full overflow-hidden border-4 border-background bg-black relative z-10">
                        <img 
                          src={channel.iconUrl} 
                          alt={channel.name}
                          className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : ''}`} 
                        />
                     </div>
                  </div>
                  {/* Icon Glow */}
                  <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-0 transition-opacity duration-500 z-0"
                    style={{
                      backgroundColor: activeColor,
                      opacity: isHovered ? 0.2 : 0
                    }}
                  ></div>
                </div>

                <h3 
                  className="text-2xl font-serif font-bold text-gray-100 transition-colors duration-300 relative z-10"
                  style={{ color: isHovered ? activeColor : undefined }}
                >
                  {channel.name}
                </h3>
                
                <p className={`text-sm text-gray-500 mt-3 leading-relaxed transform transition-all duration-500 relative z-10 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  {channel.description}
                </p>

                <div 
                  className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-600 transition-colors"
                  style={{ color: isHovered ? 'white' : undefined }}
                >
                  Produzir Roteiro <ChevronRight className={`w-3 h-3 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                </div>
              </button>
            );
          })}

          {/* Placeholder for future channels */}
          {CHANNELS.length < 3 && (
            <div className="border border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-30 select-none cursor-default">
               <div className="w-24 h-24 rounded-full bg-zinc-900 mb-6"></div>
               <div className="h-6 w-32 bg-zinc-900 rounded mb-2"></div>
               <p className="text-xs">Mais canais em breve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
