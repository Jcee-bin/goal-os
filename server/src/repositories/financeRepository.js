export function createFinanceRepository(db) {
  return {
    async list(userId) {
      return db.prepare(`
        SELECT
          id,
          type,
          account,
          destination_account AS destinationAccount,
          status,
          category,
          amount_centavos AS amountCentavos,
          note,
          transaction_on AS transactionOn,
          created_at AS createdAt
        FROM transactions
        WHERE user_id = ?
        ORDER BY transaction_on DESC, created_at DESC
      `).all(userId)
    },

    async get(userId, id) {
      return db.prepare(`
        SELECT
          id,
          type,
          account,
          destination_account AS destinationAccount,
          status,
          category,
          amount_centavos AS amountCentavos,
          note,
          transaction_on AS transactionOn,
          created_at AS createdAt
        FROM transactions
        WHERE user_id = ? AND id = ?
      `).get(userId, id)
    },

    async insert(userId, transaction) {
      await db.prepare(`
        INSERT INTO transactions
          (id, user_id, type, account, destination_account, status, category,
           amount_centavos, note, transaction_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transaction.id,
        userId,
        transaction.type,
        transaction.account,
        transaction.destinationAccount,
        transaction.status,
        transaction.category,
        transaction.amountCentavos,
        transaction.note,
        transaction.transactionOn,
        transaction.createdAt,
      )
      return this.get(userId, transaction.id)
    },

    async updateStatusAndAccount(userId, id, status, account) {
      await db.prepare(`
        UPDATE transactions SET status = ?, account = ?
        WHERE user_id = ? AND id = ?
      `).run(status, account, userId, id)
    },

    async updateCategory(userId, id, category) {
      await db.prepare(`
        UPDATE transactions SET category = ?
        WHERE user_id = ? AND id = ?
      `).run(category, userId, id)
    },

    async delete(userId, id) {
      return db.prepare('DELETE FROM transactions WHERE user_id = ? AND id = ?').run(userId, id)
    },

    async deleteAll(userId) {
      await db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId)
    },
  }
}
