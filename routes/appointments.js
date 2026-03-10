const router = require('express').Router();
const Appointment = require('../models/Appointment');
const PendingBooking = require('../models/PendingBooking');
const auth = require('../middleware/auth');

// ══════════════════════════════════════════════════════════════════
//  HELPER — Generate a random 6-digit OTP
// ══════════════════════════════════════════════════════════════════
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ══════════════════════════════════════════════════════════════════
//  HELPER — Send OTP (dev mode: console log, production: SMS API)
// ══════════════════════════════════════════════════════════════════
function sendOTP(phone, otp) {
    // If a real SMS provider is configured, send via API
    if (process.env.SMS_PROVIDER && process.env.SMS_API_KEY) {
        // TODO: Integrate with actual SMS provider (Twilio, MSG91, etc.)
        console.log(`📱  [SMS] Would send OTP ${otp} to ${phone} via ${process.env.SMS_PROVIDER}`);
    }

    // Always log in console for development/testing
    console.log('═══════════════════════════════════════');
    console.log(`📨  OTP for ${phone}: ${otp}`);
    console.log('═══════════════════════════════════════');
}

// ══════════════════════════════════════════════════════════════════
//  1. GET /api/appointments/booked-slots?date=YYYY-MM-DD
//     Public: Returns array of booked time slots for a given date
// ══════════════════════════════════════════════════════════════════
router.get('/booked-slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });

        // Find all confirmed appointments for this date
        const booked = await Appointment.find({ date }).select('timeSlot -_id');
        res.json(booked.map((b) => b.timeSlot));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════
//  2. POST /api/appointments/initiate
//     Public: Validate form, check slot, generate OTP, create pending
// ══════════════════════════════════════════════════════════════════
router.post('/initiate', async (req, res) => {
    try {
        const { patientName, phone, email, symptoms, consultationType, date, timeSlot } = req.body;

        // ── Validate required fields ────────────────────────
        if (!patientName || !phone || !email || !consultationType || !date || !timeSlot) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // ── Check if slot is already booked (confirmed appointment) ──
        const existing = await Appointment.findOne({ date, timeSlot });
        if (existing) {
            return res.status(409).json({
                error: 'This time slot is already booked. Please choose another.',
            });
        }

        // ── Generate OTP with 5-minute expiry ───────────────
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // ── Create pending booking ──────────────────────────
        const pending = await PendingBooking.create({
            patientName,
            phone,
            email,
            symptoms: symptoms || '',
            consultationType,
            date,
            timeSlot,
            otp,
            otpExpiresAt,
        });

        // ── Send OTP (logs to console in dev mode) ──────────
        sendOTP(phone, otp);

        res.status(200).json({
            message: 'OTP sent successfully. Please verify to confirm your appointment.',
            bookingId: pending._id,
        });
    } catch (err) {
        console.error('Initiate error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ══════════════════════════════════════════════════════════════════
//  3. POST /api/appointments/verify-otp
//     Public: Verify OTP → create confirmed appointment
// ══════════════════════════════════════════════════════════════════
router.post('/verify-otp', async (req, res) => {
    try {
        const { bookingId, otp } = req.body;

        if (!bookingId || !otp) {
            return res.status(400).json({ error: 'Booking ID and OTP are required.' });
        }

        // ── Find the pending booking ────────────────────────
        const pending = await PendingBooking.findById(bookingId);
        if (!pending) {
            return res.status(404).json({
                error: 'Booking request not found or has expired. Please try again.',
            });
        }

        // ── Check if OTP was already used ───────────────────
        if (pending.otpUsed) {
            return res.status(400).json({ error: 'This OTP has already been used.' });
        }

        // ── Check if OTP has expired ────────────────────────
        if (new Date() > pending.otpExpiresAt) {
            return res.status(400).json({
                error: 'OTP has expired. Please request a new one.',
            });
        }

        // ── Verify the OTP ──────────────────────────────────
        if (pending.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        // ── Mark OTP as used ────────────────────────────────
        pending.otpUsed = true;
        await pending.save();

        // ── Check if slot is STILL available (race condition protection) ──
        const alreadyBooked = await Appointment.findOne({
            date: pending.date,
            timeSlot: pending.timeSlot,
        });
        if (alreadyBooked) {
            return res.status(409).json({
                error: 'Sorry, this slot was just booked by someone else. Please select a different slot.',
            });
        }

        // ── Create the confirmed appointment ────────────────
        // The unique index on { date, timeSlot } provides final
        // database-level protection against race conditions
        try {
            const appointment = await Appointment.create({
                patientName: pending.patientName,
                phone: pending.phone,
                email: pending.email,
                symptoms: pending.symptoms,
                consultationType: pending.consultationType,
                date: pending.date,
                timeSlot: pending.timeSlot,
                status: 'confirmed',
            });

            // Clean up the pending booking
            await PendingBooking.findByIdAndDelete(bookingId);

            console.log(`✅  Appointment confirmed: ${pending.patientName} on ${pending.date} at ${pending.timeSlot}`);

            res.status(201).json({
                message: 'Appointment confirmed successfully!',
                appointment,
            });
        } catch (dbErr) {
            // Unique index violation — someone else confirmed this slot at the same instant
            if (dbErr.code === 11000) {
                return res.status(409).json({
                    error: 'Sorry, this slot was just booked by someone else. Please select a different slot.',
                });
            }
            throw dbErr;
        }
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ══════════════════════════════════════════════════════════════════
//  4. POST /api/appointments/resend-otp
//     Public: Generate new OTP for an existing pending booking
// ══════════════════════════════════════════════════════════════════
router.post('/resend-otp', async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ error: 'Booking ID is required.' });
        }

        const pending = await PendingBooking.findById(bookingId);
        if (!pending) {
            return res.status(404).json({
                error: 'Booking request not found or has expired. Please submit the form again.',
            });
        }

        // ── Generate fresh OTP ──────────────────────────────
        const otp = generateOTP();
        pending.otp = otp;
        pending.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        pending.otpUsed = false;
        await pending.save();

        // ── Send new OTP ────────────────────────────────────
        sendOTP(pending.phone, otp);

        res.status(200).json({ message: 'New OTP sent successfully.' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ══════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS (protected by auth middleware)
// ══════════════════════════════════════════════════════════════════

// GET /api/appointments — admin: list all confirmed appointments
router.get('/', auth, async (req, res) => {
    try {
        const { status, date } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (date) filter.date = date;
        const list = await Appointment.find(filter).sort({ date: -1, createdAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/appointments/:id/status — admin: approve / reject
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved, rejected, or cancelled' });
        }
        const updated = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Appointment not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/appointments/:id — admin: delete
router.delete('/:id', auth, async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Appointment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
