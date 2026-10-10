import Link from 'next/link';
import StartupCostCalculator from '@/components/StartupCostCalculator';

export const metadata = {
  title: 'Trucking Startup Cost Calculator — The Trucking Business',
  description: 'Estimate the startup capital for your trucking company: formation, FMCSA filings, equipment, insurance, permits, compliance, and operating reserve.',
};

export default function StartupCostPage() {
  return (
    <div className="bg-mist py-10">
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/calculators" className="text-sm font-bold text-dotblue hover:underline">
          ← All calculators
        </Link>
        <div className="mt-4">
          <StartupCostCalculator />
        </div>
      </div>
    </div>
  );
}
