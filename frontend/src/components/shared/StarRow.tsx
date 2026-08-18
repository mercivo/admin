import React from 'react';
import { StarFilled, StarOutlined } from '@ant-design/icons';

interface StarRowProps {
  rating: number;
  size?: 'sm' | 'md';
}

const StarRow: React.FC<StarRowProps> = ({ rating, size = 'sm' }) => {
  const fontSize = size === 'sm' ? 12 : 16;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? (
          <StarFilled key={i} style={{ fontSize, color: '#F59E0B' }} />
        ) : (
          <StarOutlined key={i} style={{ fontSize, color: '#D1D5DB' }} />
        )
      )}
    </div>
  );
};

export default StarRow;