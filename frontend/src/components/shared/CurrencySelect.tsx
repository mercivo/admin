import React from 'react';
import { Select } from 'antd';

export interface CurrencySelectOption {
  code: string;
  symbol: string;
}

export const CurrencySelect: React.FC<{
  value: string;
  currencies: CurrencySelectOption[];
  onChange: (value: string) => void;
  className?: string;
}> = ({ value, currencies, onChange, className = 'w-40' }) => (
  <Select
    className={className}
    value={value}
    onChange={onChange}
    options={currencies.map((item) => ({
      value: item.code,
      label: `${item.code} · ${item.symbol}`,
    }))}
  />
);
