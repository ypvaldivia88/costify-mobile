import { useEffect, useState } from 'react';
import {
  formatNumericDisplay,
  isNumericPartial,
  parseNumericInput,
} from '@/format/numeric-input';

interface UseNumericFieldOptions {
  value: number;
  onChange: (value: number) => void;
}

export function useNumericField({ value, onChange }: UseNumericFieldOptions) {
  const [text, setText] = useState(() => formatNumericDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatNumericDisplay(value));
    }
  }, [value, focused]);

  const handleChange = (raw: string) => {
    const normalized = raw.replace(',', '.');
    if (!isNumericPartial(normalized)) return;
    setText(normalized);
    onChange(parseNumericInput(normalized));
  };

  const handleFocus = () => setFocused(true);

  const handleBlur = () => {
    setFocused(false);
    if (text.trim() === '') {
      setText('');
      return;
    }
    const parsed = parseNumericInput(text);
    setText(Number.isFinite(parsed) ? String(parsed) : '');
  };

  return {
    text,
    handleChange,
    handleFocus,
    handleBlur,
  };
}
