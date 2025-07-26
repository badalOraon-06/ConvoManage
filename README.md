# ConvoManage: Streamlining Online Conference Management

A full-stack web application for managing virtual conferences with real-time features.

## Features

- **Multi-role Authentication**: Admin, Speaker, and Attendee roles with JWT-based authentication
- **Session Management**: Create, update, and manage conference sessions
- **Real-time Q&A**: Live chat functionality using Socket.IO
- **Responsive Dashboard**: Role-specific dashboards for different user types
- **Session Scheduling**: Calendar view for upcoming sessions
- **Email Notifications**: Automated email confirmations and reminders

## Tech Stack

- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.IO
- **Email**: Nodemailer

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   ├── models/
│   ├── routes/
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and setup**:

   ```bash
   cd "bishal Project"
   ```

2. **Install backend dependencies**:

   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**:

   ```bash
   cd ../client
   npm install
   ```

4. **Environment Setup**:

   - Copy `.env.example` to `.env` in both client and server directories
   - Update the environment variables with your configurations

5. **Start the application**:

   ```bash
   # Terminal 1 - Start backend
   cd server
   npm run dev

   # Terminal 2 - Start frontend
   cd client
   npm start
   ```

6. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Default Admin Credentials

- Email: admin@convomanage.com
- Password: admin123

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Sessions

- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create session (Admin only)
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session (Admin only)

### Users

- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id` - Update user profile

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Render)

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on push to main branch

### Database (MongoDB Atlas)

1. Create a MongoDB Atlas cluster
2. Add connection string to environment variables
3. Configure network access and database users

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
