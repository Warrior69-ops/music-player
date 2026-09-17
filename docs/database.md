# Database Schema

## Overview
The application uses **MongoDB** as its primary data store. The database acts as the single source of truth for user accounts, authentication sessions, preferences, saved tracks, playlists, favorites, and queue data.

## Collections

### 1. User
Stores user profile and authentication data.
- `_id`: ObjectId
- `name`: String
- `email`: String (Unique)
- `passwordHash`: String
- `isEmailVerified`: Boolean
- `avatarUrl`: String
- `createdAt`: Date
- `updatedAt`: Date
- `lastLoginAt`: Date

### 2. EmailOTP
Stores OTPs for email verification and password resets.
- `_id`: ObjectId
- `email`: String
- `otpHash`: String
- `type`: Enum (`EMAIL_VERIFICATION`, `PASSWORD_RESET`)
- `expiresAt`: Date (TTL Index)
- `attempts`: Number
- `createdAt`: Date

### 3. PasswordResetSession
Authorized sessions created after a valid OTP is verified, allowing a password change.
- `_id`: ObjectId
- `userId`: ObjectId (Ref: User)
- `tokenHash`: String
- `expiresAt`: Date (TTL Index)
- `used`: Boolean
- `createdAt`: Date

### 4. UserSession
Tracks active user sessions (if session-based auth is used over purely stateless JWT).
- `_id`: ObjectId
- `userId`: ObjectId (Ref: User)
- `tokenHash`: String
- `expiresAt`: Date
- `createdAt`: Date
- `lastUsedAt`: Date

### 5. UserPreferences
User settings for the application UI and playback.
- `userId`: ObjectId (Ref: User, Unique)
- `theme`: String
- `language`: String
- `autoplay`: Boolean
- `crossfade`: Boolean
- `explicitContent`: Boolean
- `preferredQuality`: String
- `createdAt`: Date
- `updatedAt`: Date

### 6. Track
Caches generic track metadata retrieved from providers to reduce API calls and maintain references.
- `_id`: ObjectId
- `provider`: String
- `providerTrackId`: String
- `title`: String
- `artist`: String
- `artistId`: String
- `album`: String
- `albumId`: String
- `albumArt`: String
- `duration`: Number
- `releaseDate`: Date
- `genre`: String
- `explicit`: Boolean
- `audioUrl`: String
- `previewUrl`: String
- `sourceQuality`: String
- `bitrate`: Number
- `format`: String
- `isStreamable`: Boolean
- `lyricsAvailable`: Boolean
- `metadata`: Mixed
- `createdAt`: Date
- `updatedAt`: Date
- **Indexes**: Unique index on `provider` + `providerTrackId`.

### 7. Playlist
User-created collections of tracks.
- `_id`: ObjectId
- `userId`: ObjectId (Ref: User)
- `name`: String
- `description`: String
- `coverImage`: String
- `isPublic`: Boolean
- `tracks`: Array of Objects (containing `trackId` or normalized track details)
- `createdAt`: Date
- `updatedAt`: Date

### 8. Favorite
Tracks that a user has "liked".
- `_id`: ObjectId
- `userId`: ObjectId (Ref: User)
- `trackId`: ObjectId (Ref: Track)
- `createdAt`: Date
- **Indexes**: Unique index on `userId` + `trackId`.

### 9. RecentlyPlayed
History of tracks listened to by the user.
- `_id`: ObjectId
- `userId`: ObjectId (Ref: User)
- `trackId`: ObjectId (Ref: Track)
- `playedAt`: Date
- `playbackPosition`: Number

### 10. UserQueue
The user's current playback queue.
- `userId`: ObjectId (Ref: User, Unique)
- `trackIds`: Array of ObjectIds (Ref: Track)
- `currentIndex`: Number
- `updatedAt`: Date
