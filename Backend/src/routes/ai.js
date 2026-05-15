import express from 'express';
import { prisma } from '../prismaClient.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Neautorizat!" });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(401).json({ error: "Sesiune invalidă" });
        
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Sesiune expirată" });
    }
};

router.get('/analyze/:electionId', authMiddleware, async (req, res) => {
    try {
        const electionId = req.params.electionId;

        // Extragem datele absolute pentru AI
        const election = await prisma.election.findUnique({
            where: { id: electionId },
            include: { candidates: { include: { _count: { select: { votes: true } } } } }
        });

        if (!election) return res.status(404).json({ error: "Alegerea nu a fost găsită." });

        const isSuperAdmin = req.user.email === 'admin@ase.ro';

        if (!isSuperAdmin) {
            const family = await prisma.family.findUnique({ where: { creatorId: req.user.id } });
            if (!family || family.id !== election.familyId) {
                return res.status(403).json({ error: "Doar creatorul familiei poate cere analize AI pentru aceste alegeri!" });
            }
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'introdu-aici-cheia-ta-gemini') {
            return res.status(200).json({
                analysis: "⚠️ Eroare Configurare: Cheia Gemini lipsește din backend-ul sistemului tău (`.env`). Obține gratuit o cheie de pe Google AI Studio și adaug-o sub numele GEMINI_API_KEY."
            });
        }

        const candidateStats = election.candidates.map(c => `- ${c.name}: ${c._count.votes} voturi`).join('\n');
        const totalVotes = election.candidates.reduce((sum, c) => sum + c._count.votes, 0);

        const prompt = `Ești un asistent AI de securitate informatică și statistică avansată pentru un sistem academic. 
Evaluezi un sistem de vot anonim. Te bazezi EXCLUSIV pe aceste date.
Titlul alegerii: "${election.title}"
Stare sondaj: ${election.isActive ? 'Pe rol/InDesfasurare' : 'Sondaj Închis definitiv'}
Total voturi unice înregistrate în sistem: ${totalVotes}
Situația candidaților:\n${candidateStats}

Sarcini:
1) Analizează aceste date ca un expert (generează text pe scurt). Dacă au zero voturi, informează clar. Evaluează distribuția și cine a obținut majoritatea temporară sau finală.
2) Evaluează riscul de fraudă bazat exclusiv pe distribuția statistică a voturilor (anomalii vizibile, monopolizarea voturilor, diferențe extreme). Nu menționa IP-uri, timestamp-uri sau date la care nu ai acces.
Returnează o analiză oficială în limba română. Poți folosi bold (**) pentru a evidenția ideile principale, dar TE ROG SĂ NU folosești deloc liste cu puncte (bullet points) sau steluțe/liniuțe la începutul fiecărui rând. Scrie textul sub formă de paragrafe. Nu repeta promptul. Începe direct cu analiza.`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        res.json({ analysis: text });

    } catch (error) {
        console.error("Eroare Generare AI:", error);
        
        let errorMessage = "Eroare la procesarea cererii AI.";
        if (error.status === 403 || error.message.includes('API key')) {
            errorMessage = "Cheia API introdusă în .env este invalidă sau a expirat. Te rog să generezi una nouă de pe Google AI Studio.";
        } else if (error.message) {
            errorMessage = `Eroare API Gemini: ${error.message}`;
        }

        res.status(500).json({ error: errorMessage });
    }
});

export default router;
