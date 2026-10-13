import UcrMap from '@/components/UcrMap';

export const instant = false;

export default function EmbedUcrMap() {
  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ color: '#0b2e4f', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
        Does your state participate in UCR?
      </h2>
      <p style={{ color: '#5b6b7b', fontSize: 14, margin: '0 0 16px' }}>
        41 states participate in the Unified Carrier Registration. Carriers based in the 9 gray states
        still must register, through a neighboring participating state.
      </p>
      <UcrMap />
      <p style={{ textAlign: 'center', fontSize: 12, color: '#5b6b7b', marginTop: 12 }}>
        Interactive by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#0b5cad' }}>TheTruckingBusiness.com</a>
      </p>
    </div>
  );
}
