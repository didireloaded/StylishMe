CREATE TABLE IF NOT EXISTS auth_oauth_states (
  id TEXT PRIMARY KEY,
  state_hash TEXT NOT NULL UNIQUE,
  binding_hash TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  code_verifier TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller')),
  intent TEXT NOT NULL CHECK (intent IN ('login', 'link')),
  link_email TEXT,
  return_to TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_oauth_states_expiry_idx ON auth_oauth_states(expires_at, used_at);

CREATE TABLE IF NOT EXISTS auth_oauth_pending_profiles (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  provider_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller')),
  return_to TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS auth_oauth_pending_profiles_expiry_idx ON auth_oauth_pending_profiles(expires_at, used_at);
CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_account_provider_idx ON auth_identities(account_email, provider);

CREATE TABLE IF NOT EXISTS auth_provider_credentials (
  identity_id TEXT PRIMARY KEY REFERENCES auth_identities(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
