# Daily Work Report Management Application

## Overview

This is a daily work report management system designed for employees and administrators to track work activities. The application allows employees to create daily reports with detailed operation entries (including client work, work orders, and time tracking), while administrators can review, approve, and export these reports. The system features a mobile-first design for employees and a comprehensive desktop interface for administrators.

## User Preferences

Preferred communication style: Simple, everyday language.
Date format: DD/MM/YYYY (Italian format) for all date displays in the application.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application built with React 18+ and TypeScript for type safety
- **Component Library**: Shadcn/ui components built on Radix UI primitives for consistent, accessible UI elements
- **Styling**: Tailwind CSS with custom design system featuring light/dark mode support
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Mobile-First Design**: Responsive design optimized for mobile employees with desktop admin interface

### Backend Architecture
- **Express.js Server**: RESTful API server with TypeScript support
- **Database Layer**: Drizzle ORM with PostgreSQL database (Neon serverless)
- **Storage Pattern**: Repository pattern with in-memory storage implementation for development
- **PDF Generation**: PDFMake for generating daily report exports
- **Session Management**: Express sessions with PostgreSQL session store

### Data Model Design
- **Users**: Authentication and role-based access (employee/admin)
- **Clients**: Company/organization entities for work assignment
- **Work Orders**: Project-based work assignments under clients
- **Daily Reports**: Date-based employee work summaries with approval workflow
- **Operations**: Individual work entries within daily reports (client, work order, time tracking, work type)

### Key Design Patterns
- **Component Composition**: Modular UI components with clear separation of concerns
- **Form Management**: React Hook Form with Zod validation for type-safe form handling
- **Theme System**: CSS custom properties with utility classes for consistent theming
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Role-Based UI**: Different interfaces optimized for employee vs admin workflows

### Authentication & Authorization
- **Simple Login System**: Username/password authentication with role selection
- **Role-Based Access**: Employee access to report creation, admin access to approval and management features
- **Session-Based**: Express sessions for maintaining user authentication state

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TypeScript for frontend framework
- **Express.js**: Node.js web server framework for REST API
- **Vite**: Build tool and development server with hot module replacement

### Database & ORM
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database operations and schema management
- **Drizzle Kit**: Database migration and schema synchronization tools

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and behavior
- **Shadcn/ui**: Pre-built component library based on Radix UI
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

### Form & Validation
- **React Hook Form**: Form state management and validation
- **Zod**: TypeScript-first schema validation library
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### Utility Libraries
- **TanStack Query**: Server state management and caching
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe CSS class composition
- **clsx & Tailwind Merge**: Conditional CSS class utilities

### Development Tools
- **TSX**: TypeScript execution for development server
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Document Generation
- **Docx**: Word document generation library with ImageRun support for embedded photos
- **Sharp**: High-performance image processing for photo resizing and compression

### Session Management
- **Connect PG Simple**: PostgreSQL session store for Express sessions

## Date Handling

### Italian Date Format (DD/MM/YYYY)
All dates in the application are displayed in Italian format (DD/MM/YYYY) as per user requirements. The system uses custom utility functions to ensure consistent date formatting across the entire application, including PDF/Word exports.

### Shared Date Utilities (`shared/dateUtils.ts`)
The date utilities are now shared between client and server to ensure consistent formatting across the entire application:

- **formatDateToItalian(dateStr)**: Converts YYYY-MM-DD to DD/MM/YYYY using manual regex parsing to avoid timezone issues
- **formatDateToItalianLong(dateStr)**: Converts YYYY-MM-DD to Italian long format with day name (e.g., "martedì 08 ottobre 2025") for PDF/Word exports
- **formatDateToISO(dateStr)**: Converts DD/MM/YYYY to YYYY-MM-DD with validation
- **getTodayItalian()**: Returns today's date in DD/MM/YYYY format
- **getTodayISO()**: Returns today's date in YYYY-MM-DD format
- **isValidItalianDate(dateStr)**: Validates DD/MM/YYYY format

