import SosMap from '@/components/SosMap';

export const instant = false;

export default function EmbedSosMap() {
  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ color: '#0a1a36', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
        Find your state's filing office
      </h2>
      <p style={{ color: '#5b6a82', fontSize: 13.5, margin: '0 0 16px' }}>
        Click your state to open its official business-entity filing page (Secretary of State or equivalent).
        Links go to official government sites only.
      </p>
      <SosMap />
      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#5b6a82', marginTop: 12 }}>
        Interactive by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#1755a8' }}>TheTruckingBusiness.com</a>
      </p>
    </div>
  );
}
