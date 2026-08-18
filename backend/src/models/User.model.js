const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, minlength: 6 },
  role: {
    type: String,
    enum: ['super_admin', 'restaurant_admin', 'waiter', 'customer'],
    default: 'customer',
  },
  avatar: { type: String, default: null },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpire: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  firebaseUid: { type: String },
  googleId: { type: String },
  lastLogin: { type: Date },
  preferences: {
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
  },
  deviceTokens: [{ type: String }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  // Don't re-hash if password is already a bcrypt hash (starts with $2a$, $2b$, etc.)
  if (/^\$2[abxy]\$\d+\$/.test(this.password)) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  if (this.password === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (e) {
    return false;
  }
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpire = Date.now() + (parseInt(process.env.OTP_EXPIRE) || 10) * 60 * 1000;
  return otp;
};

module.exports = mongoose.model('User', userSchema);
