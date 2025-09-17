import { postgresDb } from "./postgresDatabase";
import { database as sqliteDb } from "./database";

/**
 * Database Adapter - Automatically switches between SQLite and PostgreSQL
 * based on environment configuration
 */
class DatabaseAdapter {
  private usePostgres: boolean;
  private activeDb: any;

  constructor() {
    // Use PostgreSQL if DATABASE_URL is set or in production
    this.usePostgres = !!(
      process.env.DATABASE_URL ||
      process.env.DB_HOST ||
      process.env.NODE_ENV === "production"
    );
    this.activeDb = this.usePostgres ? postgresDb : sqliteDb;

    console.log(`🗄️  Database: ${this.usePostgres ? "PostgreSQL" : "SQLite"}`);
  }

  async initialize(): Promise<void> {
    if (this.usePostgres) {
      await postgresDb.initialize();
    } else {
      await sqliteDb.initialize();
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    try {
      return await this.activeDb.query(sql, params);
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.usePostgres) {
        return await postgresDb.healthCheck();
      } else {
        // Simple health check for SQLite
        const result = await sqliteDb.query("SELECT 1 as health");
        return Array.isArray(result) && result.length > 0;
      }
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  getConnectionInfo(): any {
    if (this.usePostgres) {
      return {
        type: "PostgreSQL",
        status: postgresDb.getPoolStatus(),
        url: process.env.DATABASE_URL
          ? "[REDACTED]"
          : `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`,
      };
    } else {
      return {
        type: "SQLite",
        file: "telecheck.db",
        status: "active",
      };
    }
  }

  async close(): Promise<void> {
    if (this.usePostgres) {
      await postgresDb.close();
    } else {
      await sqliteDb.close();
    }
  }

  // Helper methods for common operations
  async getUserById(id: string): Promise<any> {
    const users = await this.query("SELECT * FROM users WHERE id = ?", [id]);
    return users[0] || null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const users = await this.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return users[0] || null;
  }

  async createUser(userData: any): Promise<any> {
    const { firstName, lastName, email, ...rest } = userData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO users (first_name, last_name, email, ${Object.keys(rest).join(", ")})
        VALUES ($1, $2, $3, ${Object.keys(rest)
          .map((_, i) => `$${i + 4}`)
          .join(", ")})
        RETURNING *
      `,
        [firstName, lastName, email, ...Object.values(rest)],
      );
      return result[0];
    } else {
      const id = `user-${Date.now()}`;
      await this.query(
        `
        INSERT INTO users (id, first_name, last_name, email, ${Object.keys(rest).join(", ")})
        VALUES (?, ?, ?, ?, ${Object.keys(rest)
          .map(() => "?")
          .join(", ")})
      `,
        [id, firstName, lastName, email, ...Object.values(rest)],
      );
      return this.getUserById(id);
    }
  }

  async getVitalSigns(userId: string, limit: number = 100): Promise<any[]> {
    return await this.query(
      `
      SELECT * FROM vital_signs 
      WHERE user_id = ? 
      ORDER BY measured_at DESC 
      LIMIT ?
    `,
      [userId, limit],
    );
  }

  async addVitalSigns(vitalData: any): Promise<any> {
    const { userId, type, value, unit, measuredAt, deviceId } = vitalData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO vital_signs (user_id, type, value, unit, measured_at, device_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [userId, type, value, unit, measuredAt || new Date(), deviceId],
      );
      return result[0];
    } else {
      const id = `vital-${Date.now()}`;
      await this.query(
        `
        INSERT INTO vital_signs (id, user_id, type, value, unit, measured_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [id, userId, type, value, unit, measuredAt || new Date().toISOString()],
      );
      return this.getVitalById(id);
    }
  }

  async getVitalById(id: string): Promise<any> {
    const vitals = await this.query("SELECT * FROM vital_signs WHERE id = ?", [
      id,
    ]);
    return vitals[0] || null;
  }

  async getMedications(
    userId: string,
    activeOnly: boolean = true,
  ): Promise<any[]> {
    const activeClause = activeOnly ? "AND active = true" : "";
    return await this.query(
      `
      SELECT * FROM medications 
      WHERE user_id = ? ${activeClause}
      ORDER BY created_at DESC
    `,
      [userId],
    );
  }

  async addMedication(medicationData: any): Promise<any> {
    const {
      userId,
      name,
      dosage,
      frequency,
      startDate,
      prescribingDoctor,
      notes,
    } = medicationData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO medications (user_id, name, dosage, frequency, start_date, prescribing_doctor, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [userId, name, dosage, frequency, startDate, prescribingDoctor, notes],
      );
      return result[0];
    } else {
      const id = `med-${Date.now()}`;
      await this.query(
        `
        INSERT INTO medications (id, user_id, name, dosage, frequency, start_date, prescribing_doctor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          userId,
          name,
          dosage,
          frequency,
          startDate,
          prescribingDoctor,
          notes,
        ],
      );
      return this.getMedicationById(id);
    }
  }

  async getMedicationById(id: string): Promise<any> {
    const medications = await this.query(
      "SELECT * FROM medications WHERE id = ?",
      [id],
    );
    return medications[0] || null;
  }

  async getLabResults(userId: string, limit: number = 50): Promise<any[]> {
    return await this.query(
      `
      SELECT * FROM lab_results 
      WHERE user_id = ? 
      ORDER BY date_collected DESC 
      LIMIT ?
    `,
      [userId, limit],
    );
  }

  async addLabResult(labData: any): Promise<any> {
    const {
      userId,
      testName,
      value,
      unit,
      referenceRange,
      status,
      dateCollected,
      labName,
    } = labData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO lab_results (user_id, test_name, value, unit, reference_range, status, date_collected, lab_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          userId,
          testName,
          value,
          unit,
          referenceRange,
          status,
          dateCollected,
          labName,
        ],
      );
      return result[0];
    } else {
      const id = `lab-${Date.now()}`;
      await this.query(
        `
        INSERT INTO lab_results (id, user_id, test_name, value, unit, reference_range, status, date_collected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          userId,
          testName,
          value,
          unit,
          referenceRange,
          status,
          dateCollected,
        ],
      );
      return this.getLabResultById(id);
    }
  }

