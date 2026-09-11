import type { EasingStop } from "./easing-stops";

/** Resizes the canvas to what css gave it, which also wipes whatever was drawn before */
export function resetPlot(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = canvas.clientWidth * pixelRatio;
  canvas.height = canvas.clientHeight * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { context, width: canvas.clientWidth, height: canvas.clientHeight };
}

/** Draws the curve the stops rebuild. A tighter budget shows its cost here */
export function drawPlot(canvas: HTMLCanvasElement, sampledValues: number[], stops: EasingStop[]) {
  const prepared = resetPlot(canvas);
  if (!prepared) return;

  const { context, width, height } = prepared;

  const lowest = Math.min(...sampledValues, 0);
  const highest = Math.max(...sampledValues, 1);
  const padding = 12;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const toX = (time: number) => padding + time * plotWidth;
  const toY = (value: number) => padding + plotHeight - ((value - lowest) / (highest - lowest)) * plotHeight;

  context.strokeStyle = getComputedStyle(canvas).color;
  context.fillStyle = context.strokeStyle;

  context.globalAlpha = 0.2;
  context.lineWidth = 1;
  for (const value of [0, 1]) {
    context.beginPath();
    context.moveTo(padding, toY(value));
    context.lineTo(padding + plotWidth, toY(value));
    context.stroke();
  }

  context.globalAlpha = 1;
  context.lineWidth = 1.5;
  context.beginPath();
  stops.forEach((stop, index) => {
    const x = toX(stop.position / 100);
    const y = toY(stop.value);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}
