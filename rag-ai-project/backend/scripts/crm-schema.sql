-- CRM Schema for Iranian Commerce Industry
-- Tables prefixed with crm_ in rag_db

DROP TABLE IF EXISTS crm_campaigns CASCADE;
DROP TABLE IF EXISTS crm_support_tickets CASCADE;
DROP TABLE IF EXISTS crm_activities CASCADE;
DROP TABLE IF EXISTS crm_order_items CASCADE;
DROP TABLE IF EXISTS crm_orders CASCADE;
DROP TABLE IF EXISTS crm_deals CASCADE;
DROP TABLE IF EXISTS crm_products CASCADE;
DROP TABLE IF EXISTS crm_leads CASCADE;
DROP TABLE IF EXISTS crm_contacts CASCADE;
DROP TABLE IF EXISTS crm_customers CASCADE;
DROP TABLE IF EXISTS crm_employees CASCADE;

CREATE TABLE crm_employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(50),
  hire_date DATE,
  target_sales BIGINT DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE TABLE crm_customers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  industry VARCHAR(100),
  city VARCHAR(50),
  province VARCHAR(80),
  address TEXT,
  website VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(100),
  employee_count INTEGER,
  annual_revenue BIGINT,
  status VARCHAR(20) DEFAULT 'active',
  account_manager_id INTEGER REFERENCES crm_employees(id),
  customer_since DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm_contacts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES crm_customers(id) ON DELETE CASCADE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(80),
  email VARCHAR(100),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm_leads (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200),
  contact_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  source VARCHAR(50),
  industry VARCHAR(100),
  city VARCHAR(50),
  status VARCHAR(30) DEFAULT 'new',
  estimated_value BIGINT,
  assigned_to INTEGER REFERENCES crm_employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE crm_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  sku VARCHAR(50) UNIQUE,
  description TEXT,
  unit_price BIGINT NOT NULL,
  unit VARCHAR(20) DEFAULT 'عدد',
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE crm_deals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  customer_id INTEGER REFERENCES crm_customers(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  assigned_to INTEGER REFERENCES crm_employees(id),
  stage VARCHAR(30) DEFAULT 'prospecting',
  value BIGINT,
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  closed_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE crm_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES crm_customers(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  deal_id INTEGER REFERENCES crm_deals(id),
  assigned_to INTEGER REFERENCES crm_employees(id),
  status VARCHAR(20) DEFAULT 'pending',
  total_amount BIGINT,
  discount_percent INTEGER DEFAULT 0,
  final_amount BIGINT,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  order_date TIMESTAMP DEFAULT NOW(),
  delivery_date TIMESTAMP,
  notes TEXT
);

CREATE TABLE crm_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES crm_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES crm_products(id),
  quantity INTEGER NOT NULL,
  unit_price BIGINT NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  total_price BIGINT NOT NULL
);

CREATE TABLE crm_activities (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  subject VARCHAR(200),
  customer_id INTEGER REFERENCES crm_customers(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  deal_id INTEGER REFERENCES crm_deals(id),
  employee_id INTEGER REFERENCES crm_employees(id),
  activity_date TIMESTAMP,
  duration_minutes INTEGER,
  outcome VARCHAR(50),
  notes TEXT
);

CREATE TABLE crm_support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES crm_customers(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  assigned_to INTEGER REFERENCES crm_employees(id),
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution TEXT
);

CREATE TABLE crm_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  budget BIGINT,
  target_audience TEXT,
  description TEXT,
  leads_generated INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_crm_customers_industry ON crm_customers(industry);
CREATE INDEX idx_crm_customers_city ON crm_customers(city);
CREATE INDEX idx_crm_customers_status ON crm_customers(status);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX idx_crm_deals_customer ON crm_deals(customer_id);
CREATE INDEX idx_crm_orders_customer ON crm_orders(customer_id);
CREATE INDEX idx_crm_activities_customer ON crm_activities(customer_id);
CREATE INDEX idx_crm_tickets_customer ON crm_support_tickets(customer_id);
CREATE INDEX idx_crm_tickets_status ON crm_support_tickets(status);
