CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 0,
    location VARCHAR(255),
    patrimony VARCHAR(255) UNIQUE,
    serial_number VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kit_items (
    kit_id INT,
    item_id INT,
    quantity INT NOT NULL,
    PRIMARY KEY (kit_id, item_id),
    FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collaborators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    registration_number VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_orders (
    id SERIAL PRIMARY KEY,
    collaborator_id INT,
    status VARCHAR(50) DEFAULT 'Aberta',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborator_id) REFERENCES collaborators(id)
);

CREATE TABLE IF NOT EXISTS service_order_items (
    service_order_id INT,
    item_id INT,
    quantity_requested INT NOT NULL,
    quantity_withdrawn INT DEFAULT 0,
    PRIMARY KEY (service_order_id, item_id),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debits (
    id SERIAL PRIMARY KEY,
    collaborator_id INT,
    item_id INT,
    quantity INT NOT NULL,
    reason TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborator_id) REFERENCES collaborators(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id INT,
    details TEXT,
    "user" VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS signed_receipts (
    id SERIAL PRIMARY KEY,
    service_order_id VARCHAR(255),
    collaborator_id VARCHAR(255) NOT NULL,
    collaborator_name VARCHAR(255) NOT NULL,
    collaborator_role VARCHAR(255),
    delivery_location VARCHAR(255),
    items JSONB,
    proof_image TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


DROP TRIGGER IF EXISTS set_timestamp ON items;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON kits;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON kits
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON collaborators;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON collaborators
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON service_orders;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON service_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON debits;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON debits
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();