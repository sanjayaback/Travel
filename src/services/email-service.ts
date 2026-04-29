export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  return {
    provider: "mock-resend",
    status: "queued",
    messageId: `mock-email-${Date.now()}`,
    message,
  };
}
