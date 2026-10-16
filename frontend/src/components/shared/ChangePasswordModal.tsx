import React, { useEffect, useState } from "react";
import { Input, message } from "antd";
import api from "../../services/api";
import { AppModal } from "./AppModal";
import { ModalFormField, modalFormClassName } from "./ModalForm";

interface ChangePasswordModalProps { open: boolean; onClose: () => void }
const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);
  const account = (() => {
    try { return String(JSON.parse(localStorage.getItem("mercivo_user") || "{}").account || ""); }
    catch { return ""; }
  })();
  useEffect(() => { if (!open) setPasswords(EMPTY_PASSWORDS); }, [open]);
  const submit = async () => {
    if (passwords.newPassword.length < 8) return message.error("新密码至少 8 位");
    if (passwords.newPassword !== passwords.confirmPassword) return message.error("两次输入的新密码不一致");
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      message.success("密码修改成功"); onClose();
    } catch { message.error("密码修改失败，请检查当前密码"); }
    finally { setSaving(false); }
  };
  return <AppModal open={open} title="修改密码" description="修改当前登录账号的密码，新密码至少 8 位。" width={520} okText="确认修改" cancelText="取消" confirmLoading={saving} okButtonProps={{ disabled: !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword }} onCancel={onClose} onOk={() => void submit()}>
    <form className={modalFormClassName} onSubmit={event => { event.preventDefault(); void submit(); }}>
      <input name="username" autoComplete="username" value={account} readOnly tabIndex={-1} aria-hidden="true" className="pointer-events-none fixed -left-[10000px] h-px w-px opacity-0" />
      <ModalFormField label="当前密码" required><Input.Password autoComplete="current-password" value={passwords.currentPassword} onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))} variant="filled" /></ModalFormField>
      <ModalFormField label="新密码" required><Input.Password autoComplete="new-password" value={passwords.newPassword} onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))} variant="filled" /></ModalFormField>
      <ModalFormField label="确认新密码" required><Input.Password autoComplete="new-password" value={passwords.confirmPassword} onChange={event => setPasswords(current => ({ ...current, confirmPassword: event.target.value }))} variant="filled" /></ModalFormField>
    </form>
  </AppModal>;
};
