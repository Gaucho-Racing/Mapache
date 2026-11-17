-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA auth;

CREATE TABLE auth.entities (
    id          text        PRIMARY KEY,
    type        text        NOT NULL CHECK (type IN ('user', 'service_account')),
    disabled_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT entities_id_matches_type CHECK (
        (type = 'user' AND id LIKE 'usr\_%')
        OR (type = 'service_account' AND id LIKE 'sa\_%')
    ),
    CONSTRAINT entities_id_type_key UNIQUE (id, type)
);

CREATE TABLE auth.users (
    id            text        PRIMARY KEY REFERENCES auth.entities (id) ON DELETE CASCADE,
    email         citext      NOT NULL UNIQUE,
    name          text        NOT NULL,
    avatar_url    text,
    last_login_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_id_is_user CHECK (id LIKE 'usr\_%')
);

CREATE TABLE auth.user_passwords (
    user_id    text        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    hash       text        NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.auth_events (
    id         text        PRIMARY KEY,
    entity_id  text        REFERENCES auth.entities (id),
    event      text        NOT NULL CHECK (event IN ('login_succeeded', 'login_failed', 'refreshed', 'logged_out')),
    method     text        NOT NULL CHECK (method IN ('password')),
    email      citext,
    token_jti  text,
    ip         inet        NOT NULL,
    user_agent text        NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_entity_id_created_at_idx ON auth.auth_events (entity_id, created_at DESC);
CREATE INDEX auth_events_email_created_at_idx ON auth.auth_events (email, created_at DESC);

-- +goose Down
DROP SCHEMA auth CASCADE;
