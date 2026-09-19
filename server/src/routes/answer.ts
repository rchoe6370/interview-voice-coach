import { Router } from "express";

const router = Router();

router.post("/:id/answer", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: process answer", retryable: false } });
});

router.post("/:id/confirm-transcript", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: confirm transcript", retryable: false } });
});

export default router;
