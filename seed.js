const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

// ── Seed default admin on first run ─────────────────────────────
// Slot seeding is no longer needed — slots are hardcoded in the
// routes/slots.js file. Old Slot collection is left untouched.
module.exports = async function seedAdmin() {
    try {
        const exists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (!exists) {
            const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            await Admin.create({ email: process.env.ADMIN_EMAIL, password: hashed });
            console.log('🌱  Default admin created');
        }
    } catch (err) {
        console.error('Seed error:', err.message);
    }
};
