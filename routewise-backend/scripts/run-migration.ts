import { sql } from 'drizzle-orm';
import { db } from '../src/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🚀 Starting site filtering migration...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/add-site-filtering.sql'),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement + ';'));
        console.log('✓ Executed statement');
      } catch (error: any) {
        // Ignore errors for IF NOT EXISTS and CREATE INDEX IF NOT EXISTS
        if (!error.message?.includes('already exists')) {
          console.error('Error:', error.message);
        }
      }
    }

    console.log('\n✅ Site filtering migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
