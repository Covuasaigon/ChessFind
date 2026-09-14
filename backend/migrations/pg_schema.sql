-- ChessFind PostgreSQL Schema

CREATE TABLE IF NOT EXISTS sgc_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id VARCHAR(255) PRIMARY KEY,
    payload TEXT NOT NULL,
    published INT NOT NULL DEFAULT 0,
    auto_sync INT NOT NULL DEFAULT 1,
    sync_interval INT NOT NULL DEFAULT 5,
    last_sync VARCHAR(255),
    next_sync VARCHAR(255),
    updated VARCHAR(255) NOT NULL
);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS auto_sync INT NOT NULL DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sync_interval INT NOT NULL DEFAULT 5;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS last_sync VARCHAR(255);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS next_sync VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_tournaments_published ON tournaments (published);

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(255) PRIMARY KEY,
    tournament_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    age_group VARCHAR(100),
    source_url TEXT NOT NULL,
    total_players INT NOT NULL DEFAULT 0,
    rounds INT,
    updated VARCHAR(255) NOT NULL,
    payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_categories_tournament ON categories (tournament_id);

CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(255) PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL,
    tournament_id VARCHAR(255) NOT NULL,
    snr VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    fide_id VARCHAR(100),
    rating INT,
    club TEXT,
    country VARCHAR(100),
    gender VARCHAR(50),
    age_group VARCHAR(100),
    updated VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_category ON players (category_id);
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players (tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players (name);

CREATE TABLE IF NOT EXISTS rankings (
    player_id VARCHAR(255) PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL,
    rank INT,
    points DOUBLE PRECISION,
    buchholz DOUBLE PRECISION,
    sonneborn_berger DOUBLE PRECISION,
    performance INT,
    ties_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_rankings_category ON rankings (category_id);

CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(255) PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL,
    player_id VARCHAR(255) NOT NULL,
    player_white VARCHAR(255),
    player_black VARCHAR(255),
    round INT NOT NULL,
    board INT,
    result VARCHAR(50),
    score DOUBLE PRECISION,
    color VARCHAR(20),
    opponent_id VARCHAR(255),
    opponent_name VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_matches_player ON matches (player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_player_round ON matches (player_id, round);

CREATE TABLE IF NOT EXISTS admin_sessions (
    hash VARCHAR(255) PRIMARY KEY,
    csrf VARCHAR(255) NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_attempts (
    key VARCHAR(255) PRIMARY KEY,
    count INT NOT NULL,
    reset BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS home_banners (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    button_text VARCHAR(255),
    button_link TEXT,
    is_active INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_slides (
    id VARCHAR(255) PRIMARY KEY,
    tournament_id VARCHAR(255),
    title TEXT NOT NULL,
    slide_type VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tournament_slides_tournament ON tournament_slides (tournament_id);

CREATE TABLE IF NOT EXISTS prizes (
    id VARCHAR(255) PRIMARY KEY,
    tournament_id VARCHAR(255) NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    rank_from INT NOT NULL,
    rank_to INT NOT NULL,
    medal VARCHAR(100),
    prize_name TEXT NOT NULL,
    description TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prizes_tournament ON prizes (tournament_id);

CREATE TABLE IF NOT EXISTS details (
    tid VARCHAR(255) NOT NULL,
    pid VARCHAR(255) NOT NULL,
    revision VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (tid, pid, revision)
);

CREATE TABLE IF NOT EXISTS locks (
    key VARCHAR(255) PRIMARY KEY,
    until BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(255) PRIMARY KEY,
    created VARCHAR(255) NOT NULL,
    ok INT NOT NULL,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs (created);

CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(255) PRIMARY KEY,
    tournament_id VARCHAR(255),
    tournament_name TEXT,
    url TEXT NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    players_updated INT NOT NULL DEFAULT 0,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tournament ON sync_logs (tournament_id);

CREATE TABLE IF NOT EXISTS previews (
    token VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    expires BIGINT NOT NULL
);
