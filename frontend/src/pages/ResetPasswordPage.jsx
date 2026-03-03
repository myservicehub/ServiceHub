import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../api/client";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const policy = "At least 8 characters, with upper, lower, number, and symbol.";

  const strengthIssues = useMemo(() => {
    const issues = [];
    if (password.length < 8) issues.push("Minimum 8 characters");
    if (!/[A-Z]/.test(password)) issues.push("Include an uppercase letter");
    if (!/[a-z]/.test(password)) issues.push("Include a lowercase letter");
    if (!/[0-9]/.test(password)) issues.push("Include a number");
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) issues.push("Include a symbol");
    return issues;
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Reset link is invalid or missing a token.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/auth/password-reset", {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to reset password. The link may have expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white shadow rounded p-6">
          <h1 className="text-xl font-semibold mb-2">Password Reset Successful</h1>
          <p className="text-gray-600 mb-6">
            Your password has been updated. You can now sign in.
          </p>
          <button
            onClick={() => navigate("/join-for-free")}
            className="w-full py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded p-6">
        <h1 className="text-xl font-semibold mb-2">Reset your password</h1>
        <p className="text-gray-600 mb-6">
          Enter a new password to complete your reset. {policy}
        </p>

        {!token && (
          <div className="mb-4 text-red-600">
            Invalid or missing reset link token. Request a new link.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              autoComplete="new-password"
              required
            />
            {password && strengthIssues.length > 0 && (
              <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                {strengthIssues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder=""
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Updating" : "Reset Password"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/join-for-free" className="text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
