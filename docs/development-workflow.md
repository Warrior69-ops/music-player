# Development Workflow

## Phased Approach
The project is built incrementally, validating each phase before moving to the next. Do not attempt to generate the entire application at once.

### Phase 1: Analyze & Architecture
- Inspect the existing repository.
- Define architecture, database schema, API contracts, provider interfaces, and development workflow.
- Target output: Documentation files in `/docs`.

### Phase 2: Backend Foundation
- Convert project to monorepo.
- Initialize NestJS app (`apps/api`).
- Set up MongoDB connection, configuration module, validation pipes, and error handling filters.

### Phase 3: Database Models
- Implement Mongoose schemas based on `database.md`.
- Add timestamps, indexes, and TTL indexes.

### Phase 4: Authentication API
- Implement registration, OTP, login, logout, forgot password, and reset password flows.
- Hash passwords and OTPs.

### Phase 5: Email Service
- Create `EmailService` using Nodemailer.
- Create HTML templates for OTP emails.
- Ensure the email delivery works correctly.

### Phase 6: Providers Implementation
- Implement the `MusicProvider` interface.
- Create provider modules for Audius, Jamendo, MusicBrainz, and LRCLIB.

### Phase 7: Music Search & Aggregation
- Implement `GET /music/search` utilizing the provider modules.
- Add normalization, deduplication, and ranking.

### Phase 8: Player State & Logic (Frontend)
- Set up Zustand stores for playback.
- Implement HTML5 Audio integration for core playback controls (play, pause, seek, volume).

### Phase 9: Frontend Views
- Build UI for authentication, home, search, artist, album, and player using Next.js App Router and Tailwind CSS.

### Phase 10: Lyrics
- Implement lyrics API endpoint and frontend panel with synchronized highlighting.

### Phase 11: User Library
- Implement endpoints and UI for favorites, playlists, history, and queue management.

### Phase 12: Recommendations
- Implement a rule-based deterministic recommendation engine based on user history and favorites.

### Phase 13: Polish & Optimization
- Add animations, skeletons, responsive layouts, caching, and accessibility features.

## Quality Assurance
After completing each phase:
1. Run TypeScript type checks (`pnpm typecheck` or `npm run typecheck`).
2. Run linters (`npm run lint`).
3. Run tests.
4. Build the project.
5. Resolve all blocking errors before proceeding to the next phase.
