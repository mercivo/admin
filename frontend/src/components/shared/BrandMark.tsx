import React from 'react';

interface BrandMarkProps {
  size?: number;
}

const BrandMark: React.FC<BrandMarkProps> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="9" fill="url(#brandGrad)" />
    <defs>
      <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A899FF" />
        <stop offset="100%" stopColor="#7C6EF5" />
      </linearGradient>
    </defs>
    <path d="M7 22V10L12.5 17L16 10L19.5 17L25 10V22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 10L19 7L22 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default BrandMark;