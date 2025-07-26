# ConvoManage Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites

- Vercel account
- GitHub repository

### Steps

1. **Connect to Vercel**

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy from root directory
   vercel --prod
   ```

2. **Environment Variables**
   Set these in Vercel dashboard:

   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   VITE_SOCKET_URL=https://your-backend-url.onrender.com
   VITE_APP_NAME=ConvoManage
   ```

3. **Build Settings**
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
   - Root Directory: Leave empty

## Backend Deployment (Render)

### Prerequisites

- Render account
- GitHub repository

### Steps

1. **Create Web Service**

   - Connect GitHub repository
   - Select `server` as root directory
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Environment Variables**
   Set these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/convomanage
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRE=7d
   CLIENT_URL=https://your-frontend-url.vercel.app
   SOCKET_CORS_ORIGIN=https://your-frontend-url.vercel.app
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

## Database Setup (MongoDB Atlas)

### Steps

1. **Create Cluster**

   - Sign up at MongoDB Atlas
   - Create a new cluster (free tier available)
   - Choose a region close to your users

2. **Database Access**

   - Create database user with read/write permissions
   - Note username and password

3. **Network Access**

   - Add IP addresses: `0.0.0.0/0` (allow from anywhere)
   - Or add specific IP addresses for security

4. **Connection String**
   - Get connection string from Atlas dashboard
   - Replace `<username>`, `<password>`, and `<database>`
   - Use this as `MONGODB_URI`

## Domain Setup (Optional)

### Custom Domain for Frontend

1. In Vercel dashboard, go to your project
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update DNS records as instructed

### Custom Domain for Backend

1. In Render dashboard, go to your service
2. Navigate to Settings > Custom Domains
3. Add your custom domain
4. Update DNS records as instructed

## SSL Certificates

- Both Vercel and Render provide automatic SSL certificates
- No additional configuration needed

## Monitoring & Logs

- **Vercel**: Functions tab for serverless function logs
- **Render**: Logs tab for real-time application logs
- **MongoDB Atlas**: Monitoring tab for database metrics

## Performance Optimization

### Frontend

- Enable Vercel Edge Functions for better performance
- Use Vercel Analytics for performance monitoring
- Optimize images and assets

### Backend

- Use MongoDB Atlas Search for better query performance
- Implement proper database indexing
- Use connection pooling

### Database

- Enable MongoDB Atlas Auto-scaling
- Set up proper database indexes
- Monitor slow queries

## Backup Strategy

- MongoDB Atlas provides automatic backups
- Export critical data regularly
- Keep environment variables backed up securely

## Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable CORS with specific origins
- [ ] Use HTTPS for all communications
- [ ] Validate all inputs on backend
- [ ] Rate limit API endpoints
- [ ] Use environment variables for sensitive data
- [ ] Enable MongoDB Atlas IP whitelisting
- [ ] Use strong database passwords
- [ ] Regular security updates

## Scaling Considerations

- **Frontend**: Vercel automatically scales
- **Backend**: Render provides auto-scaling options
- **Database**: MongoDB Atlas offers auto-scaling
- **CDN**: Vercel provides global CDN
- **Caching**: Implement Redis for session storage (optional)

## Cost Optimization

- Use free tiers when possible
- Monitor usage regularly
- Optimize database queries
- Use efficient data structures
- Implement proper caching strategies
