const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'weigh8',
  password: 'weigh8_dev_password',
  database: 'weigh8_db',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  console.log('Success! Connected to database');
  console.log('Current time:', res.rows[0].now);
  pool.end();
  process.exit(0);
});
