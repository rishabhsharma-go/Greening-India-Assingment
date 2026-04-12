import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const navigate=useNavigate();

type Project = {
  id: string;
  name: string;
  description?: string;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch projects
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      setError("Failed to load projects");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ✅ Create project
  const handleCreate = async () => {
    if (!name) {
      setError("Project name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/projects", {
        name,
        description,
      });

      setName("");
      setDescription("");

      fetchProjects(); // refresh list
    } catch (err) {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px" }}>
      <h2>Projects</h2>

      {/* Logout */}
      <button onClick={handleLogout} style={{ float: "right" }}>
        Logout
      </button>

      <br /><br />

      {/* Error */}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* Create Project */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Create Project</h3>

        <input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <br /><br />

        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <br /><br />

        <button onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>

      {/* Project List */}
      <div>
        <h3>All Projects</h3>

        {projects.length === 0 ? (
          <p>No projects found</p>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              onClick={()=>navigate('/projects/${p.id}')}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px",
                cursor:"pointer",
              }}
            >
              <h4>{p.name}</h4>
              <p>{p.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}