import { HttpStatus } from '@nestjs/common';

export const PUBLIC_ERROR_CODES = {
  SITE_NOT_FOUND_OR_UNPUBLISHED: 'SITE_NOT_FOUND_OR_UNPUBLISHED',
  CONTACT_NAME_REQUIRED: 'CONTACT_NAME_REQUIRED',
  CONTACT_METHOD_REQUIRED: 'CONTACT_METHOD_REQUIRED',
  PURCHASE_REQUIREMENTS_REQUIRED: 'PURCHASE_REQUIREMENTS_REQUIRED',
  INQUIRY_SUBMIT_FAILED: 'INQUIRY_SUBMIT_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type PublicErrorCode = typeof PUBLIC_ERROR_CODES[keyof typeof PUBLIC_ERROR_CODES];

export const publicErrorCodeFor = (path: string, status: number, messages: string[]): PublicErrorCode | undefined => {
  if (!path.startsWith('/api/v1/public/')) return undefined;
  if (messages.some(message => message.includes('联系人不能为空'))) return PUBLIC_ERROR_CODES.CONTACT_NAME_REQUIRED;
  if (messages.some(message => message.includes('联系方式不能为空'))) return PUBLIC_ERROR_CODES.CONTACT_METHOD_REQUIRED;
  if (messages.some(message => message.includes('采购需求不能为空'))) return PUBLIC_ERROR_CODES.PURCHASE_REQUIREMENTS_REQUIRED;
  if (status >= 500) return path.includes('/inquiries') ? PUBLIC_ERROR_CODES.INQUIRY_SUBMIT_FAILED : PUBLIC_ERROR_CODES.SERVICE_UNAVAILABLE;
  if (status === HttpStatus.NOT_FOUND && (path.includes('/site') || path.includes('/inquiries'))) return PUBLIC_ERROR_CODES.SITE_NOT_FOUND_OR_UNPUBLISHED;
  return PUBLIC_ERROR_CODES.UNKNOWN_ERROR;
};
