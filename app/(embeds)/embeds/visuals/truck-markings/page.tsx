import TruckMarkings from '@/components/TruckMarkings';

export const instant = false;

export default function EmbedTruckMarkings() {
  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ color: '#0b2e4f', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
        What goes on the truck door
      </h2>
      <p style={{ color: '#5b6b7b', fontSize: 14, margin: '0 0 16px' }}>
        Tap a marking to see whether the law requires it. Only two lines are federally required; the rest are optional.
      </p>
      <TruckMarkings />
      <p style={{ textAlign: 'center', fontSize: 12, color: '#5b6b7b', marginTop: 12 }}>
        Interactive by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#0b5cad' }}>TheTruckingBusiness.com</a>
      </p>
    </div>
  );
}
