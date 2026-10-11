import React from 'react';
import { Modal } from 'antd';
import type { ModalFuncProps, ModalProps } from 'antd';

export interface AppModalProps extends Omit<ModalProps, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

type AppModalComponent = React.FC<AppModalProps> & {
  confirm: (props: ModalFuncProps) => ReturnType<typeof Modal.confirm>;
};

const AppModalBase: React.FC<AppModalProps> = ({ title, description, children, className = '', styles, ...props }) => (
  <Modal
    centered
    destroyOnHidden
    className={`app-modal ${className}`.trim()}
    title={<div className="app-modal-heading"><div className="app-modal-title">{title}</div>{description && <div className="app-modal-description">{description}</div>}</div>}
    styles={styles}
    {...props}
  >
    {children}
  </Modal>
);

export const AppModal = Object.assign(AppModalBase, {
  confirm: ({ title, ...props }: ModalFuncProps) => Modal.confirm({
    centered: true,
    width: 440,
    className: 'app-modal app-confirm-modal',
    cancelText: '取消',
    title: <div className="app-modal-heading"><div className="app-modal-title">{title}</div></div>,
    ...props,
  }),
}) as AppModalComponent;
