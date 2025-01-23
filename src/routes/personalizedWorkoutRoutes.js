import express from "express";
import PersonalizedWorkoutRepository from "../repositories/PersonalizedWorkoutRepository.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware(), async (req, res) => {
  const { uid } = req.user;

  try {
    const workouts = await PersonalizedWorkoutRepository.getWorkoutsByUser(uid);
    res.json({ success: true, data: workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch workouts" });
  }
});

router.get("/:workoutId", authMiddleware(), async (req, res) => {
  const { uid } = req.user;
  const { workoutId } = req.params;

  try {
    const workout = await PersonalizedWorkoutRepository.getWorkoutById(
      uid,
      workoutId
    );
    res.json({ success: true, data: workout });
  } catch (error) {
    console.error("Error fetching workout:", error.message);
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post("/", authMiddleware(), async (req, res) => {
  const { uid } = req.user;
  const workoutData = req.body;

  try {
    const newWorkout = await PersonalizedWorkoutRepository.addWorkout(
      uid,
      workoutData
    );
    res.json({ success: true, data: newWorkout });
  } catch (error) {
    console.error("Error adding workout:", error.message);
    res.status(500).json({ success: false, message: "Failed to add workout" });
  }
});

router.put("/:workoutId", authMiddleware(), async (req, res) => {
  const { uid } = req.user;
  const { workoutId } = req.params;
  const updateData = req.body;

  try {
    const result = await PersonalizedWorkoutRepository.updateWorkout(
      uid,
      workoutId,
      updateData
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error updating workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to update workout" });
  }
});

router.delete("/:workoutId", authMiddleware(), async (req, res) => {
  const { uid } = req.user;
  const { workoutId } = req.params;
  console.log(uid, workoutId);
  try {
    const result = await PersonalizedWorkoutRepository.deleteWorkout(
      uid,
      workoutId
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error deleting workout:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete workout" });
  }
});

router.post("/bulk", authMiddleware(), async (req, res) => {
  const { uid } = req.user;
  const workouts = req.body;
  console.log(workouts)
  // if (!Array.isArray(workouts)) {
  //   return res
  //     .status(400)
  //     .json({ success: false, message: "Workouts must be an array" });
  // }

  // try {
  //   const result = await PersonalizedWorkoutRepository.addBulkWorkouts(
  //     uid,
  //     workouts
  //   );
  //   res.json({ success: true, message: result.message });
  // } catch (error) {
  //   console.error("Error adding bulk workouts:", error.message);
  //   res
  //     .status(500)
  //     .json({ success: false, message: "Failed to add bulk workouts" });
  // }
      res.json({ success: true, message: 'testnig' });
});

export default router;
