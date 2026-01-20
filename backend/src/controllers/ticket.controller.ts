import { prisma } from "../lib/prisma.js";
import {
  createTicketSchema,
  addCommentSchema,
  updateStatusSchema,
  assignSchema,
} from "../schemas/ticket.schema.js";

export async function createTicket(req: any, res: any) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const data = parsed.data;

  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      priority: (data.priority as any) ?? "MEDIUM",
      requesterId: req.user.id,
      events: {
        create: {
          actorId: req.user.id,
          type: "TICKET_CREATED",
          metadata: { title: data.title },
        },
      },
    },
  });

  return res.status(201).json(ticket);
}

export async function listTickets(req: any, res: any) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
  const skip = (page - 1) * limit;

  const { status, priority, category, q } = req.query;

  // REQUESTER: solo ve los suyos. AGENT/ADMIN: ve todos.
  const baseWhere: any =
    req.user.role === "REQUESTER" ? { requesterId: req.user.id } : {};

  const where: any = {
    ...baseWhere,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: String(q), mode: "insensitive" } },
            { description: { contains: String(q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function getTicket(req: any, res: any) {
  const ticketId = req.params.id;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  // permiso: requester solo si es suyo
  if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
    return res.status(403).json({ error: "Prohibido" });
  }

  return res.json(ticket);
}

export async function addComment(req: any, res: any) {
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const ticketId = req.params.id;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
    return res.status(403).json({ error: "Prohibido" });
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      userId: req.user.id,
      body: parsed.data.body,
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId,
      actorId: req.user.id,
      type: "COMMENT_ADDED",
      metadata: { length: parsed.data.body.length },
    },
  });

  return res.status(201).json(comment);
}

export async function updateStatus(req: any, res: any) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const ticketId = req.params.id;

  // solo AGENT/ADMIN
  if (!["AGENT", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Prohibido" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: parsed.data.status },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId,
      actorId: req.user.id,
      type: "STATUS_CHANGED",
      metadata: { from: ticket.status, to: parsed.data.status },
    },
  });

  return res.json(updated);
}

export async function assignTicket(req: any, res: any) {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  if (!["AGENT", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ error: "Prohibido" });
  }

  const ticketId = req.params.id;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: parsed.data.assignedToId },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId,
      actorId: req.user.id,
      type: "ASSIGNED_CHANGED",
      metadata: { from: ticket.assignedToId, to: parsed.data.assignedToId },
    },
  });

  return res.json(updated);
}
