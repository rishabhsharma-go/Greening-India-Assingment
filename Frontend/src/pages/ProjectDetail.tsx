import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

type Task = {
  id: string;
  title: string;
  status: string;
};

export default function ProjectDetail() {
  const { id } = useParams(); // project id

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await api.get(`/projects/${id}/tasks`, {
        params: { status: filter },
      });

      setTasks(res.data.tasks || res.data);
    } catch (err) {
      setError("Failed to load tasks");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  // ✅ Create task
  const createTask = async () => {
    if (!title) return;

    try {
      setLoading(true);

      await api.post(`/projects/${id}/tasks`, {
        title,
      });

      setTitle("");
      fetchTasks();
    } catch {
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update status
  const updateStatus = async (taskId: string, status: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, {
        status,
      });

      fetchTasks();
    } catch {
      setError("Failed to update task");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px" }}>
      <h2>Project Tasks</h2>

      {/* Filter */}
      <div>
        <label>Filter: </label>
        <select onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <br />

      {/* Create Task */}
      <div>
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button onClick={createTask} disabled={loading}>
          {loading ? "Adding..." : "Add Task"}
        </button>
      </div>

      <br />

      {/* Error */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* Task List */}
      {tasks.length === 0 ? (
        <p>No tasks</p>
      ) : (
        tasks.map((t) => (
          <div
            key={t.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <h4>{t.title}</h4>
            <p>Status: {t.status}</p>

            {/* Status Buttons */}
            <button onClick={() => updateStatus(t.id, "todo")}>
              Todo
            </button>
            <button onClick={() => updateStatus(t.id, "in_progress")}>
              In Progress
            </button>
            <button onClick={() => updateStatus(t.id, "done")}>
              Done
            </button>
          </div>
        ))
      )}
    </div>
  );
}