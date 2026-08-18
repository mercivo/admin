import React from 'react';
import { Form, Input } from 'antd';
import type { FormItemProps, FormProps, InputProps } from 'antd';
import type { PasswordProps } from 'antd/es/input/Password';

type AppFormProps = Omit<FormProps, 'children'> & { children?: React.ReactNode };

export const AppForm: React.FC<AppFormProps> = ({ className = '', children, ...props }) => (
  <Form
    {...props}
    layout="vertical"
    requiredMark={false}
    size="middle"
    className={`[&_.ant-form-item]:mb-3 [&_.ant-form-item-label]:pb-1 [&_.ant-form-item-label>label]:text-xs [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-muted-foreground ${className}`}
  >{children}</Form>
);

export const AppFormItem: React.FC<FormItemProps> = props => <Form.Item {...props} />;

export const AppInput: React.FC<InputProps> = props => <Input variant="filled" {...props} />;

export const AppPasswordInput: React.FC<PasswordProps> = props => <Input.Password variant="filled" {...props} />;
