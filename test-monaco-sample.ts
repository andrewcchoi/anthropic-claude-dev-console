/**
 * Sample TypeScript file to test Monaco Editor syntax highlighting
 */

interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    console.log('UserService initialized');
  }

  async createUser(user: User): Promise<User> {
    if (this.users.has(user.id)) {
      throw new Error(`User with id ${user.id} already exists`);
    }

    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

// Test the service
const service = new UserService();
const testUser: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
};

service.createUser(testUser)
  .then(user => console.log('Created:', user))
  .catch(error => console.error('Error:', error));
