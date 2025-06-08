// services/auditService.ts
// Phase 5: Audit Logging, Advanced Security & Permissions System

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs, 
  startAfter,
  Timestamp,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

// Audit Log Entry Interface
export interface AuditLogEntry {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: AuditDetails;
  metadata: AuditMetadata;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: AuditCategory;
  outcome: 'success' | 'failure' | 'partial';
  changes?: AuditChanges;
}

// Audit Action Types
export type AuditAction = 
  // Authentication Actions
  | 'login' | 'logout' | 'login_failed' | 'password_reset' | 'account_locked'
  // User Management Actions
  | 'user_created' | 'user_updated' | 'user_deleted' | 'user_invited' | 'role_changed' | 'user_activated' | 'user_deactivated'
  // Data Management Actions
  | 'record_created' | 'record_updated' | 'record_deleted' | 'bulk_update' | 'data_export' | 'data_import'
  // System Administration
  | 'system_config_changed' | 'backup_created' | 'backup_restored' | 'maintenance_mode'
  // Security Actions
  | 'permission_granted' | 'permission_revoked' | 'access_denied' | 'suspicious_activity'
  // Business Operations
  | 'production_created' | 'production_updated' | 'inventory_adjusted' | 'sale_recorded' | 'cost_added'
  // File Operations
  | 'file_uploaded' | 'file_downloaded' | 'file_deleted' | 'report_generated';

// Resource Types
export type AuditResource = 
  | 'user' | 'production' | 'inventory' | 'sale' | 'cost' | 'product' | 'expense_type' | 'activity_type'
  | 'notification' | 'session' | 'system' | 'file' | 'report' | 'backup' | 'configuration';

// Audit Categories
export type AuditCategory = 
  | 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_administration'
  | 'security' | 'compliance' | 'business_operation' | 'file_operation' | 'reporting';

// Audit Details
export interface AuditDetails {
  description: string;
  operation?: string;
  affectedFields?: string[];
  recordCount?: number;
  additionalInfo?: Record<string, any>;
}

// Audit Metadata
export interface AuditMetadata {
  module: string;
  component?: string;
  version?: string;
  correlationId?: string;
  requestId?: string;
  feature?: string;
}

// Audit Changes (for data modifications)
export interface AuditChanges {
  before?: Record<string, any>;
  after?: Record<string, any>;
  fieldsChanged?: string[];
}

// Audit Search Filters
export interface AuditSearchFilters {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  category?: AuditCategory;
  severity?: string;
  outcome?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private collectionName = 'auditLogs';

