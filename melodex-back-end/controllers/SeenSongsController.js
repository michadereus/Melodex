// SeenSongsController.js
// Handles direct MongoDB operations for the 'seen_songs' collection

class SeenSongsController {
  // POST /api/seen-songs
  // Updates or creates the list of seen song titles for a user
  static async updateSeenSongs(req, res) {
    const { uID, titles } = req.body;
    try {
      // TODO: Implement MongoDB update to replace titles array for uID
      // Example: await db.collection('seen_songs').updateOne(
      //   { uID }, { $set: { titles } }, { upsert: true }
      // );
      res.status(200).json({ message: 'Seen songs updated' });
    } catch (error) {
      console.error('Error updating seen songs:', error);
      res.status(500).json({ error: 'Failed to update seen songs' });
    }
  }

  // Helper function: Fetches seen song titles for a user
  // Used by SongGenerationService
  static async getSeenSongTitles(uID) {
    try {
      // TODO: Implement MongoDB query to fetch titles array for uID
      // Example: const result = await db.collection('seen_songs').findOne({ uID });
      // return result ? result.titles : [];
      return []; // Placeholder: Replace with actual query result
    } catch (error) {
      console.error('Error fetching seen song titles:', error);
      throw error;
    }
  }
}

module.exports = SeenSongsController;