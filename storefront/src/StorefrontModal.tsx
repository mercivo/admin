import React from 'react';
import { ConfigProvider, Modal } from 'antd';
import type { ModalProps } from 'antd';

interface StorefrontModalProps extends Omit<ModalProps, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

export const StorefrontModal: React.FC<StorefrontModalProps> = ({ title, description, children, className = '', styles, ...props }) => (
  <ConfigProvider theme={{ token: { colorPrimary: 'var(--theme)', borderRadius: 10 }, components: { Button: { borderRadius: 10 }, Modal: { borderRadiusLG: 16 } } }}>
    <Modal
      centered
      destroyOnHidden
      className={`storefront-modal ${className}`.trim()}
      title={<div className="storefront-modal-heading"><div>{title}</div>{description && <small>{description}</small>}</div>}
      styles={styles}
      {...props}
    >
      {children}
    </Modal>
  </ConfigProvider>
);
