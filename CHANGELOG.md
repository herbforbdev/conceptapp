# Changelog

All notable changes to the Concept App (Ice & Water Production Management) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 4+ planning: Email integration, audit logging, advanced permissions

## [0.3.0] - 2025-01-22

### Added - Phase 3: Enhanced User Management Features

- **Advanced User Profile Management**

  - Enhanced user profile fields: phone, company, department, bio, location, timezone
  - User preferences: email notifications, push notifications, weekly reports, language, theme
  - Tabbed profile interface with Profile, Security, Activity, and Preferences sections
  - Real-time user statistics and activity tracking

- **User Activity Tracking & Session Management**

  - Comprehensive activity logging for all user actions (login, logout, profile updates, role changes)
  - Session management with real-time tracking and automatic cleanup
  - User login history and session analytics
  - Activity timeline with detailed timestamps and action descriptions
  - Session activity heartbeat every 5 minutes

- **Advanced User Search & Filtering**

  - Multi-criteria search: name, email, company, department
  - Advanced filtering by role, status, company, department
  - Real-time filtering with active filter display and quick clear options
  - Dynamic filter dropdowns based on existing data

- **Bulk User Operations**

  - Bulk user selection with select all/none functionality
  - Bulk role changes across multiple users
  - Bulk status updates (activate/deactivate users)
  - Bulk company and department assignments
  - Comprehensive audit logging for all bulk operations

- **User Data Export & Management**

  - CSV export functionality for user data
  - Comprehensive user data including login statistics and profile information
  - Export with sanitized and formatted data for analysis

- **Enhanced User Dashboard**
  - Individual user activity viewing with detailed timeline
  - User statistics: total logins, account creation date, active sessions
  - Last activity tracking and session management
  - Enhanced user table with additional columns and data

### Enhanced

- **User Service (`userService.ts`)**

  - Added activity tracking functions: `logUserActivity()`, `getUserActivities()`
  - Session management: `createUserSession()`, `updateUserSession()`, `endUserSession()`, `getActiveSessions()`
  - Enhanced profile management: `updateUserProfile()`, `getUserProfile()`
  - Bulk operations: `bulkUpdateUsers()`, `exportUsers()`
  - Advanced search: `searchUsers()` with filtering capabilities

- **Authentication Context**

  - Integrated session management with login/logout
  - Automatic session activity tracking
  - Enhanced profile update capabilities
  - Session persistence with localStorage
  - Activity monitoring and session cleanup

- **User Interface Enhancements**
  - Modern tabbed interface for user profiles
  - Enhanced user management dashboard with search and filtering
  - Bulk operations modal with conditional form fields
  - User activity modal with timeline view
  - Responsive design improvements

### Technical

- **Enhanced Data Models**

  - Extended User interface with profile fields, activity tracking, and preferences
  - New `UserLoginEntry` interface for login history
  - New `UserActivity` interface for action tracking
  - New `UserSession` interface for session management

- **Database Collections**
  - `UserActivities` - User action tracking and audit log
  - `UserSessions` - Active session management
  - Enhanced `Users` collection with new profile fields

### Fixed

- **SSR Issues**
  - Additional localStorage SSR fixes in costs page
  - Proper window checks for client-side only operations

## [0.2.0] - 2025-01-22

### Added - Phase 2: User Management System

- **Comprehensive Admin User Management Dashboard**

  - Tabbed interface for Users and Access Requests at `/dashboard/settings/users`
  - User invitation system with role assignment (admin, manager, user)
  - User activation/deactivation functionality
  - User deletion capabilities (admin-only)
  - Real-time user status management

- **Access Request System**

  - Public access request form at `/request-access`
  - Admin review and approval workflow
  - Real-time request status tracking
  - Automatic user creation upon approval

- **Enhanced Notification System**

  - Extended existing notification system for user management
  - Real-time admin notifications for:
    - New access requests
    - User invitations
    - User status changes
  - Maintained compatibility with existing inventory/cost alerts
  - Mark as read and navigation functionality

- **Security & Authorization**
  - Enhanced `AuthContext.js` with comprehensive authorization checks
  - User authorization validation on login
  - French error messages for different access scenarios
  - Invite-only access control system

### Enhanced

- **User Service (`userService.ts`)**

  - Added `getAllUsers()`, `inviteUser()`, `isUserAuthorized()` functions
  - Access request management functions
  - User CRUD operations with proper permissions

