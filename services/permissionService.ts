// services/permissionService.ts
// Phase 5: Advanced Permissions System

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { auditService } from './auditService';

// Permission Definitions
export interface Permission {
  id?: string;
  name: string;
  resource: string;
  action: PermissionAction;
  description: string;
  category: PermissionCategory;
  level: PermissionLevel;
  conditions?: PermissionCondition[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type PermissionAction = 
  | 'create' | 'read' | 'update' | 'delete' | 'list' | 'export' | 'import'
  | 'approve' | 'reject' | 'assign' | 'revoke' | 'manage' | 'configure' | 'execute';

export type PermissionCategory = 
  | 'user_management' | 'data_management' | 'system_administration' | 'reporting' 
  | 'audit' | 'security' | 'configuration' | 'business_operations';

export type PermissionLevel = 'basic' | 'advanced' | 'administrative' | 'system';

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  description?: string;
}

// Role Definitions
export interface Role {
  id?: string;
  name: string;
  description: string;
  level: RoleLevel;
  permissions: string[]; // Permission IDs
  inheritsFrom?: string[]; // Parent role IDs
  isSystemRole: boolean;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

export type RoleLevel = 'user' | 'manager' | 'admin' | 'super_admin' | 'system';

// User Permission Assignment
export interface UserPermissionAssignment {
  id?: string;
  userId: string;
  roleId?: string;
  permissionId?: string;
  grantedBy: string;
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
  conditions?: PermissionCondition[];
  isActive: boolean;
  reason?: string;
}

// Permission Check Result
export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  source: 'role' | 'direct' | 'inherited' | 'system';
  roleId?: string;
  permissionId?: string;
  conditions?: PermissionCondition[];
}

export class PermissionService {
  private permissionsCollection = 'permissions';
  private rolesCollection = 'roles';
  private userPermissionsCollection = 'userPermissions';

  constructor() {
    this.initializeSystemPermissions();
  }

  // Initialize system permissions and roles
  private async initializeSystemPermissions(): Promise<void> {
    try {
      // Check if system permissions already exist
      const systemPermissionsQuery = query(
        collection(db, this.permissionsCollection),
        where('category', '==', 'system_administration')
      );
      
      const snapshot = await getDocs(systemPermissionsQuery);
      if (!snapshot.empty) {
        return; // System permissions already initialized
      }

      // Create default permissions
      await this.createDefaultPermissions();
      await this.createDefaultRoles();
    } catch (error) {
      console.error('Error initializing system permissions:', error);
    }
  }

