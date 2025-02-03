import FirebaseAdmin from "../classes/firebase-admin.js";

class PersonalizedWorkoutRepository {
  constructor() {
    this.realtimeDb = FirebaseAdmin.getDatabase();
    this.workoutsRef = this.realtimeDb.ref("PersonalisedWorkouts2");
  }
  async deleteAllWorkouts() {
    try {
      console.log(this.workoutsRef);
      if (!this.workoutsRef) {
        throw new Error(
          "The database reference 'PersonalisedWorkouts' is undefined."
        );
      }

      console.log(
        "Attempting to delete data at: ",
        this.workoutsRef.toString()
      );

      const snapshot = await this.workoutsRef.once("value");

      if (!snapshot.exists()) {
        throw new Error("No data found at 'PersonalisedWorkouts'.");
      }

      console.log("Snapshot content:", snapshot.val());

      const workoutsData = snapshot.val();
      for (const category in workoutsData) {
        for (const subcategory in workoutsData[category]) {
          for (const level in workoutsData[category][subcategory]) {
            for (const day in workoutsData[category][subcategory][level]) {
              const exercisesRef = this.workoutsRef
                .child(category)
                .child(subcategory)
                .child(level)
                .child(day)
                .child("exercises");

              const exerciseSnapshot = await exercisesRef.once("value");

              if (exerciseSnapshot.exists()) {
                await exercisesRef.remove();
                console.log(
                  `Removed exercises under: ${category}/${subcategory}/${level}/${day}`
                );
              }
            }
          }
        }
      }

      await this.workoutsRef.remove();

      console.log("All workouts deleted successfully");
      return { message: "All workouts deleted successfully" };
    } catch (error) {
      console.error("Error during deletion:", error.message);
      throw new Error("Error deleting all workouts: " + error.message);
    }
  }

  async getWorkoutsByUser(uid) {
    const snapshot = await this.workoutsRef.once("value");

    if (!snapshot.exists()) {
      return [];
    }

    const workouts = snapshot.val();
    const formattedWorkouts = [];

    for (const category in workouts) {
      for (const subcategory in workouts[category]) {
        for (const level in workouts[category][subcategory]) {
          for (const day in workouts[category][subcategory][level]) {
            const dayData = workouts[category][subcategory][level][day];

            const exercises = dayData.exercises || [];

            for (const workoutId in exercises) {
              const workout = exercises[workoutId];

              formattedWorkouts.push({
                id: workout.id,
                createdBy: workout.createdBy,
                duration: workout.duration,
                date: workout.date,
                thumbnail: workout.thumbnail,
                title: workout.title,
                videoUrl: workout.videoUrl,
                goal: category,
                limitations: subcategory,
                level,
                day,
              });
            }
          }
        }
      }
    }

    return formattedWorkouts;
  }

