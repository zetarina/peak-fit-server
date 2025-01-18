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

  // Firestore: Add a new pending workout
  async addPendingWorkout(workoutData) {
    const docRef = await this.pendingWorkoutsCollection.add(workoutData);
    return { id: docRef.id, ...workoutData };
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

  // Realtime DB: Add a workout to approved workouts
  async approveWorkout(workout) {
    const workoutRef = this.approvedWorkoutsRef.push();
    await workoutRef.set(workout);
    await this.pendingWorkoutsCollection.doc(workout.id).delete();
  }

  // Firestore: Update a pending workout
  async updatePendingWorkout(workoutId, updateData) {
    await this.pendingWorkoutsCollection.doc(workoutId).update(updateData);
    return { message: "Workout updated successfully" };
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
