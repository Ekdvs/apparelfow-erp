"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Field from "@/components/Field";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/axios";
import { DEMO_USERS, HOME, ROLE_LABEL } from "@/lib/roles";
import { btnPrimary, btnSecondary, inputCls, inputErrCls } from "@/lib/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(HOME[user.role]);
  }, [loading, user, router]);

  const emailErr = !email.trim()
    ? "Email is required"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Enter a valid email address"
      : null;
  const passErr = !password ? "Password is required" : password.length < 6 ? "At least 6 characters" : null;

  const doLogin = async (e: string, p: string) => {
    setSubmitting(true);
    try {
      const u = await login(e, p);
      toast.success(`Welcome, ${u.fullName}`);
      router.replace(HOME[u.role]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailErr || passErr) return;
    doLogin(email.trim(), password);
  };

  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-6 px-4 py-10 md:grid-cols-2">
      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ApparelFlow ERP</h1>
          <p className="text-sm text-gray-700">Sign in to the Cutting Gatekeeper Terminal</p>
        </div>

        <Field label="Email" htmlFor="email" error={touched.email ? emailErr : null}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={`${inputCls} ${touched.email && emailErr ? inputErrCls : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@apparelflow.demo"
          />
        </Field>

        <Field label="Password" htmlFor="password" error={touched.password ? passErr : null}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={`${inputCls} ${touched.password && passErr ? inputErrCls : ""}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            placeholder="Your password"
          />
        </Field>

        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <section className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm" aria-label="Demo credentials">
        <h2 className="text-lg font-bold text-gray-900">Demo credentials</h2>
        <p className="mb-4 text-sm text-gray-700">Test each factory persona with one click.</p>
        <ul className="space-y-3">
          {DEMO_USERS.map((d) => (
            <li key={d.email} className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900">
              <p className="font-semibold">{ROLE_LABEL[d.role]}</p>
              <p className="text-xs text-gray-800">{d.email}</p>
              <p className="text-xs text-gray-800">Password: {d.password}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                  }}
                >
                  Fill form
                </button>
                <button type="button" disabled={submitting} className={btnPrimary} onClick={() => doLogin(d.email, d.password)}>
                  Login as {ROLE_LABEL[d.role]}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}