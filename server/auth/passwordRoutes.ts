import { Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "../storage";
import { grantSignupCredits } from "../credits";
import { Resend } from 'resend';

const resend = new Resend(process.env.EMAIL_SENDER_KEY);

// Email sending function
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.EMAIL_SENDER_KEY || !process.env.EMAIL_FROM) {
    console.log("⚠️ Email credentials not set, skipping email");
    return false;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
import passport from "./local";

const router = Router();

// Rate limiting for password auth routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: "Too many authentication attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 password reset requests per windowMs
  message: { error: "Too many password reset attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters long"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(12, "Password must be at least 12 characters long"),
});

// Helper function to create or update user with password
async function upsertUserByEmail(email: string, additionalData: any = {}) {
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    return existingUser;
  }
  
  // Create new user
  return await storage.upsertUser({
    email: email.toLowerCase(),
    ...additionalData,
  });
}

// POST /api/auth/register - Register with email/password (Option B: Clean registration for new users)
router.post("/register", authRateLimit, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }
    
    // Hash password
    const passwordHash = await argon2.hash(password, { 
      type: argon2.argon2id,
      memoryCost: 65536, // 64MB
      timeCost: 3,
      parallelism: 4,
    });
    
    // Create new user with password
    const user = await upsertUserByEmail(email.toLowerCase(), {
      firstName,
      lastName,
      passwordHash,
      passwordSetAt: new Date(),
    });
    
    // Grant signup credits to new user
    try {
      const creditResult = await grantSignupCredits(user.id);
      console.log(`✅ Granted ${creditResult.success ? 3 : 0} signup credits to user ${user.id}`);
    } catch (error) {
      console.error("⚠️ Failed to grant signup credits:", error);
      // Don't fail registration if credits fail - user still gets account
    }
    
    // Log user in immediately after successful registration
    req.login({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, async (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({ error: "Registration successful but login failed" });
      }
      
      try {
        // Implement single-session enforcement for new user
        const currentSessionId = req.sessionID;
        await storage.setCurrentSessionId(user.id, currentSessionId);
        console.log(`✅ Session initialized for new user ${user.email} (session: ${currentSessionId})`);
      } catch (sessionError) {
        console.error("Session initialization error:", sessionError);
        // Registration succeeded - don't fail on session setup
      }
      
      res.status(201).json({ success: true, message: "Registration successful" });
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login - Login with email/password
router.post("/login", authRateLimit, (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ error: "Authentication failed" });
      }
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return res.status(500).json({ error: "Login failed" });
        }
        
        try {
          // Implement single-session enforcement
          const currentSessionId = req.sessionID;
          
          // Invalidate other sessions for this user
          await storage.invalidateOtherSessions(user.id, currentSessionId);
          
          // Store current session ID for this user
          await storage.setCurrentSessionId(user.id, currentSessionId);
          
          console.log(`✅ Single session enforced for user ${user.email} (session: ${currentSessionId})`);
          
          res.json({ success: true, message: "Login successful" });
        } catch (sessionError) {
          console.error("Session enforcement error:", sessionError);
          // Login succeeded but session enforcement failed - still allow login
          res.json({ success: true, message: "Login successful" });
        }
      });
    })(req, res, next);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me - Get current authenticated user
router.get("/me", async (req, res) => {
  if (!req.user || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    // Check if this session is still valid (single-session enforcement)
    const user = req.user as any;
    const currentSessionId = req.sessionID;
    const storedSessionId = await storage.getCurrentSessionId(user.id);
    
    if (storedSessionId && storedSessionId !== currentSessionId) {
      // This session has been invalidated by a login from another device
      req.logout((err) => {
        console.log(`⚠️ Session ${currentSessionId} invalidated for user ${user.email} (active session: ${storedSessionId})`);
      });
      return res.status(401).json({ error: "Session invalidated by login from another device" });
    }
    
    // Return user info (password auth stores full user object in session)
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(401).json({ error: "Not authenticated" });
  }
});

// POST /api/auth/logout - Logout user
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true, message: "Logout successful" });
  });
});

// POST /api/auth/password/request-reset - Request password reset
router.post("/password/request-reset", resetRateLimit, async (req, res) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ success: true, message: "If that email exists, a reset link has been sent" });
    }
    
    // Generate password reset token
    const tokenPayload = {
      uid: user.id,
      jti: crypto.randomUUID(),
    };
    
    const token = jwt.sign(tokenPayload, process.env.PASSWORD_RESET_KEY!, { 
      expiresIn: "30m",
      issuer: "ai-visibility-checker",
      audience: "password-reset"
    });
    
    const tokenHash = await argon2.hash(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    // Store reset token (this would need a passwordResets storage method)
    // For now, we'll store it in the token itself and verify on reset
    
    // Send reset email
    const resetLink = `${process.env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2C3E50;">Password Reset Request</h2>
        <p>You requested a password reset for your AI Visibility Checker account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background: #F39C12; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The AI Visibility Checker Team</p>
      </div>
    `;
    
    try {
      await sendEmail({
        to: user.email!,
        subject: "Reset your password - AI Visibility Checker",
        html: emailHtml
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({ error: "Failed to send reset email" });
    }
    
    res.json({ success: true, message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    console.error("Password reset request error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: "Password reset request failed" });
  }
});

// POST /api/auth/password/reset - Reset password with token
router.post("/password/reset", authRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = passwordResetSchema.parse(req.body);
    
    // Verify JWT token
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.PASSWORD_RESET_KEY!, {
        issuer: "ai-visibility-checker",
        audience: "password-reset"
      });
    } catch (jwtError) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    
    // Get user
    const user = await storage.getUser(payload.uid);
    if (!user) {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    
    // Hash new password
    const passwordHash = await argon2.hash(newPassword, { 
      type: argon2.argon2id,
      memoryCost: 65536, // 64MB
      timeCost: 3,
      parallelism: 4,
    });
    
    // Update password
    await storage.updateUserPassword(user.id, passwordHash);
    
    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Password reset error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: "Password reset failed" });
  }
});

export default router;