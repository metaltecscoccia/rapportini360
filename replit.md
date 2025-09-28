# Daily Work Report Management Application

## Overview

This is a daily work report management system designed for employees and administrators to track work activities. The application allows employees to create daily reports with detailed operation entries (including client work, work orders, and time tracking), while administrators can review, approve, and export these reports. The system features a mobile-first design for employees and a comprehensive desktop interface for administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### PDF Generation
- **PDFMake**: Client-side PDF generation library
- **VFS Fonts**: Virtual file system for PDF font management

### Session Management
- **Connect PG Simple**: PostgreSQL session store for Express sessions