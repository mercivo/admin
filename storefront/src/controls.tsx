import React from 'react';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { ConfigProvider, Dropdown } from 'antd';
import type { MenuProps } from 'antd';

export type SelectOption = { value: string; label: string };

export const AntSelect = ({ value, options, onChange, className = '', label = '请选择', disabled = false }: { value: string; options: SelectOption[]; onChange: (value: string) => void; className?: string; label?: string; disabled?: boolean }) => {
  const selected = options.find(option => option.value === value);
  const items: MenuProps['items'] = options.map(option => ({
    key: option.value,
    label: <span className="dropdown-option-label"><span>{option.label}</span>{option.value === value && <CheckOutlined />}</span>,
  }));
  return <ConfigProvider theme={{ token: { colorPrimary: 'var(--theme)', borderRadius: 10 }, components: { Dropdown: { paddingBlock: 7 } } }}>
    <Dropdown
      menu={{ items, selectable: true, selectedKeys: [value], onClick: info => onChange(info.key) }}
      trigger={['click']}
      disabled={disabled}
      placement="bottomRight"
      overlayClassName={`storefront-dropdown ${className.includes('language-select') ? 'language-dropdown-overlay' : 'category-dropdown-overlay'}`}
      getPopupContainer={() => document.body}
    >
      <button type="button" className={`dropdown-trigger ${className}`} aria-label={label} aria-haspopup="menu" disabled={disabled} onClick={event => event.preventDefault()}><span>{selected?.label || value}</span><DownOutlined /></button>
    </Dropdown>
  </ConfigProvider>;
};
