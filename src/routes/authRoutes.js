import express from "express";
import * as yup from "yup";
import UserRepository from "../repositories/UserRepository.js";
import jwt from "jsonwebtoken";
import uploadPDF from "../middlewares/uploadPDFMiddleware.js";
import EmailService from "../classes/EmailService.js";
import authMiddleware from "../middlewares/authMiddleware.js";
const router = express.Router();

const signupSchema = yup.object().shape({
  email: yup.string().email().required("Valid email is required."),
  password: yup
    .string()
    .min(8)
    .required("Password must be at least 8 characters."),
  username: yup.string().required("Username is required."),
});
router.post(
  "/signup",
  uploadPDF.single("businessCertification"),
  async (req, res) => {
    try {
      const { email, password, username } = await signupSchema.validate(
        req.body,
        { abortEarly: false }
      );

      const existingUserInAuth = await UserRepository.getAuthUserByEmail(email);
      if (existingUserInAuth) {
        return res
          .status(409)
          .json({ error: "User already exists. Please log in." });
      }

      const existingVerification = await UserRepository.getVerificationByEmail(
        email
      );
      if (existingVerification) {
        return res.status(409).json({
          error:
            "Verification already in progress. Please check your email for the verification code.",
        });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Business certification (PDF) is required." });
      }

      const fileUrl = await UserRepository.uploadBusinessCertification(
        req.file
      );

      const verificationCode = await UserRepository.generateVerificationCode(
        email,
        {
          email,
          password,
          username,
          businessCertification: [fileUrl],
        }
      );

      await EmailService.sendEmailasHTML(
        email,
        "Verify Your Account",
        `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                <h1 style="text-align: center; color:rgb(43, 153, 43);">PEAK FIT</h1>
                <h2 style="text-align: center; color: #4CAF50;">Verify Your Account</h2>
                <p>Hi there,</p>
                <p>Thank you for signing up! Your verification code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                  <span style="display: inline-block; font-size: 24px; font-weight: bold; background-color: #f9f9f9; padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px;">
                    ${verificationCode}
                  </span>
                </div>
                <p>Please enter this code in the app to complete your account verification.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p style="margin-top: 20px;">Thank you,<br>Your App Team</p>
              </div>
            </body>
          </html>
        `
      );

      res.status(200).json({
        message: "Verification email sent. Please verify your account.",
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = error.inner.map((err) => err.message);
        return res.status(400).json({ errors });
      }

      console.error("Signup Error:", error.message);
      res.status(500).json({ error: "Failed to initiate signup." });
    }
  }
);

router.post("/verify-signup", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const userData = await UserRepository.validateVerificationCode(email, code);

    const userRecord = await UserRepository.createUser(userData);

    const authToken = jwt.sign(
      { uid: userRecord.uid, email: userData.email },
      process.env.JWT_SECRET || "nothinglastforever",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Verification successful.",
      authToken,
    });
  } catch (error) {
    console.error("Verification Error:", error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    const decodedToken = await UserRepository.verifyIdToken(token);

    const { uid, email } = decodedToken;

    const user = await UserRepository.getUserById(uid);

    if (!user) {
      return res
        .status(404)
        .json({ error: "No account found for this user. Please sign up." });
    }

    const authToken = jwt.sign(
      { uid, email },
      process.env.JWT_SECRET || "nothinglastforever",
      {
        expiresIn: "12h",
      }
    );

    res.status(200).json({ message: "Login successful!", authToken, user });
  } catch (error) {
    console.error("Login Error:", error.message);

    if (error.code === "auth/invalid-token") {
      return res
        .status(401)
        .json({ error: "Invalid token. Please login again." });
    }
    if (error.code === "auth/id-token-expired") {
      return res
        .status(401)
        .json({ error: "Session expired. Please login again." });
    }

    res
      .status(401)
      .json({ error: "Failed to login. Please check your credentials." });
  }
});
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const existingUserInAuth = await UserRepository.getAuthUserByEmail(email);
    if (existingUserInAuth) {
      return res
        .status(409)
        .json({ error: "User already exists. Please log in." });
    }

    const existingVerification = await UserRepository.getVerificationByEmail(
      email
    );
    if (existingVerification) {
      await UserRepository.deleteVerificationByEmail(email);
    }

    const newCode = await UserRepository.generateVerificationCode(email, {
      email,
    });

    await EmailService.sendEmailasHTML(
      email,
      "Resend Verification Code",
      `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
    <h1 style="text-align: center; color:rgb(43, 153, 43);">PEAK FIT</h1>
              <h2 style="text-align: center; color: #4CAF50;">Verify Your Account</h2>
              <p>Hi there,</p>
              <p>Your new verification code is:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="display: inline-block; font-size: 24px; font-weight: bold; background-color: #f9f9f9; padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px;">
                  ${newCode}
                </span>
              </div>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p style="margin-top: 20px;">Thank you,<br>Your App Team</p>
            </div>
          </body>
        </html>
      `
    );

    res.status(200).json({
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Resend Code Error:", error.message);
    res.status(500).json({ error: "Failed to resend verification code." });
  }
});

router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const existingUser = await UserRepository.getAuthUserByEmail(email);
    if (!existingUser) {
      return res
        .status(404)
        .json({ error: "User not found with this email. Please sign up." });
    }

    const resetLink = await UserRepository.generatePasswordResetLink(email);

    await EmailService.sendEmailasHTML(
      email,
      "Password Reset Request",
      `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <h1 style="text-align: center; color:rgb(43, 153, 43);">PEAK FIT</h1>
              <h2 style="text-align: center; color: #4CAF50;">Password Reset Request</h2>
              <p>Hi there,</p>
              <p>You requested to reset your password. Click the link below to reset your password:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a 
                  href="${resetLink}" 
                  style="text-decoration: none; color: white; background-color: #4CAF50; padding: 10px 20px; border-radius: 4px; font-size: 16px;"
                >
                  Reset Your Password
                </a>
              </div>
              <p>If the button above does not work, copy and paste the following link into your browser:</p>
              <p style="word-wrap: break-word; background-color: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
                <a href="${resetLink}" style="color: #4CAF50; text-decoration: none;">${resetLink}</a>
              </p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p style="margin-top: 20px;">Thank you,<br>Your App Team</p>
            </div>
          </body>
        </html>
      `
    );

    res.status(200).json({
      message: "Password reset email has been sent.",
    });
  } catch (error) {
    console.error("Error in forget-password route:", error.message);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found with this email." });
    }

    res.status(500).json({ error: "Failed to send password reset email." });
  }
});
router.get("/validate", authMiddleware(false), async (req, res) => {
  const { uid } = req.user;
  const user = await UserRepository.getUserById(uid);

  res.status(200).json({
    uid,
    email: user.email,
    isApproveUser: user.isApproveUser || false,
  });
});

export default router;
