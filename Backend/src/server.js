import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import voteRoutes from './routes/vote.js';
import aiRoutes from './routes/ai.js';
import familyRoutes from './routes/family.js';

const app = express();

app.use(cors({
    origin: 'https://secure-vote-omega.vercel.app',
    credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/family', familyRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});