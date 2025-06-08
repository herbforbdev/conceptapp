# Changelog

All notable changes to the Concept App (Ice & Water Production Management) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 3+ planning: Email integration, audit logging, advanced permissions

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
- **v0.3.0+**: Planned - Email integration, audit logging, advanced permissions

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
