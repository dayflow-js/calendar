import type { Metadata } from 'next';

import { MobileEventDetailSimulator } from '@/components/showcase/mobile-event-detail/MobileEventDetailSimulator';

export const metadata: Metadata = {
  title: 'Mobile Event Detail Simulator',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MobileEventDetailSimulatorPage() {
  return <MobileEventDetailSimulator />;
}
