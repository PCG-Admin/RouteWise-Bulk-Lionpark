
import { db } from '../db';
import { users } from '../db/schema';

async function main() {
    try {
        const allUsers = await db.select().from(users);
        console.log('--- Users ---');
        console.table(allUsers.map(u => ({ id: u.id, email: u.email, role: u.role, passwordHash: u.passwordHash?.substring(0, 10) + '...' })));
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        process.exit(0);
    }
}

main();
