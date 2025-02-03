import FirebaseAdmin from "../classes/firebase-admin.js";

class UserRepository {
  constructor() {
    this.realtimeDb = FirebaseAdmin.getDatabase();
    this.usersRef = this.realtimeDb.ref("business-users");
    this.auth = FirebaseAdmin.getAuth();
    this.firestore = FirebaseAdmin.getFirestore();
    this.storage = FirebaseAdmin.getStorage();
  }

  /** Retrieve all users from Realtime Database */
  async getAllUsers() {
    const snapshot = await this.usersRef.once("value");
    return snapshot.val();
  }

  /** Retrieve a user by ID from Realtime Database */
  async getUserById(userId) {
    const snapshot = await this.usersRef.child(userId).once("value");

    if (!snapshot.exists()) {
      throw new Error("User not found");
    }
    return snapshot.val();
  }

  /** Retrieve a user by email from Firebase Authentication */
  async getAuthUserByEmail(email) {
    try {
      return await this.auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return null;
      }
      throw error;
    }
  }
  /** Update a user's password in Firebase Authentication */
  async updateUserPassword(userId, newPassword) {
    try {
      await this.auth.updateUser(userId, { password: newPassword });
      console.log(`Password updated successfully for user: ${userId}`);
      return { message: "Password updated successfully" };
    } catch (error) {
      console.error(
        `Error updating password for user ${userId}:`,
        error.message
      );
      throw new Error("Failed to update password.");
    }
  }

  /** Retrieve verification data by email from Firestore */
  async getVerificationByEmail(email) {
    const docRef = this.firestore.collection("verification").doc(email);
    const snapshot = await docRef.get();
    return snapshot.exists ? snapshot.data() : null;
  }

  /** Delete verification data by email from Firestore */
  async deleteVerificationByEmail(email) {
    try {
      const docRef = this.firestore.collection("verification").doc(email);
      await docRef.delete();
      console.log(`Verification for ${email} deleted successfully.`);
    } catch (error) {
      console.error(
        `Error deleting verification for email ${email}:`,
        error.message
      );
      throw new Error("Failed to delete verification entry.");
    }
  }

  /** Upload a business certification to Firebase Storage */
  async uploadBusinessCertification(file) {
    try {
      const folder = "business_certifications";
      const fileName = `${folder}/${Date.now()}_${file.originalname}`;
      const bucketFile = this.storage.file(fileName);

      await bucketFile.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      await bucketFile.makePublic();
      return bucketFile.publicUrl();
    } catch (error) {
      console.error("Error uploading business certification:", error.message);
      throw new Error("Failed to upload business certification.");
    }
  }
  async uploadProfilePicture(file, uid) {
    try {
      const folder = "profile_pictures";
      const fileName = `${folder}/${uid}`;
      const bucketFile = this.storage.file(fileName);

      await bucketFile.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      await bucketFile.makePublic();
      return bucketFile.publicUrl();
    } catch (error) {
      console.error("Error uploading business certification:", error.message);
      throw new Error("Failed to upload business certification.");
    }
  }
  async deleteBusinessCertification(fileUrl) {
    try {
      const filePath = decodeURIComponent(
        fileUrl.split("/").pop().split("?")[0]
      );

      const bucketFile = this.storage.file(filePath);
      await bucketFile.delete();

      console.log(`Successfully deleted: ${filePath}`);
      return { message: "File deleted successfully." };
    } catch (error) {
      console.error("Error deleting business certification:", error.message);
      throw new Error("Failed to delete business certification.");
    }
  }
  /** Create a user in Firebase Authentication and store data in Realtime Database */
  async createUser(userData) {
    try {
      let userRecord;
      try {
        userRecord = await this.auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.username,
        });
        console.log("User created in Firebase Authentication:", userRecord);
      } catch (err) {
        if (err.code === "auth/email-already-exists") {
          const existingUser = await this.auth.getUserByEmail(userData.email);
          await this.auth.deleteUser(existingUser.uid);
          console.log("Existing user deleted successfully.");

          userRecord = await this.auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.username,
          });
        } else {
          console.error("Error creating user:", err);
          throw new Error("Failed to create user in Firebase Authentication.");
        }
      }
      console.log(userRecord.uid, {
        email: userData.email,
        username: userData.username,
        businessCertification: userData.businessCertification,
        userType: "business",
        isApproveUser: false,
        createdAt: new Date().toISOString(),
      });
      try {
        await this.usersRef.child(userRecord.uid).set({
          email: userData.email,
          username: userData.username,
          businessCertification: userData.businessCertification,
          userType: "business",
          isApproveUser: false,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.log("error creating userRef:", e);
      }

      console.log("User data saved under business-users:", userRecord.uid);

      const docRef = this.firestore
        .collection("verification")
        .doc(userData.email);
      await docRef.delete();

      console.log("Verification code deleted for email:", userData.email);

      return userRecord;
    } catch (err) {
      console.error("Error in user creation:", err);
      throw new Error("Failed to create the user or delete verification data.");
    }
  }

  /** Generate a verification code and store it in Firestore */
  async generateVerificationCode(email, userData) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const verificationData = {
      ...userData,
      code: verificationCode,
      expiry: Date.now() + 15 * 60 * 1000,
    };

    await this.firestore
      .collection("verification")
      .doc(email)
      .set(verificationData);
    return verificationCode;
  }
  /** Generate a password reset link for Firebase Authentication */
  async generatePasswordResetLink(email) {
    try {
      const resetLink = await this.auth.generatePasswordResetLink(email);
      console.log(`Password reset link generated for ${email}`);
      return resetLink;
    } catch (error) {
      console.error(
        `Error generating password reset link for ${email}:`,
        error.message
      );
      throw new Error("Failed to generate password reset link.");
    }
  }
  async validateVerificationCode(email, code) {
    try {
      const docRef = this.firestore.collection("verification").doc(email);

      console.log("Fetching document for email:", email);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        console.log("Snapshot does not exist for email:", email);
        throw new Error("Verification code expired or does not exist.");
      }

      const verificationData = snapshot.data();
      console.log("Verification data retrieved:", verificationData);

      if (Date.now() > verificationData.expiry) {
        console.log("Verification code expired for email:", email);
        throw new Error("Verification code expired.");
      }

      if (parseInt(code, 10) !== verificationData.code) {
        console.log("Invalid verification code for email:", email);
        throw new Error("Invalid verification code.");
      }

      console.log("Verification successful for email:", email);
      return verificationData;
    } catch (error) {
      console.error("Error validating verification code:", error.message);
      throw error;
    }
  }

  /** Update user data in Realtime Database */
  async updateUser(userId, updateData) {
    await this.usersRef.child(userId).update(updateData);
    return { message: "User updated successfully" };
  }

  /** Delete a user from Realtime Database */
  async deleteUser(userId) {
    await this.usersRef.child(userId).remove();
    return { message: "User deleted successfully" };
  }

  /** Generate a password reset link for Firebase Authentication */
  async generatePasswordResetLink(email) {
    return this.auth.generatePasswordResetLink(email);
  }

  /** Verify an ID token from Firebase Authentication */
  async verifyIdToken(token) {
    return this.auth.verifyIdToken(token);
  }
}

export default new UserRepository();
