// Canvas HUD Radar Sweep
// Inspired by ThreeUI aesthetic — lightweight, performant, zero external dependencies

(function() {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = canvas.offsetWidth || 380);
  let height = (canvas.height = canvas.offsetHeight || 180);

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth || 380;
    height = canvas.height = canvas.offsetHeight || 180;
  });

  let angle = 0;
  const blips = [
    { dist: 0.35, angle: 0.8, alpha: 0.9, size: 3.5 },
    { dist: 0.65, angle: 2.2, alpha: 0.7, size: 4 },
    { dist: 0.82, angle: 4.5, alpha: 0.85, size: 3 },
    { dist: 0.50, angle: 5.6, alpha: 0.6, size: 3 }
  ];

  function getAccentColor() {
    const palette = document.documentElement.dataset.palette || 'mono';
    if (palette === 'azure') return { r: 56, g: 189, b: 248 };
    if (palette === 'moss') return { r: 52, g: 211, b: 153 };
    if (palette === 'amber') return { r: 251, g: 191, b: 36 };
    return { r: 244, g: 244, b: 245 };
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    const color = getAccentColor();
    const centerX = width * 0.82;
    const centerY = height * 0.55;
    const maxRadius = Math.min(width, height) * 0.7;

    // Concentric range circles
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const r = (maxRadius / 3) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.08 * i})`;
      ctx.stroke();
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius, centerY);
    ctx.lineTo(centerX + maxRadius, centerY);
    ctx.moveTo(centerX, centerY - maxRadius);
    ctx.lineTo(centerX, centerY + maxRadius);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.08)`;
    ctx.stroke();

    // Radar rotating beam sweep
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
    grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`);
    grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.0)`);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxRadius, -Math.PI / 4, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(maxRadius, 0);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.45)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Render discovered blips
    blips.forEach(blip => {
      const bx = centerX + Math.cos(blip.angle) * (blip.dist * maxRadius);
      const by = centerY + Math.sin(blip.angle) * (blip.dist * maxRadius);

      // Distance from current sweep beam
      let diff = (angle % (Math.PI * 2)) - (blip.angle % (Math.PI * 2));
      if (diff < 0) diff += Math.PI * 2;
      const intensity = Math.max(0.2, 1 - diff / (Math.PI * 1.5));

      ctx.beginPath();
      ctx.arc(bx, by, blip.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * blip.alpha})`;
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    angle += 0.025;
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
