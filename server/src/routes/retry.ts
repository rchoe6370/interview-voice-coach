import { Router } from "express";

const router = Router();

router.post("/:id/retry", (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "TODO: retry weakest question", retryable: false } });
});

export default router;
