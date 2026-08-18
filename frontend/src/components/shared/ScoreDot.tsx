import React from 'react';

interface ScoreDotProps {
  score: number;
}

const ScoreDot: React.FC<ScoreDotProps> = ({ score }) => {
  const color = score >= 85 ? '#10B981' : score >= 65 ? '#F59E0B' : '#9CA3AF';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1E1B35' }}>{score}</span>
    </div>
  );
};

export default ScoreDot;