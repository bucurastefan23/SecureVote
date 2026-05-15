import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import voteRoutes from './routes/vote.js';
import aiRoutes from './routes/ai.js';
import familyRoutes from './routes/family.js';

const app = express();
app.use(cors());
app.use(express.json());

console.log("Forcing nodemon restart to load .env variables... Done!");

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/family', familyRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Nodemon restart trigger 2
