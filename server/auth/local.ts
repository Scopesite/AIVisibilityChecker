import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import argon2 from "argon2";
import { storage } from "../storage";

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      console.log(`🔐 Login attempt for email: ${email}`);
      const user = await storage.findUserByEmail(email.toLowerCase());
      console.log(`🔍 User found:`, user ? { id: user.id, email: user.email, hasPassword: !!user.passwordHash } : 'null');
      
      if (!user || !user.passwordHash) {
        console.log(`❌ Login failed: User not found or no password hash`);
        return done(null, false, { message: "Invalid credentials" });
      }

      // Check account lock
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return done(null, false, { message: "Account locked. Try again later" });
      }

      // Verify password
      console.log(`🔑 Verifying password for ${email}, hash length: ${user.passwordHash.length}`);
      const isValidPassword = await argon2.verify(user.passwordHash, password);
      console.log(`🔓 Password verification result: ${isValidPassword}`);
      
      if (!isValidPassword) {
        console.log(`❌ Login failed: Invalid password for ${email}`);
        await storage.incrementFailedLoginAttempts(user.id);
        return done(null, false, { message: "Invalid credentials" });
      }

      // Clear failed login attempts on successful login
      await storage.clearFailedLoginAttempts(user.id);
      
      return done(null, { 
        id: user.id, 
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error("Local strategy error:", error);
      return done(error);
    }
  }
));

export default passport;