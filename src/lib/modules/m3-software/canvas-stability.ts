/** Two identical canvas draws → different hashes = noise / RFP */
export async function sampleCanvasStability(): Promise<boolean> {
  const draw = () => {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 50;
    const ctx = c.getContext('2d');
    if (!ctx) return 'x';
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#111';
    ctx.font = '14px Arial';
    ctx.fillText('stability Σ 🔥', 4, 20);
    return c.toDataURL();
  };
  const a = draw();
  await new Promise((r) => setTimeout(r, 20));
  const b = draw();
  return a !== b;
}
