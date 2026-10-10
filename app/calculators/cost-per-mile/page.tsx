import Link from 'next/link';
import CostPerMileCalculator from '@/components/CostPerMileCalculator';

export const metadata = {
  title: 'Cost-Per-Mile Calculator — The Trucking Business',
  description: 'Calculate your true operating cost per mile: loaded and empty miles, fixed and variable costs, fuel, and profit goals.',
};

export default function CostPerMilePage() {
  return (
    <div className="bg-mist py-10">
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/calculators" className="text-sm font-bold text-dotblue hover:underline">
          ← All calculators
        </Link>
        <div className="mt-4">
          <CostPerMileCalculator />
        </div>
      </div>
    </div>
  );
}
