import React from 'react';
import { ConfigProvider, Modal as AntModal, Switch } from 'antd';
import type { ThemeConfig } from 'antd';
import { X } from 'lucide-react';
import './controls.css';

const createEditorTheme = (primaryColor: string): ThemeConfig => ({
  token: {
    colorPrimary: primaryColor,
    colorInfo: primaryColor,
    colorLink: primaryColor,
    borderRadius: 6,
    borderRadiusLG: 8,
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    colorBorder: '#d9d9d9',
    colorText: 'rgba(0,0,0,.88)',
    colorTextSecondary: 'rgba(0,0,0,.65)',
    colorBgContainer: '#fff',
    boxShadowSecondary: '0 6px 16px 0 rgba(0,0,0,.08), 0 3px 6px -4px rgba(0,0,0,.12), 0 9px 28px 8px rgba(0,0,0,.05)',
    fontSize: 14,
  },
  components: {
    Button: { borderRadius: 6, controlHeight: 32, paddingInline: 15 },
    Input: { activeBorderColor: primaryColor, hoverBorderColor: primaryColor, activeShadow: `0 0 0 2px ${primaryColor}1f` },
    Select: { activeBorderColor: primaryColor, hoverBorderColor: primaryColor, optionSelectedBg: `${primaryColor}12` },
    Switch: { colorPrimary: primaryColor, colorPrimaryHover: primaryColor },
    Modal: { borderRadiusLG: 8 },
  },
});

export const SiteEditorDesignProvider = ({ children, primaryColor = '#1A3D2E' }: { children: React.ReactNode; primaryColor?: string }) => <ConfigProvider theme={createEditorTheme(primaryColor)}>{children}</ConfigProvider>;

export const EditorSwitch = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => <Switch size="small" checked={value} onChange={onChange} />;

export const EditorModal = ({ title, children, footer, onClose, width = 520 }: { title: string; children: React.ReactNode; footer: React.ReactNode; onClose: () => void; width?: number }) => <AntModal open title={title} onCancel={onClose} footer={<div className="site-editor-modal-footer">{footer}</div>} closeIcon={<X className="h-4 w-4" />} width={width} centered destroyOnHidden>{children}</AntModal>;
