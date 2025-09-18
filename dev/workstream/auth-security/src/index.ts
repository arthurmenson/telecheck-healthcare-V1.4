import { App } from './app';

// Load environment variables
const port = parseInt(process.env['PORT'] || '3000');

// Initialize and start the application
const app = new App();
app.listen(port);