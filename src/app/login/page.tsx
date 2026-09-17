import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background text-lg font-semibold">
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
