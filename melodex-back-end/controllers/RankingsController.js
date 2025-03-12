// backend/controllers/RankingsController.js
class RankingsController {
  static async upsertRanking(req, res) {
    const { uID, deezerID, rating } = req.body;
    const db = req.app.locals.db;
    try {
      const result = await db.collection('rankings').updateOne(
        { uID, deezerID },
        { $set: { rating } },
        { upsert: true }
      );
      const message = result.matchedCount > 0 ? 'Ranking updated' : 'Ranking created';
      res.status(200).json({ message });
    } catch (error) {
      console.error('Error upserting ranking:', error);
      res.status(500).json({ error: 'Failed to update ranking' });
    }
  }

  static async getRankedDeezerIDs(req, uID) { // Add req parameter
    const db = req.app.locals.db;
    try {
      const rankedSongs = await db.collection('rankings')
        .find({ uID })
        .project({ deezerID: 1, rating: 1, _id: 0 })
        .toArray();
      return rankedSongs;
    } catch (error) {
      console.error('Error fetching ranked deezerIDs:', error);
      throw error;
    }
  }
}

module.exports = RankingsController;