const mongoose = require('mongoose');

// ── PendingBooking Model ─────────────────────────────────────────
// Stores booking attempts while OTP verification is in progress.
// Auto-expires after 10 minutes via TTL index on createdAt.
// No unique constraint on date+timeSlot — multiple users may attempt
// the same slot, but only the first verified OTP wins.
const pendingBookingSchema = new mongoose.Schema(
    {
        patientName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
        symptoms: { type: String, default: '' },
        consultationType: {
            type: String,
            enum: ['online', 'offline'],
            required: true,
        },
        date: { type: String, required: true },       // YYYY-MM-DD
        timeSlot: { type: String, required: true },    // e.g. "06:30 AM"

        // ── OTP fields ──────────────────────────────
        otp: { type: String, required: true },         // plain 6-digit (dev mode)
        otpExpiresAt: { type: Date, required: true },  // current time + 5 min
        otpUsed: { type: Boolean, default: false },    // single-use flag

        createdAt: { type: Date, default: Date.now },
    }
);

// TTL index — MongoDB automatically deletes docs 10 min after createdAt
pendingBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('PendingBooking', pendingBookingSchema);
