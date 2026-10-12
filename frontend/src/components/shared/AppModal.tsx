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

const AppModalBase: React.FC<AppModalProps> = ({ title, description, children, className = '', styles, width, okButtonProps, ...props }) => {
  const confirmLike = width === 440 && (Boolean(okButtonProps?.danger) || (typeof title === 'string' && /确认|删除|移除|下架|取消/.test(title)));
  const modalStyles: AppModalProps['styles'] = {
    ...styles,
    body: { maxHeight: '72vh', overflowY: 'auto', ...styles?.body },
  };
  return <Modal
    centered
    destroyOnHidden
    className={`app-modal ${confirmLike ? 'app-confirm-modal' : ''} ${className}`.trim()}
    title={<div className="app-modal-heading"><div className="app-modal-title">{title}</div>{description && <div className="app-modal-description">{description}</div>}</div>}
    styles={modalStyles}
    width={width}
    okButtonProps={okButtonProps}
    {...props}
  >
    {children}
  </Modal>;
};

export const AppModal = Object.assign(AppModalBase, {
  confirm: ({ title, content, okButtonProps, ...props }: ModalFuncProps) => Modal.confirm({
    centered: true,
    width: 440,
    className: 'app-modal app-confirm-modal',
    icon: <div className={`app-confirm-icon ${okButtonProps?.danger ? 'is-danger' : ''}`}>!</div>,
    cancelText: '取消',
    title: <div className="app-confirm-content-title">{title}</div>,
    content: <div className="app-confirm-message">{content}</div>,
    okButtonProps,
    ...props,
  }),
}) as AppModalComponent;
