import React, { useState, useRef, useEffect } from 'react';
import { Channel, ScriptItem } from '../types';
import { generateScriptStream } from '../services/geminiService';
import { ArrowLeft, FileText, Loader2, Sparkles, Upload, X, CheckCircle2, AlertCircle, Download, FolderArchive, FileUp, Bell } from 'lucide-react';

interface ChannelWorkspaceProps {
  channel: Channel;
  onBack: () => void;
}

// Simple Toast Component for "Popup" information
const NotificationToast = ({ message, type, onClose }: { message: string, type: 'info' | 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    info: 'bg-zinc-800 border-zinc-700',
    success: 'bg-green-900/80 border-green-700/50',
    error: 'bg-red-900/80 border-red-700/50'
  };

  return (
    <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-lg border shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm ${bgColors[type]}`}>
      {type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
      {type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
      {type === 'info' && <Bell className="w-5 h-5 text-blue-400" />}
      <div>
        <p className="text-sm font-medium text-white">{message}</p>
      </div>
      <button onClick={onClose} className="ml-auto text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
};

export const ChannelWorkspace: React.FC<ChannelWorkspaceProps> = ({ channel, onBack }) => {
  const [mode, setMode] = useState<'UPLOAD_BATCH' | 'WORKBENCH'>('UPLOAD_BATCH');
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<number>(0);
  const [notification, setNotification] = useState<{msg: string, type: 'info' | 'success' | 'error'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showNotification = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ msg, type });
  };

  // --- BATCH PARSER ---
  const parseBatchFile = (text: string): ScriptItem[] => {
    const raw = text.replace(/\r\n/g, '\n');
    const blocks = raw.split(/(?=TITULO:)/).filter(b => b.trim().length > 0);

    return blocks.map((block, index) => {
      const extract = (key: string) => {
        const regex = new RegExp(`${key}\\s*([\\s\\S]*?)(?=\\n[A-ZÀ-Ú ]+:|$)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      };

      const title = extract('TITULO:');
      const thumbnail = extract('THUMBNAIL:');
      const premise = extract('PREMISSA:');
      const date = extract('DATA:');

      let contextContent = '';
      if (date) contextContent += `DATA DE PUBLICAÇÃO: ${date}\n\n`;
      if (thumbnail) contextContent += `THUMBNAIL SUGERIDA: ${thumbnail}\n\n`;
      if (premise) contextContent += `PREMISSA / CONTEXTO:\n${premise}`;

      if (!contextContent && block.length > 20) {
        contextContent = block;
      }

      return {
        id: index,
        title: title || `Roteiro Sem Título ${index + 1}`,
        txtContent: contextContent,
        fileName: 'Batch Import',
        status: 'IDLE',
        output: '',
        progress: 0
      };
    });
  };

  const handleBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          const parsedItems = parseBatchFile(content);
          if (parsedItems.length === 0) {
            showNotification("Não foi possível identificar vídeos. Verifique se começam com 'TITULO:'.", 'error');
            return;
          }
          setItems(parsedItems);
          setActiveItemId(0);
          setMode('WORKBENCH');
          showNotification(`${parsedItems.length} pautas carregadas com sucesso.`, 'success');
        } catch (err) {
          console.error(err);
          showNotification("Erro ao processar arquivo.", 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // --- INPUT HANDLING ---
  const updateItem = (id: number, updates: Partial<ScriptItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/plain') {
        showNotification("Apenas arquivos .txt são permitidos.", 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        updateItem(activeItemId, {
          fileName: file.name,
          txtContent: content,
          title: items[activeItemId].title || file.name.replace('.txt', '')
        });
        showNotification("Pauta individual carregada.", 'success');
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    updateItem(id, { fileName: '', txtContent: '' });
  };

  const buildFullContext = () => {
    const prompt = channel.basePrompt || '';
    const kbContent = channel.knowledgeBase?.map(k => `--- DOCUMENTO DE REFERÊNCIA: ${k.title} ---\n${k.content}`).join('\n\n') || '';
    
    // Add extra constraint enforcement in context
    const constraint = `
      \n\n=== REGRAS DE OUTPUT (CRÍTICO) ===
      1. NÃO escreva introduções, conclusões fora do roteiro, ou contagem de caracteres.
      2. O texto deve ser APENAS o roteiro, pronto para ser lido.
      3. Se for uma continuação, comece IMEDIATAMENTE do próximo ponto, sem repetir o anterior.
      4. Tudo que não for roteiro deve ser omitido.
    `;

    if (!kbContent) return prompt + constraint;
    return `${prompt}\n${constraint}\n\n========================================\nBASE DE CONHECIMENTO:\n========================================\n${kbContent}`;
  };

  // --- GENERATION LOGIC ---
  const processGeneration = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (!item.title && !item.txtContent) {
      updateItem(id, { status: 'ERROR', error: 'Sem Título/Conteúdo' });
      return;
    }

    updateItem(id, { status: 'GENERATING', error: undefined });
    let currentText = '';

    try {
      const promptInput = `
        TÍTULO/TEMA: ${item.title}
        ${item.txtContent ? `INFORMAÇÕES DE PAUTA:\n${item.txtContent}` : ''}
        
        INSTRUÇÃO: Escreva o roteiro completo. Lembre-se: APENAS O TEXTO DO ROTEIRO. Sem metadados.
      `;

      const fullContext = buildFullContext();

      // 1. Initial Generation Phase
      await generateScriptStream(
        promptInput,
        fullContext,
        (chunk) => {
          currentText += chunk;
          setItems(prev => prev.map(i => {
            if (i.id === id) {
              return { ...i, output: i.output + chunk };
            }
            return i;
          }));
        }
      );

      // 2. Auto-Complete Logic Phase
      if (channel.targetChars && currentText.length > 0) {
        const target = channel.targetChars;
        let currentLength = currentText.length;
        
        if (currentLength < target) {
          const missing = target - currentLength;
          // Trigger notification via UI, not text
          showNotification(`Meta não atingida (${currentLength}/${target}). Iniciando auto-extensão transparente...`, 'info');

          const kNeeded = Math.max(1, Math.ceil(missing / 1000));
          const charsToRequest = kNeeded * 1000;
          const contextWindow = currentText.slice(-4000);

          // Prompt de extensão super restrito
          const autoExtensionPrompt = `
            CONTEXTO ANTERIOR (FINAL DO TEXTO): " ...${contextWindow} "

            TAREFA: Continue o roteiro IMEDIATAMENTE a partir da última palavra acima.
            
            REGRAS CRÍTICAS DE CONTINUAÇÃO:
            1. NÃO repita o texto do contexto.
            2. NÃO escreva "Aqui está a continuação" ou títulos.
            3. NÃO deixe linhas em branco no início. Comece na mesma linha se possível.
            4. Apenas "cole" o próximo parágrafo de conteúdo.
            
            META: Adicionar +${charsToRequest} caracteres de profundidade no tema.
          `;

          await generateScriptStream(
            autoExtensionPrompt,
            fullContext,
            (chunk) => {
              currentText += chunk;
              currentLength += chunk.length;
              setItems(prev => prev.map(i => {
                if (i.id === id) {
                  return { ...i, output: i.output + chunk };
                }
                return i;
              }));
            }
          );
        }
      }

      updateItem(id, { status: 'COMPLETE' });
      // Notification shows the final count (Satisfying "Info in popup")
      showNotification(`Roteiro #${id + 1} Finalizado: ${currentText.length} caracteres.`, 'success');

    } catch (error) {
      console.error(error);
      updateItem(id, { status: 'ERROR', error: 'Erro ao gerar.' });
      showNotification(`Erro ao gerar roteiro #${id + 1}`, 'error');
    }
  };

  const handleGenerateBase = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (item?.status === 'GENERATING') return;
    
    if (!item?.title && !item?.txtContent) {
      showNotification("Defina um título ou faça upload de pauta.", 'error');
      return;
    }

    updateItem(id, { output: '' });
    await processGeneration(id);
  };

  const handleGenerateAll = async () => {
    const itemsToGenerate = items.filter(
      i => (i.status === 'IDLE' || i.status === 'ERROR') && (i.title || i.txtContent)
    );

    if (itemsToGenerate.length === 0) {
      const isAnythingGenerating = items.some(i => i.status === 'GENERATING');
      if (!isAnythingGenerating) {
        showNotification("Nenhum item pronto para gerar.", 'info');
      }
      return;
    }

    itemsToGenerate.forEach(item => updateItem(item.id, { output: '' }));
    showNotification(`Iniciando geração de ${itemsToGenerate.length} roteiros em paralelo...`, 'info');
    itemsToGenerate.forEach(item => processGeneration(item.id));
  };

  const handleExtend = async (id: number, kChars: number) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status === 'GENERATING') return;

    updateItem(id, { status: 'GENERATING' });
    showNotification(`Estendendo roteiro em +${kChars}k caracteres...`, 'info');

    try {
      const currentText = item.output;
      const contextWindow = currentText.slice(-4000); 
      
      const extensionPrompt = `
        CONTEXTO ANTERIOR: " ...${contextWindow} "

        TAREFA: Continue o roteiro IMEDIATAMENTE.
        REGRAS: SEM metadados, SEM repetição, SEM títulos. Apenas conteúdo novo "colado" no final.
        META: +${kChars * 1000} caracteres.
      `;

      const fullContext = buildFullContext();

      await generateScriptStream(
        extensionPrompt,
        fullContext,
        (chunk) => {
          setItems(prev => prev.map(i => {
            if (i.id === id) {
              return { ...i, output: i.output + chunk };
            }
            return i;
          }));
        }
      );

      updateItem(id, { status: 'COMPLETE' });
      showNotification("Extensão concluída.", 'success');
    } catch (error) {
      console.error(error);
      updateItem(id, { status: 'ERROR', error: 'Erro ao estender.' });
      showNotification("Erro na extensão.", 'error');
    }
  };

  // Função para download individual de um item
  const handleDownload = (item: ScriptItem) => {
    if (!item.output) return;
    const element = document.createElement("a");
    const file = new Blob([item.output], {type: 'text/plain'});
    const safeTitle = item.title.replace(/[^a-z0-9\u00C0-\u00FF\s-_]/gi, '').trim().replace(/\s+/g, '_');
    element.href = URL.createObjectURL(file);
    element.download = `${safeTitle || `roteiro_${item.id + 1}`}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Alterado para baixar individualmente em sequência
  const handleDownloadAll = async () => {
    // Filtra apenas os itens que têm output
    const completedItems = items.filter(i => i.output && i.output.length > 0);
    
    if (completedItems.length === 0) {
      showNotification("Não há roteiros prontos para baixar.", 'error');
      return;
    }

    showNotification(`Iniciando download de ${completedItems.length} arquivos...`, 'info');

    // Ordena por ID para garantir a sequência correta
    const sortedItems = [...completedItems].sort((a, b) => a.id - b.id);

    // Itera sequencialmente
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      handleDownload(item);
      
      // Pequeno delay para garantir que o navegador processe o download anterior
      // e para dar tempo da caixa de diálogo "Salvar como" aparecer (se configurada)
      if (i < sortedItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    showNotification("Todos os downloads foram iniciados.", 'success');
  };

  const getStats = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return { chars: 0, words: 0 };
    return {
      chars: cleanText.length,
      words: cleanText.split(/\s+/).length
    };
  };

  // --- RENDER: UPLOAD BATCH ---
  if (mode === 'UPLOAD_BATCH') {
    return (
      <div className="min-h-screen bg-background text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {notification && (
          <NotificationToast 
            message={notification.msg} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
        
        <div className="absolute top-8 left-8">
           <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" /> Voltar
           </button>
        </div>

        <div className="text-center z-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div 
             className="w-24 h-24 mx-auto mb-8 rounded-full border-2 border-dashed p-1"
             style={{ borderColor: channel.primaryColor }}
           >
             <div className="w-full h-full rounded-full overflow-hidden bg-black">
               <img src={channel.iconUrl} alt={channel.name} className="w-full h-full object-cover" />
             </div>
           </div>
           
           <h1 className="text-4xl font-serif font-bold mb-4">Upload de Pauta</h1>
           <p className="text-gray-400 mb-8 max-w-lg mx-auto">
             Envie um arquivo <strong>.txt</strong> contendo múltiplos vídeos.
           </p>

           <div className="flex justify-center">
             <input type="file" ref={batchInputRef} onChange={handleBatchUpload} className="hidden" accept=".txt" />
             <button
               onClick={() => batchInputRef.current?.click()}
               className="group relative bg-surface border border-dashed border-gray-600 hover:border-primary rounded-2xl p-10 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 w-full max-w-md flex flex-col items-center gap-4"
             >
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                 <FileUp className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />
               </div>
               <div className="space-y-1">
                 <div className="text-lg font-bold text-white group-hover:text-primary transition-colors">Carregar Arquivo .txt</div>
                 <div className="text-xs text-gray-500">Clique para selecionar o arquivo de pauta</div>
               </div>
             </button>
           </div>
           
           <div className="mt-8 text-left bg-black/30 p-4 rounded-lg border border-white/5 text-xs text-gray-500 font-mono">
             <p className="mb-2 font-bold text-gray-400">Formato esperado:</p>
             <p>TITULO: Seu Título Aqui...</p>
             <p>THUMBNAIL: Texto da Thumbnail...</p>
             <p>PREMISSA: Texto explicativo...</p>
             <p>DATA: 13 E 14 DE DEZEMBRO (Opcional)</p>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDER: WORKBENCH ---
  const activeItem = items.find(i => i.id === activeItemId);
  if (!activeItem) return null;

  const stats = getStats(activeItem.output);
  const isCurrentItemGenerating = activeItem.status === 'GENERATING';

  return (
    <div className="h-screen bg-[#0a0a0b] text-white flex overflow-hidden font-sans relative">
      
      {/* GLOBAL NOTIFICATION TOAST */}
      {notification && (
        <NotificationToast 
          message={notification.msg} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* SIDEBAR */}
      <div className="w-72 bg-[#18181b] border-r border-[#27272a] flex flex-col shrink-0 z-20">
        <div className="p-4 border-b border-[#27272a] bg-black/20">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-700" style={{ borderColor: channel.primaryColor }}>
                   <img src={channel.iconUrl} className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-sm truncate max-w-[120px]">{channel.name}</span>
             </div>
             <button onClick={onBack} className="text-gray-500 hover:text-white p-1">
               <X className="w-4 h-4" />
             </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
             <button 
               onClick={handleGenerateAll}
               className="flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 p-2 rounded border border-white/5 transition-colors"
               title="Gerar todos os itens preenchidos"
             >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Gerar Todos</span>
             </button>
             <button 
               onClick={handleDownloadAll}
               className="flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 p-2 rounded border border-white/5 transition-colors"
               title="Baixar todos individualmente"
             >
                <Download className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Baixar Todos</span>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItemId(item.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all relative group
                ${item.id === activeItemId 
                  ? 'bg-primary/10 border-primary/50' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
                }
              `}
            >
              <div className="flex justify-between items-center mb-1">
                 <span className={`text-[10px] font-bold px-1.5 rounded
                    ${item.id === activeItemId ? 'text-primary bg-primary/20' : 'text-gray-500 bg-gray-800'}
                 `}>
                   #{item.id + 1}
                 </span>
                 
                 <div className="flex items-center gap-2">
                   {item.status === 'GENERATING' && (
                      <span className="text-[10px] font-mono text-primary/80 tracking-tighter animate-pulse">
                        {item.output.length.toLocaleString()} chars
                      </span>
                   )}
                   {item.status === 'COMPLETE' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                   {item.status === 'GENERATING' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                   {item.status === 'ERROR' && <AlertCircle className="w-3 h-3 text-red-500" />}
                 </div>
              </div>
              <div className={`text-sm font-medium truncate ${item.id === activeItemId ? 'text-white' : 'text-gray-400'}`}>
                {item.title || "Sem Título"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN EDITOR AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-[#09090b]">
        
        {/* TOP TOOLBAR */}
        <div className="h-16 border-b border-[#27272a] flex items-center justify-between px-6 bg-[#18181b] z-10">
          <div className="flex-1 max-w-2xl mr-4">
            <input 
              type="text" 
              value={activeItem.title}
              onChange={(e) => updateItem(activeItem.id, { title: e.target.value })}
              placeholder="Digite o Título ou Tema do Vídeo..."
              className="w-full bg-transparent border-none text-lg font-medium focus:ring-0 placeholder-gray-600 px-0"
            />
          </div>

          <div className="flex items-center gap-3">
             <div className="relative">
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt" />
               {activeItem.fileName ? (
                 <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1.5 rounded text-xs border border-green-500/20">
                   <FileText className="w-3 h-3" />
                   <span className="max-w-[100px] truncate">{activeItem.fileName}</span>
                   <button onClick={(e) => clearFile(activeItem.id, e)} className="hover:text-green-300"><X className="w-3 h-3" /></button>
                 </div>
               ) : (
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex items-center gap-2 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded hover:bg-white/5 transition-colors border border-dashed border-gray-700"
                 >
                   <Upload className="w-3 h-3" /> Transcrição
                 </button>
               )}
             </div>

             <div className="h-4 w-px bg-gray-700 mx-2"></div>

             {activeItem.output.length === 0 ? (
                <button 
                  onClick={() => handleGenerateBase(activeItem.id)}
                  disabled={isCurrentItemGenerating}
                  className={`
                    px-4 py-1.5 rounded-md font-bold text-sm flex items-center gap-2 transition-all
                    ${isCurrentItemGenerating 
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-gray-200'
                    }
                  `}
                >
                  {isCurrentItemGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Gerar Roteiro
                </button>
             ) : (
                <div className="flex items-center gap-2">
                   <span className="text-xs text-gray-500 uppercase font-bold mr-2">Complementar:</span>
                   {[1, 5, 10, 20].map(k => (
                     <button
                        key={k}
                        onClick={() => handleExtend(activeItem.id, k)}
                        disabled={isCurrentItemGenerating}
                        className="px-3 py-1.5 rounded-md bg-[#27272a] hover:bg-primary hover:text-black border border-[#3f3f46] text-xs font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {isCurrentItemGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : `+${k}k`}
                     </button>
                   ))}
                   
                   <div className="h-4 w-px bg-gray-700 mx-2"></div>
                   
                   <button 
                    onClick={() => handleDownload(activeItem)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    title="Baixar .txt"
                   >
                     <Download className="w-4 h-4" />
                   </button>
                </div>
             )}
          </div>
        </div>

        {/* EDITOR SURFACE */}
        <div className="flex-1 relative bg-[#09090b] overflow-hidden">
           <textarea
              ref={textareaRef}
              value={activeItem.output}
              onChange={(e) => updateItem(activeItem.id, { output: e.target.value })}
              placeholder="O roteiro gerado aparecerá aqui. Você pode editar livremente..."
              className="w-full h-full p-8 bg-transparent text-gray-200 font-mono text-sm leading-relaxed resize-none focus:ring-0 border-none outline-none custom-scrollbar"
              spellCheck={false}
           />
           
           {activeItem.output.length === 0 && !isCurrentItemGenerating && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
               <div className="text-center">
                 <FileText className="w-16 h-16 mx-auto mb-4" />
                 <p className="text-xl font-serif">Aguardando geração...</p>
                 {activeItem.txtContent && <p className="text-xs text-primary mt-2">Pauta carregada e pronta.</p>}
               </div>
             </div>
           )}
        </div>

        {/* FOOTER STATS BAR */}
        <div className="h-8 bg-[#18181b] border-t border-[#27272a] flex items-center justify-between px-4 text-[10px] text-gray-500 uppercase tracking-wider font-mono select-none">
           <div className="flex gap-4">
              <span>Palavras: <strong className="text-gray-300">{stats.words}</strong></span>
              <span>Caracteres: <strong className="text-gray-300">{stats.chars}</strong>
              {channel.targetChars && (
                  <span className={`ml-2 ${stats.chars < channel.targetChars ? 'text-yellow-500' : 'text-green-500'}`}>
                    / {channel.targetChars} META
                  </span>
              )}
              </span>
           </div>
           <div className="flex gap-4">
              <span className={isCurrentItemGenerating ? "text-primary animate-pulse" : ""}>
                {isCurrentItemGenerating ? "GERANDO..." : "PRONTO"}
              </span>
              <span>DarkPill Studio v1.2</span>
           </div>
        </div>

      </div>
    </div>
  );
};