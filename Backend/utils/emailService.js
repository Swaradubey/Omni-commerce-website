/**
 * Email Service Utility
 * ---------------------
 * Provides a reusable nodemailer transporter for sending emails.
 * Reads SMTP configuration from environment variables.
 *
 * Required env vars (add to Backend/.env):
 *   SMTP_HOST        – e.g. smtp.gmail.com
 *   SMTP_PORT        – e.g. 587
 *   SMTP_SECURE      – "true" for port 465, "false" for STARTTLS (587)
 *   SMTP_USER        – sender email address
 *   SMTP_PASS        – app-specific password (Gmail: https://myaccount.google.com/apppasswords)
 *   SMTP_FROM_NAME   – display name for "From" (optional, defaults to "RetailVerse")
 */

const nodemailer = require("nodemailer");

let _transporter = null;

/**
 * Returns a lazily-created nodemailer transporter.
 * Throws a clear error when SMTP env vars are missing.
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in Backend/.env"
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  console.log(`[emailService] Transporter created — host=${host}, port=${port}, user=${user}`);
  return _transporter;
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 * @returns {Promise<{ messageId: string }>}
 */
async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "RetailVerse";
  const fromAddr = process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

  console.log(`[emailService] Email sent to ${to} — messageId=${info.messageId}`);
  return { messageId: info.messageId };
}

/**
 * Build a premium HTML invoice email body.
 * @param {object} invoice – invoice data (same shape as latestInvoiceData on the frontend)
 * @returns {string} HTML string
 */
function buildInvoiceEmailHtml(invoice) {
  const formatCurrency = (n) => {
    const num = Number(n) || 0;
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const issueDate = new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const itemsHtml = (invoice.items || [])
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #f0e6d2;">
        <td style="padding: 14px 16px; font-weight: 600; color: #111111; font-size: 14px;">${item.name}</td>
        <td style="padding: 14px 16px; text-align: center; color: #666; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 14px 16px; text-align: right; color: #666; font-size: 14px;">${formatCurrency(item.price)}</td>
        <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: #111111; font-size: 14px;">${formatCurrency(item.subtotal || item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f0e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #fffcf5; border-radius: 16px; border: 1px solid #e6d5b8; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f0e6d2;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 5px; height: 32px; background-color: #b89146; border-radius: 3px; vertical-align: middle; margin-right: 10px;"></div>
                    <span style="font-size: 28px; font-weight: 900; color: #111111; letter-spacing: -0.5px; vertical-align: middle;">INVOICE</span>
                    <br>
                    <span style="font-size: 14px; font-weight: 700; color: #b89146; letter-spacing: 1px; margin-top: 4px; display: inline-block;">${invoice.invoiceNumber}</span>
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <div style="display: inline-block; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      ✓ ${invoice.paymentStatus === "paid" || invoice.paymentStatus === "Paid" || invoice.paymentStatus === "Completed" ? "Payment Success" : invoice.paymentStatus || "Completed"}
                    </div>
                    <br>
                    <span style="font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1.5px;">Issue Date</span>
                    <br>
                    <span style="font-size: 14px; font-weight: 700; color: #111111;">${issueDate}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer & Payment Info -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: top; width: 50%;">
                    <span style="font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 2px;">Billed To</span>
                    <div style="margin-top: 8px; background: rgba(255,255,255,0.6); border-radius: 10px; border: 1px solid #f0e6d2; padding: 12px;">
                      <div style="font-size: 14px; font-weight: 700; color: #111111;">${invoice.customerName || "POS Customer"}</div>
                      ${invoice.customerEmail ? `<div style="font-size: 12px; color: #888; margin-top: 6px; font-style: italic;">${invoice.customerEmail}</div>` : ""}
                    </div>
                  </td>
                  <td style="vertical-align: top; width: 50%; text-align: right;">
                    <span style="font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 2px;">Payment Method</span>
                    <div style="margin-top: 8px; background: rgba(255,255,255,0.6); border-radius: 10px; border: 1px solid #f0e6d2; padding: 12px; display: inline-block; min-width: 140px; text-align: right;">
                      <div style="font-size: 14px; font-weight: 700; color: #111111;">${invoice.paymentMethod || "N/A"}</div>
                      <div style="font-size: 10px; color: #059669; margin-top: 4px; font-weight: 700; text-transform: uppercase;">Verified Transaction</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order ID -->
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <span style="font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1.5px;">Order ID:</span>
              <span style="font-size: 11px; font-weight: 700; color: #111111; font-family: monospace; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #f0e6d2; margin-left: 4px;">${invoice.orderId || "N/A"}</span>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; border: 1px solid #f0e6d2; overflow: hidden;">
                <thead>
                  <tr style="background-color: rgba(184, 145, 70, 0.08);">
                    <th style="padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 1.5px;">Item</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 1.5px;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 1.5px;">Price</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 1.5px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left: auto; min-width: 240px; background: rgba(184,145,70,0.05); border-radius: 12px; border: 1px solid #f0e6d2; padding: 16px;">
                <tr>
                  <td style="padding: 8px 16px; font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase;">Subtotal</td>
                  <td style="padding: 8px 16px; font-size: 12px; font-weight: 700; color: #111111; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 16px; font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase;">GST / Tax</td>
                  <td style="padding: 8px 16px; font-size: 12px; font-weight: 700; color: #111111; text-align: right;">${formatCurrency(invoice.tax || 0)}</td>
                </tr>
                <tr style="border-top: 1px solid rgba(184,145,70,0.2);">
                  <td style="padding: 12px 16px; font-size: 10px; font-weight: 900; color: #b89146; text-transform: uppercase; letter-spacing: 2px;">Grand Total</td>
                  <td style="padding: 12px 16px; font-size: 20px; font-weight: 900; color: #111111; text-align: right;">${formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #f0e6d2; background-color: rgba(184,145,70,0.03);">
              <p style="margin: 0; font-size: 12px; color: #999; font-style: italic;">Thank you for your business. We hope to see you again soon!</p>
              <p style="margin: 8px 0 0 0; font-size: 10px; color: #ccc;">This invoice was generated automatically by RetailVerse POS.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { sendEmail, buildInvoiceEmailHtml, getTransporter };
