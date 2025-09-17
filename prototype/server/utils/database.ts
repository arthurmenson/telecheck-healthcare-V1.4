// In-memory database simulation for development
// In production, this would be replaced with a real database (PostgreSQL, MongoDB, etc.)

import { User, LabResult, LabReport, Medication, VitalSigns, ChatMessage, HealthInsight } from '@shared/types';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { initializeMessagingTables } from './messagingDatabase';

// SQL Database implementation
class SQLiteDatabase {
  private db: any = null;

  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: path.join(process.cwd(), 'telecheck.db'),
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Initialize core tables
      await this.initializeTables();

      // Initialize messaging tables
      await initializeMessagingTables();

      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return await this.db.all(sql, params);
      } else {
        const result = await this.db.run(sql, params);
        return result;
      }
    } catch (error) {
      console.error('Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  private async initializeTables(): Promise<void> {
    // Create core application tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT,
        phone TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        medical_history TEXT,
        current_medications TEXT,
        allergies TEXT,
        insurance_provider TEXT,
        insurance_policy_number TEXT,
        primary_care_physician TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS lab_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        reference_range TEXT,
        status TEXT,
        date_collected DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        prescribing_doctor TEXT,
        notes TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS vital_signs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        measured_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS health_insights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        dismissed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON lab_results(user_id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_vital_signs_user_id ON vital_signs(user_id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_health_insights_user_id ON health_insights(user_id)');
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
}

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private labResults: Map<string, LabResult> = new Map();
  private labReports: Map<string, LabReport> = new Map();
  private medications: Map<string, Medication> = new Map();
  private vitalSigns: Map<string, VitalSigns> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();
  private healthInsights: Map<string, HealthInsight> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed with sample user
    const sampleUser: User = {
      id: 'user-1',
      email: 'demo@telecheck.com',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1985-06-15',
      phone: '+1-555-0123',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1-555-0124',
        relationship: 'Spouse'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(sampleUser.id, sampleUser);

    // Seed with sample lab results
    const sampleLabResults: LabResult[] = [
      {
        id: 'lab-1',
        userId: 'user-1',
        testName: 'Glucose (Fasting)',
        value: 95,
        unit: 'mg/dL',
        referenceRange: '70-100',
        status: 'normal',
        testDate: '2024-01-15',
        labName: 'Quest Diagnostics',
        createdAt: new Date().toISOString()
      },
      {
        id: 'lab-2',
        userId: 'user-1',
        testName: 'Total Cholesterol',
        value: 205,
        unit: 'mg/dL',
        referenceRange: '<200',
        status: 'borderline',
        testDate: '2024-01-15',
        labName: 'Quest Diagnostics',
        createdAt: new Date().toISOString()
      },
      {
        id: 'lab-3',
        userId: 'user-1',
        testName: 'HDL Cholesterol',
        value: 58,
        unit: 'mg/dL',
        referenceRange: '>40 (M), >50 (F)',
        status: 'normal',
        testDate: '2024-01-15',
        labName: 'Quest Diagnostics',
        createdAt: new Date().toISOString()
      },
      {
        id: 'lab-4',
        userId: 'user-1',
        testName: 'LDL Cholesterol',
        value: 135,
        unit: 'mg/dL',
        referenceRange: '<100',
        status: 'high',
        testDate: '2024-01-15',
        labName: 'Quest Diagnostics',
        createdAt: new Date().toISOString()
      }
    ];

    sampleLabResults.forEach(result => this.labResults.set(result.id, result));

    // Seed with sample medications
    const sampleMedications: Medication[] = [
      {
        id: 'med-1',
        userId: 'user-1',
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily',
        startDate: '2024-01-01',
        prescribedBy: 'Dr. Smith',
        instructions: 'Take with evening meal',
        isActive: true
      },
      {
        id: 'med-2',
        userId: 'user-1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        startDate: '2023-12-01',
        prescribedBy: 'Dr. Johnson',
        instructions: 'Take with meals',
        isActive: true
      }
    ];

    sampleMedications.forEach(med => this.medications.set(med.id, med));

    // Seed with sample vital signs
    const sampleVitals: VitalSigns[] = [
      {
        id: 'vital-1',
        userId: 'user-1',
        heartRate: 72,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        temperature: 98.6,
        oxygenSaturation: 98,
        weight: 175,
        height: 70,
        recordedAt: new Date().toISOString(),
        source: 'manual'
      }
    ];

    sampleVitals.forEach(vital => this.vitalSigns.set(vital.id, vital));

    // Seed with sample health insights
    const sampleInsights: HealthInsight[] = [
      {
        id: 'insight-1',
        userId: 'user-1',
        type: 'recommendation',
        title: 'Cholesterol Management',
        description: 'Your LDL cholesterol is elevated. Consider discussing lifestyle modifications or medication adjustments with your healthcare provider.',
        priority: 'medium',
        category: 'Cardiovascular Health',
        confidence: 92,
        actionRequired: true,
        dismissed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'insight-2',
        userId: 'user-1',
        type: 'insight',
        title: 'Excellent Glucose Control',
        description: 'Your fasting glucose levels are well within normal range, indicating good metabolic health.',
        priority: 'low',
        category: 'Metabolic Health',
        confidence: 95,
        actionRequired: false,
        dismissed: false,
        createdAt: new Date().toISOString()
      }
    ];

    sampleInsights.forEach(insight => this.healthInsights.set(insight.id, insight));
  }

  // User methods
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  // Lab Results methods
  getLabResults(userId: string): LabResult[] {
    return Array.from(this.labResults.values()).filter(result => result.userId === userId);
  }

  createLabResult(result: Omit<LabResult, 'id' | 'createdAt'>): LabResult {
    const newResult: LabResult = {
      ...result,
      id: `lab-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.labResults.set(newResult.id, newResult);
    return newResult;
  }

  // Lab Reports methods
  getLabReports(userId: string): LabReport[] {
    return Array.from(this.labReports.values()).filter(report => report.userId === userId);
  }

  createLabReport(report: Omit<LabReport, 'id'>): LabReport {
    const newReport: LabReport = {
      ...report,
      id: `report-${Date.now()}`
    };
    this.labReports.set(newReport.id, newReport);
    return newReport;
  }

  updateLabReport(id: string, updates: Partial<LabReport>): LabReport | undefined {
    const report = this.labReports.get(id);
    if (report) {
      const updatedReport = { ...report, ...updates };
      this.labReports.set(id, updatedReport);
      return updatedReport;
    }
    return undefined;
  }

  // Medications methods
  getMedications(userId: string): Medication[] {
    return Array.from(this.medications.values()).filter(med => med.userId === userId);
  }

  createMedication(medication: Omit<Medication, 'id'>): Medication {
    const newMedication: Medication = {
      ...medication,
      id: `med-${Date.now()}`
    };
    this.medications.set(newMedication.id, newMedication);
    return newMedication;
  }

  // Vital Signs methods
  getVitalSigns(userId: string): VitalSigns[] {
    return Array.from(this.vitalSigns.values()).filter(vital => vital.userId === userId);
  }

  createVitalSigns(vital: Omit<VitalSigns, 'id'>): VitalSigns {
    const newVital: VitalSigns = {
      ...vital,
      id: `vital-${Date.now()}`
    };
    this.vitalSigns.set(newVital.id, newVital);
    return newVital;
  }

  // Chat Messages methods
  getChatMessages(userId: string): ChatMessage[] {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.userId === userId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  createChatMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`
    };
    this.chatMessages.set(newMessage.id, newMessage);
    return newMessage;
  }

  // Health Insights methods
  getHealthInsights(userId: string): HealthInsight[] {
    return Array.from(this.healthInsights.values())
      .filter(insight => insight.userId === userId && !insight.dismissed)
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  createHealthInsight(insight: Omit<HealthInsight, 'id'>): HealthInsight {
    const newInsight: HealthInsight = {
      ...insight,
      id: `insight-${Date.now()}`
    };
    this.healthInsights.set(newInsight.id, newInsight);
    return newInsight;
  }

  dismissHealthInsight(id: string): boolean {
    const insight = this.healthInsights.get(id);
    if (insight) {
      insight.dismissed = true;
      this.healthInsights.set(id, insight);
      return true;
    }
    return false;
  }
}

export const db = new InMemoryDatabase();

// Create and export SQL database instance
const sqlDatabase = new SQLiteDatabase();

// Initialize the database when the module is loaded
sqlDatabase.initialize().catch(console.error);

// Export both databases
export const database = sqlDatabase; // For new SQL-based features
export { sqlDatabase };
