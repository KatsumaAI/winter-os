# KatsuCases - Project Specification

## 1. Concept & Vision

KatsuCases is a **premium Pokémon-themed RNG case-opening, inventory, trading, and marketplace platform** that masterfully blends the clean commercial structure of a high-end storefront with the controlled excitement of a luxury casino experience. The platform evokes the feeling of walking into an exclusive Pokémon trading hall where rarity, value, and the thrill of the pull are celebrated with sophisticated visual restraint.

The design philosophy centers on **"controlled excitement"** — every element whispers premium quality while the core mechanics (case openings, rare pulls, live activity) deliver the adrenaline of gambling without feeling tacky or overwhelming. Think: a luxury watch boutique that occasionally reveals its master craftsmanship through dramatic moments.

## 2. Design Language

### Aesthetic Direction
**Reference**: rbxmoney's dark theme marketplace meets a premium casino product showroom
- **Primary Feeling**: Exclusive trading floor, collector's vault, luxury gaming lounge
- **Mood**: Trustworthy yet thrilling, commercial yet exciting, modern yet timeless
- **Energy Level**: Controlled excitement — premium restraint with strategic moments of drama

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary Background | Deep Navy | `#0a0e1a` | Main page backgrounds |
| Secondary Background | Dark Slate | `#12182b` | Card surfaces, panels |
| Tertiary Background | Midnight Blue | `#1a2140` | Elevated elements |
| Primary Accent | Electric Blue | `#3b82f6` | CTAs, highlights, active states |
| Secondary Accent | Royal Purple | `#8b5cf6` | Rarity indicators, premium elements |
| Tertiary Accent | Cyan Glow | `#06b6d4` | Supporting accents, live indicators |
| Success/Rare | Emerald | `#10b981` | Verified badges, success states |
| Warning/Epic | Amber | `#f59e0b` | Epic rarity, warnings |
| Legendary | Gold | `#fbbf24` | Legendary items, premium content |
| Mythical | Magenta | `#ec4899` | Mythical rarity, special events |
| Text Primary | Pure White | `#ffffff` | Headlines, important text |
| Text Secondary | Silver | `#94a3b8` | Body text, descriptions |
| Text Muted | Slate Gray | `#64748b` | Captions, metadata |
| Border | Subtle Edge | `#1e293b` | Card borders, dividers |

### Typography

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| Hero Headline | Outfit | 800 | 56px | 1.1 |
| Section Title | Outfit | 700 | 36px | 1.2 |
| Card Title | Outfit | 600 | 20px | 1.3 |
| Body Text | Inter | 400 | 16px | 1.6 |
| Small Text | Inter | 400 | 14px | 1.5 |
| Caption | Inter | 500 | 12px | 1.4 |
| Button | Outfit | 600 | 14px | 1 |
| Mono/Stats | JetBrains Mono | 500 | 14px | 1 |

**Font Fallbacks**: system-ui, -apple-system, sans-serif

### Spatial System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight inline spacing |
| `--space-sm` | 8px | Component internal padding |
| `--space-md` | 16px | Standard gaps |
| `--space-lg` | 24px | Section internal spacing |
| `--space-xl` | 32px | Card padding |
| `--space-2xl` | 48px | Section margins |
| `--space-3xl` | 64px | Major section breaks |

### Motion Philosophy

All animations use **anime.js** with intentional pacing that builds anticipation:

| Animation Type | Duration | Easing | Purpose |
|---------------|----------|--------|---------|
| Micro-interactions | 150ms | ease-out | Hover states, button feedback |
| Panel transitions | 300ms | ease-in-out | Modal opens, dropdown reveals |
| Card reveals | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | Item card appearances |
| Case roll | 2000-4000ms | Custom deceleration | Slot machine roll effect |
| Rare reveal | 800ms | spring | Epic/legendary reveal sequence |
| Page transitions | 200ms | ease-out | Route changes |

### Visual Assets

