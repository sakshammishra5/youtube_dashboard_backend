const express = require('express');
const router = express.Router();
const logEvent = require('../middleware/logEvent');
const { google } = require('googleapis');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  if (!req.user.accessToken) {
    return res.status(401).json({ error: 'No access token available. Please log in again.' });
  }
  next();
};

const getYoutubeClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.youtube({
    version: "v3",
    auth: oauth2Client,
  });
};

// Fetch video details including comments
router.get("/video/:videoId", requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;

    const youtube = getYoutubeClient(req.user.accessToken);

    const videoResponse = await youtube.videos.list({
      part: "snippet",
      id: videoId,
    });

    const videoData = videoResponse.data.items?.[0];
    if (!videoData) {
      return res.status(404).json({ error: "Video not found or not accessible" });
    }

    let comments = [];
    try {
      const commentsResponse = await youtube.commentThreads.list({
        part: "snippet",
        videoId,
        textFormat: "plainText",
        maxResults: 20,
      });

      comments = commentsResponse.data.items.map((item) => ({
        id: item.id,
        text: item.snippet.topLevelComment.snippet.textOriginal,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
      }));
    } catch (e) {
      console.log("COMMENTS ERROR:", e?.response?.data || e.message);
    }

    res.json({ ...videoData, comments });
  } catch (err) {
    console.log("YOUTUBE ERROR:", err?.response?.data || err.message);
    res.status(500).json({
      error: err?.response?.data?.error?.message || err.message,
      details: err?.response?.data || null,
    });
  }
});


// Add a comment to a video
router.post("/comment/:videoId", requireAuth, async (req, res) => {
  const { videoId } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  try {
    const youtube = getYoutubeClient(req.user.accessToken);

    const response = await youtube.commentThreads.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: comment,
            },
          },
        },
      },
    });

    await logEvent("COMMENT_ADD", `Added comment to video: ${videoId}`);
    return res.json(response.data);
  } catch (err) {
    console.log("COMMENT ADD ERROR:", err?.response?.data || err.message);

    await logEvent(
      "ERROR",
      `Failed to add comment: ${err?.response?.data?.error?.message || err.message}`
    );

    return res.status(err.code || 500).json({
      error: err?.response?.data?.error?.message || err.message,
      details: err?.response?.data || null,
    });
  }
});


// ✅ Update video title
router.put("/video/:videoId", requireAuth, async (req, res) => {
  const { videoId } = req.params;
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const youtube = getYoutubeClient(req.user.accessToken);

    const response = await youtube.videos.update({
      part: "snippet",
      requestBody: {
        id: videoId,
        snippet: {
          title,
          categoryId: "22", // keep if needed
        },
      },
    });

    await logEvent("VIDEO_UPDATE", `Updated title of video: ${videoId}`);
    return res.json(response.data);
  } catch (err) {
    console.log("VIDEO UPDATE ERROR:", err?.response?.data || err.message);

    await logEvent(
      "ERROR",
      `Failed to update video: ${err?.response?.data?.error?.message || err.message}`
    );

    return res.status(err.code || 500).json({
      error: err?.response?.data?.error?.message || err.message,
      details: err?.response?.data || null,
    });
  }
});

// ✅ Delete a comment
router.delete("/comment/:commentId", requireAuth, async (req, res) => {
  const { commentId } = req.params;

  try {
    const youtube = getYoutubeClient(req.user.accessToken);

    await youtube.comments.delete({
      id: commentId,
    });

    await logEvent("COMMENT_DELETE", `Deleted comment: ${commentId}`);
    return res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.log("COMMENT DELETE ERROR:", err?.response?.data || err.message);

    await logEvent(
      "ERROR",
      `Failed to delete comment: ${err?.response?.data?.error?.message || err.message}`
    );

    return res.status(err.code || 500).json({
      error: err?.response?.data?.error?.message || err.message,
      details: err?.response?.data || null,
    });
  }
});


const notesStore = {};

router.post("/notes/:videoId", requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ error: "Note is required" });
    }

    const userId = req.user?.id || req.user?._id || req.user?.googleId;

    if (!userId) {
      return res.status(400).json({ error: "User ID not found" });
    }

    if (!notesStore[userId]) notesStore[userId] = {};
    if (!notesStore[userId][videoId]) notesStore[userId][videoId] = [];

    const newNote = {
      id: Date.now().toString(),
      text: note,
      createdAt: new Date().toISOString(),
    };

    notesStore[userId][videoId].push(newNote);

    return res.status(201).json({
      success: true,
      id: newNote.id,
      note: newNote,
    });
  } catch (err) {
    console.log("ADD NOTE ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;