import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            I
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Importec
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa con tu cuenta para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
