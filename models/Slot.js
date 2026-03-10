const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
        ],
        required: true,
    },
    slots: [{ type: String }], // e.g. ["09:00 AM - 09:30 AM", "09:30 AM - 10:00 AM"]
});

module.exports = mongoose.model('Slot', slotSchema);
