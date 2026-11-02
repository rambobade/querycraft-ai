"""
QueryCraft AI - Sample Database Seeder
Populates a realistic SQLite database with e-commerce, employees, orders, and reviews.
"""
import sqlite3
import os
from datetime import datetime, timedelta
import random

def seed_sample_database(db_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables
    cursor.executescript("""
    PRAGMA foreign_keys = ON;

    CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        budget REAL NOT NULL,
        location TEXT NOT NULL
    );

    CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        department_id INTEGER,
        role TEXT NOT NULL,
        salary REAL NOT NULL,
        hire_date TEXT NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        loyalty_tier TEXT NOT NULL DEFAULT 'Bronze',
        created_at TEXT NOT NULL
    );

    CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        rating REAL DEFAULT 4.5,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        employee_id INTEGER,
        order_date TEXT NOT NULL,
        status TEXT NOT NULL,
        total_amount REAL NOT NULL,
        shipping_city TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        discount REAL DEFAULT 0.0,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Create indexes for performance
    CREATE INDEX idx_orders_customer ON orders(customer_id);
    CREATE INDEX idx_orders_date ON orders(order_date);
    CREATE INDEX idx_order_items_order ON order_items(order_id);
    CREATE INDEX idx_order_items_product ON order_items(product_id);
    CREATE INDEX idx_products_category ON products(category_id);
    CREATE INDEX idx_employees_dept ON employees(department_id);
    """)

    # Seed Departments
    departments = [
        ("Engineering", 850000.0, "San Francisco, CA"),
        ("Sales", 450000.0, "New York, NY"),
        ("Marketing", 320000.0, "Austin, TX"),
        ("Customer Support", 210000.0, "Chicago, IL"),
        ("Product", 540000.0, "Seattle, WA"),
    ]
    cursor.executemany("INSERT INTO departments (name, budget, location) VALUES (?, ?, ?);", departments)

    # Seed Employees
    employees = [
        ("Alice", "Chen", "alice.chen@company.com", 1, "Lead Database Architect", 145000.0, "2021-03-15"),
        ("Bob", "Miller", "bob.miller@company.com", 1, "Senior Backend Engineer", 132000.0, "2022-01-10"),
        ("Carol", "Taylor", "carol.taylor@company.com", 2, "Sales Director", 125000.0, "2020-06-01"),
        ("David", "Kim", "david.kim@company.com", 2, "Account Executive", 82000.0, "2023-04-18"),
        ("Elena", "Rostova", "elena.rostova@company.com", 3, "VP of Marketing", 138000.0, "2021-09-20"),
        ("Frank", "Wright", "frank.wright@company.com", 4, "Support Team Lead", 68000.0, "2022-08-11"),
        ("Grace", "Hopper", "grace.hopper@company.com", 5, "Principal Product Manager", 152000.0, "2020-02-14"),
        ("Henry", "Ford", "henry.ford@company.com", 1, "DevOps Engineer", 115000.0, "2023-08-01"),
        ("Isabella", "Garcia", "isabella.garcia@company.com", 2, "Sales Representative", 74000.0, "2024-02-15"),
        ("Jack", "Smith", "jack.smith@company.com", 4, "Support Specialist", 52000.0, "2024-05-10"),
    ]
    cursor.executemany("""
        INSERT INTO employees (first_name, last_name, email, department_id, role, salary, hire_date)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, employees)

    # Seed Categories
    categories = [
        ("Electronics", "Laptops, smartphones, audio, and high-tech gadgets"),
        ("Office Furniture", "Ergonomic chairs, standing desks, and workplace accessories"),
        ("Developer Tools", "Keyboards, monitors, docks, and specialized hardware"),
        ("Books & Learning", "Software architecture, AI/ML, and system design literature"),
        ("Accessories", "Cables, adapters, power banks, and desk pads"),
    ]
    cursor.executemany("INSERT INTO categories (name, description) VALUES (?, ?);", categories)

    # Seed Products
    products = [
        ("UltraWide 38-inch Curved Monitor", 1, 899.99, 45, 4.8, 1),
        ("Mechanical Keyboard - Tactile Brown", 3, 149.50, 120, 4.9, 1),
        ("Ergonomic Mesh Office Chair", 2, 429.00, 30, 4.6, 1),
        ("Wireless Noise-Canceling Headphones", 1, 299.95, 85, 4.7, 1),
        ("Motorized Standing Desk 60x30", 2, 650.00, 22, 4.8, 1),
        ("Designing Data-Intensive Applications", 4, 48.00, 200, 4.95, 1),
        ("Thunderbolt 4 Triple-Display Dock", 3, 219.00, 60, 4.5, 1),
        ("USB-C GaN 100W Fast Charger", 5, 45.00, 350, 4.7, 1),
        ("Precision Wireless Mouse", 3, 89.99, 140, 4.6, 1),
        ("System Design Interview Guide", 4, 39.99, 175, 4.85, 1),
        ("Premium Leather Desk Pad", 5, 34.50, 210, 4.4, 1),
        ("Smart LED Desk Lamp with Auto-Dim", 2, 79.99, 95, 4.3, 1),
    ]
    cursor.executemany("""
        INSERT INTO products (name, category_id, price, stock_quantity, rating, is_active)
        VALUES (?, ?, ?, ?, ?, ?);
    """, products)

    # Seed Customers
    customers = [
        ("Sarah Connor", "sarah.connor@cyberdyne.org", "+1-415-555-0101", "San Francisco", "USA", "Platinum", "2023-01-15"),
        ("Bruce Wayne", "bruce@wayneenterprises.com", "+1-212-555-0144", "New York", "USA", "Platinum", "2022-11-20"),
        ("Peter Parker", "peter.parker@dailybugle.net", "+1-212-555-0189", "New York", "USA", "Silver", "2023-04-12"),
        ("Diana Prince", "diana.prince@themyst.org", "+1-202-555-0123", "Washington", "USA", "Gold", "2023-02-28"),
        ("Tony Stark", "tony@starkindustries.com", "+1-310-555-0199", "Los Angeles", "USA", "Platinum", "2022-08-10"),
        ("Natasha Romanoff", "natasha.r@avengers.org", "+1-312-555-0177", "Chicago", "USA", "Gold", "2023-07-04"),
        ("Clark Kent", "clark.kent@dailyplanet.com", "+1- Metropolis-555-01", "Metropolis", "USA", "Silver", "2023-09-18"),
        ("Wanda Maximoff", "wanda.m@westview.gov", "+1-201-555-0133", "Newark", "USA", "Bronze", "2024-01-05"),
        ("Stephen Strange", "dr.strange@sanctum.org", "+1-212-555-0166", "New York", "USA", "Gold", "2023-05-22"),
        ("Barry Allen", "barry.allen@centralcitypd.gov", "+1-816-555-0155", "Kansas City", "USA", "Bronze", "2024-03-11"),
        ("Arthur Curry", "arthur@atlantis-marine.org", "+1-207-555-0188", "Portland", "USA", "Silver", "2023-12-01"),
        ("Hal Jordan", "hal.jordan@ferrisair.com", "+1-310-555-0142", "San Diego", "USA", "Bronze", "2024-04-19"),
    ]
    cursor.executemany("""
        INSERT INTO customers (name, email, phone, city, country, loyalty_tier, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, customers)

    # Seed Orders & Order Items
    order_statuses = ["Completed", "Completed", "Completed", "Processing", "Shipped", "Cancelled"]
    random.seed(42)

    base_date = datetime(2024, 1, 10)
    for order_id in range(1, 36):
        cust_id = random.randint(1, len(customers))
        emp_id = random.choice([3, 4, 9]) # Sales employees
        days_offset = random.randint(0, 240)
        order_dt = base_date + timedelta(days=days_offset)
        status = random.choice(order_statuses)
        city = customers[cust_id - 1][3]

        # Insert order placeholder
        cursor.execute("""
            INSERT INTO orders (customer_id, employee_id, order_date, status, total_amount, shipping_city)
            VALUES (?, ?, ?, ?, 0.0, ?);
        """, (cust_id, emp_id, order_dt.strftime("%Y-%m-%d"), status, city))

        # Generate 1 to 4 items for this order
        num_items = random.randint(1, 4)
        chosen_products = random.sample(range(1, len(products) + 1), num_items)
        order_total = 0.0

        for prod_id in chosen_products:
            prod_price = products[prod_id - 1][2]
            qty = random.randint(1, 3)
            discount = 0.05 if random.random() > 0.6 else 0.0
            item_total = qty * prod_price * (1.0 - discount)
            order_total += item_total

            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount)
                VALUES (?, ?, ?, ?, ?);
            """, (order_id, prod_id, qty, prod_price, discount))

        cursor.execute("UPDATE orders SET total_amount = ? WHERE id = ?;", (round(order_total, 2), order_id))

    # Seed Reviews
    sample_reviews = [
        (1, 1, 5, "The color accuracy and screen real estate have boosted my productivity 10x!"),
        (2, 2, 5, "Best tactile feel of any mechanical keyboard I've ever owned. Silent and crisp."),
        (3, 4, 4, "Very comfortable for long 8+ hour coding sessions. Lumbar support is great."),
        (4, 5, 5, "ANC is stellar. Blocks out all office chatter and commuter train noise."),
        (6, 1, 5, "The holy grail of distributed systems books. An absolute must-read!"),
        (7, 3, 4, "Solid dock, drives two 4K displays at 60Hz without any hiccups."),
        (10, 6, 5, "Helped me ace my technical interviews at top tier tech firms."),
        (5, 2, 5, "Smooth motor, memories are handy, sturdy build with no wobble."),
        (8, 7, 5, "Compact charger, charges my laptop and phone simultaneously fast."),
        (9, 8, 4, "Super smooth tracking, good battery life, ergonomic hand angle."),
    ]
    cursor.executemany("""
        INSERT INTO reviews (product_id, customer_id, rating, comment, created_at)
        VALUES (?, ?, ?, ?, '2024-05-15');
    """, sample_reviews)

    conn.commit()
    conn.close()
    print(f"Sample database successfully seeded at: {db_path}")

if __name__ == "__main__":
    db_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "sample_ecommerce.db")
    seed_sample_database(db_file)
