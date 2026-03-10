const mongoose = require('mongoose');

// ── Confirmed Appointment Model ─────────────────────────────────
// Only created after successful OTP verification.
// The compound unique index on date+timeSlot is the DATABASE-LEVEL
// protection against double bookings — even if two users verify OTP
// at the exact same moment, only one insert will succeed.
const appointmentSchema = new mongoose.Schema(
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
        date: { type: String, required: true },      // YYYY-MM-DD
        timeSlot: { type: String, required: true },   // e.g. "06:30 AM"
        status: {
            type: String,
            enum: ['confirmed', 'approved', 'rejected', 'cancelled'],
            default: 'confirmed',
        },
    },
    { timestamps: true }
);

// Compound unique index — prevents two confirmed bookings for same date+slot
appointmentSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
