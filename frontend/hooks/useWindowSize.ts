'use client';

import { useEffect, useState } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    function update() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}
