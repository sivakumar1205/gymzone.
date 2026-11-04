import jwt from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { issueOtp, verifyOtp } from '../utils/otp.js';

const RESET_GRANT_TTL_MS = 5 * 60 * 1000;

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function matchesResetToken(candidate, storedHash) {
  if (typeof candidate !== 'string' || typeof storedHash !== 'string') return false;
  const candidateHash = Buffer.from(hashResetToken(candidate), 'hex');
  const savedHash = Buffer.from(storedHash, 'hex');
  return candidateHash.length === savedHash.length && timingSafeEqual(candidateHash, savedHash);
}

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password) {
  return typeof password === 'string'
    && password.length >= 8
    && Buffer.byteLength(password, 'utf8') <= 72;
}

// ─── Register ─────────────────────────────────────────────────────────────────
// Stores a PendingRegistration — NO User is created until OTP is verified.

export async function register(request, response) {
  const { name, email, password, phone } = request.body;

  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return response.status(400).json({ message: 'Enter a name between 2 and 80 characters.' });
  }
  if (!validateEmail(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (!validatePassword(password)) {
    return response.status(400).json({ message: 'Password must be 8–72 bytes long.' });
  }
  if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
    return response.status(400).json({ message: 'Phone number must be 30 characters or fewer.' });
  }

  const normalEmail = email.trim().toLowerCase();

  // Block if a verified account already exists.
  const existing = await User.findOne({ email: normalEmail });
  if (existing) {
    return response.status(409).json({ message: 'An account with that email already exists.' });
  }

  const existingPending = await PendingRegistration.findOne({ email: normalEmail });
  if (existingPending) {
    try {
      await issueOtp(normalEmail, 'verify_email');
      return response.status(200).json({
        message: 'A registration is already pending. Check your email for its verification code.',
        email: normalEmail,
      });
    } catch (otpError) {
      if (otpError.status === 429) {
        return response.status(429).json({
          message: otpError.message,
          email: normalEmail,
          registrationPending: true,
          retryAfter: otpError.retryAfter,
        });
      }
      throw otpError;
    }
  }

  const pending = await PendingRegistration.create({
    name: name.trim(),
    email: normalEmail,
    password,
    phone: typeof phone === 'string' ? phone.trim() : '',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    const otp = await issueOtp(normalEmail, 'verify_email');
    return response.status(201).json({
      message: 'A verification code has been emailed to you. Verify it to create your account.',
      email: normalEmail,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (otpError) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw otpError;
  }
}

// ─── Resend verify OTP ────────────────────────────────────────────────────────

export async function sendVerifyOtp(request, response) {
  const { email } = request.body;
  if (!validateEmail(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }

  const normalEmail = email.trim().toLowerCase();

  // Check verified user first.
  const user = await User.findOne({ email: normalEmail });
  if (user?.isEmailVerified) {
    return response.status(400).json({ message: 'This email is already verified. You can sign in.' });
  }

  // Must have a pending registration to resend to.
  const pending = await PendingRegistration.findOne({ email: normalEmail });
  if (!user && !pending) {
    // Generic to prevent enumeration.
    return response.json({ message: 'If that email is registered and unverified, a code has been sent.' });
  }

  const otp = await issueOtp(normalEmail, 'verify_email');

  return response.json({
    message: 'Verification code sent. Check your inbox (and spam folder).',
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  });
}

// ─── Verify email OTP ─────────────────────────────────────────────────────────
// Creates the User account only after OTP is confirmed.

export async function verifyEmail(request, response) {
  const { email, otp } = request.body;
  if (!validateEmail(email) || typeof otp !== 'string') {
    return response.status(400).json({ message: 'Email and verification code are required.' });
  }

  const normalEmail = email.trim().toLowerCase();

  // Verification must not act as a passwordless login for existing accounts.
  const existingUser = await User.findOne({ email: normalEmail });
  if (existingUser?.isEmailVerified) {
    return response.status(409).json({ message: 'This email is already verified. Please sign in.' });
  }

  const pending = await PendingRegistration.findOne({ email: normalEmail });
  if (!pending) {
    const legacyUser = await User.findOne({ email: normalEmail }).select('+password');
    if (!legacyUser || legacyUser.isEmailVerified) {
      return response.status(400).json({ message: 'No pending registration found. Please sign up again.' });
    }

    await verifyOtp(normalEmail, 'verify_email', otp.trim());
    legacyUser.isEmailVerified = true;
    await legacyUser.save();
    return response.json({ token: createToken(legacyUser), user: legacyUser.toSafeObject() });
  }

  // verifyOtp throws with a descriptive error on failure.
  await verifyOtp(normalEmail, 'verify_email', otp.trim());

  // OTP correct — create the real user account with the already-hashed password.
  const user = new User({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    phone: pending.phone,
    isEmailVerified: true,
  });
  user._passwordAlreadyHashed = true;
  await user.save();

  // Clean up pending record.
  await PendingRegistration.deleteOne({ email: normalEmail });

  return response.json({ token: createToken(user), user: user.toSafeObject() });
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(request, response) {
  const { email, password } = request.body;
  if (!validateEmail(email) || typeof password !== 'string') {
    return response.status(400).json({ message: 'Enter your email and password.' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

  if (!user || !await user.checkPassword(password)) {
    return response.status(401).json({ message: 'Email or password is incorrect.' });
  }
  if (!user.isActive) {
    return response.status(403).json({ message: 'This account has been disabled. Contact support.' });
  }
  if (!user.isEmailVerified) {
    return response.status(403).json({
      message: 'Please verify your email before signing in.',
      requiresVerification: true,
      email: user.email,
    });
  }

  return response.json({ token: createToken(user), user: user.toSafeObject() });
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getMe(request, response) {
  return response.json({ user: request.user.toSafeObject() });
}

// ─── Forgot password — send OTP ───────────────────────────────────────────────

export async function requestPasswordReset(request, response) {
  const { email } = request.body;
  if (!validateEmail(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }

  const genericMessage = 'If that email is registered, a reset code has been sent.';

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || !user.isActive || !user.isEmailVerified) {
    return response.json({ message: genericMessage });
  }

  await User.updateOne(
    { _id: user._id },
    { $unset: { resetTokenHash: 1, resetTokenExpires: 1 } },
  );
  const otp = await issueOtp(email.trim().toLowerCase(), 'reset_password');

  return response.json({
    message: genericMessage,
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  });
}

// ─── Forgot password — verify OTP and issue a short-lived reset grant ─────────

export async function verifyResetOtp(request, response) {
  const { email, otp } = request.body;
  if (!validateEmail(email) || typeof otp !== 'string') {
    return response.status(400).json({ message: 'Email and verification code are required.' });
  }

  const normalEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalEmail }).select('+resetTokenHash +resetTokenExpires');
  if (!user || !user.isActive || !user.isEmailVerified) {
    return response.status(400).json({ message: 'The code has expired or is invalid. Request a new one.' });
  }

  await verifyOtp(normalEmail, 'reset_password', otp.trim());
  const resetToken = randomBytes(32).toString('hex');
  user.resetTokenHash = hashResetToken(resetToken);
  user.resetTokenExpires = new Date(Date.now() + RESET_GRANT_TTL_MS);
  await user.save();

  return response.json({ message: 'Code verified. You may now set a new password.', resetToken });
}

// ─── Forgot password — reset with the single-use grant ────────────────────────

export async function resetPassword(request, response) {
  const { email, resetToken, password } = request.body;
  if (!validateEmail(email) || typeof resetToken !== 'string' || !resetToken.trim()) {
    return response.status(400).json({ message: 'Email and verified reset authorization are required.' });
  }
  if (!validatePassword(password)) {
    return response.status(400).json({ message: 'Password must be 8–72 bytes long.' });
  }

  const normalEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalEmail })
    .select('+resetTokenHash +resetTokenExpires');
  if (!user || !user.isActive || !user.isEmailVerified
    || !user.resetTokenExpires || user.resetTokenExpires <= new Date()
    || !matchesResetToken(resetToken.trim(), user.resetTokenHash)) {
    return response.status(400).json({ message: 'Reset authorization has expired or is invalid. Request a new code.' });
  }

  const claimed = await User.updateOne(
    {
      _id: user._id,
      resetTokenHash: user.resetTokenHash,
      resetTokenExpires: { $gt: new Date() },
    },
    { $unset: { resetTokenHash: 1, resetTokenExpires: 1 } },
  );
  if (claimed.modifiedCount !== 1) {
    return response.status(400).json({ message: 'Reset authorization has expired or is invalid. Request a new code.' });
  }

  user.password = password;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  return response.json({ message: 'Password updated. You can now sign in.' });
}
