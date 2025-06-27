# Replit.md - Potluck Planner Application

## Overview

This is a full-stack potluck event management application built with React, TypeScript, Express.js, and PostgreSQL. The application allows users to create themed potluck events, manage sign-up lists, and coordinate item contributions in real-time. The system features a modern UI built with shadcn/ui components and real-time updates via WebSockets.

## System Architecture

### Full-Stack Monorepo Structure
- **Frontend**: React with TypeScript, built with Vite
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket integration for live updates
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build System**: Vite for frontend, esbuild for backend

### Directory Structure
```
├── client/           # React frontend application
├── server/           # Express.js backend server
├── shared/           # Shared types and schemas
├── migrations/       # Database migration files
└── dist/            # Production build output
```

## Key Components

### Frontend Architecture
- **React Router**: Uses Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Architecture  
- **API Server**: Express.js with TypeScript
- **Real-time Communication**: WebSocket server for live updates
- **Data Layer**: Drizzle ORM with PostgreSQL
- **Storage**: Configurable storage interface (in-memory for development)
- **Request Handling**: RESTful API with JSON responses

### Database Schema
- **Events Table**: Stores potluck event information (id, title, description, theme, date, location, expectedGuests)
- **Items Table**: Manages item sign-ups with foreign key to events (id, eventId, name, category, isCustom, claimedBy, claimedByEmail)

## Data Flow

### Event Creation Flow
1. User fills out event creation form with theme selection
2. Frontend validates data using Zod schemas
3. Backend creates event and auto-populates theme-based items
4. Event ID is generated and user is redirected to event page

### Item Management Flow
1. Users view categorized item lists on event pages
2. Claiming items opens modal for user details
3. Custom items can be added to any category
4. Real-time updates broadcast changes to all connected clients

### Real-time Updates
1. WebSocket clients join event-specific rooms
2. Item claims and additions trigger broadcasts
3. Frontend invalidates queries and refetches data
4. UI updates automatically for all connected users

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for Neon
- **drizzle-orm**: Type-safe SQL query builder
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling with validation
- **zod**: Runtime type validation
- **ws**: WebSocket server implementation

### UI Dependencies
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant styling
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for development
- **esbuild**: Backend bundling for production

## Deployment Strategy

### Development Environment
- Frontend served by Vite dev server with HMR
- Backend runs with tsx for TypeScript execution
- In-memory storage for rapid development iteration
- WebSocket server integrated with HTTP server

### Production Build Process
1. Frontend builds to `dist/public` using Vite
2. Backend bundles to `dist/index.js` using esbuild  
3. Static files served by Express in production
4. PostgreSQL database required for production storage

### Environment Configuration
- `NODE_ENV`: Controls development vs production behavior
- `DATABASE_URL`: PostgreSQL connection string (required)
- `REPL_ID`: Enables Repl.it-specific development features

## Changelog

```
Changelog:
- June 27, 2025. Initial setup
- June 27, 2025. Added localStorage integration to remember user names/emails for repeated item claims
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```