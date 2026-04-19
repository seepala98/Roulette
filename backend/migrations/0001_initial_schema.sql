# Initial Database Migrations (SQL)

-- Table: sessions
-- Manages unique game instances (boards)
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'WAITING', -- WAITING, IN_PROGRESS, FINISHED
    max_players INTEGER NOT NULL DEFAULT 4,
    current_round INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: players
-- Tracks connected players and their chip balances within a session
CREATE TABLE players (
    player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    player_name VARCHAR(100) NOT NULL,
    initial_budget INTEGER NOT NULL,
    current_chips INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: bets
-- Logs every single bet placed by a player in a given round
CREATE TABLE bets (
    bet_id BIGSERIAL PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(player_id),
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    round_number INTEGER NOT NULL,
    bet_type VARCHAR(100) NOT NULL, -- e.g., 'STRAIGHT_UP', 'RED', 'DOZEN'
    amount INTEGER NOT NULL,
    selection VARCHAR(50) NOT NULL, -- e.g., '17', 'RED', '1-6'
    UNIQUE (player_id, session_id, round_number) -- Player can only place one bet per round
);

-- Table: history
-- Records the outcome of each round
CREATE TABLE history (
    history_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    round_number INTEGER NOT NULL,
    winning_number INTEGER NOT NULL, -- 0 through 36
    payout_multiplier NUMERIC(10, 4) NOT NULL,
    round_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups on session and round number
CREATE INDEX idx_session_round ON history (session_id, round_number);
CREATE INDEX idx_player_session ON players (session_id);