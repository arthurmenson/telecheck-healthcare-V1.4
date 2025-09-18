const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockUsers = [
  {
    id: '1',
    email: 'admin@healthcare.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    lastLogin: new Date('2024-01-15T10:30:00Z'),
    failedLoginAttempts: 0,
    mfaEnabled: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    phone: '+1-555-0123',
    organization: 'Healthcare Systems Inc',
    department: 'Administration',
    verified: true,
    twoFactorEnabled: true
  },
  {
    id: '2',
    email: 'doctor.smith@healthcare.com',
    name: 'Dr. John Smith',
    role: 'doctor',
    isActive: true,
    lastLogin: new Date('2024-01-15T09:00:00Z'),
    failedLoginAttempts: 0,
    mfaEnabled: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T09:00:00Z'),
    phone: '+1-555-0124',
    organization: 'Healthcare Systems Inc',
    department: 'Cardiology',
    verified: true,
    twoFactorEnabled: true
  },
  {
    id: '3',
    email: 'nurse.johnson@healthcare.com',
    name: 'Sarah Johnson',
    role: 'nurse',
    isActive: true,
    lastLogin: new Date('2024-01-15T08:00:00Z'),
    failedLoginAttempts: 0,
    mfaEnabled: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z'),
    phone: '+1-555-0125',
    organization: 'Healthcare Systems Inc',
    department: 'Emergency',
    verified: true,
    twoFactorEnabled: false
  },
  {
    id: '4',
    email: 'patient.doe@gmail.com',
    name: 'John Doe',
    role: 'patient',
    isActive: true,
    lastLogin: new Date('2024-01-14T19:30:00Z'),
    failedLoginAttempts: 0,
    mfaEnabled: false,
    createdAt: new Date('2024-01-05T00:00:00Z'),
    updatedAt: new Date('2024-01-14T19:30:00Z'),
    phone: '+1-555-0126',
    organization: null,
    department: null,
    verified: true,
    twoFactorEnabled: false
  },
  {
    id: '5',
    email: 'pharmacist.lee@healthcare.com',
    name: 'David Lee',
    role: 'pharmacist',
    isActive: true,
    lastLogin: new Date('2024-01-15T07:45:00Z'),
    failedLoginAttempts: 0,
    mfaEnabled: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T07:45:00Z'),
    phone: '+1-555-0127',
    organization: 'Healthcare Systems Inc',
    department: 'Pharmacy',
    verified: true,
    twoFactorEnabled: true
  }
];

const mockSystemMetrics = {
  totalUsers: mockUsers.length,
  activeUsers: mockUsers.filter(u => u.isActive).length,
  totalPatients: mockUsers.filter(u => u.role === 'patient').length,
  totalDoctors: mockUsers.filter(u => u.role === 'doctor').length,
  totalNurses: mockUsers.filter(u => u.role === 'nurse').length,
  totalPharmacists: mockUsers.filter(u => u.role === 'pharmacist').length,
  totalAdmins: mockUsers.filter(u => u.role === 'admin').length,
  activeToday: Math.floor(mockUsers.length * 0.7),
  securityAlerts: 2,
  pendingVerifications: 1,
  systemHealth: 'good',
  uptime: 99.9,
  lastBackup: new Date('2024-01-15T02:00:00Z')
};

// API Routes

// Get users with pagination and filtering
app.get('/api/admin/users', (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;

  let filteredUsers = [...mockUsers];

  // Apply search filter
  if (search) {
    filteredUsers = filteredUsers.filter(user =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Apply role filter
  if (role && role !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }

  // Apply status filter
  if (status && status !== 'all') {
    if (status === 'active') {
      filteredUsers = filteredUsers.filter(user => user.isActive);
    } else if (status === 'inactive') {
      filteredUsers = filteredUsers.filter(user => !user.isActive);
    }
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      users: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit)
      }
    }
  });
});

// Get single user by ID
app.get('/api/admin/users/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }
  res.json({ success: true, data: user });
});

// Create new user
app.post('/api/admin/users', (req, res) => {
  const newUser = {
    id: (mockUsers.length + 1).toString(),
    ...req.body,
    isActive: true,
    failedLoginAttempts: 0,
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    verified: false,
    twoFactorEnabled: false
  };

  mockUsers.push(newUser);

  res.status(201).json({
    success: true,
    data: newUser
  });
});

// Update user
app.put('/api/admin/users/:id', (req, res) => {
  const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  mockUsers[userIndex] = {
    ...mockUsers[userIndex],
    ...req.body,
    updatedAt: new Date()
  };

  res.json({
    success: true,
    data: mockUsers[userIndex]
  });
});

// Delete user
app.delete('/api/admin/users/:id', (req, res) => {
  const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  mockUsers.splice(userIndex, 1);

  res.json({
    success: true,
    data: { message: 'User deleted successfully' }
  });
});

// Get system metrics
app.get('/api/admin/system-metrics', (req, res) => {
  res.json({
    success: true,
    data: mockSystemMetrics
  });
});

// Get security alerts
app.get('/api/admin/security-alerts', (req, res) => {
  const alerts = [
    {
      id: '1',
      type: 'failed_login',
      severity: 'medium',
      message: 'Multiple failed login attempts detected',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      resolved: false
    },
    {
      id: '2',
      type: 'suspicious_activity',
      severity: 'high',
      message: 'Unusual access pattern detected',
      timestamp: new Date('2024-01-15T09:30:00Z'),
      resolved: false
    }
  ];

  res.json({
    success: true,
    data: alerts
  });
});

// Authentication endpoints
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Mock authentication - accept any password for development
  const user = mockUsers.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  // Generate mock JWT token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: getPermissions(user.role),
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    }
  });
});

function getPermissions(role) {
  switch (role) {
    case 'admin':
      return ['full_access', 'user_management', 'system_settings', 'audit_logs'];
    case 'doctor':
      return ['view_all_patients', 'prescribe_medications', 'review_labs'];
    case 'nurse':
      return ['update_vital_signs', 'care_coordination', 'medication_administration'];
    case 'pharmacist':
      return ['dispense_medications', 'review_prescriptions', 'drug_interactions'];
    case 'patient':
      return ['view_own_records', 'book_appointments', 'order_medications'];
    default:
      return [];
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong!'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`📊 Serving ${mockUsers.length} mock users`);
  console.log(`🔗 Admin endpoints available at /api/admin/*`);
});