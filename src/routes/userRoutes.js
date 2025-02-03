import express from "express";
import UserRepository from "../repositories/UserRepository.js";
import PersonalizedWorkoutRepository from "../repositories/PersonalizedWorkoutRepository.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Fetch all users from the repository
    const users = await UserRepository.getAllUsers();

    if (!users) {
      return res.status(404).json({ message: "No users found." });
    }

    res.status(200).json({ message: "Users retrieved successfully.", users });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Failed to retrieve users." });
  }
});
router.get("/delete-all-workout", async (req, res) => {
  try {
    console.log('delete')
    const result = await PersonalizedWorkoutRepository.deleteAllWorkouts();
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error deleting all workouts:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete all workouts" });
  }
});

export default router;
