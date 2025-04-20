const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const logEvent = require('../middleware/logEvent');
const { youtube } = require('../youtubeClient');

// Fetch video details including comments
router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    // Fetch video details
    const videoResponse = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
    });

    // Fetch comments
    const commentsResponse = await youtube.commentThreads.list({
      part: 'snippet',
      videoId: videoId,
      textFormat: 'plainText',
    });

    const videoData = videoResponse.data.items[0];
    const comments = commentsResponse.data.items.map(item => ({
      id: item.id,
      text: item.snippet.topLevelComment.snippet.textOriginal,
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
    }));

    // Combine video data and comments
    const responseData = {
      ...videoData,
      comments: comments || [],
    };

    await logEvent('VIDEO_FETCH', `Fetched video and comments: ${videoId}`);
    res.json(responseData);
  } catch (err) {
    await logEvent('ERROR', `Failed to fetch video/comments: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Add a comment to a video
router.post('/comment/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { comment } = req.body;

  try {
    const response = await youtube.commentThreads.insert({
      part: 'snippet',
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

    await logEvent('COMMENT_ADD', `Added comment to video: ${videoId}`);
    res.json(response.data);
  } catch (err) {
    await logEvent('ERROR', `Failed to add comment: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Update video title
router.put('/video/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { title } = req.body;

  try {
    const response = await youtube.videos.update({
      part: 'snippet',
      requestBody: {
        id: videoId,
        snippet: {
          title,
          categoryId: '22',
        },
      },
    });

    await logEvent('VIDEO_UPDATE', `Updated title of video: ${videoId}`);
    res.json(response.data);
  } catch (err) {
    await logEvent('ERROR', `Failed to update video: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment (updated to match frontend)
router.delete('/comment/:videoId/:commentId', async (req, res) => {
  const { commentId } = req.params;

  try {
    await youtube.comments.delete({
      id: commentId,
    });

    await logEvent('COMMENT_DELETE', `Deleted comment: ${commentId}`);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    await logEvent('ERROR', `Failed to delete comment: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;