import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { LoadingState } from '@/components/ui/StateViews';
import { getErrorMessage } from '@/lib/firebase/errors';
import { requestPasswordReset, signIn } from './api';
import { useAuth } from './useAuth';

const schema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (auth.status === 'loading') return <LoadingState />;
  if (auth.status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    setResetNotice(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  const onResetPassword = async () => {
    setSubmitError(null);
    setResetNotice(null);
    if (!(await trigger('email'))) return;
    setResetPending(true);
    try {
      await requestPasswordReset(getValues('email'));
      setResetNotice(
        'Если аккаунт с таким email существует, на него отправлено письмо для сброса пароля.',
      );
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setResetPending(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-ink text-3xl font-semibold tracking-tight">Вместе</h1>
        <p className="text-ink-muted mt-2 text-sm">Войдите в общий аккаунт, чтобы продолжить.</p>

        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <Field label="Email" error={errors.email?.message}>
            {(props) => (
              <Input {...props} type="email" autoComplete="username" {...register('email')} />
            )}
          </Field>
          <Field label="Пароль" error={errors.password?.message}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            )}
          </Field>

          {submitError && (
            <p
              role="alert"
              className="rounded-control bg-danger-soft text-danger px-3 py-2 text-sm"
            >
              {submitError}
            </p>
          )}
          {resetNotice && (
            <p role="status" className="rounded-control bg-accent-soft text-ink px-3 py-2 text-sm">
              {resetNotice}
            </p>
          )}

          <Button type="submit" pending={isSubmitting} className="mt-2">
            Войти
          </Button>
          <Button variant="ghost" pending={resetPending} onClick={onResetPassword}>
            Забыли пароль?
          </Button>
        </form>
      </div>
    </main>
  );
}
