import { Router } from "express";
import { auth } from "../middleware/auth.middleware.js";
import {
  addComment,
  assignTicket,
  createTicket,
  getTicket,
  listTickets,
  updateStatus,
} from "../controllers/ticket.controller.js";

const router = Router();

router.use(auth);

router.get("/", listTickets);
router.post("/", createTicket);
router.get("/:id", getTicket);
router.post("/:id/comments", addComment);
router.patch("/:id/status", updateStatus);
router.patch("/:id/assign", assignTicket);

export default router;
