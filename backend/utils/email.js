import nodemailer from 'nodemailer';

// ─── Transporter singleton ────────────────────────────────────────────────────
// Built once at module load so the SMTP connection is reused across requests.
// Returns null when email credentials are absent.

let _transporter = null;
let _transporterReady = false;

function buildTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim().replace(/\s+/g, ''); // strip spaces from App Password

  if (!user || !pass) return null;

  const host = process.env.EMAIL_HOST?.trim();
  const transportOptions = host
    ? {
      host,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
    }
    : { service: 'gmail' };

  return nodemailer.createTransport({
    ...transportOptions,
    auth: { user, pass },
    pool: true,          // reuse connections
    maxConnections: 3,
    socketTimeout: 10000,
  });
}

// Called once from server.js after env is loaded.
export async function initEmailTransport() {
  _transporter = buildTransporter();

  if (!_transporter) {
    console.warn(
      '[email] EMAIL_USER / EMAIL_PASS are not configured. OTP delivery is unavailable.',
    );
    _transporterReady = false;
    return;
  }

  try {
    await _transporter.verify();
    _transporterReady = true;
    console.log('[email] Gmail SMTP connection verified.');
  } catch (err) {
    _transporterReady = false;
    // Log the real error so the developer can diagnose it, but do not crash.
    console.error('[email] SMTP verification failed:', smtpErrorMessage(err));
    console.error(
      '[email] Check EMAIL_USER and EMAIL_PASS in backend/.env. ' +
      'Gmail requires a 16-character App Password, not your account password. ' +
      'See: https://myaccount.google.com/apppasswords',
    );
  }
}

// ─── Error classification ─────────────────────────────────────────────────────

function smtpErrorMessage(err) {
  const code = err.code || '';
  const response = err.response || '';

  if (code === 'EAUTH' || response.includes('535') || response.includes('Username and Password not accepted')) {
    return 'Gmail authentication failed. Make sure EMAIL_PASS is a Gmail App Password (not your account password).';
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ESOCKET') {
    return 'Cannot reach Gmail SMTP. Check your internet connection and firewall.';
  }
  if (response.includes('550') || response.includes('Invalid recipient')) {
    return 'The recipient email address was rejected by Gmail.';
  }
  if (response.includes('Daily user sending quota exceeded')) {
    return 'Gmail daily sending quota exceeded. Try again tomorrow or use a different account.';
  }
  return 'The email provider rejected the SMTP request.';
}

