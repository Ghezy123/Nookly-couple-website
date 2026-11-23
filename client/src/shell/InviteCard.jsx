import { useState } from 'react';
import { Copy } from 'lucide-react';

export default function InviteCard({ info }) {
  const [copied, setCopied] = useState(false);
  if (info.partner) return null;
  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div><div className="text-sm opacity-70">Kode undangan untuk pasanganmu</div><div className="font-display text-3xl font-bold tracking-[.25em]">{info.inviteCode}</div></div>
      <button className="btn-soft" onClick={() => { navigator.clipboard?.writeText(info.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={16} />{copied ? 'Tersalin' : 'Salin'}</button>
    </div>
  );
}
