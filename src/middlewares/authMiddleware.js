import jwt from "jsonwebtoken";
import UserRepository from "../repositories/UserRepository.js";

const authMiddleware =
  (approvalRequired = true) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized. Token required." });
      }

      const token = authHeader.split(" ")[1];

      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET || "nothinglastforever"
      );

      req.user = decodedToken;

      if (approvalRequired) {
        const { uid } = decodedToken;

        const user = await UserRepository.getUserById(uid);

        if (!user) {
          return res
            .status(403)
            .json({ error: "Access denied. Approval required." });
        }

        if (!user.isApproveUser) {
          return res
            .status(403)
            .json({ error: "Access denied. Approval required." });
        }
      }

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token." });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired." });
      }

      res.status(500).json({ error: "Failed to authenticate." });
    }
  };

export default authMiddleware;