// ─── Order confirmation email ────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(to, order) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (!_transporter || !_transporterReady) {
    if (isDev) {
      console.log(`[email] ORDER CONFIRMATION (dev) → ${to} | Order: ${order._id}`);
      return;
    }
    return; // don't block order placement if email fails
  }

  const itemRows = order.items.map((item) =>
    `<tr>
      <td style="padding:8px 0;font-size:14px;color:#111110;border-bottom:1px solid #e8e6e2">${item.name}</td>
      <td style="padding:8px 0;font-size:14px;color:#111110;border-bottom:1px solid #e8e6e2;text-align:center">×${item.quantity}</td>
      <td style="padding:8px 0;font-size:14px;color:#111110;border-bottom:1px solid #e8e6e2;text-align:right">₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`,
  ).join('');

  const paymentLabel = order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery';
  const addr = order.shippingAddress;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f1;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:520px;width:100%">
        <tr><td style="background:#ff6b00;padding:20px 32px">
          <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:1px">GYMZONE.</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111110">Order Confirmed!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6c6a64">Hi ${addr.fullName}, your order has been placed successfully.</p>
          <p style="margin:0 0 4px;font-size:12px;color:#92918c;text-transform:uppercase;letter-spacing:1px">Order ID</p>
          <p style="margin:0 0 24px;font-size:13px;color:#111110;font-family:monospace">${order._id}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
            <thead><tr>
              <th style="text-align:left;font-size:11px;color:#92918c;text-transform:uppercase;padding-bottom:8px">Item</th>
              <th style="text-align:center;font-size:11px;color:#92918c;text-transform:uppercase;padding-bottom:8px">Qty</th>
              <th style="text-align:right;font-size:11px;color:#92918c;text-transform:uppercase;padding-bottom:8px">Price</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="text-align:right;font-size:16px;font-weight:700;color:#111110;margin:12px 0 24px">Total: ₹${order.subtotal.toLocaleString('en-IN')}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#92918c;text-transform:uppercase;letter-spacing:1px">Delivery Address</p>
          <p style="margin:0 0 24px;font-size:14px;color:#111110;line-height:1.6">
            ${addr.address}, ${addr.city}, ${addr.postalCode}, ${addr.country}
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#92918c;text-transform:uppercase;letter-spacing:1px">Payment</p>
          <p style="margin:0;font-size:14px;color:#111110">${paymentLabel}</p>
        </td></tr>
        <tr><td style="background:#f5f4f1;padding:16px 32px;border-top:1px solid #e8e6e2">
          <p style="margin:0;font-size:11px;color:#92918c">© ${new Date().getFullYear()} GYMZONE. Built for the work.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Order Confirmed — GYMZONE\n\nHi ${addr.fullName},\nYour order ${order._id} has been placed.\nTotal: ₹${order.subtotal.toLocaleString('en-IN')}\nPayment: ${paymentLabel}\nDelivery: ${addr.address}, ${addr.city}, ${addr.postalCode}, ${addr.country}`;

  try {
    await _transporter.sendMail({
      from: `"GYMZONE" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Order Confirmed — GYMZONE #${order._id}`,
      html,
      text,
    });
    console.log(`[email] Order confirmation sent to ${to}`);
  } catch (err) {
    // Don't throw — order is already placed, email failure should not affect the response
    console.error('[email] Order confirmation email failed:', err.message);
  }
}

// ─── Public send function ─────────────────────────────────────────────────────

export async function sendOtpEmail(to, otp, purpose) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Always log in dev so you can test without real email.
  if (isDev) {
    console.log(`\n[email] ─────────────────────────────────────`);
    console.log(`[email] TO      : ${to}`);
    console.log(`[email] PURPOSE : ${purpose}`);
    console.log(`[email] OTP     : ${otp}`);
    console.log(`[email] EXPIRES : 5 minutes`);
    console.log(`[email] ─────────────────────────────────────\n`);
  }

  if (!_transporter || !_transporterReady) {
    if (isDev) return; // OTP already printed to console above
    const error = new Error('Email delivery is unavailable. Check the backend email configuration and try again.');
    error.status = 503;
    throw error;
  }

  const isVerify = purpose === 'verify_email';
  const subject = isVerify ? 'Your GYMZONE email verification code' : 'Your GYMZONE password reset code';
  const heading = isVerify ? 'Verify your email' : 'Reset your password';
  const bodyText = isVerify
    ? 'Use the code below to verify your GYMZONE account email address.'
    : 'Use the code below to reset your GYMZONE account password.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f1;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:480px;width:100%">
        <tr>
          <td style="background:#ff6b00;padding:20px 32px">
            <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:1px">GYMZONE.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111110">${heading}</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#6c6a64;line-height:1.6">${bodyText} It expires in <strong>5 minutes</strong>.</p>
            <div style="background:#f5f4f1;border-left:4px solid #ff6b00;padding:20px;text-align:center;margin-bottom:28px">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111110;font-family:monospace">${otp}</span>
            </div>
            <p style="margin:0;font-size:12px;color:#92918c;line-height:1.6">
              If you did not request this code, you can safely ignore this email.<br>
              Never share this code with anyone.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f4f1;padding:16px 32px;border-top:1px solid #e8e6e2">
            <p style="margin:0;font-size:11px;color:#92918c">© ${new Date().getFullYear()} GYMZONE. Built for the work.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${heading}\n\nYour GYMZONE code: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;

  try {
    await _transporter.sendMail({
      from: `"GYMZONE" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[email] Failed to send OTP email:', smtpErrorMessage(err));
    const sendError = new Error('We could not send the email. Check the backend email configuration and try again.');
    sendError.status = 503;
    throw sendError;
  }
}
