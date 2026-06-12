import { useState, useCallback, useEffect } from 'react';
import { Enc, Dec, createDefaultWenyanConfig, createDefaultAdvancedConfig } from './lib/CoreHandler';
import { stringToUint8Array } from './lib/Misc';
import type { WenyanConfig, AdvancedEncConfig } from './lib/CoreHandler';

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [key, setKey] = useState('ABRACADABRA');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [randomness, setRandomness] = useState(50);
  const [isDark, setIsDark] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Wenyan options
  const [punctuation, setPunctuation] = useState(true);
  const [pianwen, setPianwen] = useState(false);
  const [logicPriority, setLogicPriority] = useState(false);
  const [removePunctuation, setRemovePunctuation] = useState(false);
  const [traditional, setTraditional] = useState(false);

  // Advanced encryption options
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [useStrongIV, setUseStrongIV] = useState(true);
  const [useHMAC, setUseHMAC] = useState(false);
  const [usePBKDF2, setUsePBKDF2] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleProcess = useCallback(() => {
    setError('');
    setOutput('');

    if (!input.trim()) {
      setError('请输入文本');
      return;
    }

    if (!key.trim()) {
      setError('请输入密钥');
      return;
    }

    try {
      if (mode === 'encrypt') {
        const wenyanConfig: WenyanConfig = {
          ...createDefaultWenyanConfig(),
          PunctuationMark: punctuation && !removePunctuation,
          RandomIndex: randomness,
          PianwenMode: pianwen,
          LogicMode: logicPriority,
          Traditional: traditional,
        };

        const advancedConfig: AdvancedEncConfig = {
          ...createDefaultAdvancedConfig(),
          Enable: useAdvanced,
          UseStrongIV: useStrongIV,
          UseHMAC: useHMAC,
          UsePBKDF2: usePBKDF2,
        };

        const inputBytes = stringToUint8Array(input);
        const result = Enc(inputBytes, key, wenyanConfig, advancedConfig);
        setOutput(result);
      } else {
        try {
          const result = Dec(input, key);
          setOutput(result);
        } catch (decErr: any) {
          setError(decErr.message || '解密失败');
        }
      }
    } catch (err: any) {
      setError(err.message || '处理失败，请检查输入和密钥');
    }
  }, [input, key, mode, randomness, punctuation, pianwen, logicPriority, removePunctuation, traditional, useAdvanced, useStrongIV, useHMAC, usePBKDF2]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const handleSwap = useCallback(() => {
    setInput(output);
    setOutput('');
    setMode(m => m === 'encrypt' ? 'decrypt' : 'encrypt');
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 dark:from-black dark:via-purple-950/50 dark:to-black transition-colors duration-500">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white text-lg">🔮</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                CipherWeave
              </h1>
              <p className="text-[10px] text-white/40 -mt-0.5">密文编织 · 文言文加密</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <a
              href="https://github.com/watermelontip/cipherweave"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            密文编织
          </h2>
          <p className="text-white/40 text-sm">将文字编织成文言文密文，支持密钥加密与多重混淆</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => setMode('encrypt')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'encrypt'
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              🔒 加密
            </button>
            <button
              onClick={() => setMode('decrypt')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'decrypt'
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              🔓 解密
            </button>
          </div>
        </div>

        {/* Input/Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Input */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-white/60">
                {mode === 'encrypt' ? '📝 明文输入' : '🔮 密文输入'}
              </span>
              <button onClick={handleClear} className="text-xs text-white/30 hover:text-red-400 transition-colors">
                清空
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encrypt' ? '输入要加密的文字...' : '输入要解密的密文...'}
              className="w-full h-48 p-4 bg-transparent text-white/90 text-sm leading-relaxed resize-none outline-none placeholder-white/20 font-mono"
              spellCheck={false}
            />
          </div>

          {/* Output */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-white/60">
                {mode === 'encrypt' ? '🔮 密文输出' : '📝 明文输出'}
              </span>
              {output && (
                <button
                  onClick={handleCopy}
                  className={`text-xs transition-colors ${copied ? 'text-green-400' : 'text-white/30 hover:text-purple-400'}`}
                >
                  {copied ? '✓ 已复制' : '复制'}
                </button>
              )}
            </div>
            <div className="h-48 p-4 overflow-auto">
              {error ? (
                <p className="text-red-400 text-sm">{error}</p>
              ) : output ? (
                <p className="text-white/90 text-sm leading-relaxed font-mono whitespace-pre-wrap">{output}</p>
              ) : (
                <p className="text-white/20 text-sm">结果将在此显示...</p>
              )}
            </div>
          </div>
        </div>

        {/* Key + Actions */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Key input */}
            <div className="flex-1 w-full">
              <label className="text-xs text-white/40 mb-1.5 block">🔑 密钥</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="输入密钥..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/90 text-sm outline-none focus:border-purple-500/50 transition-colors font-mono"
              />
            </div>

            {/* Randomness slider */}
            <div className="w-full sm:w-48">
              <label className="text-xs text-white/40 mb-1.5 block">🎲 随机度: {randomness}</label>
              <input
                type="range"
                min={1}
                max={100}
                value={randomness}
                onChange={(e) => setRandomness(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleProcess}
                className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95"
              >
                {mode === 'encrypt' ? '🔒 加密' : '🔓 解密'}
              </button>
              <button
                onClick={handleSwap}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all"
                title="交换输入输出"
              >
                ⇄
              </button>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/60">⚙️ 选项</h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showAdvanced ? '收起高级选项' : '展开高级选项'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <ToggleOption
              label="添加标点"
              checked={punctuation}
              onChange={setPunctuation}
              description="密文中添加中文标点"
            />
            <ToggleOption
              label="骈文格律"
              checked={pianwen}
              onChange={setPianwen}
              description="强制生成骈文密文"
            />
            <ToggleOption
              label="逻辑优先"
              checked={logicPriority}
              onChange={setLogicPriority}
              description="强制生成逻辑密文"
            />
            <ToggleOption
              label="去除标点"
              checked={removePunctuation}
              onChange={setRemovePunctuation}
              description="去除所有标点符号"
            />
            <ToggleOption
              label="繁體中文"
              checked={traditional}
              onChange={setTraditional}
              description="输出繁体中文"
            />
          </div>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-xs text-white/40 mb-3">🔐 高级加密</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ToggleOption
                  label="启用高级加密"
                  checked={useAdvanced}
                  onChange={setUseAdvanced}
                  description="AES-256-CTR 加密"
                />
                <ToggleOption
                  label="强 IV"
                  checked={useStrongIV}
                  onChange={setUseStrongIV}
                  description="使用完整 16 字节 IV"
                  disabled={!useAdvanced}
                />
                <ToggleOption
                  label="HMAC 签名"
                  checked={useHMAC}
                  onChange={setUseHMAC}
                  description="使用 HMAC-SHA256 签名"
                  disabled={!useAdvanced}
                />
                <ToggleOption
                  label="PBKDF2 密钥衍生"
                  checked={usePBKDF2}
                  onChange={setUsePBKDF2}
                  description="对密钥加盐衍生"
                  disabled={!useAdvanced}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center text-xs text-white/20 space-y-1">
          <p>CipherWeave · 密文编织 · 基于 Abracadabra 加密算法</p>
          <p>与 Abracadabra 加密格式兼容</p>
        </div>
      </main>
    </div>
  );
}

function ToggleOption({ label, checked, onChange, description, disabled = false }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
        disabled
          ? 'border-white/5 opacity-40 cursor-not-allowed'
          : checked
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
      disabled={disabled}
    >
      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
        checked ? 'border-purple-500 bg-purple-500' : 'border-white/20'
      }`}>
        {checked && <span className="text-white text-[10px]">✓</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{label}</p>
        <p className="text-[10px] text-white/30 truncate">{description}</p>
      </div>
    </button>
  );
}

export default App;
