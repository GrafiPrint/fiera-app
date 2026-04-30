-- ============================================================
--  FieraApp — Schema Supabase
--  Vai su: supabase.com → tuo progetto → SQL Editor
--  Incolla tutto questo e clicca "Run"
-- ============================================================

-- Tabella Fiere
CREATE TABLE IF NOT EXISTS fiere (
  id         BIGSERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  luogo      TEXT DEFAULT '',
  data_inizio TEXT DEFAULT '',
  data_fine   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella Contatti (dati CSV + note condivise)
CREATE TABLE IF NOT EXISTS contatti (
  id              BIGSERIAL PRIMARY KEY,
  fiera_id        BIGINT REFERENCES fiere(id) ON DELETE CASCADE,
  -- Campi chiave per ricerca rapida
  email           TEXT DEFAULT '',
  azienda         TEXT DEFAULT '',
  nome            TEXT DEFAULT '',
  cognome         TEXT DEFAULT '',
  posizione       TEXT DEFAULT '',
  regione         TEXT DEFAULT '',
  importanza_num  INTEGER DEFAULT 0,
  giorno_num      INTEGER,
  ora             TEXT DEFAULT '',
  ora_norm        TEXT DEFAULT '',
  ha_appuntamento BOOLEAN DEFAULT FALSE,
  riferimento     TEXT DEFAULT '',
  -- Tutti gli altri campi CSV come JSON
  dati            JSONB NOT NULL DEFAULT '{}',
  -- Campi condivisi tra utenti (aggiornati in tempo reale)
  note_personali  TEXT DEFAULT '',
  visitato        BOOLEAN DEFAULT FALSE,
  visitato_da     TEXT DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_contatti_fiera ON contatti(fiera_id);
CREATE INDEX IF NOT EXISTS idx_contatti_email ON contatti(email);
CREATE INDEX IF NOT EXISTS idx_contatti_giorno ON contatti(giorno_num);

-- Abilita Realtime (aggiornamenti istantanei tra dispositivi)
ALTER PUBLICATION supabase_realtime ADD TABLE contatti;
ALTER PUBLICATION supabase_realtime ADD TABLE fiere;

-- Row Level Security: accesso libero (app privata, no auth per ora)
ALTER TABLE fiere    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso libero fiere"    ON fiere    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accesso libero contatti" ON contatti FOR ALL USING (true) WITH CHECK (true);
