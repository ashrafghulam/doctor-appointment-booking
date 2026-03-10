/* ══════════════════════════════════════════════════════════════════
   Appointment Booking – Frontend Logic
   Dynamic slots, OTP flow, slot locking
   ══════════════════════════════════════════════════════════════════ */

const API = '/api';

// ── State ────────────────────────────────────────────────────────
let morningSlots = [];
let eveningSlots = [];
let bookedSlots = [];
let currentBookingId = null;   // pending booking ID (for OTP flow)
let resendCooldown = null;     // countdown interval ID

// ══════════════════════════════════════════════════════════════════
//  DOM Ready — load slot definitions, set min date, bind events
// ══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch hardcoded slot definitions from backend
    try {
        const res = await fetch(`${API}/slots`);
        const data = await res.json();
        morningSlots = data.morning || [];
        eveningSlots = data.evening || [];
    } catch (e) {
        console.error('Could not load slot definitions', e);
    }

    // Set minimum date to today (prevent past dates)
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    // When date changes, load available slots
    dateInput.addEventListener('change', loadSlots);

    // Allow only digits in OTP input
    const otpInput = document.getElementById('otpInput');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        // Submit OTP on Enter key
        otpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyOTP();
        });
    }
});

// ══════════════════════════════════════════════════════════════════
//  Build a slot group card (Morning or Evening)
// ══════════════════════════════════════════════════════════════════
function buildSlotGroup(title, icon, colorClass, slotsArr, bookedArr) {
    const card = document.createElement('div');
    card.className = 'slot-group-card';

    // Header with icon and count
    const header = document.createElement('div');
    header.className = 'slot-group-header';
    const freeCount = slotsArr.filter(s => !bookedArr.includes(s)).length;
    header.innerHTML = `<i class="bi ${icon} ${colorClass}"></i> <span>${title}</span> <small class="ms-auto">${freeCount}/${slotsArr.length} available</small>`;
    card.appendChild(header);

    // Grid of slot buttons
    const grid = document.createElement('div');
    grid.className = 'slot-grid';

    slotsArr.forEach((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = slot;

        if (bookedArr.includes(slot)) {
            // Slot is already booked — disabled
            btn.classList.add('booked');
            btn.disabled = true;
            btn.title = 'Already booked';
        } else {
            btn.addEventListener('click', () => selectSlot(slot, btn));
        }
        grid.appendChild(btn);
    });

    card.appendChild(grid);
    return card;
}

// ══════════════════════════════════════════════════════════════════
//  Load and render slots for the selected date
// ══════════════════════════════════════════════════════════════════
async function loadSlots() {
    const dateInput = document.getElementById('date');
    const container = document.getElementById('slotsContainer');
    const dateVal = dateInput.value;

    if (!dateVal) {
        container.innerHTML = `<p style="color:var(--clr-text-dim);font-size:.9rem"><i class="bi bi-info-circle me-1"></i> Select a date to see available slots.</p>`;
        return;
    }

    // Show loading state
    container.innerHTML = `<div class="text-center py-3"><span class="spinner-border spinner-border-sm me-2" style="color:var(--clr-primary)"></span> Loading slots...</div>`;

    // Fetch booked slots for the selected date
    try {
        const res = await fetch(`${API}/appointments/booked-slots?date=${dateVal}`);
        bookedSlots = await res.json();
    } catch {
        bookedSlots = [];
    }

    container.innerHTML = '';

    // Render Morning slots group
    if (morningSlots.length > 0) {
        container.appendChild(
            buildSlotGroup('Morning Slots', 'bi-sunrise', 'text-morning', morningSlots, bookedSlots)
        );
    }

    // Render Evening slots group
    if (eveningSlots.length > 0) {
        container.appendChild(
            buildSlotGroup('Evening Slots', 'bi-moon-stars', 'text-evening', eveningSlots, bookedSlots)
        );
    }

    // Clear any previous slot selection
    document.getElementById('selectedSlot').value = '';
}

// ══════════════════════════════════════════════════════════════════
//  Select a slot — highlight it and store in hidden input
// ══════════════════════════════════════════════════════════════════
function selectSlot(slot, btn) {
    // Remove active class from all slot buttons
    document.querySelectorAll('.slot-btn.active').forEach((b) => b.classList.remove('active'));
    // Highlight selected
    btn.classList.add('active');
    document.getElementById('selectedSlot').value = slot;
}