### Critical Implementation Details
- **Manual Regex Parsing**: All date parsing uses manual regex extraction (not `new Date()`) to avoid timezone-induced day shifts
- **String Comparison Filtering**: Date range filtering uses direct string comparison on YYYY-MM-DD format (lexicographically sortable)
- **Shared Codebase**: Client re-exports utilities from `shared/dateUtils.ts` for backward compatibility

### Storage Format
- Database stores dates in YYYY-MM-DD format for compatibility and proper sorting
- All UI displays convert to DD/MM/YYYY for user-friendly Italian format
- PDF/Word exports use `formatDateToItalianLong()` for full Italian date representation
- Date input fields use native HTML5 date picker (browser format) for better UX
- Conversions are handled automatically by the date utilities to prevent timezone-related bugs

## Multi-Tenancy Security

### Organization Isolation (Fixed)
The application implements strict multi-tenant data isolation with organizationId filtering at all layers:

- **Storage Layer**: All `getAll*` methods require organizationId parameter for proper filtering
- **Single-Record Methods**: Critical methods like `getWorkOrder` and `getOperationsByWorkOrderId` now enforce organization scoping
- **Export Services**: PDF/Word export services properly filter all data by organizationId to prevent cross-tenant data leakage
- **Session Management**: organizationId is stored in Express session during login and passed to all data access operations

### Recent Security Fixes (2025-10-08)
- Fixed critical vulnerability in export services where work order and operation queries bypassed organization filtering
- Updated `getWorkOrder(id, organizationId)` to enforce organization scoping with `AND` clause
- Updated `getOperationsByWorkOrderId(workOrderId, organizationId)` to join with workOrders table for organization filtering
- All export routes now extract organizationId from session and pass to services

## Photo Upload Feature (2025-10-09)

### Implementation Complete
The application now supports uploading up to 5 photos per operation with full integration in Word exports:

- **Database Schema**: `operations.photos` field (text[]) stores array of object paths
- **Object Storage**: Replit object storage with ACL-based multi-tenant isolation
- **Upload Component**: `ObjectUploader` with Uppy integration, max 5 photos, comprehensive error handling
- **Camera Capture**: Uppy Webcam plugin for taking photos directly (mobile camera / desktop webcam)
- **Display**: 80×80px thumbnails in operation cards and form, always-visible delete buttons for mobile
- **Word Export**: Photos embedded with preserved aspect ratio (300px max width, 80% quality) using ImageRun

### Camera & Upload Options
- **Mobile**: Direct access to device camera for instant photo capture
- **Desktop**: Webcam integration for taking photos
- **Library Upload**: Traditional file picker for uploading existing photos
- **Webcam Configuration**: Picture mode only (no video), rear camera default on mobile, mirrored preview

### Technical Details
- **Sharp Integration**: Server-side image resizing prevents Word bloat (photos compressed from multi-MB to ~50KB)
- **Parallel Loading**: `Promise.all` for photo fetching eliminates sequential latency
- **Aspect Ratio**: Word export uses `toBuffer({ resolveWithObject: true })` to get real dimensions, prevents distortion
- **Lifecycle Cleanup**: `uppy.close()` in useEffect cleanup releases camera stream on unmount
- **Error Handling**: Toast feedback, `uppy.cancelAll()` for cleanup, null filtering for missing photos
- **CSS Imports**: Uppy core, dashboard, and webcam styles imported in `main.tsx` for proper loading

### Mobile Fixes (2025-10-09)
- **Photo Thumbnails**: Fixed URL construction - server returns complete `/objects/photo.jpg` path, removed duplicate prefix
- **Crash Prevention**: Added `onError` handler with SVG placeholder fallback to prevent white screen on failed image loads
- **Error Loop Protection**: `onerror = null` after fallback prevents infinite retry loops
- **Uppy API**: Fixed TypeScript error by replacing `uppy.reset()` with `uppy.cancelAll()`

## Word Export Endpoints

### Export Routes
- **Daily Reports**: `GET /api/export/daily-reports/:date` - Word export by date
- **Date Range**: `GET /api/export/daily-reports-range?from=&to=&status=&search=` - Filtered export with photos
- **Work Order**: `GET /api/export/work-order/:workOrderId` - Work order-specific export
- **Authentication**: `requireAdmin` middleware for all export endpoints
- **Service**: `WordService` with photo integration via Sharp resizing