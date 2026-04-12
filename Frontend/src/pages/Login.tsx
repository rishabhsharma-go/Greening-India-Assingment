import { useState } from "react";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setSuccess("Login successful 🎉");

      // delay for UX
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error;

      if (msg === "email not found") {
        setError("❌ Email not registered");
      } else if (msg === "incorrect password") {
        setError("❌ Incorrect password");
      } else {
        setError("❌ Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "300px" }}>
      <h2>Login</h2>

      {/* ✅ Error Message */}
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {/* ✅ Success Message */}
      {success && (
        <div style={{ color: "green", marginBottom: "10px" }}>
          {success}
        </div>
      )}

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button
        onClick={handleLogin}
        disabled={loading || !email || !password}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}