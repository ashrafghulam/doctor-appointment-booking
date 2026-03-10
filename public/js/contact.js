/* ── Contact Form Logic ───────────────────── */
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        subject: document.getElementById('contactSubject').value.trim(),
        message: document.getElementById('contactMessage').value.trim(),
    };

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Message sent successfully!', 'success');
            document.getElementById('contactForm').reset();
        } else {
            showToast(result.error || 'Failed to send.', 'error');
        }
    } catch {
        showToast('Server error. Try again later.', 'error');
    }
});

function showToast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `custom-toast ${type}`;
    el.innerHTML = `<i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-x-circle'} me-2"></i>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}
