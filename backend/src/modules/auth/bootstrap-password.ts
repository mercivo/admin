export function normalizeBootstrapPassword(value: string | undefined): string {
  // Secret Manager values are commonly created with `echo`, which appends a
  // newline. Cloud Run preserves that byte when exposing the secret as an
  // environment variable, but users cannot enter it in the login form.
  return (value || '').replace(/[\r\n]+$/, '');
}
