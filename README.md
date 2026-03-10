# Pediatric Appointment Booking

A full-stack appointment booking system for a pediatric clinic, built with Node.js, Express, MongoDB, and Bootstrap.

## Features

- Online appointment booking with morning & evening time slots
- Real-time slot locking (prevents double booking)
- OTP verification before confirming appointments
- Admin dashboard for managing appointments
- Contact form
- Responsive, child-friendly design

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Bootstrap 5
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT (admin), OTP (patient booking)

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/doctor-appointment-booking.git
cd doctor-appointment-booking

# 2. Install dependencies
npm install

# 3. Create .env file (copy from example)
cp .env.example .env
# Edit .env and set your MongoDB URI and other variables

# 4. Start the server
npm start
# or for development with auto-reload:
npm run dev
```

Visit `http://localhost:3000`

---

## Deployment on Render (Free Tier)

### Step 1: Create a MongoDB Atlas Database (Free)

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up / log in
2. Click **"Build a Database"** → select **M0 Free Tier**
3. Choose a cloud provider and region (any will work)
4. Set a **database username** and **password** — save these
5. Under **Network Access**, click **"Add IP Address"** → **"Allow Access from Anywhere"** (set `0.0.0.0/0`)
6. Under **Database** → click **"Connect"** → **"Connect your application"**
7. Copy the connection string. It looks like:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/doctor_appointment?retryWrites=true&w=majority
   ```
8. Replace `USERNAME` and `PASSWORD` with your actual credentials

### Step 2: Push to GitHub

```bash
# Initialize git (if not already)
cd d:\webiste_llm\doctor_web
git init
git add .
git commit -m "Initial commit: doctor appointment booking system"

# Create a repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/doctor-appointment-booking.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to [https://render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your **GitHub account** and select the repository
4. Configure the service:

   | Setting        | Value                |
   |----------------|----------------------|
   | **Name**       | doctor-appointment   |
   | **Runtime**    | Node                 |
   | **Build Command** | `npm install`     |
   | **Start Command** | `npm start`       |
   | **Plan**       | Free                 |

5. Click **"Advanced"** → **"Add Environment Variable"** and add:

   | Key             | Value                                         |
   |-----------------|-----------------------------------------------|
   | `MONGODB_URI`   | Your MongoDB Atlas connection string           |
   | `JWT_SECRET`    | A strong random string (e.g. `x7Kz9mP2qR5wT`) |
   | `ADMIN_EMAIL`   | `admin@doctor.com`                             |
   | `ADMIN_PASSWORD`| A strong password for admin login              |
   | `NODE_ENV`      | `production`                                   |

6. Click **"Deploy Web Service"**
7. Wait 2-3 minutes for build and deployment
8. Your live URL will be: `https://doctor-appointment-XXXX.onrender.com`

---

## Environment Variables

| Variable         | Required | Description                         |
|------------------|----------|-------------------------------------|
| `PORT`           | No       | Server port (default: 3000)         |
| `MONGODB_URI`    | Yes      | MongoDB connection string           |
| `JWT_SECRET`     | Yes      | Secret key for JWT tokens           |
| `ADMIN_EMAIL`    | Yes      | Default admin email                 |
| `ADMIN_PASSWORD` | Yes      | Default admin password              |
| `NODE_ENV`       | No       | Set to `production` for deployment  |

## Project Structure

```
doctor_web/
├── server.js              # Express server (entry point)
├── seed.js                # Admin user seeder
├── package.json
├── .env.example           # Environment variables template
├── .gitignore
├── models/                # Mongoose models
│   ├── Admin.js
│   ├── Appointment.js
│   ├── Contact.js
│   └── PendingBooking.js
├── routes/                # API routes
│   ├── appointments.js
│   ├── auth.js
│   ├── contact.js
│   └── slots.js
├── middleware/             # Auth middleware
│   └── auth.js
└── public/                # Frontend (served as static)
    ├── index.html
    ├── about.html
    ├── services.html
    ├── contact.html
    ├── appointment.html
    ├── css/style.css
    ├── js/
    └── images/
```

## Admin Panel

After deployment, access the admin panel at:
```
https://your-domain.onrender.com/admin/login.html
```
Login with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in environment variables.

## License

MIT
