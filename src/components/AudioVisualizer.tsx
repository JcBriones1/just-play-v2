import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  accentColor: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqArray = new Uint8Array(32);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (isPlaying) {
        audioEngine.getFrequencyData(freqArray);
      }

      const barCount = 24;
      const barSpacing = 4;
      const totalSpacing = (barCount - 1) * barSpacing;
      const barWidth = Math.max(3, (width - totalSpacing) / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = isPlaying ? freqArray[i % freqArray.length] : 12;
        // Scale height nicely
        const normalized = val / 255;
        const minHeight = 6;
        const barHeight = Math.max(minHeight, normalized * height * 0.9);
        const x = i * (barWidth + barSpacing);
        const y = height - barHeight;

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, accentColor || '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Rounded bar top
        const radius = Math.min(barWidth / 2, 4);
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, accentColor]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm h-32 rounded-2xl bg-black/40 border border-white/10 p-3 shadow-inner flex flex-col items-center justify-between">
        <canvas
          ref={canvasRef}
          width={320}
          height={100}
          className="w-full h-full"
        />
        <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-mono pt-1">
          <span>20 Hz (SUB)</span>
          <span className="text-purple-400 font-semibold">{isPlaying ? 'LIVE SPECTRUM' : 'IDLE'}</span>
          <span>16 kHz (HIGH)</span>
        </div>
      </div>
    </div>
  );
};
