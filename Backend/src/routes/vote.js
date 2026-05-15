import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prismaClient.js';

const router = express.Router();

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Nu ești autentificat!" });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        
        const checkUser = await prisma.user.findUnique({
             where: { id: decoded.id }
        });
        if (!checkUser) return res.status(401).json({ error: "Sesiune invalidă! Contul nu mai există în baza de date." });

        req.userId = decoded.id; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Sesiune expirată sau invalidă!" });
    }
};

// Get elections (Global + User's Family)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });

        const electionsData = await prisma.election.findMany({
            where: {
                isHidden: false,
                OR: [
                    { familyId: null }, // Global elections
                    { familyId: user.familyId || 'no-family' } // User's family elections
                ]
            },
            include: { 
                candidates: {
                    include: { _count: { select: { votes: true } } }
                } 
            },
            orderBy: { createdAt: 'desc' }
        });

        // Procesăm și mapăm datele astfel încât voturile să rămână secrete cât timp curge campania!
        const safeElections = electionsData.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            isActive: e.isActive,
            isGlobal: e.familyId === null,
            candidates: e.candidates.map(c => ({
                id: c.id,
                name: c.name,
                details: c.details,
                // Doar dacă e Inactiv se văd răspunsurile public!
                votes: e.isActive ? null : c._count.votes 
            }))
        }));
        
        res.json(safeElections);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// Vote for a candidate
router.post('/cast', authMiddleware, async (req, res) => {
    const { electionId, candidateId } = req.body;
    const realUserId = req.userId || (req.user ? req.user.id : null);

    try {
        const user = await prisma.user.findUnique({ where: { id: realUserId } });
        const election = await prisma.election.findUnique({ where: { id: electionId } });
        
        if (!election) return res.status(404).json({ error: "Alegerea nu există!" });
        
        if (election.familyId !== null && election.familyId !== user.familyId) {
            return res.status(403).json({ error: "Nu faci parte din familia care a organizat acest sondaj!" });
        }

        // Prevent double voting using real User ID
        const existingVote = await prisma.electionParticipation.findUnique({
            where: { userId_electionId: { userId: realUserId, electionId } }
        });
        if (existingVote) return res.status(400).json({ error: "Ai votat deja la această alegere!" });

        // Record participation and cast anonymous vote in a transaction
        await prisma.$transaction([
            prisma.electionParticipation.create({
                data: { userId: realUserId, electionId }
            }),
            prisma.vote.create({
                data: { electionId, candidateId }
            })
        ]);

        res.json({ message: "Vot anonim înregistrat vizual și real!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin/Creator endpoint: Create a new election
router.post('/admin/create-election', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        const isSuperAdmin = user.email === 'admin@ase.ro';
        
        let targetFamilyId = null; // Default to global
        
        // If not super admin, check if user is family creator
        if (!isSuperAdmin) {
            const family = await prisma.family.findUnique({ where: { creatorId: req.userId } });
            if (!family) {
                return res.status(403).json({ error: "Acces interzis! Trebuie să fii Super Admin sau Creatorul unei familii." });
            }
            targetFamilyId = family.id;
        }

        const { title, description, candidates } = req.body;
        
        const newElection = await prisma.election.create({
            data: {
                title,
                description: description || "Alegere creată de Admin",
                startDate: new Date(),
                endDate: new Date(Date.now() + 864000000), // active for 10 days
                isActive: true,
                familyId: targetFamilyId,
                candidates: {
                    create: candidates.map(cName => ({ name: cName, details: "N/A" }))
                }
            }
        });

        res.status(201).json({ message: "Alegere creată cu succes!", election: newElection });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin/Creator endpoint: Get all managed elections with vote counts
router.get('/admin/elections', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        const isSuperAdmin = user.email === 'admin@ase.ro';
        
        let elections = [];
        
        if (isSuperAdmin) {
            // Super Admin sees all global elections
            elections = await prisma.election.findMany({
                where: { familyId: null },
                include: { candidates: { include: { _count: { select: { votes: true } } } } },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // Family creator sees their family's elections
            const family = await prisma.family.findUnique({ where: { creatorId: req.userId } });
            if (!family) return res.status(403).json({ error: "Acces interzis" });
            
            elections = await prisma.election.findMany({
                where: { familyId: family.id },
                include: { candidates: { include: { _count: { select: { votes: true } } } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        const formatted = elections.map(e => ({
            id: e.id,
            title: e.title,
            isActive: e.isActive,
            isHidden: e.isHidden,
            isGlobal: e.familyId === null,
            totalVotes: e.candidates.reduce((acc, c) => acc + c._count.votes, 0),
            candidatesCount: e.candidates.map(c => ({
                name: c.name,
                votes: c._count.votes
            }))
        }));

        res.json(formatted);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin/Creator endpoint: Stop election
router.put('/admin/elections/:id/stop', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        const isSuperAdmin = user.email === 'admin@ase.ro';
        const election = await prisma.election.findUnique({ where: { id: req.params.id } });
        
        if (!election) return res.status(404).json({ error: "Alegerea nu există!" });
        
        if (!isSuperAdmin) {
            const family = await prisma.family.findUnique({ where: { creatorId: req.userId } });
            if (!family || family.id !== election.familyId) {
                 return res.status(403).json({ error: "Acces interzis. Aceasta nu e alegerea ta!" });
            }
        } else if (election.familyId !== null) {
            // Super admin should ideally only stop global elections, or maybe all. Let's restrict to global.
            return res.status(403).json({ error: "Adminul global poate opri doar alegerile globale!" });
        }

        const updated = await prisma.election.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });

        res.json({ message: "Alegerea a fost OPRITĂ automat!", election: updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin/Creator endpoint: Hide election (Soft Delete)
router.put('/admin/elections/:id/hide', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        const isSuperAdmin = user.email === 'admin@ase.ro';
        const election = await prisma.election.findUnique({ where: { id: req.params.id } });
        
        if (!election) return res.status(404).json({ error: "Alegerea nu există!" });
        
        if (!isSuperAdmin) {
            const family = await prisma.family.findUnique({ where: { creatorId: req.userId } });
            if (!family || family.id !== election.familyId) {
                 return res.status(403).json({ error: "Acces interzis. Aceasta nu e alegerea ta!" });
            }
        } else if (election.familyId !== null) {
            return res.status(403).json({ error: "Adminul global poate gestiona doar alegerile globale!" });
        }

        const updated = await prisma.election.update({
            where: { id: req.params.id },
            data: { isHidden: true }
        });

        res.json({ message: "Alegerea a fost ascunsă cu succes!", election: updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