  async getWorkoutById(uid, workoutId) {
    const snapshot = await this.workoutsRef.once("value");

    if (!snapshot.exists()) {
      throw new Error("No workouts found.");
    }

    const workoutData = snapshot.val();

    for (const category in workoutData) {
      for (const subcategory in workoutData[category]) {
        for (const level in workoutData[category][subcategory]) {
          for (const day in workoutData[category][subcategory][level]) {
            const dayData = workoutData[category][subcategory][level][day];

            const exercises = dayData.exercises || [];

            for (const workoutIdKey in exercises) {
              const workout = exercises[workoutIdKey];
              if (workout.id === workoutId) {
                return {
                  ...workout,
                  category,
                  subcategory,
                  level,
                  day,
                };
              }
            }
          }
        }
      }
    }

    throw new Error("Workout not found");
  }
  async addWorkout(uid, workoutData) {
    const { goal, limitations, level, day } = workoutData;

    if (!goal || !limitations || !level || !day) {
      throw new Error(
        "Missing required fields: goal, limitations, level, or day"
      );
    }

    const category = goal;
    const subcategory = limitations;

    const workoutRef = this.workoutsRef
      .child(category)
      .child(subcategory)
      .child(level)
      .child(day)
      .child("exercises")
      .push();

    const newWorkout = {
      id: workoutRef.key,
      date: new Date().toISOString(),
      createdBy: uid,
      thumbnail: workoutData.thumbnail,
      title: workoutData.title,
      videoUrl: workoutData.videoUrl,
      duration: workoutData.duration,
    };

    await workoutRef.set(newWorkout);

    return newWorkout;
  }
  async updateWorkout(uid, workoutId, updateData) {
    const existingWorkout = await this.getWorkoutById(uid, workoutId);

    if (!existingWorkout) {
      throw new Error("Workout not found");
    }

    const { category, subcategory, level, day } = existingWorkout;

    const currentPathRef = this.workoutsRef
      .child(category)
      .child(subcategory)
      .child(level)
      .child(day)
      .child("exercises")
      .child(workoutId);

    const snapshot = await currentPathRef.once("value");
    if (!snapshot.exists()) {
      throw new Error("Workout not found in the current location.");
    }

    const cleanedWorkoutData = {
      id: workoutId,
      createdBy: uid,
      thumbnail: updateData.thumbnail,
      title: updateData.title,
      videoUrl: updateData.videoUrl,
      duration: updateData.duration,
      date: "2025-02-03T11:56:09.732Z",
    };

    await currentPathRef.update(cleanedWorkoutData);

    const newCategory = updateData.goal || category;
    const newSubcategory = updateData.limitations || subcategory;
    const newLevel = updateData.level || level;
    const newDay = updateData.day || day;

    if (
      newCategory !== category ||
      newSubcategory !== subcategory ||
      newLevel !== level ||
      newDay !== day
    ) {
      const newPathRef = this.workoutsRef
        .child(newCategory)
        .child(newSubcategory)
        .child(newLevel)
        .child(newDay)
        .child("exercises")
        .child(workoutId);

      await newPathRef.set(cleanedWorkoutData);

      await currentPathRef.remove();

      return { message: "Workout moved and updated successfully" };
    }

    return { message: "Workout updated successfully" };
  }

  async deleteWorkout(uid, workoutId) {
    const existingWorkout = await this.getWorkoutById(uid, workoutId);
    if (!existingWorkout) {
      throw new Error("Workout not found.");
    }

    const { category, subcategory, level, day } = existingWorkout;

    const workoutRef = this.workoutsRef
      .child(category)
      .child(subcategory)
      .child(level)
      .child(day)
      .child("exercises");

    const snapshot = await workoutRef.once("value");
    if (!snapshot.exists()) {
      throw new Error("No workouts found.");
    }

    let exercises = snapshot.val();

    if (typeof exercises === "object" && !Array.isArray(exercises)) {
      exercises = Object.values(exercises);
    }

    const updatedExercises = exercises.filter(
      (workout) => workout.id !== workoutId
    );

    if (updatedExercises.length === 0) {
      await workoutRef.remove();
    } else {
      await workoutRef.set(updatedExercises);
    }

    return { message: "Workout deleted successfully" };
  }

  async addBulkWorkouts(uid, workouts) {
    const updates = {};

    workouts.forEach((workout) => {
      const { category, subcategory, level, day } = workout;
      if (!category || !subcategory || !level || !day) {
        throw new Error("Missing required fields in one of the workouts");
      }

      const workoutRef = this.workoutsRef
        .child(uid)
        .child(category)
        .child(subcategory)
        .child(level)
        .child(day)
        .child("exercises")
        .push();

      updates[
        `${category}/${subcategory}/${level}/${day}/exercises/${workoutRef.key}`
      ] = {
        ...workout,
        id: workoutRef.key,
        date: workout.date || new Date().toISOString(),
      };
    });

    await this.workoutsRef.child(uid).update(updates);
    return { message: "Bulk workouts added successfully" };
  }

  async deleteAllWorkouts(uid) {
    await this.workoutsRef.child(uid).remove();
    return { message: "All workouts deleted successfully" };
  }
}

export default new PersonalizedWorkoutRepository();
