<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# ConvoManage Development Instructions

This is a full-stack conference management application built with:

## Tech Stack

- **Frontend**: React.js with Vite, Tailwind CSS, React Router, React Hook Form
- **Backend**: Node.js, Express.js, Socket.IO for real-time features
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with role-based access control
- **Real-time**: Socket.IO for live chat and Q&A functionality

## Project Structure

- `client/` - React frontend application
- `server/` - Node.js backend API
- Monorepo structure with separate package.json files

## Key Features

- Multi-role authentication (Admin, Speaker, Attendee)
- Session management and scheduling
- Real-time chat and Q&A during sessions
- User management and role-based permissions
- Responsive dashboard for different user types
- Email notifications (optional)

## Development Guidelines

1. Use functional components with React Hooks
2. Follow RESTful API conventions for backend routes
3. Implement proper error handling and validation
4. Use Tailwind CSS for consistent styling
5. Maintain separation of concerns between frontend and backend
6. Use proper TypeScript types where applicable
7. Follow security best practices for authentication and authorization

## Database Models

- **User**: name, email, password, role, bio, avatar, registeredSessions
- **Session**: title, description, speaker, date, startTime, endTime, attendees, category, tags
- **Chat**: sessionId, userId, message, type, isAnswered, answer

## API Endpoints

- `/api/auth/*` - Authentication routes
- `/api/sessions/*` - Session management
- `/api/users/*` - User management (admin only)
- `/api/chat/*` - Chat and Q&A functionality

## Environment Variables

Check `.env.example` files in both client and server directories for required environment variables.

## Socket.IO Events

- `join-session` - Join a session room
- `leave-session` - Leave a session room
- `send-message` - Send chat message
- `send-question` - Send Q&A question
- `receive-message` - Receive chat message
- `receive-question` - Receive Q&A question
