psql moneyspot -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;"
psql moneyspot -c "UPDATE users SET permissions = '{\"services\": [\"Domestic Money Transfer\", \"Bill Pay + Withdrawal\", \"Card Withdrawal\", \"AEPS\", \"Micro ATM\", \"Indo-Nepal\", \"Cash Deposit\", \"Prepaid Card\", \"Travel Booking\", \"Fastag\", \"PAN Card\", \"Account Opening\", \"Insurance\", \"Credit Card Bill\"], \"features\": [\"Customer Requests\", \"Attendance\", \"All Transactions\", \"Expenses Management\", \"Pending Payments\"]}'::jsonb WHERE role = 'employee' AND permissions = '{}'::jsonb;"
psql moneyspot -c "CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    branch VARCHAR(100),
    employee_id INTEGER REFERENCES users(id),
    customer_id INTEGER,
    cust_name VARCHAR(100),
    cust_mobile VARCHAR(20),
    pending_amount NUMERIC(10, 2),
    reason TEXT,
    card_number VARCHAR(10),
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"
