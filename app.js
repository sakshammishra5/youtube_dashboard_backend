const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://youtube-video-dashboard.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());
app.use(express.json());


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));



// Routes
// const eventLogRoutes = require('./routes/eventLogs');
const youtubeRoutes = require('./routes/youtube');
const { oauth2Client } = require('./youtubeClient');
// app.use('/api/logs', eventLogRoutes);
app.use('/api/youtube', youtubeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // OAuth Flow (simplified)
  app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    });
    res.redirect(url);
  });
  
  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.redirect('https://youtube-video-dashboard.vercel.app/');
    // res.send('Authentication successful! You can close this window.');
  });