- **Icons**: Remix Icon library (modern, sharp, premium feel)
- **Pokémon Sprites**: Pokémon Showdown sprites (https://play.pokemonshowdown.com/sprites/)
- **Case Images**: Generated CSS gradients with animated glow effects
- **Decorative Elements**: Subtle grid patterns, soft glows, layered shadows

## 3. Layout & Structure

### Page Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TOP NAVIGATION (Sticky, 72px height)                        │
│  [Logo] [Nav Links...] [Balances] [Auth/Profile]            │
├─────────────────────────────────────────────────────────────┤
│  MAIN CONTENT AREA (max-width: 1400px, centered)             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Hero Section (Home only)                           │    │
│  │  - Headline + Subline                               │    │
│  │  - Primary CTA                                      │    │
│  │  - Trust Indicators                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Content Sections (varies by page)                  │    │
│  │  - Section Title + Description                      │    │
│  │  - Grid/Card Layouts                               │    │
│  │  - Premium Feature Highlights                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Featured Cases / Live Activity Strip              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                      │
│  - Links | Social | Legal                                   │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Structure

**Primary Links**:
- Home
- Cases (dropdown: Featured, Daily, Case Vs, Live Pulls)
- Marketplace
- Trading
- Inventory
- Guide (dropdown: Odds, Provably Fair, FAQ, Support)

**Right-Aligned Controls**:
- Balance Display ($0.00 / $0.00)
- Inventory Count
- Sign In / Sign Up (logged out)
- Profile Dropdown (logged in)

### Responsive Strategy

| Breakpoint | Layout Adjustments |
|------------|-------------------|
| 1400px+ | Full layout, 4-column grids |
| 1200px | 3-column grids, condensed nav |
| 992px | 2-column grids, hamburger menu |
| 576px | Single column, stacked sections |

## 4. Features & Interactions

### Authentication System

**Sign Up Flow**:
1. Email + Username + Password form
2. Password strength indicator
3. Terms acceptance checkbox
4. Submit → Create account → Auto-login → Redirect to Home

**Sign In Flow**:
1. Email + Password form
2. Remember me checkbox
3. Submit → Validate → Session → Redirect to previous page

**Session Management**:
- Express-session with SQLite store
- Secure password hashing (bcrypt)
- Auto-expire after 7 days of inactivity

### Case Opening Experience

**Pre-Opening**:
- Case detail modal with contents preview
- Odds display by rarity tier
- "Open 1" / "Open 10" buttons
- Balance check and validation

**Opening Animation** (anime.js powered):
1. Screen dims slightly (opacity 0.7)
2. Horizontal strip of card slots appears
3. Cards contain "?" symbols
4. Roll animation starts (2-4 seconds)
5. Cards gradually slow down with suspense
6. Winning card lands with bounce
7. Brief pause for anticipation
8. Reward reveal overlay appears

**Reveal Sequence**:
- Standard rewards: Card flips, shows Pokémon + stats
- Epic rewards: Screen flash, enhanced glow, sound cue
- Legendary rewards: Full cinematic mode, particle effects, extended celebration
- After reveal: "View in Inventory" / "Open Another" / "List on Marketplace" buttons

### Marketplace

**Browsing**:
- Search by Pokémon name
- Filter by rarity, price range, seller
- Sort by: Price (low/high), Recent, Rarity
- Grid view with item cards

**Item Cards**:
- Pokémon sprite (Showdown)
- Name + form/variant
- Rarity badge
- Price
- Seller username
- Quick "Buy" button

**Listing Flow**:
1. Select item from inventory
2. Set price
3. Confirm listing
4. Item appears in marketplace

### Trading

**Trade Interface**:
- Two-column layout: Your Offer | Their Offer
- Drag items from inventory to trade area
- Real-time value calculation
- Trade status: Pending, Accepted, Declined, Completed

**Trade Actions**:
- Send trade offer
- Accept incoming trade
- Decline trade
- Cancel pending trade

### Live Pulls Feed

**Display**:
- Scrollable feed of recent case openings
- Username + Case name + Pokémon + Rarity badge
- Timestamp (relative: "2 minutes ago")
- Auto-updates every 10 seconds

**Premium Entries**:
- Rare pulls highlighted with glow effect
- Legendary pulls get special treatment

### Inventory Management

**Views**:
- Grid of owned items
- Filter by rarity, source, listed status
- Sort by value, rarity, acquisition date

**Item Actions**:
- List on marketplace
- Send in trade
- View details (full stats, history)

### Profile & Stats

**Stats Displayed**:
- Total cases opened
- Total spent
- Total earned (from sales)
- Rarest pull (all-time)
- Recent activity feed

## 5. Component Inventory

### Navigation Bar

| State | Appearance |
|-------|------------|
| Default | Dark background (#12182b), subtle bottom border |
| Scrolled | Slight shadow added, background solidifies |
| Logo | "KatsuCases" in Outfit font, gradient text |
| Nav Links | Silver text, electric blue on hover, underline on active |
| Dropdowns | Dark panel, animated reveal (scale + opacity) |
| Balance | Mono font, subtle background pill |
| Auth Buttons | Outlined style (logged out), filled (Sign In) |

### Buttons

| Variant | Appearance |
|---------|------------|
| Primary | Electric blue bg, white text, subtle glow on hover |
| Secondary | Transparent, electric blue border, blue text |
| Success | Emerald bg, white text |
| Danger | Red bg, white text |
| Ghost | Transparent, silver text |
| Disabled | Muted colors, no pointer events |

### Cards

**Case Card**:
```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │   Case Image     │  │
│  │   (Animated      │  │
│  │    Glow Edge)    │  │
│  └───────────────────┘  │
│  Case Name             │
│  "X items • 1 in Y"    │
│  [$0.00] [Open]        │
└─────────────────────────┘
```

**Item Card (Marketplace)**:
```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │   Pokémon        │  │
│  │   Sprite         │  │
│  └───────────────────┘  │
│  Name (Form)            │
│  [Rarity Badge]         │
│  $0.00 • Seller         │
└─────────────────────────┘
```

**Rarity Badge Colors**:
| Rarity | Color |
|--------|-------|
| Common | #9ca3af (gray) |
| Uncommon | #10b981 (green) |
| Rare | #3b82f6 (blue) |
| Epic | #8b5cf6 (purple) |
| Legendary | #fbbf24 (gold) |
| Mythical | #ec4899 (magenta) |

### Modals

| Element | Style |
|---------|-------|
| Overlay | Black 80% opacity, blur backdrop |
| Panel | Dark slate bg, rounded corners, shadow |
| Header | Title + close button |
| Body | Scrollable content area |
| Footer | Action buttons, right-aligned |

### Form Inputs

| State | Appearance |
|-------|------------|
| Default | Dark bg, subtle border, silver text |
| Focus | Electric blue border, subtle glow |
| Error | Red border, error message below |
| Disabled | Muted bg, no interaction |

### Toast Notifications

| Type | Appearance |
|------|------------|
| Success | Green left border, emerald icon |
| Error | Red left border, X icon |
| Info | Blue left border, info icon |

## 6. Technical Approach

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Server | Express.js (CommonJS) |
| Database | SQLite3 |
| Session | express-session + connect-sqlite3 |
| Auth | bcrypt |
| HTTP Client | Axios |
| Animations | anime.js |
| Icons | Remix Icon |
| Pokémon Data | PokeAPI v2 |
| Pokémon Sprites | Pokémon Showdown |

### Project Structure

```
katsucases/
├── server.js              # Express app entry
├── package.json
├── database.js            # SQLite3 setup
├── routes/
│   ├── auth.js            # Login, register, logout
│   ├── api.js             # API endpoints
│   └── pages.js           # Page routes
├── middleware/
│   └── auth.js            # Auth middleware
├── public/
│   ├── css/
│   │   ├── main.css        # Core styles
│   │   ├── components.css  # Component styles
│   │   └── pages.css       # Page-specific styles
│   ├── js/
│   │   ├── main.js         # Core functionality
│   │   ├── auth.js         # Auth handlers
│   │   ├── cases.js        # Case opening logic
│   │   ├── marketplace.js   # Marketplace interactions
│   │   └── animations.js   # anime.js configurations
│   └── assets/
│       └── images/
├── views/
│   ├── partials/
│   │   ├── header.html
│   │   └── footer.html
│   ├── index.html
│   ├── cases.html
│   ├── marketplace.html
│   ├── trading.html
│   ├── livepulls.html
│   ├── casevs.html
│   ├── inventory.html
│   ├── profile.html
│   ├── guide.html
│   ├── faq.html
│   ├── signin.html
│   └── signup.html
└── data/
    └── katsucases.db       # SQLite database
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Authenticate user |
| POST | /api/auth/logout | End session |
| GET | /api/user | Get current user data |
| GET | /api/cases | List all cases |
| GET | /api/cases/:id | Get case details + contents |
| POST | /api/cases/:id/open | Open case (1 or 10) |
| GET | /api/marketplace | List marketplace items |
| POST | /api/marketplace/list | List item for sale |
| DELETE | /api/marketplace/:id | Remove listing |
| POST | /api/marketplace/:id/buy | Purchase item |
| GET | /api/inventory | Get user inventory |
| GET | /api/trades | List user trades |
| POST | /api/trades | Create trade offer |
| PUT | /api/trades/:id | Update trade status |
| GET | /api/livepulls | Get recent openings |
| GET | /api/stats | Platform statistics |

### Database Schema

**users**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| username | TEXT | UNIQUE, NOT NULL |
| email | TEXT | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| balance | REAL | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**inventory**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY |
| pokemon_id | INTEGER | NOT NULL |
| name | TEXT | NOT NULL |
| form | TEXT | |
| rarity | TEXT | NOT NULL |
| sprite_url | TEXT | |
| is_listed | INTEGER | DEFAULT 0 |
| listed_price | REAL | |
| acquired_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**cases**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| name | TEXT | NOT NULL |
| description | TEXT | |
| price | REAL | NOT NULL |
| image_url | TEXT | |
| is_featured | INTEGER | DEFAULT 0 |
| min_odds | INTEGER | |
| max_odds | INTEGER | |

**case_contents**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| case_id | INTEGER | FOREIGN KEY |
| pokemon_id | INTEGER | |
| name | TEXT | NOT NULL |
| form | TEXT | |
| rarity | TEXT | NOT NULL |
| sprite_url | TEXT | |
| odds | INTEGER | NOT NULL |

**openings**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY |
| case_id | INTEGER | FOREIGN KEY |
| item_id | INTEGER | FOREIGN KEY |
| amount_paid | REAL | |
| is_public | INTEGER | DEFAULT 1 |
| opened_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**marketplace**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| seller_id | INTEGER | FOREIGN KEY |
| item_id | INTEGER | FOREIGN KEY |
| price | REAL | NOT NULL |
| status | TEXT | DEFAULT 'active' |
| listed_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**trades**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| sender_id | INTEGER | FOREIGN KEY |
| receiver_id | INTEGER | FOREIGN KEY |
| status | TEXT | DEFAULT 'pending' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**trade_items**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| trade_id | INTEGER | FOREIGN KEY |
| item_id | INTEGER | FOREIGN KEY |
| from_user | INTEGER | FOREIGN KEY |

**transactions**
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY |
| type | TEXT | NOT NULL |
| amount | REAL | NOT NULL |
| description | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### Pokémon Data Integration

**PokeAPI v2** (https://pokeapi.co/api/v2/):
- Fetch Pokémon details by ID
- Get species, forms, sprites
- Cache responses locally

**Pokémon Showdown Sprites**:
- Format: `https://play.pokemonshowdown.com/sprites/ani/[pokemon].gif`
- Fallback: `https://play.pokemonshowdown.com/sprites/ani-shiny/[pokemon].gif`

### Authentication Flow

```
1. User submits login form
2. Server validates credentials
3. Create session, store user_id
4. Set session cookie
5. Return success
6. Client redirects to destination
```

### Session Configuration

```javascript
session({
    secret: 'katsucases-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    },
    store: new SQLiteStore({ db: 'sessions.db' })
})
```

## 7. Page Specifications

### Home Page
- Hero with headline, CTA, trust indicators
- Featured cases grid (4 items)
- How it works section (3 steps)
- Recent live pulls strip
- Rarity tiers explanation
- Statistics bar
- Testimonials section
- FAQ preview
- Footer

### Cases Page
- Featured case hero banner
- Category tabs (All, Featured, Daily, etc.)
- Filter sidebar (rarity, price)
- Case cards grid (responsive)
- Case detail modal

### Marketplace Page
- Search bar
- Filter pills (Rarity, Price Range)
- Sort dropdown
- Item cards grid
- Item detail modal

### Trading Page
- Active trades tab
- Create new trade section
- Trade history tab
- Incoming trades panel

### Live Pulls Page
- Live feed of openings
- Filter by rarity
- Real-time updates
- Highlighted rare pulls

### Case Vs Page
- Match lobby
- Player vs Player layout
- Side-by-side case opening
- Winner announcement

### Inventory Page
- User items grid
- Filter/sort controls
- Quick actions (List, Trade)
- Item detail view

### Profile Page
- Account overview card
- Statistics charts
- Recent activity
- Rarest pulls showcase

### Guide / FAQ Pages
- Clean article layout
- Section navigation
- Provably fair explanation
- Odds breakdown tables
