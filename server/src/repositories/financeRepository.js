export function createFinanceRepository(db) {
  return {
    list(userId) {
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

    get(userId, id) {
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

    insert(userId, transaction) {
      db.prepare(`
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

    updateStatusAndAccount(userId, id, status, account) {
      db.prepare(`
        UPDATE transactions SET status = ?, account = ?
        WHERE user_id = ? AND id = ?
      `).run(status, account, userId, id)
    },

    updateCategory(userId, id, category) {
      db.prepare(`
        UPDATE transactions SET category = ?
        WHERE user_id = ? AND id = ?
      `).run(category, userId, id)
    },

    delete(userId, id) {
      return db.prepare('DELETE FROM transactions WHERE user_id = ? AND id = ?').run(userId, id)
    },

    deleteAll(userId) {
      db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId)
    },
  }
}