  // Create default system permissions
  private async createDefaultPermissions(): Promise<void> {
    const defaultPermissions: Omit<Permission, 'id'>[] = [
      // User Management
      {
        name: 'users.create',
        resource: 'user',
        action: 'create',
        description: 'Create new users and send invitations',
        category: 'user_management',
        level: 'administrative'
      },
      {
        name: 'users.read',
        resource: 'user',
        action: 'read',
        description: 'View user profiles and information',
        category: 'user_management',
        level: 'basic'
      },
      {
        name: 'users.update',
        resource: 'user',
        action: 'update',
        description: 'Update user profiles and settings',
        category: 'user_management',
        level: 'advanced'
      },
      {
        name: 'users.delete',
        resource: 'user',
        action: 'delete',
        description: 'Delete user accounts',
        category: 'user_management',
        level: 'administrative'
      },
      {
        name: 'users.manage_roles',
        resource: 'user',
        action: 'assign',
        description: 'Assign and revoke user roles',
        category: 'user_management',
        level: 'administrative'
      },

      // Data Management
      {
        name: 'production.create',
        resource: 'production',
        action: 'create',
        description: 'Create production records',
        category: 'business_operations',
        level: 'basic'
      },
      {
        name: 'production.update',
        resource: 'production',
        action: 'update',
        description: 'Update production records',
        category: 'business_operations',
        level: 'basic'
      },
      {
        name: 'production.delete',
        resource: 'production',
        action: 'delete',
        description: 'Delete production records',
        category: 'business_operations',
        level: 'advanced'
      },
      {
        name: 'inventory.manage',
        resource: 'inventory',
        action: 'manage',
        description: 'Manage inventory and stock levels',
        category: 'business_operations',
        level: 'basic'
      },
      {
        name: 'sales.create',
        resource: 'sale',
        action: 'create',
        description: 'Record sales transactions',
        category: 'business_operations',
        level: 'basic'
      },
      {
        name: 'costs.manage',
        resource: 'cost',
        action: 'manage',
        description: 'Manage costs and expenses',
        category: 'business_operations',
        level: 'basic'
      },

      // Reporting
      {
        name: 'reports.view',
        resource: 'report',
        action: 'read',
        description: 'View reports and analytics',
        category: 'reporting',
        level: 'basic'
      },
      {
        name: 'reports.export',
        resource: 'report',
        action: 'export',
        description: 'Export reports and data',
        category: 'reporting',
        level: 'advanced'
      },
      {
        name: 'reports.create',
        resource: 'report',
        action: 'create',
        description: 'Create custom reports',
        category: 'reporting',
        level: 'advanced'
      },

      // System Administration
      {
        name: 'system.configure',
        resource: 'system',
        action: 'configure',
        description: 'Configure system settings',
        category: 'system_administration',
        level: 'system'
      },
      {
        name: 'audit.view',
        resource: 'audit',
        action: 'read',
        description: 'View audit logs',
        category: 'audit',
        level: 'administrative'
      },
      {
        name: 'audit.export',
        resource: 'audit',
        action: 'export',
        description: 'Export audit logs',
        category: 'audit',
        level: 'administrative'
      },
      {
        name: 'permissions.manage',
        resource: 'permission',
        action: 'manage',
        description: 'Manage roles and permissions',
        category: 'security',
        level: 'system'
      },

      // Master Data
      {
        name: 'master_data.manage',
        resource: 'master_data',
        action: 'manage',
        description: 'Manage products, expense types, and activity types',
        category: 'configuration',
        level: 'advanced'
      }
    ];

    for (const permission of defaultPermissions) {
      await addDoc(collection(db, this.permissionsCollection), {
        ...permission,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  // Create default system roles
  private async createDefaultRoles(): Promise<void> {
    // Get all permissions first
    const permissionsSnapshot = await getDocs(collection(db, this.permissionsCollection));
    const permissions = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const defaultRoles: Omit<Role, 'id'>[] = [
      {
        name: 'user',
        description: 'Standard user with basic permissions',
        level: 'user',
        permissions: permissions
          .filter(p => p.level === 'basic' && p.category === 'business_operations')
          .map(p => p.id),
        isSystemRole: true,
        isActive: true
      },
      {
        name: 'manager',
        description: 'Manager with advanced business permissions',
        level: 'manager',
        permissions: permissions
          .filter(p => ['basic', 'advanced'].includes(p.level) && 
                      ['business_operations', 'reporting'].includes(p.category))
          .map(p => p.id),
        inheritsFrom: [], // Will be set after user role is created
        isSystemRole: true,
        isActive: true
      },
      {
        name: 'admin',
        description: 'Administrator with full system access',
        level: 'admin',
        permissions: permissions
          .filter(p => p.level !== 'system')
          .map(p => p.id),
        isSystemRole: true,
        isActive: true
      },
      {
        name: 'super_admin',
        description: 'Super administrator with all permissions',
        level: 'super_admin',
        permissions: permissions.map(p => p.id),
        isSystemRole: true,
        isActive: true
      }
    ];

    for (const role of defaultRoles) {
      await addDoc(collection(db, this.rolesCollection), {
        ...role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  // Check if user has permission
  async hasPermission(
    userId: string, 
    resource: string, 
    action: PermissionAction, 
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    try {
      // Get user's roles and direct permissions
      const userRoles = await this.getUserRoles(userId);
      const directPermissions = await this.getUserDirectPermissions(userId);

      // Check direct permissions first
      for (const permission of directPermissions) {
        if (this.matchesPermission(permission, resource, action)) {
          if (await this.evaluateConditions(permission.conditions, context)) {
            return {
              granted: true,
              reason: 'Direct permission granted',
              source: 'direct',
              permissionId: permission.id
            };
          }
        }
      }

      // Check role-based permissions
      for (const role of userRoles) {
        const rolePermissions = await this.getRolePermissions(role.id);
        
        for (const permission of rolePermissions) {
          if (this.matchesPermission(permission, resource, action)) {
            if (await this.evaluateConditions(permission.conditions, context)) {
              return {
                granted: true,
                reason: `Permission granted through role: ${role.name}`,
                source: 'role',
                roleId: role.id,
                permissionId: permission.id
              };
            }
          }
        }
      }

      // Log access denial for audit
      await auditService.logSecurityEvent(
        userId,
        'unknown',
        'Unknown',
        'access_denied',
        `Access denied for ${resource}:${action}`,
        'medium',
        'failure'
      );

      return {
        granted: false,
        reason: `No permission found for ${resource}:${action}`,
        source: 'system'
      };

    } catch (error) {
      console.error('Error checking permission:', error);
      return {
        granted: false,
        reason: 'Permission check failed due to system error',
        source: 'system'
      };
    }
  }

  // Get user's roles
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      // First get user document to find their role
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';

      // Get the role document
      const roleQuery = query(
        collection(db, this.rolesCollection),
        where('name', '==', userRole),
        where('isActive', '==', true)
      );

      const roleSnapshot = await getDocs(roleQuery);
      return roleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  // Get user's direct permissions
  async getUserDirectPermissions(userId: string): Promise<Permission[]> {
    try {
      const assignmentQuery = query(
        collection(db, this.userPermissionsCollection),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);
      const permissionIds = assignmentSnapshot.docs
        .map(doc => doc.data().permissionId)
        .filter(id => id);

      if (permissionIds.length === 0) {
        return [];
      }

      // Get permission details
      const permissions: Permission[] = [];
      for (const permissionId of permissionIds) {
        const permissionDoc = await getDoc(doc(db, this.permissionsCollection, permissionId));
        if (permissionDoc.exists()) {
          permissions.push({ id: permissionDoc.id, ...permissionDoc.data() } as Permission);
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user direct permissions:', error);
      return [];
    }
  }

  // Get permissions for a role
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const roleDoc = await getDoc(doc(db, this.rolesCollection, roleId));
      if (!roleDoc.exists()) {
        return [];
      }

      const role = roleDoc.data() as Role;
      const permissions: Permission[] = [];

      // Get direct permissions
      for (const permissionId of role.permissions || []) {
        const permissionDoc = await getDoc(doc(db, this.permissionsCollection, permissionId));
        if (permissionDoc.exists()) {
          permissions.push({ id: permissionDoc.id, ...permissionDoc.data() } as Permission);
        }
      }

      // Get inherited permissions
      if (role.inheritsFrom) {
        for (const parentRoleId of role.inheritsFrom) {
          const inheritedPermissions = await this.getRolePermissions(parentRoleId);
          permissions.push(...inheritedPermissions);
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  // Check if permission matches resource and action
  private matchesPermission(permission: Permission, resource: string, action: PermissionAction): boolean {
    return permission.resource === resource && permission.action === action;
  }

  // Evaluate permission conditions
  private async evaluateConditions(
    conditions: PermissionCondition[] | undefined, 
    context: Record<string, any> | undefined
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means permission is granted
    }

    if (!context) {
      return false; // Conditions exist but no context provided
    }

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false; // All conditions must be met
      }
    }

    return true;
  }

  // Evaluate single condition
  private evaluateCondition(condition: PermissionCondition, context: Record<string, any>): boolean {
    const contextValue = context[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'contains':
        return String(contextValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'greater_than':
        return Number(contextValue) > Number(condition.value);
      case 'less_than':
        return Number(contextValue) < Number(condition.value);
      default:
        return false;
    }
  }

  // Assign permission to user
  async assignPermissionToUser(
    userId: string,
    permissionId: string,
    grantedBy: string,
    expiresAt?: Date,
    reason?: string
  ): Promise<boolean> {
    try {
      await addDoc(collection(db, this.userPermissionsCollection), {
        userId,
        permissionId,
        grantedBy,
        grantedAt: serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        isActive: true,
        reason: reason || 'Direct permission assignment'
      });

      // Log the permission assignment
      await auditService.logAdminAction(
        grantedBy,
        'system',
        'System',
        'permission_granted',
        'permission',
        `Permission ${permissionId} granted to user ${userId}`,
        'medium',
        { userId, permissionId, reason }
      );

      return true;
    } catch (error) {
      console.error('Error assigning permission to user:', error);
      return false;
    }
  }

  // Revoke permission from user
  async revokePermissionFromUser(userId: string, permissionId: string, revokedBy: string): Promise<boolean> {
    try {
      const assignmentQuery = query(
        collection(db, this.userPermissionsCollection),
        where('userId', '==', userId),
        where('permissionId', '==', permissionId),
        where('isActive', '==', true)
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);
      
      for (const doc of assignmentSnapshot.docs) {
        await updateDoc(doc.ref, {
          isActive: false,
          revokedBy,
          revokedAt: serverTimestamp()
        });
      }

      // Log the permission revocation
      await auditService.logAdminAction(
        revokedBy,
        'system',
        'System',
        'permission_revoked',
        'permission',
        `Permission ${permissionId} revoked from user ${userId}`,
        'medium',
        { userId, permissionId }
      );

      return true;
    } catch (error) {
      console.error('Error revoking permission from user:', error);
      return false;
    }
  }

  // Get all permissions
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const snapshot = await getDocs(collection(db, this.permissionsCollection));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[];
    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [];
    }
  }

  // Get all roles
  async getAllRoles(): Promise<Role[]> {
    try {
      const snapshot = await getDocs(query(
        collection(db, this.rolesCollection),
        where('isActive', '==', true)
      ));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
    } catch (error) {
      console.error('Error getting all roles:', error);
      return [];
    }
  }

  // Create new role
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.rolesCollection), {
        ...role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy
      });

      await auditService.logAdminAction(
        createdBy,
        'system',
        'System',
        'record_created',
        'role',
        `Created new role: ${role.name}`,
        'medium',
        { roleId: docRef.id, roleName: role.name }
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating role:', error);
      return null;
    }
  }

  // Update role
  async updateRole(roleId: string, updates: Partial<Role>, updatedBy: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.rolesCollection, roleId), {
        ...updates,
        updatedAt: serverTimestamp()
      });

      await auditService.logAdminAction(
        updatedBy,
        'system',
        'System',
        'record_updated',
        'role',
        `Updated role: ${roleId}`,
        'medium',
        { roleId, updates }
      );

      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      return false;
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService(); 
