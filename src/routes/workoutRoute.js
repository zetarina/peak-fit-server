import express from "express";
import WorkoutRepository from "../repositories/WorkoutRepository.js";

const router = express.Router();

// Fetch all pending workouts (Firestore)
router.get("/pending", async (req, res) => {
  try {
    const pendingWorkouts = await WorkoutRepository.fetchPendingWorkouts();
    res.json({ success: true, data: pendingWorkouts });
  } catch (error) {
    console.error("Error fetching pending workouts:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch pending workouts" });
  }
});

// Approve a workout (Move from Firestore to Realtime DB)
router.post("/approve", async (req, res) => {
  const { workout } = req.body;
  if (!workout || !workout.id) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid workout data" });
  }

  try {
    await WorkoutRepository.approveWorkout(workout);
    res.json({ success: true, message: "Workout approved successfully" });
  } catch (error) {
    console.error("Error approving workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to approve workout" });
  }
});
router.post("/createApproved", async (req, res) => {
  const workoutData = req.body;

  if (!workoutData || Object.keys(workoutData).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid workout data" });
  }

  try {
    const newWorkout = await WorkoutRepository.addApprovedWorkout(workoutData);
    res.json({ success: true, data: newWorkout, message: "Workout created successfully" });
  } catch (error) {
    console.error("Error adding approved workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to add approved workout" });
  }
});
// Fetch all approved workouts (Realtime Database)
router.get("/approved", async (req, res) => {
  try {
    const approvedWorkouts = await WorkoutRepository.fetchApprovedWorkouts();
    res.json({ success: true, data: approvedWorkouts });
  } catch (error) {
    console.error("Error fetching approved workouts:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch approved workouts" });
  }
});

// Update an approved workout
router.put("/approved/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!updateData || Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid update data" });
  }

  try {
    const result = await WorkoutRepository.updateApprovedWorkout(id, updateData);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error updating approved workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to update approved workout" });
  }
});

// Delete a pending workout
router.delete("/pending/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await WorkoutRepository.deletePendingWorkout(id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error deleting pending workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete pending workout" });
  }
});

// Delete an approved workout
router.delete("/approved/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await WorkoutRepository.deleteApprovedWorkout(id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error deleting approved workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete approved workout" });
  }
});

export default router;
