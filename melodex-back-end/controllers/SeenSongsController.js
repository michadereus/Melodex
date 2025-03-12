// backend/controllers/SeenSongsController.js
class SeenSongsController {
  static async updateSeenSongs(req, res) {
    const { uID, titles, genreField } = req.body;
    const db = req.app.locals.db;
    try {
      const updateObj = { $push: { titles: { $each: titles } } };
      if (genreField) {
        updateObj.$push[genreField] = { $each: titles };
      }
      await db.collection('seen_songs').updateOne(
        { uID },
        updateObj,
        { upsert: true }
      );
      res.status(200).json({ message: 'Seen songs updated' });
    } catch (error) {
      console.error('Error updating seen songs:', error);
      res.status(500).json({ error: 'Failed to update seen songs' });
    }
  }

  static async getSeenSongTitles(req, uID) { // Add req parameter
    const db = req.app.locals.db;
    try {
      const result = await db.collection('seen_songs').findOne({ uID });
      return result ? result.titles || [] : [];
    } catch (error) {
      console.error('Error fetching seen song titles:', error);
      throw error;
    }
  }
}

module.exports = SeenSongsController;