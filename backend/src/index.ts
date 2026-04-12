import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import tasksRoutes from './routes/tasks';
import { Server } from 'http';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use('/auth', authRoutes);
app.use('/projects', projectsRoutes);
app.use('/', tasksRoutes); // tasksRoutes handle /projects/:id/tasks and /tasks/:id

app.use(errorHandler);

// Graceful shutdown on SIGTERM
let server: Server;

server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
