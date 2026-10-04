# Zoom Clone - Web Conferencing Platform

A full-stack Zoom web application clone built with Next.js, FastAPI, SQLite, and WebSockets. The application replicates Zoom's core portal design, meeting scheduling workflows, participant management, and real-time audio/video communication.

---

## Live Demo & Links

* **Frontend Web Application**: https://zoom-2.netlify.app
* **Backend API Server**: https://zoom-clone-pr52.onrender.com
* **Swagger API Documentation**: https://zoom-clone-pr52.onrender.com/docs
* **GitHub Repository**: https://github.com/AnilKumt/zoom-clone

---

## Tech Stack Overview

* **Frontend**: Next.js 14+ (App Router, Single Page Application mode, TypeScript)
* **Backend**: Python 3.12, FastAPI (Asynchronous), Uvicorn ASGI
* **Database**: SQLite with Write-Ahead Logging (WAL) mode, SQLAlchemy 2.0 (Async), Alembic
* **Real-Time & Ephemeral State**: Redis (Upstash) with in-memory fallback for local development
* **Audio / Video Streaming**: WebRTC Peer-to-Peer Mesh (decoupled audio element architecture)
* **UI & Styling**: Tailwind CSS, Material Design 3 surface tokens, Radix UI, Lucide Icons, Sonner

---

<details open>
<summary><b>1. System Architecture</b></summary>

The platform separates persistent domain entities from ephemeral real-time state. Next.js handles portal routing and meeting room rendering, communicating via HTTP REST for transactional operations and WebSockets for real-time room events.

```mermaid
graph TD
    UserClient[Web Browser Client] -->|HTTP REST| APIGateway[FastAPI Application Server]
    UserClient -->|WebSocket Connection| WSRouter["WebSocket Room Handler (/ws/rooms/{code})"]
    UserClient <-->|WebRTC Media Mesh| PeerClient[Remote Participant Browsers]

    subgraph Backend Services
        APIGateway --> MeetingService[Meeting Lifecycle Service]
        APIGateway --> UserService[User & Profile Service]
        APIGateway --> AuthService[Authentication & Ticket Service]
        WSRouter --> SignalHandler[WebRTC Signal Dispatcher]
        WSRouter --> PresenceHandler[Room Presence & Heartbeat]
        WSRouter --> HostHandler[Host Commands Controller]
    end

    subgraph Storage Layer
        MeetingService --> SQLiteDB[(SQLite Database - WAL Mode)]
        UserService --> SQLiteDB
        AuthService --> RedisStore[(Redis Key-Value Store)]
        PresenceHandler --> RedisStore
        SignalHandler --> RedisStore
    end
```

### Architectural Highlights
* **Decoupled State Layers**: Persistent data (users, scheduled meetings, attendance history) lives in SQLite. High-frequency ephemeral data (30-second single-use WebSocket tickets, room presence rosters, signaling messages) is processed in Redis.
* **First-Party API Gateway**: In development and production, Next.js rewrites route `/api/*` traffic directly to FastAPI, ensuring consistent cookie handling without cross-origin configuration issues.
* **Resilient Media Architecture**: Local audio and video streams are managed through a decoupled media pipeline, ensuring participant audio continues uninterrupted even when video tracks are disabled.

</details>

---

<details>
<summary><b>2. Core Meeting Workflows</b></summary>

The application implements Zoom's core user journey from initial dashboard landing to meeting creation, pre-call lobby testing, and in-room collaboration.

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host User
    actor Guest as Guest User
    participant API as FastAPI Backend
    participant DB as SQLite / Redis
    participant WS as WebSocket Room

    Host->>API: POST /api/v1/meetings/instant
    API->>DB: Persist meeting row & default settings
    API-->>Host: 201 Created (10-digit code, invite link)
    Host->>Host: Enter Lobby (/meeting/{code}/lobby)
    Host->>API: POST /api/v1/meetings/{code}/join
    API->>DB: Register participant & issue single-use ticket
    API-->>Host: ws_url + ws_ticket
    Host->>WS: Connect WebSocket with ticket
    WS-->>Host: room.snapshot (presence roster)

    Guest->>API: GET /api/v1/meetings/{code}/public
    API-->>Guest: Validation (exists, live status, passcode flag)
    Guest->>Guest: Configure display name in Lobby
    Guest->>API: POST /api/v1/meetings/{code}/join
    API-->>Guest: ws_ticket
    Guest->>WS: Connect WebSocket
    WS->>Host: participant.joined broadcast
    Host<-->>Guest: WebRTC Peer Connection (Offer / Answer / ICE)
