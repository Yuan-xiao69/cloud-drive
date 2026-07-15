import { useState, useEffect } from 'react';

/**
 * 防抖 hook：value 变化后延迟 delay 毫秒才更新返回值
 * 新值到达时会自动清除上一次的定时器
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
