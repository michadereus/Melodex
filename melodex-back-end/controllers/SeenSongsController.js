// backend/controllers/SeenSongsController.js
class SeenSongsController {
  static async updateSeenSongs(req, res) {
    const { uID, titles, genreField } = req.body;
    const db = req.app.locals.db;
    try {
      if (!uID) throw new Error('uID is required');

      // If no titles provided, just return current titles (for fetchSeenSongs)
      if (!titles || !Array.isArray(titles)) {
        const doc = await db.collection('seen_songs').findOne({ uID });
        return res.status(200).json({ message: 'Seen songs retrieved', titles: doc?.titles || [] });
      }

      // Otherwise, update with titles
      const updateObj = { $push: { titles: { $each: titles } } };
      if (genreField) updateObj.$push[genreField] = { $each: titles };

      await db.collection('seen_songs').updateOne(
        { uID },
        updateObj,
        { upsert: true }
      );
      const updatedDoc = await db.collection('seen_songs').findOne({ uID });
      res.status(200).json({ message: 'Seen songs updated', titles: updatedDoc.titles || [] });
    } catch (error) {
      console.error('Error updating seen songs:', error);
      res.status(500).json({ error: 'Failed to update seen songs' });
    }
  }

  static async getSeenSongTitles(req, uID) {
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