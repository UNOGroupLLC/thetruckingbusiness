import StartupRoadmap from '@/components/StartupRoadmap';

export const instant = false;

export default function EmbedStartupRoadmap() {
  return (
    <div style={{ padding: 20, maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ color: '#0a1a36', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>
        Your startup roadmap — tap through the 15 steps
      </h2>
      <p style={{ color: '#5b6a82', fontSize: 13.5, margin: '0 0 16px' }}>
        Tap a step to see what it costs and where to file it. Check steps off as you finish them; your progress saves on this device.
      </p>
      <StartupRoadmap />
      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#5b6a82', marginTop: 12 }}>
        Interactive by <a href="https://www.thetruckingbusiness.com" target="_blank" rel="noopener" style={{ color: '#1755a8' }}>TheTruckingBusiness.com</a>
      </p>
    </div>
  );
}
