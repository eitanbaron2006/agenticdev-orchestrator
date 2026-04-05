'use client';

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Terminal as TerminalIcon, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

interface TerminalProps {
  onExec: (command: string, cwd?: string, timeout?: number) => Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
  disabled?: boolean;
  workDir?: string;
}

const Terminal = memo(({ onExec, disabled = false, workDir = '/home/daytona/project' }: TerminalProps) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'system', content: `Terminal ready. Working directory: ${workDir}` },
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineIdRef = useRef(1);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    const id = lineIdRef.current++;
    setLines((prev) => [...prev, { id, type, content }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = input.trim();
      if (!cmd || isRunning || disabled) return;

      setInput('');
      setHistoryIndex(-1);
      setHistory((prev) => [...prev, cmd]);
      addLine('input', `$ ${cmd}`);

      if (cmd === 'clear') {
        setLines([{ id: lineIdRef.current++, type: 'system', content: 'Terminal cleared.' }]);
        return;
      }

      setIsRunning(true);
      try {
        const result = await onExec(cmd, workDir, 120);
        if (result.stdout) addLine('output', result.stdout);
        if (result.stderr) addLine('error', result.stderr);
        if (result.exitCode !== 0 && !result.stdout && !result.stderr) {
          addLine('error', `Process exited with code ${result.exitCode}`);
        }
      } catch (err) {
        addLine('error', err instanceof Error ? err.message : 'Command failed');
      } finally {
        setIsRunning(false);
        inputRef.current?.focus();
      }
    },
    [input, isRunning, disabled, onExec, workDir, addLine]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length === 0) return;
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setInput('');
          return;
        }
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
    },
    [history, historyIndex]
  );

  return (
    <div className="flex flex-col bg-[#0a0a0a] border-t border-white/10 h-full">
      <div className="h-8 border-b border-white/5 flex items-center justify-between px-3 bg-black/50 shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3 h-3 text-accent" />
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            Terminal
          </span>
          {disabled && (
            <span className="text-[9px] font-mono text-yellow-500/70">(No sandbox)</span>
          )}
        </div>
        <button
          onClick={() =>
            setLines([{ id: lineIdRef.current++, type: 'system', content: 'Terminal cleared.' }])
          }
          className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white transition-colors"
          title="Clear"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed custom-scrollbar"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              'whitespace-pre-wrap break-all py-0.5',
              line.type === 'input' && 'text-accent font-bold',
              line.type === 'output' && 'text-white/80',
              line.type === 'error' && 'text-red-400',
              line.type === 'system' && 'text-white/30 italic'
            )}
          >
            {line.content}
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-white/30 py-0.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px]">Running...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-1">
          <ChevronRight className="w-3 h-3 text-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning || disabled}
            placeholder={disabled ? 'Create a sandbox first' : 'Type a command...'}
            className="flex-1 bg-transparent text-white/90 outline-none font-mono text-[11px] placeholder:text-white/20 caret-accent"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';
export default Terminal;