  async getLabResultById(id: string): Promise<any> {
    const results = await this.query("SELECT * FROM lab_results WHERE id = ?", [
      id,
    ]);
    return results[0] || null;
  }

  async getChatMessages(userId: string, limit: number = 50): Promise<any[]> {
    return await this.query(
      `
      SELECT * FROM chat_messages 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `,
      [userId, limit],
    );
  }

  async addChatMessage(messageData: any): Promise<any> {
    const { userId, content, sender, messageType, metadata } = messageData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO chat_messages (user_id, content, sender, message_type, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [userId, content, sender, messageType || "text", metadata],
      );
      return result[0];
    } else {
      const id = `msg-${Date.now()}`;
      await this.query(
        `
        INSERT INTO chat_messages (id, user_id, content, sender)
        VALUES (?, ?, ?, ?)
      `,
        [id, userId, content, sender],
      );
      return this.getChatMessageById(id);
    }
  }

  async getChatMessageById(id: string): Promise<any> {
    const messages = await this.query(
      "SELECT * FROM chat_messages WHERE id = ?",
      [id],
    );
    return messages[0] || null;
  }

  async getHealthInsights(
    userId: string,
    dismissed: boolean = false,
  ): Promise<any[]> {
    return await this.query(
      `
      SELECT * FROM health_insights 
      WHERE user_id = ? AND dismissed = ? 
      ORDER BY priority DESC, created_at DESC
    `,
      [userId, dismissed],
    );
  }

  async addHealthInsight(insightData: any): Promise<any> {
    const {
      userId,
      title,
      description,
      type,
      priority,
      category,
      confidence,
      actionRequired,
    } = insightData;

    if (this.usePostgres) {
      const result = await this.query(
        `
        INSERT INTO health_insights (user_id, title, description, type, priority, category, confidence, action_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          userId,
          title,
          description,
          type,
          priority,
          category,
          confidence,
          actionRequired,
        ],
      );
      return result[0];
    } else {
      const id = `insight-${Date.now()}`;
      await this.query(
        `
        INSERT INTO health_insights (id, user_id, title, description, type, priority)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [id, userId, title, description, type, priority],
      );
      return this.getHealthInsightById(id);
    }
  }

  async getHealthInsightById(id: string): Promise<any> {
    const insights = await this.query(
      "SELECT * FROM health_insights WHERE id = ?",
      [id],
    );
    return insights[0] || null;
  }

  async dismissHealthInsight(id: string): Promise<boolean> {
    const result = await this.query(
      "UPDATE health_insights SET dismissed = true WHERE id = ?",
      [id],
    );
    return this.usePostgres ? result.rowCount > 0 : result.changes > 0;
  }

  // Audit logging for HIPAA compliance
  async logActivity(
    userId: string,
    action: string,
    description: string,
    details: any = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    if (this.usePostgres) {
      await this.query(
        `
        INSERT INTO audit_logs (user_id, action, description, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          userId,
          action,
          description,
          JSON.stringify(details),
          ipAddress,
          userAgent,
        ],
      );
    } else {
      await this.query(
        `
        INSERT INTO audit_logs (user_id, action, description, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          action,
          description,
          JSON.stringify(details),
          ipAddress,
          userAgent,
        ],
      );
    }
  }
}

// Export singleton instance
export const db = new DatabaseAdapter();

// Initialize on import
db.initialize().catch(console.error);

export default db;
