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
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(401).json({ error: "Sesiune invalidă!" });

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Sesiune expirată sau invalidă!" });
    }
};

// Create family
router.post('/create', authMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        if (req.user.familyId || req.user.createdFamily) {
            return res.status(400).json({ error: "Ai deja o familie!" });
        }

        const newFamily = await prisma.family.create({
            data: {
                name,
                creatorId: req.user.id,
            }
        });

        // Add creator as member of their own family
        await prisma.user.update({
            where: { id: req.user.id },
            data: { familyId: newFamily.id }
        });

        res.status(201).json({ message: "Familie creată!", family: newFamily });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Invite member
router.post('/invite', authMiddleware, async (req, res) => {
    const { email } = req.body;
    try {
        const family = await prisma.family.findUnique({ where: { creatorId: req.user.id } });
        if (!family) {
            return res.status(403).json({ error: "Nu ești creatorul niciunei familii!" });
        }

        const userToInvite = await prisma.user.findUnique({ where: { email } });
        if (!userToInvite) {
            return res.status(404).json({ error: "Utilizatorul nu există în sistem." });
        }

        if (userToInvite.familyId) {
            return res.status(400).json({ error: "Utilizatorul face deja parte dintr-o familie." });
        }

        const existingInvite = await prisma.familyInvitation.findFirst({
            where: { familyId: family.id, userId: userToInvite.id }
        });

        if (existingInvite) {
            return res.status(400).json({ error: "O invitație a fost deja trimisă acestui utilizator." });
        }

        await prisma.familyInvitation.create({
            data: { familyId: family.id, userId: userToInvite.id }
        });

        res.json({ message: "Invitație trimisă cu succes!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get current user's family
router.get('/my', authMiddleware, async (req, res) => {
    try {
        if (!req.user.familyId) {
            return res.json({ family: null });
        }

        const family = await prisma.family.findUnique({
            where: { id: req.user.familyId },
            include: {
                members: { select: { id: true, email: true, createdAt: true } },
                creator: { select: { id: true, email: true } }
            }
        });

        res.json({ family, isCreator: family.creatorId === req.user.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Remove member
router.post('/remove-member', authMiddleware, async (req, res) => {
    const { userId } = req.body;
    try {
        const family = await prisma.family.findUnique({ where: { creatorId: req.user.id } });
        if (!family) {
            return res.status(403).json({ error: "Nu ești creatorul niciunei familii!" });
        }

        if (userId === req.user.id) {
            return res.status(400).json({ error: "Nu te poți elimina pe tine însuți din familie. Dacă vrei, șterge familia cu totul." });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { familyId: null }
        });

        res.json({ message: "Membru eliminat cu succes!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Leave family
router.post('/leave', authMiddleware, async (req, res) => {
    try {
        if (!req.user.familyId) {
            return res.status(400).json({ error: "Nu faci parte din nicio familie!" });
        }

        const family = await prisma.family.findUnique({ where: { id: req.user.familyId } });
        if (family.creatorId === req.user.id) {
            return res.status(400).json({ error: "Ești creatorul familiei. Dacă vrei să ieși, contactează suportul pentru a șterge familia." });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { familyId: null }
        });

        res.json({ message: "Ai părăsit familia cu succes!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get pending invitations for current user
router.get('/invitations', authMiddleware, async (req, res) => {
    try {
        const invitations = await prisma.familyInvitation.findMany({
            where: { userId: req.user.id, status: 'PENDING' },
            include: { family: true }
        });
        res.json(invitations);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Accept invitation
router.post('/invitations/:id/accept', authMiddleware, async (req, res) => {
    try {
        if (req.user.familyId) {
            return res.status(400).json({ error: "Faci deja parte dintr-o familie. Părăsește familia curentă mai întâi." });
        }

        const invitation = await prisma.familyInvitation.findUnique({
            where: { id: req.params.id }
        });

        if (!invitation || invitation.userId !== req.user.id) {
            return res.status(404).json({ error: "Invitația nu a fost găsită." });
        }

        // Add user to family
        await prisma.user.update({
            where: { id: req.user.id },
            data: { familyId: invitation.familyId }
        });

        // Mark this one as accepted and delete all others (since you can only be in one family)
        await prisma.familyInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        await prisma.familyInvitation.deleteMany({
            where: { userId: req.user.id, status: 'PENDING' }
        });

        res.json({ message: "Invitația a fost acceptată!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Reject invitation
router.post('/invitations/:id/reject', authMiddleware, async (req, res) => {
    try {
        const invitation = await prisma.familyInvitation.findUnique({
            where: { id: req.params.id }
        });

        if (!invitation || invitation.userId !== req.user.id) {
            return res.status(404).json({ error: "Invitația nu a fost găsită." });
        }

        await prisma.familyInvitation.delete({
            where: { id: invitation.id }
        });

        res.json({ message: "Invitația a fost respinsă." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
