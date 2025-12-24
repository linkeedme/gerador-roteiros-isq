export interface Channel {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
  primaryColor: string; // Hex code for accent
  basePrompt?: string; // Script Agent Prompt
  targetChars?: number; // Meta de caracteres para Auto-Complete
  knowledgeBase?: { title: string; type: 'pdf' | 'doc'; url?: string; content?: string }[];
}

export interface ScriptMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type ScriptStatus = 'IDLE' | 'GENERATING' | 'COMPLETE' | 'ERROR';

export interface ScriptItem {
  id: number;
  title: string;
  txtContent: string;
  fileName: string;
  status: ScriptStatus;
  output: string;
  progress: number;
  error?: string;
}