```

### Implemented Workflow Steps
1. **Landing Dashboard (`/home`)**: Renders Zoom top navigation bar, sidebar, user profile card with Personal Meeting ID (PMI), quick action tiles (Schedule, Join, New Meeting), upcoming meetings list, and previous meeting history.
2. **Instant Meeting Creation**: Generates a collision-resistant 10-digit numeric meeting ID, creates shareable `/j/{code}` invite links, and routes the host into the room.
3. **Join Meeting Flow (`/join`)**: Accepts 10-digit numeric codes (raw, dashed, or spaced) and full invite URLs. Validates meeting existence and passcode requirements before granting entry.
4. **Meeting Scheduling (`/meetings/schedule`)**: Configures title, description, start timestamp, duration, timezone, passcode protection, and initial host/participant media settings.
5. **Pre-Meeting Lobby (`/meeting/{code}/lobby`)**: Provides live camera preview, audio mute controls, display name input, and hardware permission fallback before connecting to the live room.

</details>

---

<details>
<summary><b>3. Database Schema & Data Modeling</b></summary>

The database schema is designed for SQLite in Write-Ahead Logging (WAL) mode, maintaining relational integrity, table normalization, and attendance history.

```mermaid
erDiagram
    USERS ||--o{ MEETINGS : hosts
    USERS ||--o{ PARTICIPANTS : attends
    MEETINGS ||--|| MEETING_SETTINGS : configures
    MEETINGS ||--o{ PARTICIPANTS : includes
    PARTICIPANTS ||--o{ PARTICIPANTS : removes

    USERS {
        string id PK "ULID Primary Key"
        string email UK "Lowercased unique email"
        string name "Full display name"
        string password_hash "Argon2id hash"
        string personal_meeting_id UK "10-digit static PMI"
        string timezone "User timezone"
        string plan "Account tier"
        boolean is_demo "Demo mode flag"
        datetime created_at "UTC Timestamp"
    }

    MEETINGS {
        string id PK "ULID Primary Key"
        string meeting_code UK "10-digit numeric code"
        string host_id FK "References users.id"
        string title "Meeting topic"
        string kind "instant | scheduled | personal"
        string status "scheduled | live | ended | cancelled"
        datetime scheduled_start_at "Scheduled UTC start"
        int duration_minutes "Planned duration"
        string timezone "Meeting timezone"
        string passcode "Optional access code"
        datetime started_at "Actual start timestamp"
        datetime ended_at "Actual end timestamp"
    }

    MEETING_SETTINGS {
        string meeting_id PK,FK "References meetings.id"
        boolean host_video_on "Initial host video state"
        boolean participant_video_on "Initial participant video state"
        boolean mute_on_entry "Auto-mute participants"
        boolean join_before_host "Allow early arrival"
        boolean waiting_room "Enable waiting room gate"
        boolean allow_self_unmute "Participant unmute permission"
        boolean chat_enabled "In-meeting chat permission"
    }

    PARTICIPANTS {
        string id PK "ULID Primary Key"
        string meeting_id FK "References meetings.id"
        string user_id FK "Nullable for guest users"
        string display_name "Session display name"
        string role "host | co_host | participant"
        string status "joined | left | removed"
        datetime joined_at "Join timestamp"
        datetime left_at "Leave timestamp"
        string removed_by FK "References participants.id"
    }
```

### Schema Design Decisions
* **1:1 Settings Separation**: Extracted `meeting_settings` into a dedicated table linked by foreign key to keep the `meetings` table narrow and optimized for frequent list and dashboard queries.
* **Immutable Attendance Records**: Each join operation writes a new `participants` record. Rejoining participants generate a new entry, preserving accurate historical session attendance.
* **ULID Primary Keys**: Universally Unique Lexicographically Sortable Identifiers provide chronological ordering and eliminate sequential enumeration vulnerabilities.
* **Database Indexes**: Composite indexes on `(host_id, status, scheduled_start_at)` and `(meeting_id, status)` ensure single-digit millisecond query execution for portal dashboards.

</details>

---

<details>
<summary><b>4. Real-Time WebSockets & Host Controls</b></summary>

WebSocket communication coordinates room state synchronization, WebRTC signaling exchange, in-meeting chat, floating emoji reactions, and server-enforced host controls.

```mermaid
graph LR
    subgraph Client Actions
        Host[Host Client]
        Participant[Participant Client]
    end

    subgraph WebSocket Gateway
        WSGateway[WebSocket Connection Manager]
    end

    subgraph Message Types
        Signaling["WebRTC Signaling (Offer / Answer / ICE)"]
        Chat["In-Meeting Chat Broadcast"]
        Reaction["Floating Reaction Broadcast"]
        HostControls["Host Commands (Mute All / Remove)"]
    end

    Host -->|host.mute_all / host.remove| WSGateway
    Participant -->|chat.message / reaction.send| WSGateway
    WSGateway --> HostControls
    WSGateway --> Chat
    WSGateway --> Reaction
    WSGateway --> Signaling
    HostControls -->|participant.removed| Participant
    Chat -->|chat.message| Host
    Chat -->|chat.message| Participant
```

### Real-Time Features
* **Single-Use WebSocket Tickets**: Tickets expire after 30 seconds and are verified on connection handshake, preventing credentials from leaking in URL logs.
* **Host Control Enforcement**: Hosts can mute individual attendees, trigger room-wide **Mute All**, or remove disruptive users. Removed users receive a termination event, close media tracks, and redirect to the dashboard.
* **Real-Time Chat Synchronization**: Instant message delivery across all connected peers with unread counter badges and sender timestamps.
* **Synchronized Reactions**: Broadcasts floating emoji animations across participant video tiles with single-render deduplication.

</details>

---

<details>
<summary><b>5. Setup and Operations</b></summary>

### Prerequisites
* Python 3.12 or higher
* Node.js 20 or higher (with npm)
* Git

### Backend Setup
1. Navigate to the API application directory:
   ```bash
   cd apps/api
   ```
2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     python -m venv .venv
     source .venv/bin/activate
     ```
3. Install backend dependencies:
   ```bash
   pip install -e ".[dev]"
   ```
4. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
5. Seed initial demo users and mock meetings:
   ```bash
   python -m app.seed
   ```
6. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup
1. Navigate to the web application directory:
   ```bash
   cd apps/web
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to: **http://localhost:3000**

</details>

---

<details>
<summary><b>6. API Specifications</b></summary>

```mermaid
graph TD
    Root["/api/v1"]
    Root --> Users["/users"]
    Root --> Auth["/auth"]
    Root --> Meetings["/meetings"]
    Root --> WS["/ws/rooms/{code}"]

    Users --> U1["GET /me"]
    Auth --> A1["POST /login"]
    Auth --> A2["POST /register/request-otp"]
    Auth --> A3["POST /register/verify-otp"]
    Auth --> A4["POST /refresh"]
    Auth --> A5["POST /logout"]

    Meetings --> M1["POST /instant"]
    Meetings --> M2["POST /"]
    Meetings --> M3["GET /?scope=upcoming"]
    Meetings --> M4["GET /{code}"]
    Meetings --> M5["GET /{code}/public"]
    Meetings --> M6["POST /{code}/join"]
```

### Core API Endpoints

#### Authentication & Profile
* `GET /api/v1/users/me` - Fetch authenticated user profile and Personal Meeting ID.
* `POST /api/v1/auth/login` - Authenticate credentials and issue JWT httpOnly session cookies.
* `POST /api/v1/auth/register/request-otp` - Request 6-digit email registration code.
* `POST /api/v1/auth/register/verify-otp` - Verify code and provision user account.
* `POST /api/v1/auth/refresh` - Rotate access and refresh session tokens.
* `POST /api/v1/auth/logout` - Invalidate session and clear authorization cookies.

#### Meetings Management
* `POST /api/v1/meetings/instant` - Provision an instant meeting room and return invite link.
* `POST /api/v1/meetings` - Schedule a meeting with custom start time, duration, and settings.
* `GET /api/v1/meetings?scope={upcoming|previous}` - List meetings for the current user.
* `GET /api/v1/meetings/{code}` - Retrieve host meeting management details.
* `GET /api/v1/meetings/{code}/public` - Public endpoint validating meeting status and passcode requirements.
* `POST /api/v1/meetings/{code}/join` - Record participant attendance and issue WebSocket connection ticket.

#### Real-Time WebSocket
* `WS /api/v1/ws/rooms/{code}?ticket={ticket}` - Full-duplex room connection handling presence rosters, WebRTC signals, chat messages, reactions, and host moderation events.

</details>

---

<details>
<summary><b>7. Production Scaling & Engineering Trade-offs</b></summary>

### 1. WebRTC Mesh vs. Selective Forwarding Unit (SFU)
* **Current Implementation (Mesh Topology)**: Each participant establishes direct peer connections with every other attendee. This eliminates server media processing costs and minimizes latency for small meetings (2–4 users).
* **10x Scale Bottleneck**: Network uplink requirements scale quadratically ($O(N^2)$), causing bandwidth saturation on client devices with 5+ participants.
* **Production Resolution**: Transition to an SFU media routing server (such as LiveKit or mediasoup). Clients publish a single upstream feed, and the SFU distributes downstream tracks based on active speaker detection and bandwidth estimates.

### 2. SQLite Concurrency vs. Distributed PostgreSQL
* **Current Implementation**: SQLite running in WAL mode with connection busy-timeouts handles concurrent reads seamlessly with minimal memory footprint.
* **10x Scale Bottleneck**: Database writes remain serialized through a single file lock, limiting throughput under high-frequency transaction bursts across distributed nodes.
* **Production Resolution**: Replace the async SQLite engine with a managed PostgreSQL cluster using SQLAlchemy's asyncpg driver, backed by PgBouncer connection pooling.

### 3. Audio Decoupling Architecture
* **Problem**: Standard HTML5 video elements attach audio playback to video rendering. Disabling video tracks frequently mutes participant audio in mesh topologies.
* **Resolution**: Audio and video streams are managed through dedicated stream references. Audio elements remain mounted in the DOM regardless of video track enable states.

</details>

---

<details>
<summary><b>8. Verification & Automated Test Suites</b></summary>

To validate frontend layout calculations, meeting code parsing, and API behavior, run the automated test suites:

### 1. Frontend Test Suite
Validates dynamic grid layout calculations across varying participant counts, 10-digit meeting code normalizers, and invite URL parsers:
```bash
cd apps/web
npm test
```

### 2. Backend Test Suite
Executes unit and integration tests across database models, meeting creation services, and authentication dependencies:
```bash
cd apps/api
pytest tests/ -v
```

### 3. Manual Multi-User Verification
1. **Host Session**: Open the application at `http://localhost:3000` and click **New Meeting**.
2. **Guest Session**: Open a private/incognito window, navigate to the invite link or `/join`, and enter a guest display name.
3. **Verify Features**:
   * Verify two-way WebRTC camera and decoupled audio communication.
   * Send chat messages and verify real-time cross-client delivery.
   * Send emoji reactions and verify single-render animations on video tiles.
   * Trigger **Mute All** or **Remove Participant** from the host controls and observe instant client synchronization.

</details>
