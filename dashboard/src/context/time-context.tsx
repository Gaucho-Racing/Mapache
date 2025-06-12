// src/context/TimeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

const TimeContext = createContext<number>(Date.now());

export const useNow = () => useContext(TimeContext);

export const TimeProvider: React.FC<{
  interval?: number;
  children: React.ReactNode;
}> = ({ interval = 100, children }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);

  return <TimeContext.Provider value={now}>{children}</TimeContext.Provider>;
};
