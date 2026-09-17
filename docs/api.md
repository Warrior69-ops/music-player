# REST API Documentation

## Overview
The NestJS backend provides a secure REST API for the Next.js frontend. All responses follow a standard format.

### Standard Response Format
**Success**:
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Endpoints

### Auth
- `POST /auth/register`: Register a new user with name, email, and password. Sends an OTP.
- `POST /auth/verify-email`: Verify registration OTP to activate the account.
- `POST /auth/login`: Authenticate with email/password and receive session/JWT.
- `POST /auth/logout`: Invalidate the current session/JWT.
- `POST /auth/forgot-password`: Request a password reset OTP for a given email.
- `POST /auth/verify-reset-otp`: Verify the reset OTP and receive a reset authorization token.
- `POST /auth/reset-password`: Set a new password using the reset authorization token.
- `POST /auth/change-password`: Change password for currently authenticated user.
- `GET /auth/me`: Get the currently authenticated user's profile.

### Users
- `GET /users/me`: Fetch current user details.
- `PATCH /users/me`: Update user profile details (e.g., name, avatar, preferences).

### Music
- `GET /music/search`: Search for tracks, artists, and albums across all providers.
  - Query Params: `q` (search term), `type` (optional filter).
- `GET /music/tracks/:id`: Get detailed metadata for a specific track.
- `GET /music/albums/:id`: Get detailed metadata and tracklist for an album.
- `GET /music/artists/:id`: Get artist details, popular tracks, and albums.

### Lyrics
- `GET /lyrics/:trackId`: Fetch plain or synchronized lyrics for a track.

### Favorites
- `GET /users/me/favorites`: List user's favorite tracks.
- `POST /users/me/favorites`: Add a track to favorites. Body: `{ "trackId": "..." }`.
- `DELETE /users/me/favorites/:trackId`: Remove a track from favorites.

### History
- `GET /users/me/history`: Get user's recently played tracks.
- `POST /users/me/history`: Add a track to the recently played history.

### Playlists
- `GET /playlists`: List user's playlists.
- `POST /playlists`: Create a new playlist.
- `GET /playlists/:id`: Get playlist details and tracks.
- `PATCH /playlists/:id`: Update playlist metadata.
- `DELETE /playlists/:id`: Delete a playlist.
- `POST /playlists/:id/tracks`: Add a track to a playlist.
- `DELETE /playlists/:id/tracks/:trackId`: Remove a track from a playlist.
- `PATCH /playlists/:id/reorder`: Reorder tracks within a playlist.

### Recommendations
- `GET /recommendations`: Get recommended tracks based on user history and favorites.
