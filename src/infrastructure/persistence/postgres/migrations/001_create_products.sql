CREATE TABLE products (
    id          uuid        PRIMARY KEY,
    code        text        NOT NULL,
    name        text        NOT NULL,
    description text        NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NULL,
    CONSTRAINT products_code_key UNIQUE (code)
);

CREATE INDEX products_created_at_idx ON products (created_at, id);
