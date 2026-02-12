'use client';

import dynamic from 'next/dynamic';

const AiAssistant = dynamic(() => import('@/components/AiAssistant'), {
  ssr: false,
});

export default function AiAssistantLazy() {
  return <AiAssistant />;
}
