import React from 'react';

const join = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(' ');

/** Canonical label-value layout for every data-entry AppModal. */
export const modalFormClassName = 'app-modal-form';

export const ModalForm: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={join(modalFormClassName, className)}>{children}</div>
);

export const ModalFormGrid: React.FC<{ children: React.ReactNode; columns?: 1 | 2 | 3 | 4; className?: string }> = ({ children, columns = 2, className }) => (
  <div className={join('app-modal-form-grid', `app-modal-form-grid-${columns}`, className)}>{children}</div>
);

export const ModalFormField: React.FC<{ label: React.ReactNode; required?: boolean; children: React.ReactNode; className?: string }> = ({ label, required, children, className }) => (
  <label className={join('app-modal-form-field', className)}>
    <span className="app-modal-form-label">{required && <span className="app-modal-form-required">*</span>}{label}</span>
    {children}
  </label>
);
