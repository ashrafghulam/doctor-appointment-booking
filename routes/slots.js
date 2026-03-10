const router = require('express').Router();

// ══════════════════════════════════════════════════════════════════
//  Hardcoded slot definitions — no DB dependency needed.
//  Morning: 8 slots (06:30 AM – 08:15 AM, 15 min apart)
//  Evening: 10 slots (06:00 PM – 08:15 PM, 15 min apart)
// ══════════════════════════════════════════════════════════════════
const MORNING_SLOTS = [
    '06:30 AM', '06:45 AM', '07:00 AM', '07:15 AM',
    '07:30 AM', '07:45 AM', '08:00 AM', '08:15 AM',
];

const EVENING_SLOTS = [
    '06:00 PM', '06:15 PM', '06:30 PM', '06:45 PM',
    '07:00 PM', '07:15 PM', '07:30 PM', '07:45 PM',
    '08:00 PM', '08:15 PM',
];

// GET /api/slots — public: returns grouped slot definitions
router.get('/', (_req, res) => {
    res.json({
        morning: MORNING_SLOTS,
        evening: EVENING_SLOTS,
    });
});

module.exports = router;
