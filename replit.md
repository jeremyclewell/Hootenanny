# Replit.md - Hootenanny Application

## Overview

This is a full-stack event management application called "Hootenanny" built with React, TypeScript, Express.js, and PostgreSQL. The application allows users to create themed hootenanny events, manage sign-up lists, and coordinate item contributions in real-time. The system features a modern UI built with shadcn/ui components and real-time updates via WebSockets.

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
- **Storage**: PostgreSQL database with Drizzle ORM
- **Request Handling**: RESTful API with JSON responses

### Database Schema
- **Events Table**: Stores potluck event information (id, title, description, theme, date, location, expectedGuests, pollStatus, candidateDates, hostToken)
- **Items Table**: Manages item sign-ups with foreign key to events (id, eventId, name, category, isCustom, claimedBy, claimedByEmail)
- **Date Votes Table**: Tracks invitee availability for polling events (id, eventId, voterName, voterEmail, selectedDates)

### Date Polling
- Hosts can create an event in either "fixed date" or "polling" mode
- In polling mode, the host picks 2+ candidate dates within a 4-week window
- Invitees visit the shared link and check off the dates that work for them (name + optional email, prefilled from localStorage)
- Each event has a `hostToken` returned only to the creator and saved in localStorage; the host UI (finalize buttons) only appears for browsers holding the matching token
- The host sees a vote tally per candidate date with the leading date(s) highlighted, and finalizes one with a single click
- Finalizing seeds the theme items and switches the event into the normal item sign-up flow
- Vote submissions and date finalization are broadcast over WebSocket for real-time updates

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
- PostgreSQL database for persistent data storage
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
- June 27, 2025. Migrated from in-memory storage to PostgreSQL database with Drizzle ORM
- June 27, 2025. Renamed application from "Potluck Planner" to "Shindig"
- June 28, 2025. Renamed application from "Shindig" to "Hootenanny"
- June 28, 2025. Added combined edit/delete functionality with dropdown menu for unclaimed items
- June 28, 2025. Implemented unclaim functionality allowing users to remove their claims from items
- May 4, 2026. Address autocomplete on location field (Nominatim API, no key needed)
- May 4, 2026. Fixed calendar date selection timezone bug (parseLocalDate helper)
- May 4, 2026. Redesigned home page: two-column hero layout with floating UI mockup cards
- May 5, 2026. Restyled all form fields (Input/Textarea/Select) and Dialog to match design references: soft cream bg, terracotta focus ring, rounded-xl, white-circle close button
- May 5, 2026. Redesigned RSVP dialog: icon-box header, serif title, sage/sand/terracotta response cards, select-then-save flow, full-width pill CTA
- May 5, 2026. Added plus-ones feature: plusOnes integer column on rsvps table, stepper UI in RSVP dialog (visible for yes/maybe responses), "+N" display in RSVP list
- May 12, 2026. Added Replit Auth (Google/Apple/email). Events now have an owner (text ownerId referencing users.id) and a draft|published status. Creating an event requires login; new events start as drafts (only visible to owner) until the host hits "Publish event". Drafts return 403 to non-owners on all event endpoints. Removed the legacy hostToken mechanism — host actions (publish/unpublish, delete, finalize, candidate-dates, reopen, RSVP removal) now check req.user against event.ownerId. Added /api/my/events, /api/events/:id/publish, /api/events/:id/unpublish, DELETE /api/events/:id. New /my dashboard page lists the user's events with draft/published badges and delete. New AuthButton component (Sign in / avatar dropdown w/ My events + Sign out) added to home, event, my-events headers. Existing event data was wiped (clean cutover).
- May 8, 2026. Applied "Aurora — Midnight Teal + Coral" design system app-wide: off-white page, coral primary CTA (gradient with shadow-coral helper), midnight-teal hero gradient with decorative string lights SVG, mint/sand/blush RSVP status cards with circular tinted icons, Fraunces serif. Restructured event page: white-pill top nav, dark-hero card with status pills + 3 detail rows, horizontal RSVP CTA row, "Who's coming" with 3 horizontal status cards + collapsible names, restyled "Add a custom item" with white-card icon-chip header. Home + create-event inherit new colors via tokens.
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```