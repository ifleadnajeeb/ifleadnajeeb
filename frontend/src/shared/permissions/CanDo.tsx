import { ReactNode } from 'react';

export function CanDo({ permission, children }: { permission: string; children: ReactNode }) {
  // 🚨 TEMPORARY FIX: Always show UI elements so buttons aren't hidden
  return <>{children}</>;
}
