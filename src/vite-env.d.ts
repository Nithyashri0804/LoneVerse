/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (request: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeAllListeners: (event: string) => void;
  };
}
