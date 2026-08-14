import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export default function MultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = '全部',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (item) => {
    const normalized = String(item);
    const arr = Array.isArray(value) ? value.map(v => String(v)) : [];
    let next;
    if (arr.includes(normalized)) {
      next = arr.filter(v => v !== normalized);
    } else {
      next = [...arr, normalized];
    }
    onChange(next);
  };

  const remove = (e, item) => {
    e.stopPropagation();
    const normalized = String(item);
    const arr = Array.isArray(value) ? value.map(v => String(v)) : [];
    onChange(arr.filter(v => v !== normalized));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedCount = Array.isArray(value) ? value.length : 0;
  const displayText = selectedCount === 0
    ? placeholder
    : selectedCount <= 2
      ? (Array.isArray(value) ? value.map(v => String(v)).join(' / ') : '')
      : `已选 ${selectedCount} 项`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors cursor-pointer min-w-[120px] max-w-[200px] ${
          open
            ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : selectedCount > 0
              ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        {selectedCount > 0 && !disabled && (
          <span
            role="button"
            onClick={clearAll}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-w-[260px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">无选项</div>
          )}
          {options.map((opt) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const val = typeof opt === 'string' ? opt : opt.value;
            const normalized = String(val);
            const isSelected = Array.isArray(value) && value.map(v => String(v)).includes(normalized);
            return (
              <div
                key={normalized}
                onClick={() => toggle(val)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs ${
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-gray-300 dark:border-slate-500'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
