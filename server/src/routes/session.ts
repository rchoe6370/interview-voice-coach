import { Router } from "express";

const router = Router();

router.post("/start", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: start session", retryable: false } });
});

router.get("/:id", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: fetch session", retryable: false } });
});

router.get("/:id/summary", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: fetch summary", retryable: false } });
});

export default router;
