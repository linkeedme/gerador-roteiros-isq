import { GoogleGenAI } from "@google/genai";

export const generateScriptStream = async (
  prompt: string, 
  context: string | undefined,
  onChunk: (text: string) => void
): Promise<void> => {
  
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("A variável de ambiente process.env.API_KEY não está configurada.");
  }

  // Initialize client
  const ai = new GoogleGenAI({ apiKey });

  // Model selection: Gemini 3 Pro Preview (supports Thinking)
  const modelId = 'gemini-3-pro-preview';

  try {
    // If context is provided (Channel Base Prompt), we add it as a System Instruction-like setup within the prompt
    // or as a separate part depending on complexity. Here we combine for clarity.
    const fullPrompt = context 
      ? `CONTEXTO DO AGENTE/CANAL:\n${context}\n\n---\n\n${prompt}`
      : prompt;

    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 2048, // Allocate tokens for reasoning
        },
        temperature: 0.7, // Creativity balance
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
    
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};