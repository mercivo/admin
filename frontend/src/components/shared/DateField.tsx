import React from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

interface DateFieldProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const DateField: React.FC<DateFieldProps> = ({ value, onChange, placeholder = '请选择日期', disabled }) => (
  <DatePicker
    value={value ? dayjs(value) : null}
    onChange={date => onChange?.(date ? date.format('YYYY-MM-DD') : null)}
    format="YYYY-MM-DD"
    placeholder={placeholder}
    disabled={disabled}
    allowClear
    style={{ width: '100%' }}
  />
);
