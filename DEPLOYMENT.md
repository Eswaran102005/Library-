# Deployment Guide

This project is now ready for deployment! Here's how to deploy it:

## ✅ What's Been Fixed
- ✅ Environment variable support added (dotenv)
- ✅ Production start script added (`npm start`)
- ✅ Security vulnerabilities fixed
- ✅ MongoDB connection error handling improved
- ✅ Session secret now uses environment variables
- ✅ .gitignore created to exclude sensitive files

## 📋 Pre-Deployment Checklist

### 1. **Environment Variables Setup**
Create a `.env` file on your server with:
```
PORT=3000
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=your-secure-random-key
NODE_ENV=production
```

### 2. **MongoDB Setup**
- Use MongoDB Atlas (recommended): https://www.mongodb.com/cloud/atlas
- Or install MongoDB on your server
- Your connection string should look like:
  - **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/campus_library`
  - **Local**: `mongodb://localhost:27017/campus_library`

### 3. **Node.js Environment**
- Ensure Node.js 14+ is installed on server
- Run `npm install` to install all dependencies

## 🚀 Deployment Platforms

### **Option 1: Render (Recommended - Easiest)**
1. Push code to GitHub
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Set these settings:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Add variables from `.env.example`
6. Deploy!

### **Option 2: Heroku**
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set SESSION_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### **Option 3: DigitalOcean App Platform**
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Choose Node.js as runtime
4. Set start command: `npm start`
5. Deploy!

### **Option 4: AWS/Nginx VPS**
```bash
# SSH into server
ssh root@your-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone your-repo
cd your-repo
npm install

# Install PM2 (process manager)
sudo npm install -g pm2
pm2 start app.js --name "campus-library"
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure /etc/nginx/sites-available/default to proxy to port 3000
sudo systemctl restart nginx
```

## 🧪 Testing Locally Before Deploy
```bash
# Install dependencies
npm install

# Create .env file with local MongoDB
cp .env.example .env

# Start app
npm start

# Visit http://localhost:3000
```

## 📊 Monitoring & Logs
- **Render**: View in dashboard → "Logs"
- **Heroku**: `heroku logs --tail`
- **PM2**: `pm2 logs`
- **Docker**: Check container logs

## 🔒 Security Tips
1. Never commit `.env` file (already in .gitignore)
2. Use strong SESSION_SECRET (min 32 characters)
3. Keep Node.js and dependencies updated
4. Set up HTTPS/SSL certificate
5. Use database authentication with strong passwords
6. Enable IP whitelisting if possible

## ✨ Next Steps
1. Choose a deployment platform
2. Set up MongoDB connection string
3. Configure environment variables
4. Test deployment
5. Set up domain and SSL
6. Monitor logs for issues

Questions? Check your platform's documentation!
