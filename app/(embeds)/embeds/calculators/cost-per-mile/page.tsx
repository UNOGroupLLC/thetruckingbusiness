import CostPerMileCalculator from '@/components/CostPerMileCalculator';

export const instant = false;

export default function EmbedCostPerMile() {
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <CostPerMileCalculator />
      <p style={{ textAlign: 'center', fontSize: 12, color: '#5b6b7b', marginTop: 12 }}>
        Free tool by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#0b5cad' }}>TheTruckingBusiness.com</a> — educational estimates, not quotes.
      </p>
    </div>
  );
}