  // Create audit log entry
  async logAction(auditEntry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const entry: Omit<AuditLogEntry, 'id'> = {
        ...auditEntry,
        timestamp: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(collection(db, this.collectionName), entry);
      
      // For critical actions, also log to console for immediate visibility
      if (auditEntry.severity === 'critical') {
        console.warn('🚨 CRITICAL AUDIT EVENT:', {
          action: auditEntry.action,
          user: auditEntry.userEmail,
          resource: auditEntry.resource,
          details: auditEntry.details.description
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Critical: Audit logging should never fail silently
      if (auditEntry.severity === 'critical') {
        console.error('🚨 FAILED TO LOG CRITICAL AUDIT EVENT:', error);
      }
      return null;
    }
  }

  // Get audit logs with filtering and pagination
  async getAuditLogs(filters: AuditSearchFilters = {}): Promise<{
    logs: AuditLogEntry[];
    hasMore: boolean;
    total?: number;
  }> {
    try {
      let q = collection(db, this.collectionName);
      let queryConstraints: any[] = [];

      // Apply filters
      if (filters.userId) {
        queryConstraints.push(where('userId', '==', filters.userId));
      }
      
      if (filters.action) {
        queryConstraints.push(where('action', '==', filters.action));
      }
      
      if (filters.resource) {
        queryConstraints.push(where('resource', '==', filters.resource));
      }
      
      if (filters.category) {
        queryConstraints.push(where('category', '==', filters.category));
      }
      
      if (filters.severity) {
        queryConstraints.push(where('severity', '==', filters.severity));
      }
      
      if (filters.outcome) {
        queryConstraints.push(where('outcome', '==', filters.outcome));
      }
      
      if (filters.startDate) {
        queryConstraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }
      
      if (filters.endDate) {
        queryConstraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      // Always order by timestamp (most recent first)
      queryConstraints.push(orderBy('timestamp', 'desc'));
      
      // Apply limit
      const limitCount = filters.limit || 50;
      queryConstraints.push(firestoreLimit(limitCount + 1)); // +1 to check if there are more

      const queryRef = query(q, ...queryConstraints);
      const snapshot = await getDocs(queryRef);
      
      const logs = snapshot.docs.slice(0, limitCount).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLogEntry[];

      const hasMore = snapshot.docs.length > limitCount;

      return { logs, hasMore };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], hasMore: false };
    }
  }

  // Search audit logs by text
  async searchAuditLogs(searchTerm: string, filters: AuditSearchFilters = {}): Promise<AuditLogEntry[]> {
    try {
      // First get all logs with filters, then filter by search term client-side
      // In production, consider using a search service like Algolia
      const { logs } = await this.getAuditLogs({ ...filters, limit: 1000 });
      
      const searchLower = searchTerm.toLowerCase();
      return logs.filter(log => 
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.details.description?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower) ||
        log.resource?.toLowerCase().includes(searchLower) ||
        log.ipAddress?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching audit logs:', error);
      return [];
    }
  }

  // Get audit statistics
  async getAuditStatistics(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByCategory: Record<AuditCategory, number>;
    eventsByAction: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    topUsers: Array<{ userId: string; userEmail: string; count: number }>;
    securityEvents: number;
    failedLogins: number;
  }> {
    try {
      const filters: AuditSearchFilters = {
        startDate,
        endDate,
        limit: 10000 // Large limit to get comprehensive statistics
      };

      const { logs } = await this.getAuditLogs(filters);

      // Calculate statistics
      const stats = {
        totalEvents: logs.length,
        eventsByCategory: {} as Record<AuditCategory, number>,
        eventsByAction: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        eventsByOutcome: {} as Record<string, number>,
        topUsers: [] as Array<{ userId: string; userEmail: string; count: number }>,
        securityEvents: 0,
        failedLogins: 0
      };

      const userCounts: Record<string, { userEmail: string; count: number }> = {};

      logs.forEach(log => {
        // Category stats
        stats.eventsByCategory[log.category] = (stats.eventsByCategory[log.category] || 0) + 1;
        
        // Action stats
        stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
        
        // Severity stats
        stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;
        
        // Outcome stats
        stats.eventsByOutcome[log.outcome] = (stats.eventsByOutcome[log.outcome] || 0) + 1;
        
        // User stats
        if (!userCounts[log.userId]) {
          userCounts[log.userId] = { userEmail: log.userEmail, count: 0 };
        }
        userCounts[log.userId].count++;
        
        // Security events
        if (log.category === 'security' || log.category === 'authentication') {
          stats.securityEvents++;
        }
        
        // Failed logins
        if (log.action === 'login_failed') {
          stats.failedLogins++;
        }
      });

      // Top users
      stats.topUsers = Object.entries(userCounts)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      return {
        totalEvents: 0,
        eventsByCategory: {} as Record<AuditCategory, number>,
        eventsByAction: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        eventsByOutcome: {} as Record<string, number>,
        topUsers: [],
        securityEvents: 0,
        failedLogins: 0
      };
    }
  }

  // Export audit logs
  async exportAuditLogs(filters: AuditSearchFilters = {}): Promise<string> {
    try {
      const { logs } = await this.getAuditLogs({ ...filters, limit: 10000 });
      
      // Create CSV content
      const headers = [
        'Timestamp',
        'User Email',
        'User Name',
        'Action',
        'Resource',
        'Resource ID',
        'Category',
        'Severity',
        'Outcome',
        'Description',
        'IP Address',
        'Session ID',
        'Changes'
      ];

      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          log.timestamp ? new Date(log.timestamp.seconds * 1000).toISOString() : '',
          `"${log.userEmail || ''}"`,
          `"${log.userName || ''}"`,
          log.action,
          log.resource,
          log.resourceId || '',
          log.category,
          log.severity,
          log.outcome,
          `"${log.details.description || ''}"`,
          log.ipAddress || '',
          log.sessionId || '',
          log.changes ? `"${JSON.stringify(log.changes)}"` : ''
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  // Helper methods for common audit actions

  // Authentication events
  async logLogin(userId: string, userEmail: string, userName: string, sessionId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      userName,
      action: 'login',
      resource: 'session',
      resourceId: sessionId,
      details: {
        description: `User ${userEmail} logged in successfully`,
        operation: 'authentication'
      },
      metadata: {
        module: 'authentication',
        component: 'login'
      },
      severity: 'low',
      category: 'authentication',
      outcome: 'success',
      ipAddress,
      userAgent,
      sessionId
    });
  }

  async logLogout(userId: string, userEmail: string, userName: string, sessionId: string): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      userName,
      action: 'logout',
      resource: 'session',
      resourceId: sessionId,
      details: {
        description: `User ${userEmail} logged out`,
        operation: 'authentication'
      },
      metadata: {
        module: 'authentication',
        component: 'logout'
      },
      severity: 'low',
      category: 'authentication',
      outcome: 'success',
      sessionId
    });
  }

  async logFailedLogin(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId: 'anonymous',
      userEmail: email,
      userName: 'Unknown',
      action: 'login_failed',
      resource: 'session',
      details: {
        description: `Failed login attempt for ${email}: ${reason}`,
        operation: 'authentication',
        additionalInfo: { reason }
      },
      metadata: {
        module: 'authentication',
        component: 'login'
      },
      severity: 'medium',
      category: 'security',
      outcome: 'failure',
      ipAddress,
      userAgent
    });
  }

  // Data modification events
  async logDataChange(
    userId: string, 
    userEmail: string, 
    userName: string, 
    action: 'record_created' | 'record_updated' | 'record_deleted',
    resource: AuditResource,
    resourceId: string,
    changes?: AuditChanges,
    sessionId?: string
  ): Promise<void> {
    const actionDescriptions = {
      record_created: 'created',
      record_updated: 'updated',
      record_deleted: 'deleted'
    };

    await this.logAction({
      userId,
      userEmail,
      userName,
      action,
      resource,
      resourceId,
      details: {
        description: `${userName} ${actionDescriptions[action]} ${resource} record`,
        operation: 'data_modification',
        affectedFields: changes?.fieldsChanged
      },
      metadata: {
        module: 'data_management',
        component: resource
      },
      severity: action === 'record_deleted' ? 'medium' : 'low',
      category: 'data_modification',
      outcome: 'success',
      changes,
      sessionId
    });
  }

  // Administrative events
  async logAdminAction(
    userId: string,
    userEmail: string,
    userName: string,
    action: AuditAction,
    resource: AuditResource,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    additionalInfo?: Record<string, any>,
    sessionId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      userName,
      action,
      resource,
      details: {
        description,
        operation: 'administration',
        additionalInfo
      },
      metadata: {
        module: 'administration',
        component: 'admin_panel'
      },
      severity,
      category: 'system_administration',
      outcome: 'success',
      sessionId
    });
  }

  // Security events
  async logSecurityEvent(
    userId: string,
    userEmail: string,
    userName: string,
    action: AuditAction,
    description: string,
    severity: 'medium' | 'high' | 'critical' = 'high',
    outcome: 'success' | 'failure' = 'failure',
    ipAddress?: string,
    sessionId?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      userName,
      action,
      resource: 'system',
      details: {
        description,
        operation: 'security_event'
      },
      metadata: {
        module: 'security',
        component: 'security_monitor'
      },
      severity,
      category: 'security',
      outcome,
      ipAddress,
      sessionId
    });
  }
}

// Export singleton instance
export const auditService = new AuditService(); 