// ══════════════════════════════════════════════════════════════════
//  Form submission — initiate booking (generate OTP)
// ══════════════════════════════════════════════════════════════════
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const slot = document.getElementById('selectedSlot').value;
    if (!slot) {
        showToast('Please select a time slot.', 'error');
        return;
    }

    // Collect form data
    const data = {
        patientName: document.getElementById('patientName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        symptoms: document.getElementById('symptoms').value.trim(),
        consultationType: document.querySelector('input[name="consultationType"]:checked').value,
        date: document.getElementById('date').value,
        timeSlot: slot,
    };

    // Validate required fields
    if (!data.patientName || !data.phone || !data.email || !data.date) {
        showToast('Please fill all required fields.', 'error');
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Sending OTP...';

    try {
        // ── Call initiate API — generates OTP, creates pending booking ──
        const res = await fetch(`${API}/appointments/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
            // Store booking ID for OTP verification
            currentBookingId = result.bookingId;

            // Show OTP modal
            showOTPModal();

            showToast('OTP sent! Check your phone (or server console in dev mode).', 'success');
        } else {
            showToast(result.error || 'Could not initiate booking.', 'error');
        }
    } catch (err) {
        showToast('Server error. Please try again later.', 'error');
    }

    // Re-enable submit button
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-calendar-check"></i> Confirm Appointment';
});

// ══════════════════════════════════════════════════════════════════
//  Show OTP Modal — reset state and start resend countdown
// ══════════════════════════════════════════════════════════════════
function showOTPModal() {
    // Reset OTP input and error
    document.getElementById('otpInput').value = '';
    document.getElementById('otpError').style.display = 'none';
    document.getElementById('verifyOtpBtn').disabled = false;
    document.getElementById('verifyOtpBtn').innerHTML = '<i class="bi bi-check-circle"></i> Verify & Confirm';

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('otpModal'));
    modal.show();

    // Start resend countdown
    startResendTimer();
}

// ══════════════════════════════════════════════════════════════════
//  Resend countdown timer (30 seconds)
// ══════════════════════════════════════════════════════════════════
function startResendTimer() {
    let seconds = 30;
    const timerEl = document.getElementById('resendTimer');
    const countdownEl = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendBtn');

    // Show timer, hide button
    timerEl.style.display = 'inline';
    resendBtn.style.display = 'none';

    // Clear any existing interval
    if (resendCooldown) clearInterval(resendCooldown);

    countdownEl.textContent = seconds;

    resendCooldown = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(resendCooldown);
            // Hide timer, show resend button
            timerEl.style.display = 'none';
            resendBtn.style.display = 'inline-block';
        }
    }, 1000);
}

// ══════════════════════════════════════════════════════════════════
//  Verify OTP — call backend to confirm appointment
// ══════════════════════════════════════════════════════════════════
async function verifyOTP() {
    const otpInput = document.getElementById('otpInput');
    const otp = otpInput.value.trim();
    const errorEl = document.getElementById('otpError');

    if (!otp || otp.length !== 6) {
        errorEl.textContent = 'Please enter a valid 6-digit OTP.';
        errorEl.style.display = 'block';
        return;
    }

    const verifyBtn = document.getElementById('verifyOtpBtn');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Verifying...';
    errorEl.style.display = 'none';

    try {
        const res = await fetch(`${API}/appointments/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: currentBookingId, otp }),
        });

        const result = await res.json();

        if (res.ok) {
            // ── Success — close modal, show confirmation ──
            const modal = bootstrap.Modal.getInstance(document.getElementById('otpModal'));
            if (modal) modal.hide();

            // Hide form, show success message
            document.getElementById('appointmentForm').style.display = 'none';
            document.getElementById('confirmationMsg').style.display = 'block';

            showToast('Appointment confirmed successfully!', 'success');
        } else {
            // Show error in modal
            errorEl.textContent = result.error || 'OTP verification failed.';
            errorEl.style.display = 'block';
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="bi bi-check-circle"></i> Verify & Confirm';
        }
    } catch (err) {
        errorEl.textContent = 'Server error. Please try again.';
        errorEl.style.display = 'block';
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="bi bi-check-circle"></i> Verify & Confirm';
    }
}

// ══════════════════════════════════════════════════════════════════
//  Resend OTP — generate a new OTP for the pending booking
// ══════════════════════════════════════════════════════════════════
async function resendOTP() {
    const resendBtn = document.getElementById('resendBtn');
    const errorEl = document.getElementById('otpError');

    resendBtn.disabled = true;
    resendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sending...';
    errorEl.style.display = 'none';

    try {
        const res = await fetch(`${API}/appointments/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: currentBookingId }),
        });

        const result = await res.json();

        if (res.ok) {
            showToast('New OTP sent! Check your phone (or server console).', 'success');
            document.getElementById('otpInput').value = '';
            startResendTimer();
        } else {
            errorEl.textContent = result.error || 'Could not resend OTP.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Server error. Please try again.';
        errorEl.style.display = 'block';
    }

    resendBtn.disabled = false;
    resendBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Resend OTP';
}

// ══════════════════════════════════════════════════════════════════
//  Toast notification helper
// ══════════════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `custom-toast ${type}`;
    el.innerHTML = `<i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-x-circle'} me-2"></i>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}