- **Notification Service (`notificationService.ts`)**
  - Extended to support user management notifications
  - Maintained compatibility with existing `notifications` collection
  - Added notification types for user management events

### Fixed

- **SSR (Server-Side Rendering) Issues**

  - Fixed localStorage SSR errors in costs page
  - Added `typeof window !== 'undefined'` checks

- **Translation Keys**
  - Added missing translation keys: `common.loadingFormData`, `inventory.table.stockAdjustment`

### Technical

- **Database Structure**

  - Enhanced User interface with `invited`, `invitedBy`, `invitedAt` fields
  - New `AccessRequest` interface with status tracking
  - Maintained existing `notifications` collection structure

- **UI/UX Improvements**
  - Beautiful, modern UI with Flowbite React components
  - Animated transitions with Framer Motion
  - Responsive design across all new components
  - French translations throughout

## [0.1.0] - 2025-01-20

### Added - Initial Production Management System

- **Core Application Framework**

  - Next.js 15.3.2 with App Router
  - Firebase Authentication (Google OAuth)
  - Firestore database integration
  - TypeScript support
  - Tailwind CSS with Flowbite components

- **Production Management**

  - Production records tracking
  - Activity type management
  - Product-based production planning
  - Packaging quantity tracking
  - Production status management (completed, pending, cancelled)
  - Production trends and analytics

- **Inventory Management**

  - Stock movement tracking (IN, OUT, ADJUSTMENT)
  - Real-time stock calculations
  - Product-based inventory organization
  - Packaging stock monitoring
  - **Stock threshold alerts** with admin notifications
  - Multiple activity type support
  - Source tracking (production, consumption, sales, manual)

- **Sales Management**

  - Multi-channel sales tracking (On Site, Truck Delivery, Motorcycle Delivery)
  - Currency support (USD/CDF with exchange rates)
  - Product-based sales analytics
  - Sales trends and performance metrics
  - Channel-based sales distribution

- **Cost Management**

  - Expense type categorization
  - **Budget tracking with overrun alerts**
  - Multi-currency cost recording
  - Monthly/yearly cost analysis
  - Cost trends and projections

- **Master Data Management**

  - Products management with types (Ice Blocks, Ice Cubes, Bottled Water, Packaging)
  - Expense types with budget allocation
  - Activity types configuration
  - CRUD operations for all master data

- **Analytics & Reporting**

  - Interactive charts and graphs
  - Real-time dashboard metrics
  - Date-based filtering systems
  - Export capabilities
  - Performance trend analysis

- **Notification System (Original)**

  - Real-time inventory threshold alerts
  - Budget overrun notifications
  - Admin-targeted notifications
  - Mark as read functionality

- **Internationalization**

  - Full French language support
  - English language support
  - Translation management system
  - Localized date and number formatting

- **Authentication & Roles**
  - Firebase Google OAuth integration
  - Role-based access control (admin, manager, user)
  - User profile management
  - Protected routes and permissions

### Technical Foundation

- **Database Collections**

  - `Users` - User management and roles
  - `Products` - Product catalog
  - `ActivityTypes` - Activity type definitions
  - `ExpenseTypes` - Expense categories with budgets
  - `Production` - Production records
  - `Inventory` - Stock movements
  - `Sales` - Sales transactions
  - `Costs` - Expense records
  - `notifications` - System notifications

- **Services Architecture**

  - Firestore service layer
  - Type-safe TypeScript interfaces
  - Custom React hooks for data fetching
  - State management utilities

- **UI Components**
  - Responsive design system
  - Reusable component library
  - Chart.js integration
  - Framer Motion animations
  - Flowbite React components

## Version History Summary

- **v0.1.0**: Initial production management system with full CRUD operations
- **v0.2.0**: User management system with access control and notifications
- **v0.3.0**: Enhanced user management with activity tracking and bulk operations
- **v0.4.0+**: Planned - Email integration, audit logging, advanced permissions

---

## Development Guidelines

### Commit Message Format

- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
- `docs:` Documentation updates

### Branches

- `main`: Production-ready code
- `develop`: Development integration
- `feature/*`: Feature development
- `hotfix/*`: Critical fixes

### Testing

- Manual testing required for all features
- Browser compatibility testing
- Mobile responsiveness verification

---

_For detailed technical documentation, see individual component README files and code comments._
