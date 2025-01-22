import FirebaseAdmin from "../classes/firebase-admin.js";

class WorkoutRepository {
  constructor() {
    this.firestore = FirebaseAdmin.getFirestore();
    this.realtimeDb = FirebaseAdmin.getDatabase();
    this.pendingWorkoutsCollection =
      this.firestore.collection("pending_workouts");
    this.approvedWorkoutsRef = this.realtimeDb.ref("approved_workouts");
  }

  // Firestore: Fetch all pending workouts
  async fetchPendingWorkouts() {
    const snapshot = await this.pendingWorkoutsCollection.get();
    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // Realtime DB: Fetch all approved workouts
  async fetchApprovedWorkouts() {
    const snapshot = await this.approvedWorkoutsRef.once("value");
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val()).map(([key, workout]) => ({
      id: key,
      ...workout,
    }));
  }

  // Realtime DB: Add a new workout directly to approved workouts
  async addApprovedWorkout(workoutData) {
    const workoutRef = this.approvedWorkoutsRef.push();
    await workoutRef.set(workoutData);
    return { id: workoutRef.key, ...workoutData };
  }

  // Approve a workout: Move from pending to approved
  async approveWorkout(workout) {
    const workoutRef = this.approvedWorkoutsRef.push();
    await workoutRef.set(workout);
    await this.pendingWorkoutsCollection.doc(workout.id).delete(); // Remove from pending
    return { id: workoutRef.key, ...workout };
  }

  // Realtime DB: Update an approved workout
  async updateApprovedWorkout(workoutId, updateData) {
    await this.approvedWorkoutsRef.child(workoutId).update(updateData);
    return { message: "Approved workout updated successfully" };
  }

  // Firestore: Delete a pending workout
  async deletePendingWorkout(workoutId) {
    await this.pendingWorkoutsCollection.doc(workoutId).delete();
    return { message: "Pending workout deleted successfully" };
  }

  // Realtime DB: Delete an approved workout
  async deleteApprovedWorkout(workoutId) {
    await this.approvedWorkoutsRef.child(workoutId).remove();
    return { message: "Approved workout deleted successfully" };
  }
}

export default new WorkoutRepository();
