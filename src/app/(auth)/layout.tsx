import type { ReactNode } from 'react';

import { BrandPanel } from '@/components/auth/brand-panel';
import './auth.css';


export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <BrandPanel />
        <main className="auth-main">
          <div className="auth-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
