import FirebaseAdmin from "../classes/firebase-admin.js";

class PersonalizedWorkoutRepository {
  constructor() {
    this.db = FirebaseAdmin.getDatabase();
    this.workoutsRef = this.db.ref("personalized-workouts");
  }

  async getWorkoutsByUser(uid) {
    const userWorkoutsRef = this.workoutsRef.child(uid);
    const snapshot = await userWorkoutsRef.once("value");

    if (!snapshot.exists()) {
      return [];
    }

    // Convert object to an array with `id` included
    const workouts = snapshot.val();
    return Object.entries(workouts).map(([key, workout]) => ({
      id: key, // Use Firebase's unique key as `id`
      ...workout,
    }));
  }

  async getWorkoutById(uid, workoutId) {
    const workoutRef = this.workoutsRef.child(uid).child(workoutId);
    const snapshot = await workoutRef.once("value");

    if (!snapshot.exists()) {
      throw new Error("Workout not found");
    }

    return { id: workoutId, ...snapshot.val() };
  }

  async addWorkout(uid, workoutData) {
    const userWorkoutsRef = this.workoutsRef.child(uid);
    const workoutRef = userWorkoutsRef.push(); // Generate a unique Firebase key

    const newWorkout = {
      ...workoutData,
      id: workoutRef.key, // Set Firebase key as `id`
      date: new Date().toISOString(),
    };

    await workoutRef.set(newWorkout);
    return newWorkout;
  }

  async updateWorkout(uid, workoutId, updateData) {
    const workoutRef = this.workoutsRef.child(uid).child(workoutId);
    await workoutRef.update(updateData);

    return { message: "Workout updated successfully" };
  }

  async deleteWorkout(uid, workoutId) {
    const workoutRef = this.workoutsRef.child(uid).child(workoutId);
    await workoutRef.remove();

    return { message: "Workout deleted successfully" };
  }

  async addBulkWorkouts(uid, workouts) {
    const userWorkoutsRef = this.workoutsRef.child(uid);

    const updates = {};
    workouts.forEach((workout) => {
      const workoutRef = userWorkoutsRef.push(); // Generate a unique Firebase key
      updates[workoutRef.key] = {
        ...workout,
        id: workoutRef.key, // Set Firebase key as `id`
        date: workout.date || new Date().toISOString(),
      };
    });

    await userWorkoutsRef.update(updates);
    return { message: "Bulk workouts added successfully" };
  }
  async deleteAllWorkouts() {
    await this.workoutsRef.remove();
    return { message: "All workouts deleted successfully" };
  }
}

export default new PersonalizedWorkoutRepository();
