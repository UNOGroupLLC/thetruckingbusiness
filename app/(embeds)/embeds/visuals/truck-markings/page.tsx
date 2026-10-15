import TruckMarkings from '@/components/TruckMarkings';

export const instant = false;

export default function EmbedTruckMarkings() {
  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ color: '#0a1a36', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
        What goes on the truck door
      </h2>
      <p style={{ color: '#5b6a82', fontSize: 13.5, margin: '0 0 16px' }}>
        Tap a marking to see whether the law requires it. Only two lines are federally required; the rest are optional.
      </p>
      <TruckMarkings />
      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#5b6a82', marginTop: 12 }}>
        Interactive by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#1755a8' }}>TheTruckingBusiness.com</a>
      </p>
    </div>
  );
}
